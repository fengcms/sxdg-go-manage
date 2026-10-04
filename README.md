# 四系点工 · 管理后台

React 19 + TypeScript + Vite + Tailwind CSS v4。中文界面，对接同级 `sxdg-be` 的真实 HTTP 服务。首期及已就绪的 A/B 增强功能均已实现；IM 发送、新版看板和生产部署不在本次范围。

## 本地启动

1. 后端目录执行 `./start.sh start`，确认 `http://127.0.0.1:8080/healthz` 正常。后端版本需包含 `a2085e1` 的 A/B 能力及密码登录、服务费配置前置提交。
2. 本仓库使用 Node **22.14.0**、pnpm **9.4.0**（`.nvmrc` / `packageManager` 已固定）。
3. 执行 `pnpm install --frozen-lockfile`，然后 `pnpm dev`。
4. 打开 **http://127.0.0.1:5173**，使用后端已有管理员账号登录。

也可执行 `./start.sh` 安装依赖并启动前端。脚本只启动前端，不关闭或替换已占用端口的服务。后端端口可通过 `SERVER_PORT=8081 pnpm dev` 覆盖；开发代理同时转发 `/api/v1` 和 `/uploads`。

账号初始化在后端使用 `ADMIN_USERNAME`、`ADMIN_PASSWORD`、`ADMIN_ROLE` 环境变量执行 `go run ./cmd/init-admin`；角色为 super_admin/operator/finance/customer_service。不把密码写进 Git；客服账号还需由超管在“客服配置”中绑定接待身份。

双令牌只保存在内存，**刷新页面或新标签页需要重新登录**。不是登录状态丢失缺陷。查询条件写入 URL，登录后回到原路由。

## 验证

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
# 或 pnpm check
```

浏览器验收（需要已启动的本地 mock 后端和前端、Docker）：

```bash
# 后端首次准备初始化工具
(cd ../sxdg-be && go build -o bin/init-admin ./cmd/init-admin)
python3 scripts/prepare-e2e.py
node scripts/prepare-business-fixtures.mjs
pnpm exec playwright install chromium
pnpm exec playwright test
```

凭据只保存在 `.e2e-accounts.json`（0600，Git忽略），业务ID在 `.e2e-fixtures.json`（Git忽略）。脚本新增唯一前缀账号、分类、订单、资质、会话等本地记录，不修改既有业务；写入验收会改变这些记录并保留审计。**重复跑业务写入用例前重新生成业务夹具**；客服账号已有绑定时需重新运行 prepare-e2e.py 创建新一组账号。凭据与报告不提交。仅用于本地测试数据库，外部支付/短信/IM是mock，不代表供应商联调完成。

## 页面与权限

- 四角色导航、路由与按钮权限；接口仍由后端最终授权。
- 四类看板；用户治理、资质审核和鉴权证件；内容运营与模板 JSON 校验预览。
- 订单固定状态动作、退款裁定、服务/需求管理；详情聚合与真实结算展示。
- 客服绑定、上线/离线、会话转接、已入库历史消息。**无发送输入框，无完整腾讯 IM 历史承诺**。
- 系统参数、信用规则、服务费分摊与审计；高级筛选和用户子资源分页。

生产反向代理、HTTPS、SPA回退与真实外部服务部署另行安排。首期构建产物不是生产上线验收证明。

## 资料

- `docs/prd/development-execution-plan.md`：执行计划与范围。
- `docs/prd/api-current.md`：后端最新交付与旧 PRD 的差异。
- `docs/dev-log/2026-10-04.md`：开发流水账。
- `docs/dev-log/acceptance.md`：验证结果与边界。
