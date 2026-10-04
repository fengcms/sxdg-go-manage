// 使用真实后台验证页面刷新、续期、主动退出及启动断网重试。
import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

const accounts = JSON.parse(readFileSync(".e2e-accounts.json", "utf8"));
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("账号", { exact: true }).fill(accounts.operator.account);
  await page.getByLabel("密码", { exact: true }).fill(accounts.operator.password);
  await page.getByRole("button", { name: "登录工作台", exact: true }).click();
  await expect(page.locator(".topbar")).toBeVisible();
}
test("刷新保留路由及筛选条件，过期访问令牌自动续期，退出清理", async ({ page }) => {
  await login(page);
  await page.goto("/users?keyword=session-reload");
  await expect(page.getByRole("heading", { name: "用户管理", exact: true })).toBeVisible();
  let refreshCount = 0;
  page.on("request", (r) => {
    if (r.url().includes("/auth/refresh")) refreshCount++;
  });
  await page.evaluate(() => {
    const key = "sxdg-admin-session-v1";
    const saved = JSON.parse(sessionStorage.getItem(key) || "{}");
    saved.accessToken = "expired-token";
    sessionStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "用户管理", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/users\?keyword=session-reload$/);
  expect(refreshCount).toBe(1);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(sessionStorage.getItem("sxdg-admin-session-v1") || "{}").accessToken !==
        "expired-token",
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "退出登录", exact: true }).click();
  await expect(page.getByRole("button", { name: "登录工作台", exact: true })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("sxdg-admin-session-v1"))).toBeNull();
  await page.reload();
  await expect(page.getByRole("button", { name: "登录工作台", exact: true })).toBeVisible();
});
test("刷新校验断网不展示业务页面，网络恢复后可以重试", async ({ page }) => {
  await login(page);
  await page.route("**/api/v1/auth/me", (route) => route.abort());
  await page.reload();
  await expect(page.getByRole("heading", { name: "暂时无法恢复登录" })).toBeVisible();
  await expect(page.locator(".topbar")).toHaveCount(0);
  await page.unroute("**/api/v1/auth/me");
  await page.getByRole("button", { name: "重试恢复" }).click();
  await expect(page.locator(".topbar")).toBeVisible();
});
test("双令牌失效时回到登录且清理存储", async ({ page }) => {
  await login(page);
  await page.evaluate(() =>
    sessionStorage.setItem(
      "sxdg-admin-session-v1",
      JSON.stringify({ accessToken: "invalid", refreshToken: "invalid", expiresIn: 60 }),
    ),
  );
  await page.reload();
  await expect(page.getByRole("button", { name: "登录工作台", exact: true })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("sxdg-admin-session-v1"))).toBeNull();
});
