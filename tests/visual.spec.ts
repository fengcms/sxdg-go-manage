// 使用真实接口检查几何布局与键盘，动态业务区域遮罩后保存视觉基线。
import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

const account = JSON.parse(readFileSync(".e2e-accounts.json", "utf8")).super_admin;
async function openUsers(page: Page) {
  await page.goto("/login");
  await page.getByLabel("账号", { exact: true }).fill(account.account);
  await page.getByLabel("密码", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "登录工作台", exact: true }).click();
  await page.getByRole("heading", { name: "运营总览", exact: true }).waitFor();
  await page.getByRole("link", { name: "用户管理", exact: true }).click();
  await page.getByRole("table").waitFor();
}
test("亮暗样板尺寸、折叠与视觉基线", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openUsers(page);
  expect((await page.locator(".sidebar").boundingBox())?.width).toBe(200);
  expect((await page.locator(".topbar").boundingBox())?.height).toBe(56);
  expect((await page.locator("tbody tr").first().boundingBox())?.height).toBe(52);
  const input = await page.getByLabel("昵称 / 完整手机号", { exact: true }).boundingBox();
  const search = await page.getByRole("button", { name: "查询", exact: true }).boundingBox();
  expect(input?.y).toBe(search?.y);
  const stylePath = "tests/visual-mask.css";
  const maskStyle = await page.addStyleTag({ content: readFileSync(stylePath, "utf8") });
  await expect(page.locator("tbody td").first()).toHaveCSS("visibility", "hidden");
  await expect(page).toHaveScreenshot("users-light.png", {
    stylePath,
    animations: "disabled",
    maxDiffPixelRatio: 0.01,
  });
  await page.getByRole("button", { name: "切换主题" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page).toHaveScreenshot("users-dark.png", {
    stylePath,
    animations: "disabled",
    maxDiffPixelRatio: 0.01,
  });
  await maskStyle.evaluate((node) => node.parentNode?.removeChild(node));
  await page.getByRole("button", { name: "折叠侧边栏" }).click();
  await expect.poll(async () => (await page.locator(".sidebar").boundingBox())?.width).toBe(64);
  await page.getByRole("button", { name: "展开侧边栏" }).click();
  await page.getByRole("button", { name: "切换主题" }).click();
  await page.getByRole("button", { name: "调整信用分", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect((await dialog.boundingBox())?.width).toBe(600);
  await expect(dialog).toHaveScreenshot("credit-dialog.png", {
    stylePath,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});
test("响应式导航和移动弹窗焦点", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openUsers(page);
  for (const width of [1280, 1024, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width === 1024)
      await expect.poll(async () => (await page.locator(".sidebar").boundingBox())?.width).toBe(64);
  }
  await page.setViewportSize({ width: 1024, height: 844 });
  await page.getByRole("button", { name: "展开侧边栏" }).click();
  await expect.poll(async () => (await page.locator(".sidebar").boundingBox())?.width).toBe(200);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "展开导航" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "展开导航" })).toBeFocused();
  await page.getByRole("button", { name: "展开导航" }).click();
  await page.getByRole("link", { name: "用户管理", exact: true }).click();
  await page.getByRole("button", { name: "调整信用分", exact: true }).first().click();
  const box = await page.getByRole("dialog").boundingBox();
  expect(box?.width).toBeLessThanOrEqual(358);
  await page.getByLabel("增减分值", { exact: true }).fill("0");
  await page.getByRole("button", { name: "核对操作" }).click();
  await expect(page.getByRole("alert").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "放弃未保存的修改？" })).toBeVisible();
  await page.getByRole("button", { name: "放弃修改", exact: true }).click();
});
