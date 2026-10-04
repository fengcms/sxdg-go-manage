// 浏览器验收使用真实后端；仅创建独立模板，不修改已有业务记录。
import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

const accounts = JSON.parse(readFileSync(".e2e-accounts.json", "utf8"));
const login = async (page: Page, role: string) => {
  await page.goto("/login");
  await page.getByLabel("账号", { exact: true }).fill(accounts[role].account);
  await page.getByLabel("密码", { exact: true }).fill(accounts[role].password);
  await page.getByRole("button", { name: "登录工作台", exact: true }).click();
  await expect(page.locator(".topbar")).toBeVisible();
};
const fixture = [
  {
    blockId: "demo",
    title: "用户视角",
    extra: { keep: false },
    fields: [
      {
        key: "choice",
        label: "选择项",
        type: "drawer",
        placeholder: "请选择内容",
        panel: {
          mode: "tab",
          title: "选择要求",
          groups: [
            {
              key: "age",
              label: "年龄",
              panel: {
                mode: "wheel",
                title: "年龄",
                wheels: [
                  {
                    key: "age",
                    options: [
                      { value: "18", label: "18岁" },
                      { value: "20", label: "20岁" },
                    ],
                  },
                ],
              },
            },
          ],
        },
      },
      { key: "tags", label: "自定义标签", type: "tags", maxCustom: 1, options: [] },
    ],
  },
];
let templateID = 0;
test.beforeAll(async ({ request }) => {
  const login = await request.post("http://127.0.0.1:8080/api/v1/auth/login", {
    data: accounts.operator,
  });
  const data = await login.json();
  expect(data.code).toBe(0);
  const response = await request.post("http://127.0.0.1:8080/api/v1/admin/form-templates", {
    headers: { Authorization: `Bearer ${data.data.accessToken}` },
    data: { templateName: `readonly-${Date.now()}`, isActive: false, blocks: fixture },
  });
  const saved = await response.json();
  expect(saved.code).toBe(0);
  templateID = saved.data.id;
});
test("设计器导入保存克隆、预览、失败保留与离开保护", async ({ page }) => {
  const savedName = `saved-${Date.now()}`;
  page.on("dialog", (d) => void d.accept());
  await login(page, "operator");
  await page.goto("/content/form-templates/new");
  await page.getByRole("checkbox", { name: "启用模板" }).uncheck();
  await page.getByLabel("模板名称", { exact: true }).fill(`设计器验收-${Date.now()}`);
  await page.getByRole("button", { name: "JSON模式", exact: true }).click();
  await page.getByRole("button", { name: "从JSON导入", exact: true }).click();
  await page.getByLabel("待导入JSON").fill(JSON.stringify(fixture));
  await page.getByRole("button", { name: "检查并导入" }).click();
  const created = page.waitForResponse(
    (r) => r.url().endsWith("/api/v1/admin/form-templates") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "保存模板", exact: true }).click();
  const body = await (await created).json();
  expect(body.code).toBe(0);
  const createdID = body.data.id;
  await expect(page).toHaveURL(new RegExp(`/content/form-templates/${createdID}$`));
  await page.getByRole("button", { name: "JSON模式", exact: true }).click();
  expect(JSON.parse(await page.getByLabel("模板JSON（只读）").inputValue())).toEqual(fixture);
  await page.getByRole("button", { name: "设计模式", exact: true }).click();
  await page.getByRole("button", { name: /请选择内容/ }).click();
  await page.getByLabel("age", { exact: true }).selectOption("20");
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(page.getByRole("button", { name: /请选择内容/ })).toBeVisible();
  await page.getByRole("button", { name: /请选择内容/ }).click();
  await page.getByLabel("age", { exact: true }).selectOption("20");
  await page.getByRole("button", { name: "确定选择", exact: true }).click();
  await expect(page.getByRole("button", { name: "已选择 ›", exact: true })).toBeVisible();
  await page.getByLabel("模板名称", { exact: true }).fill(savedName);
  await page.getByRole("button", { name: "返回列表", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "存在未保存修改" })).toBeVisible();
  await page.getByRole("button", { name: "继续编辑", exact: true }).click();
  await page.route(`**/api/v1/admin/form-templates/${createdID}`, (route) =>
    route.request().method() === "PUT" ? route.abort() : route.continue(),
  );
  await page.getByRole("button", { name: "保存模板", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("模板名称", { exact: true })).toHaveValue(savedName);
  await page.unroute(`**/api/v1/admin/form-templates/${createdID}`);
  await page.getByRole("button", { name: "保存模板", exact: true }).click();
  await expect(page.getByText("版本 2", { exact: false })).toBeVisible();
  await page.screenshot({ path: "docs/dev-log/form-designer-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "docs/dev-log/form-designer-mobile.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "返回列表", exact: true }).click();
  const row = page.getByRole("row").filter({ hasText: savedName });
  await row.getByRole("button", { name: "克隆", exact: true }).click();
  await page.getByLabel("新模板名称", { exact: true }).fill("设计器验收副本");
  await page.getByRole("button", { name: "核对操作", exact: true }).click();
  await page.getByRole("button", { name: "确认执行", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("财务角色只读可预览，不能修改保存", async ({ page }) => {
  await login(page, "finance");
  await page.goto(`/content/form-templates/${templateID}`);
  await expect(page.getByText("只读查看", { exact: false })).toBeVisible();
  await expect(page.getByLabel("模板名称", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "保存模板", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "添加区块", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /请选择内容/ }).click();
  await expect(page.getByRole("dialog", { name: "选择要求" })).toBeVisible();
});
test("纯控件创建选项与排序保存，无需编写JSON", async ({ page }) => {
  page.on("dialog", (d) => void d.accept());
  await login(page, "operator");
  await page.goto("/content/form-templates/new");
  await page.getByRole("checkbox", { name: "启用模板" }).uncheck();
  await page.getByLabel("模板名称", { exact: true }).fill(`可视化创建-${Date.now()}`);
  await page.getByRole("button", { name: "添加区块", exact: true }).click();
  await page.getByRole("button", { name: "添加字段", exact: true }).click();
  await page.locator(".designer-tree").getByRole("button", { name: "新字段", exact: true }).click();
  await page.getByLabel("显示名称", { exact: true }).fill("工作类型");
  await page.getByRole("button", { name: "添加选项", exact: true }).click();
  await page.getByLabel("选项1提交值", { exact: true }).fill("a");
  await page.getByLabel("选项1名称", { exact: true }).fill("选项A");
  await page.getByRole("button", { name: "添加选项", exact: true }).click();
  await page.getByLabel("选项2提交值", { exact: true }).fill("b");
  await page.getByLabel("选项2名称", { exact: true }).fill("选项B");
  await page
    .locator(".designer-properties")
    .getByRole("button", { name: "选项2上移", exact: true })
    .click();
  await expect(page.getByLabel("选项1提交值", { exact: true })).toHaveValue("b");
  await page.getByRole("button", { name: "保存模板", exact: true }).click();
  await expect(page).toHaveURL(/\/content\/form-templates\/\d+$/);
  await page.getByRole("button", { name: "JSON模式", exact: true }).click();
  const saved = JSON.parse(await page.getByLabel("模板JSON（只读）").inputValue());
  expect(saved[0].fields[0].options.map((o: { value: string }) => o.value)).toEqual(["b", "a"]);
});
test("客服也仅能查看模板入口和只读设计器", async ({ page }) => {
  await login(page, "customer_service");
  await expect(
    page.locator("nav").getByRole("link", { name: "动态表单", exact: true }),
  ).toBeVisible();
  await page.goto(`/content/form-templates/${templateID}`);
  await expect(page.getByLabel("模板名称", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "保存模板", exact: true })).toHaveCount(0);
});
