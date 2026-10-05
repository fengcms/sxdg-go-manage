// 通道浏览器验收：真实HTTP角色与独立资金夹具，故障场景单独拦截响应。
import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

const data = JSON.parse(readFileSync(".refund-e2e.json", "utf8"));
async function visit(page: Page, role: string, id: number) {
  await page.addInitScript(
    (tokens) => sessionStorage.setItem("sxdg-admin-session-v1", JSON.stringify(tokens)),
    data.sessions[role],
  );
  await page.goto(`/refunds/${id}`);
}
async function execute(page: Page, reason: string) {
  await page.getByLabel("操作原因", { exact: true }).fill(reason);
  await page.getByRole("button", { name: "核对操作", exact: true }).click();
  await page.getByRole("button", { name: "确认执行", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
for (const role of ["finance", "super_admin"]) {
  test(`${role}真实查单与已完成重复查单`, async ({ page }) => {
    await visit(page, role, data.fixtures.processing.id);
    await expect(page.getByRole("heading", { name: "通道处理", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "主动对账", exact: true }).click();
    await execute(page, "浏览器查询处理中通道");
    await expect(page.getByRole("status").filter({ hasText: "对账完成" })).toContainText("已同意");
    await expect(page.getByRole("button", { name: "重试退款", exact: true })).toHaveCount(0);
    await page.goto(`/refunds/${data.fixtures.success.id}`);
    for (let i = 0; i < 2; i++) {
      await page.getByRole("button", { name: "主动对账", exact: true }).click();
      await execute(page, "浏览器终态幂等核验");
      await expect(page.getByRole("status").filter({ hasText: "对账完成" })).toContainText(
        "已完成",
      );
    }
  });
}
test("财务CLOSED换号、历史通知隔离与SUCCESS幂等", async ({ page, request }) => {
  const f = data.fixtures.closed;
  await visit(page, "finance", f.id);
  await page.getByRole("button", { name: "重试退款", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("受理不等于到账");
  await execute(page, "确认原通道已关闭，受控换号");
  await expect(page.getByRole("button", { name: "重试退款", exact: true })).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: f.refundNo })).toContainText("历史号");
  const auth = { Authorization: `Bearer ${data.sessions.finance.accessToken}` };
  const get = async () =>
    (await (await request.get(`/api/v1/admin/refunds/${f.id}`, { headers: auth })).json()).data;
  const row = await get();
  expect(row.refundNo).not.toBe(f.refundNo);
  expect(row.retryCount).toBe(1);
  expect(row.attempts).toHaveLength(2);
  const notice = async (number: string, status: string) => {
    const response = await request.post("/api/v1/payments/wx-refund-callback", {
      data: { out_refund_no: number, refund_status: status, amount: { refund: 5000 } },
    });
    expect(response.status()).toBe(200);
  };
  await notice(f.refundNo, "CLOSED");
  expect((await get()).refundNo).toBe(row.refundNo);
  expect((await get()).status).toBe(1);
  await notice(row.refundNo, "SUCCESS");
  await notice(row.refundNo, "SUCCESS");
  expect((await get()).status).toBe(4);
  const req = await (
    await request.get(`/api/v1/admin/requirements/${f.requirementId}`, { headers: auth })
  ).json();
  expect(req.data.refundedAmount).toBe("50");
  await page.reload();
  await expect(page.getByRole("row").filter({ hasText: row.refundNo })).toContainText("退款成功");
  await page.screenshot({ path: "test-results/refund-channel-success.png", fullPage: true });
});
test("ABNORMAL不可重试，客服只读，运营403及真实越权拒绝", async ({ browser, request }) => {
  for (const role of ["finance", "customer_service", "operator"]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await visit(page, role, data.fixtures.abnormal.id);
    if (role === "operator")
      await expect(page.getByRole("heading", { name: /403|无权|禁止|权限/ })).toBeVisible();
    else {
      await expect(page.getByText("请在微信商户平台处理异常", { exact: false })).toBeVisible();
      await expect(page.getByRole("button", { name: "重试退款", exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "主动对账", exact: true })).toHaveCount(
        role === "finance" ? 1 : 0,
      );
    }
    await context.close();
  }
  for (const role of ["customer_service", "operator"])
    for (const op of ["reconcile", "retry"]) {
      const response = await request.post(
        `/api/v1/admin/refunds/${data.fixtures.abnormal.id}/${op}`,
        {
          headers: { Authorization: `Bearer ${data.sessions[role].accessToken}` },
          data: { reason: "权限负向验收" },
        },
      );
      expect(response.status()).toBe(403);
      expect((await response.json()).code).toBe(20003);
    }
});
test("原因长度、70002保留输入、网络异常不自动重发", async ({ page }) => {
  await visit(page, "finance", data.fixtures.processing.id);
  let calls = 0;
  await page.route("**/refunds/*/reconcile", (route) => {
    calls++;
    return route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ code: 70002, message: "退款状态已变化", data: null }),
    });
  });
  await page.getByRole("button", { name: "主动对账", exact: true }).click();
  await page.getByLabel("操作原因", { exact: true }).fill("😀".repeat(256));
  await page.getByRole("button", { name: "核对操作", exact: true }).click();
  await expect(page.getByText("请填写1～255个字符的操作原因")).toBeVisible();
  expect(calls).toBe(0);
  await page.getByLabel("操作原因", { exact: true }).fill("并发变化核验");
  await page.getByRole("button", { name: "核对操作", exact: true }).click();
  await page.getByRole("button", { name: "确认执行", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("退款状态已变化");
  await expect(page.getByLabel("操作原因", { exact: true })).toHaveValue("并发变化核验");
  expect(calls).toBe(1);
  await page.unroute("**/refunds/*/reconcile");
  await page.route("**/refunds/*/reconcile", (route) => {
    calls++;
    return route.abort();
  });
  await page.getByRole("button", { name: "核对操作", exact: true }).click();
  await page.getByRole("button", { name: "确认执行", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("网络连接失败");
  expect(calls).toBe(2);
});
test("空历史与未知通道回退", async ({ page }) => {
  const id = data.fixtures.processing.id;
  await page.route(`**/api/v1/admin/refunds/${id}`, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.data.channelStatus = "FUTURE_STATE";
    body.data.attempts = [];
    await route.fulfill({ response, json: body });
  });
  await visit(page, "finance", id);
  await expect(page.getByText("FUTURE_STATE", { exact: true })).toBeVisible();
  await expect(page.getByText("暂无尝试记录", { exact: true })).toBeVisible();
});

test("255个Unicode字符可提交且执行中禁重复点击", async ({ page }) => {
  await visit(page, "finance", data.fixtures.processing.id);
  let calls = 0;
  let submitted = "";
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/refunds/*/reconcile", async (route) => {
    calls++;
    submitted = route.request().postDataJSON().reason;
    await gate;
    const response = await route.fetch();
    await route.fulfill({ response });
  });
  await page.getByRole("button", { name: "主动对账", exact: true }).click();
  await page.getByLabel("操作原因", { exact: true }).fill(`  ${"😀".repeat(255)}  `);
  await page.getByRole("button", { name: "核对操作", exact: true }).click();
  await page.getByRole("button", { name: "确认执行", exact: true }).click();
  await expect.poll(() => calls).toBe(1);
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "处理中…", exact: true }),
  ).toBeDisabled();
  expect(Array.from(submitted)).toHaveLength(255);
  release?.();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(calls).toBe(1);
});

test("状态6筛选与空通道不误报", async ({ page }) => {
  await visit(page, "finance", data.fixtures.abnormal.id);
  await page.goto("/refunds");
  await page.getByLabel("状态", { exact: true }).selectOption("6");
  await page.getByRole("button", { name: "查询", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: data.fixtures.abnormal.refundNo }),
  ).toContainText("通道失败待处理");
  const id = data.fixtures.processing.id;
  await page.route(`**/api/v1/admin/refunds/${id}`, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.data.channelStatus = null;
    body.data.attempts = [];
    body.data.lastRetryAt = null;
    await route.fulfill({ response, json: body });
  });
  await page.goto(`/refunds/${id}`);
  await expect(page.getByText("暂无通道记录", { exact: true })).toBeVisible();
  await page.getByRole("heading", { name: "通道处理", exact: true }).scrollIntoViewIfNeeded();
  await page.getByText("暂无尝试记录", { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/refund-channel-empty.png" });
});
