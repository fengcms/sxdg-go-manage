// 真实 HTTP/DB/Redis 验收；凭据文件被 Git 忽略，不记录到报告。

import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

const accounts = JSON.parse(readFileSync(".e2e-accounts.json", "utf8")) as Record<
  string,
  { account: string; password: string }
>;
async function login(page: Page, role: string) {
  await page.goto("/login");
  await page.getByLabel("账号", { exact: true }).fill(accounts[role].account);
  await page.getByLabel("密码", { exact: true }).fill(accounts[role].password);
  await page.getByRole("button", { name: "登录工作台", exact: true }).click();
  await expect(page.getByRole("heading", { name: "运营总览", exact: true })).toBeVisible();
}
const titles: Record<string, string[]> = {
  super_admin: [
    "运营总览",
    "订单统计",
    "用户统计",
    "财务统计",
    "用户管理",
    "资质审核",
    "分类体系",
    "热门分类",
    "动态表单",
    "Banner 管理",
    "服务标签",
    "订单管理",
    "退款裁定",
    "服务管理",
    "需求管理",
    "客服配置",
    "接待工作台",
    "系统参数",
    "信用分规则",
    "服务费配置",
    "操作日志",
  ],
  operator: [
    "运营总览",
    "订单统计",
    "用户统计",
    "用户管理",
    "资质审核",
    "分类体系",
    "热门分类",
    "动态表单",
    "Banner 管理",
    "服务标签",
    "订单管理",
    "服务管理",
    "需求管理",
  ],
  finance: [
    "运营总览",
    "订单统计",
    "用户统计",
    "财务统计",
    "用户管理",
    "订单管理",
    "退款裁定",
    "服务管理",
    "需求管理",
  ],
  customer_service: [
    "运营总览",
    "订单统计",
    "用户统计",
    "用户管理",
    "订单管理",
    "退款裁定",
    "服务管理",
    "需求管理",
    "接待工作台",
  ],
};
for (const role of Object.keys(accounts)) {
  test(`${role} 全部授权页面加载真实接口`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await login(page, role);
    for (const title of titles[role]) {
      await page.locator("nav").getByRole("link", { name: title, exact: true }).click();
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await expect(page.getByText("正在加载数据…")).toHaveCount(0);
      await expect(page.getByRole("alert")).toHaveCount(0);
    }
    expect(errors).toEqual([]);
    if (role !== "super_admin") {
      await page.evaluate(() => {
        window.history.pushState({}, "", "/system/configs");
        window.dispatchEvent(new PopStateEvent("popstate"));
      });
      await expect(page.getByText("403 · 无访问权限")).toBeVisible();
    }
    await page.reload();
    await expect(page.getByRole("button", { name: "登录工作台", exact: true })).toBeVisible();
  });
}
test("登录错误不刷新，移动端菜单可达", async ({ page }) => {
  let refresh = 0;
  page.on("request", (r) => {
    if (r.url().includes("/auth/refresh")) refresh++;
  });
  await page.goto("/login");
  await page.getByLabel("账号", { exact: true }).fill(accounts.operator.account);
  await page.getByLabel("密码", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "登录工作台", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("账号或密码错误");
  expect(refresh).toBe(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "operator");
  await page.getByRole("button", { name: "展开导航", exact: true }).click();
  await page.locator("nav").getByRole("link", { name: "用户管理", exact: true }).click();
  await expect(page.getByRole("heading", { name: "用户管理", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("内容写入、二次确认和 JSON 预检", async ({ page }) => {
  await login(page, "operator");
  await page.locator("nav").getByRole("link", { name: "服务标签", exact: true }).click();
  await page.getByRole("button", { name: "新建服务标签" }).click();
  const name = `浏览器验收-${Date.now()}`;
  await page.getByLabel("名称", { exact: true }).fill(name);
  await page.getByRole("button", { name: "核对操作" }).click();
  await expect(page.getByRole("heading", { name: "确认新建服务标签" })).toBeVisible();
  await page.getByRole("button", { name: "确认执行" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const row = page.getByRole("row").filter({ hasText: name });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "编辑", exact: true }).click();
  await page.getByLabel("名称", { exact: true }).fill(`${name}-改`);
  await page.getByRole("button", { name: "核对操作" }).click();
  await page.getByRole("button", { name: "确认执行" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("row")
    .filter({ hasText: `${name}-改` })
    .getByRole("button", { name: "删除", exact: true })
    .click();
  await page.getByRole("button", { name: "核对操作" }).click();
  await page.getByRole("button", { name: "确认执行" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: `${name}-改` })).toContainText("停用");
  await page.locator("nav").getByRole("link", { name: "动态表单", exact: true }).click();
  await page.getByRole("button", { name: "新建动态表单" }).click();
  await page.getByLabel("模板名称", { exact: true }).fill("非法模板预检");
  await page
    .getByLabel("模板 JSON", { exact: true })
    .fill(
      '[{"blockId":"a","fields":[{"key":"a","label":"必填选项","type":"single","required":true}]}]',
    );
  await page.getByRole("button", { name: "核对操作" }).click();
  await expect(page.getByText(/可保存但无法用于发布/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "确认执行" })).toHaveCount(0);
});
test("费率精度与信用组合前端拦截", async ({ page }) => {
  await login(page, "super_admin");
  await page.locator("nav").getByRole("link", { name: "服务费配置", exact: true }).click();
  await page.getByRole("button", { name: "编辑服务费" }).click();
  await page.getByLabel("承担方", { exact: true }).selectOption("split");
  await page.getByLabel("雇主承担（%）", { exact: true }).fill("30.5");
  await page.getByRole("button", { name: "核对操作" }).click();
  await expect(page.getByRole("alert")).toContainText("0～100整数");
  await page.getByLabel("承担方", { exact: true }).selectOption("provider");
  await expect(page.getByLabel("雇主承担（%）", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await page.getByRole("button", { name: "放弃修改", exact: true }).click();
  await page.locator("nav").getByRole("link", { name: "系统参数", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "credit_score_min" })
    .getByRole("button", { name: "编辑", exact: true })
    .click();
  await page.getByLabel("新配置值", { exact: true }).fill("100000");
  await page.getByRole("button", { name: "核对操作" }).click();
  await expect(page.getByRole("alert")).toContainText("下限");
});
test("空态、网络错误恢复与未保存离开确认", async ({ page, context }) => {
  await login(page, "operator");
  await page.locator("nav").getByRole("link", { name: "用户管理", exact: true }).click();
  await page.getByLabel("昵称 / 完整手机号", { exact: true }).fill("不存在的用户-" + Date.now());
  await page.getByRole("button", { name: "查询", exact: true }).click();
  await expect(page.getByText("暂无数据", { exact: true })).toBeVisible();
  await context.setOffline(true);
  await page.getByLabel("昵称 / 完整手机号", { exact: true }).fill("offline-" + Date.now());
  await page.getByRole("button", { name: "查询", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("网络连接失败");
  await context.setOffline(false);
  await page.getByRole("button", { name: "重试", exact: true }).click();
  await expect(page.getByText("暂无数据", { exact: true })).toBeVisible();
  await page.locator("nav").getByRole("link", { name: "服务标签", exact: true }).click();
  await page.getByRole("button", { name: "新建服务标签" }).click();
  await page.getByLabel("名称", { exact: true }).fill("未保存的标签");
  await page.goBack();
  await expect(page.getByRole("heading", { name: "离开并放弃修改？" })).toBeVisible();
  await page.getByRole("button", { name: "继续编辑", exact: true }).click();
  await expect(page.getByLabel("名称", { exact: true })).toHaveValue("未保存的标签");
});
