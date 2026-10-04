// 状态写入使用独立本地夹具；重复跑前重新生成业务夹具。

import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

const accounts = JSON.parse(readFileSync(".e2e-accounts.json", "utf8"));
const f = JSON.parse(readFileSync(".e2e-fixtures.json", "utf8"));
async function login(page: Page, role: string) {
  await page.goto("/login");
  await page.getByLabel("账号", { exact: true }).fill(accounts[role].account);
  await page.getByLabel("密码", { exact: true }).fill(accounts[role].password);
  await page.getByRole("button", { name: "登录工作台", exact: true }).click();
  await expect(page.getByRole("heading", { name: "运营总览", exact: true })).toBeVisible();
}
async function navigate(page: Page, path: string) {
  await page.evaluate((path) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}
async function confirm(page: Page) {
  await page.getByRole("button", { name: "核对操作", exact: true }).click();
  await page.getByRole("button", { name: "确认执行", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
test("用户封禁解封、信用调整、子资源与审计", async ({ page }) => {
  await login(page, "super_admin");
  await navigate(page, `/users/${f.userId}`);
  await page.getByRole("button", { name: "封禁", exact: true }).click();
  await page.getByLabel("操作原因", { exact: true }).fill("隔离用户界面验收");
  await confirm(page);
  await expect(page.getByRole("button", { name: "解封", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "解封", exact: true }).click();
  await page.getByLabel("操作原因", { exact: true }).fill("验收恢复正常");
  await confirm(page);
  await page.getByRole("button", { name: "调整信用分", exact: true }).click();
  await page.getByLabel("增减分值", { exact: true }).fill("1");
  await page.getByLabel("操作原因", { exact: true }).fill("验收信用日志");
  await confirm(page);
  await expect(page.getByRole("row").filter({ hasText: "验收信用日志" })).toBeVisible();
  await page.getByRole("button", { name: "发布服务", exact: true }).click();
  await expect(page.getByRole("heading", { name: "发布服务", exact: true })).toBeVisible();
  await navigate(page, "/system/audit-logs");
  await page.getByLabel("对象类型", { exact: true }).fill("users");
  await page.getByRole("button", { name: "查询", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "调整信用分" }).first()).toBeVisible();
});
test("资质审核实际鉴权证件读取", async ({ page }) => {
  await login(page, "operator");
  await navigate(page, `/users/${f.userId}`);
  const row = page.getByRole("row").filter({ hasText: "ui-test" });
  await row.getByRole("button", { name: "查看证件", exact: true }).click();
  await expect(page.getByAltText("资质证件")).toBeVisible();
  expect(await page.getByAltText("资质证件").getAttribute("src")).toMatch(/^blob:/);
  await page.getByRole("button", { name: "关闭弹窗", exact: true }).click();
  await row.getByRole("button", { name: "拒绝", exact: true }).click();
  await page.getByLabel("拒绝原因", { exact: true }).fill("测试证件，仅用于本地联调");
  await confirm(page);
  await expect(row).toContainText("已拒绝");
});
test("订单两个固定动作和真实结算详情", async ({ page }) => {
  await login(page, "customer_service");
  await navigate(page, `/orders/${f.orderIds[0]}`);
  await page.getByRole("button", { name: "取消未支付订单", exact: true }).click();
  await page.getByLabel("操作原因", { exact: true }).fill("本地取消验收");
  await confirm(page);
  await expect(page.getByText("已取消", { exact: true })).toBeVisible();
  await navigate(page, `/orders/${f.orderIds[1]}`);
  await page.getByRole("button", { name: "验收完成", exact: true }).click();
  await page.getByLabel("操作原因", { exact: true }).fill("本地验收完成");
  await confirm(page);
  await expect(page.getByText("已完成", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "结算记录", exact: true })).toBeVisible();
  await expect(page.getByText("暂无结算", { exact: true })).toHaveCount(0);
});
test("财务退款裁定与来源详情", async ({ page }) => {
  await login(page, "finance");
  await navigate(page, `/refunds/${f.refundId}`);
  await expect(page.getByRole("heading", { name: "退款来源", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "通过", exact: true }).click();
  await page.getByLabel("操作原因", { exact: true }).fill("本地金额边界验收");
  await page.getByLabel("裁定金额", { exact: true }).fill("50.01");
  await page.getByRole("button", { name: "核对操作", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("不超过申请金额");
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await page.getByRole("button", { name: "放弃修改", exact: true }).click();
  await page.getByRole("button", { name: "拒绝", exact: true }).click();
  await page.getByLabel("操作原因", { exact: true }).fill("本地拒绝裁定验收");
  await confirm(page);
  await expect(page.getByText("已拒绝", { exact: true })).toBeVisible();
});
test("客服转接后失权，超管非参与方不能读取", async ({ browser }) => {
  const old = await browser.newPage();
  const admin = await browser.newPage();
  await login(admin, "super_admin");
  await navigate(admin, "/cs/sessions");
  const rows = admin.getByRole("row").filter({ hasText: "界面验收消息" });
  await rows.first().getByRole("button").first().click();
  await expect(admin.getByText("仅参与方可查看历史消息")).toBeVisible();
  await expect(admin.getByRole("button", { name: "转接会话", exact: true })).toHaveCount(0);
  await login(old, "customer_service");
  await navigate(old, "/cs/sessions");
  await old
    .getByRole("row")
    .filter({ hasText: "界面验收消息" })
    .first()
    .getByRole("button")
    .first()
    .click();
  await expect(old.locator(".chat-message")).toContainText("界面验收消息");
  await old.getByRole("button", { name: "转接会话", exact: true }).click();
  await old.getByLabel("目标客服", { exact: true }).selectOption(String(f.agents[1]));
  await confirm(old);
  await expect(old.locator(".chat-message")).toHaveCount(0);
  await expect(old.getByRole("row").filter({ hasText: "界面验收消息" })).toHaveCount(0);
  await old.close();
  await admin.close();
});
test("Banner 上传、时间回显与分类引用保护", async ({ page }) => {
  await login(page, "operator");
  await navigate(page, "/content/banners");
  await page.getByRole("button", { name: "新建Banner 管理" }).click();
  await page.getByLabel("标题", { exact: true }).fill(`图片验收${f.run}`);
  await page.getByLabel("选择上传图片", { exact: true }).setInputFiles({
    name: "banner.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByLabel("横幅图片", { exact: true })).toHaveValue(/\/uploads\/banner\//);
  await page.getByLabel("开始时间", { exact: true }).fill("2026-10-05T09:30");
  await page.getByLabel("结束时间", { exact: true }).fill("2026-10-06T09:30");
  await confirm(page);
  const row = page.getByRole("row").filter({ hasText: `图片验收${f.run}` });
  await row.getByRole("button", { name: "编辑", exact: true }).click();
  await expect(page.getByLabel("开始时间", { exact: true })).toHaveValue("2026-10-05T09:30");
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await navigate(page, "/content/categories");
  const category = page.getByRole("row").filter({ hasText: `验收${f.run}-3` });
  await category.getByRole("button", { name: "删除", exact: true }).click();
  await page.getByRole("button", { name: "核对操作" }).click();
  await page.getByRole("button", { name: "确认执行" }).click();
  await expect(page.getByRole("alert")).toContainText(/引用|服务|需求/);
});
