# 四系点工 · 管理后台总体规划

> 开发状态更新（2026-10-04）：后端 A/B 已交付。下文“待补”及旧能力描述保留为产品裁决上下文，实施时先读 [当前对接补充](api-current.md)，以其中逐项更新为准；首期范围与二期边界不自动扩大。

> 状态：已按开发前审阅裁决修订（v2）
> 创建日期：2026-10-04
> 关联：对接唯一权威 [api-integration.md](./api-integration.md)；裁决记录 [review/02-pre-development-decisions.md](./review/02-pre-development-decisions.md)；后端 [api-spec.md](../../../sxdg-be/docs/api-spec.md) / [enums.md](../../../sxdg-be/docs/enums.md) / [schema.md](../../../sxdg-be/docs/schema.md)

---

## 1. 产品定位

「四系点工管理后台」是平台运营方的工作台，承担三大职责：

1. **内容运营**：维护分类体系、服务标签、Banner、动态表单模板等前台展示内容
2. **交易监管**：监控订单全生命周期、处理退款仲裁、管理客服接待
3. **平台治理**：用户封禁/解封、信用分调整、资质审核、系统参数配置

后台不直接产生交易，而是通过「配置 + 审核 + 仲裁」影响前台体验与交易安全。

---

## 2. 用户角色

后台用户即 `users` 表中 `is_admin = true` 的账号，通过 `admin_role` 区分四类角色：

| 角色 | 标识 | 核心职责 |
|------|------|---------|
| 超级管理员 | `super_admin` | 全部权限，含系统配置、信用分规则、操作日志、客服账号管理 |
| 运营 | `operator` | 内容管理（分类 / 表单模板 / Banner / 标签 / 上下架）、资质审核 |
| 财务 | `finance` | 退款审核、财务看板、结算相关数据查看 |
| 客服 | `customer_service` | 订单查询与状态调整、用户封禁/解封、客服接待、退款查看 |

> 权限模型细节见 [01-permission-model.md](./01-permission-model.md)。

---

## 3. 功能模块总览

后端 OpenAPI 实际注册 **72 条 admin 接口**（含任务/勋章/活动消息等扩展，不纳入首期）。管理后台首期只使用其中的**冻结子集**（逐接口清单见 [api-integration.md](./api-integration.md) §15），划分为 8 个功能域：

| # | 功能域 | 核心能力 | 首期状态 |
|---|--------|---------|---------|
| 1 | 数据看板 | 用户 / 订单 / GMV / 财务 四类现有聚合统计（无趋势图、无日期筛选） | 已实现（现有口径） |
| 2 | 用户管理 | 用户列表（昵称搜索）、详情、封禁/解封、信用分调整、资质审核 | 已实现；全局资质队列 ⏳ 任务单 #5 |
| 3 | 内容管理 | 三级分类、热门分类（聚合入口）、动态表单模板（blocks DSL）、Banner、服务标签 | 已实现；热门 PUT ⏳ #7、Banner 上传 ⏳ #8 |
| 4 | 服务与需求 | Service / Requirement 列表、详情、上下架、删除 | 已实现 |
| 5 | 订单与退款 | 订单查询（status 筛选）、固定状态动作、退款裁定 | 已实现 |
| 6 | 客服管理 | 接待列表、会话流转、历史消息查看 | 部分待补；客服列表/目标查询 ⏳ #6a、IM 发送链路 ⏳ #6b |
| 7 | 系统配置 | 系统参数、服务费配置、信用分规则 | 已实现（fee-config 见提交 7afb63c） |
| 8 | 操作日志 | 管理员操作审计 | 已实现；日志标准化 ⏳ #9 |

> ⏳ 为后端补充任务单 [admin-backend-supplement-tasks.md](../../../sxdg-be/docs/review/admin-backend-supplement-tasks.md) 待补项，对应页面依赖就绪后开发。各模块详细设计见 `modules/` 目录。

---

## 4. 技术栈

技术选型参考 [管理后台前端技术栈与UI风格指导.md](../管理后台前端技术栈与UI风格指导.md)：

| 层 | 选型 |
|----|------|
| 框架 | React 19 + Vite + TypeScript (strict) |
| 样式 | Tailwind CSS v4（CSS-first，`@theme inline`） |
| UI 原语 | 自建 shadcn/ui 风格组件 + Radix（按需） |
| 数据请求 | @tanstack/react-query v5 |
| 表单 | react-hook-form + zod |
| 客户端状态 | zustand（仅会话/UI 偏好） |
| 路由 | react-router-dom v7 |
| 图表 | recharts（首期看板无趋势图，暂不使用，二期启用） |
| 格式化/Lint | Biome（不使用 ESLint/Prettier） |
| 包管理 | pnpm |

> **降级声明（裁决 R18）**：上述技术指导文档在本项目中**降级为参考文档**，不再是硬性约定。其中与本项目后端合同冲突的内容——分页形状 `list/pagination`、Cookie 空体刷新、`/files` 路径、11000 端口、信封扩展字段（requestId/timestamp 必填假设）——一律以 [api-integration.md](./api-integration.md) 为准。

---

## 5. 与后端的对接约定

### 5.1 鉴权与会话

- 后台管理员账号即 `users` 表中 `is_admin=true` 的用户，登录方式：`POST /api/v1/auth/login`（`account` + `password`）
- 该接口为通用能力，普通用户也可使用，小程序前端暂不开放入口
- 四角色账号准备走**受控运维步骤**（本地 seed + 一次性初始化命令，支持指定 `admin_role`，后端任务单 #6a）；`admin/Admin.123` 仅为本地开发 seed，不作为部署默认账号，首期不做页面开户
- 登录成功后返回 `accessToken` + `refreshToken`，**双令牌纯内存存储**（不落 localStorage / sessionStorage / Cookie）
- **整页刷新 / 新标签页 = 重新登录**；bootstrap 仅处理本次页面生命周期内的已有会话，不做跨刷新恢复
- 请求头：`Authorization: Bearer <accessToken>`
- Token 过期：**仅受保护请求**的 401 触发一次刷新（同飞去重），登录 / refresh 请求本身 skipRefresh，失败不触发刷新循环
- `POST /api/v1/auth/logout` **撤销整个会话**（accessToken 与 refreshToken 均失效）；退出/换用户时前端清 Query 缓存、取消在途请求，防止旧用户数据回填
- 完整鉴权流程见 [01-permission-model.md](./01-permission-model.md) §4，会话策略以 [api-integration.md](./api-integration.md) §1 为准（技术指导 §7.1 的 Cookie 刷新方案不适用本项目）

### 5.2 响应格式

统一信封：

```json
{ "code": 0, "message": "success", "data": {} }
```

- `code === 0` 成功，业务代码直接拿到 `data`
- **业务码与 HTTP 状态是两个维度**：`ApiError.status` 是 HTTP 状态码，`ApiError.code` 是业务码
- 非 0 为业务错误，由 `lib/errorCodes.ts` 映射中文文案
- 分页：请求参数 `page` / `page_size`；响应固定 `data = { items, total, page, pageSize }`

### 5.3 接口前缀与开发代理

全部后台接口前缀 `/api/v1/admin/`。开发期 Vite 同源代理转发到后端（默认 8080，`SERVER_PORT` 可覆盖）：

```
/api/v1   → http://localhost:8080/api/v1
/uploads  → http://localhost:8080/uploads
```

> 无 11000 端口、无 `/files` 路径。公开静态文件走 `/uploads/...`，附件一律使用服务端返回的 fileUrl。生产环境反向代理与 SPA 路由回退另行约定（二期）。

### 5.4 权限

后端在路由层做角色校验（`middleware.Admin(roles...)`），前端据此做菜单与按钮级隐藏。
**前端隐藏是体验，后端校验才是安全底线**——即使前端显示了按钮，无权限调用也会返回 403。
**未知 `adminRole` 默认拒绝**：不在四种已知角色（super_admin / operator / finance / customer_service）内的值一律视为无权限，不渲染任何菜单与操作按钮。

---

## 6. 文档结构

```
docs/prd/
├── README.md                       # 本文档索引
├── 00-overview.md                  # 总体规划（本文）
├── 01-permission-model.md          # 权限模型与鉴权方案
├── 02-information-architecture.md  # 信息架构与导航设计
├── modules/
│   ├── 01-dashboard.md             # 数据看板
│   ├── 02-user-management.md       # 用户管理与资质审核
│   ├── 03-content-management.md    # 内容管理
│   ├── 04-order-refund.md          # 订单与退款管理
│   ├── 05-customer-service.md      # 客服管理
│   ├── 06-system-config.md         # 系统配置与信用分规则
│   └── 07-audit-log.md             # 操作日志
├── review/
│   ├── 01-pre-development-review.md      # 开发前审阅（19 项问题）
│   ├── 01-api-shape-evidence.json        # 审阅证据（接口字段核验）
│   └── 02-pre-development-decisions.md   # 产品裁决与修订依据
├── api-integration.md              # 前后端接口对接合同 v2（唯一权威）
└── development-plan.md             # 开发计划与排期
```

> 技术参考《管理后台前端技术栈与UI风格指导.md》位于上级 `docs/` 目录，不计入产品规划文档体系。

---

## 7. 已裁决记录与首期范围冻结

原「待确认事项」已全部裁决，裁决详情见 [review/02-pre-development-decisions.md](./review/02-pre-development-decisions.md)。

### 7.1 已裁决记录

| # | 事项 | 裁决结果 |
|---|------|---------|
| 1 | 管理员账号创建方式 | 已裁决：**首期不做页面开户**。四角色账号准备走受控运维步骤（本地 seed + 一次性初始化命令支持指定 `admin_role`，后端任务单 #6a）；`admin/Admin.123` 仅为本地开发 seed，不作为部署默认账号。密码登录接口已实现（提交 7afb63c） |
| 2 | 服务费配置 | 已裁决：纳入首期（菜单 / 路由 / 权限矩阵 / Phase 7 全部补入）。接口已实现（提交 7afb63c）。UI 直接展示「雇主承担百分比」，提交 `split_ratio = 雇主百分比 / 100`；生效范围=影响随后读取当前配置的业务，已预付需求沿用原费率快照 |
| 3 | 客服账号管理界面 | 已裁决：首期不做页面开户。`POST /api/v1/admin/cs/agents` 仅 super_admin，用于客服配置绑定（不设置用户 isAdmin，不是提权接口）；客服列表 / 转接目标 / 当前身份查询待后端任务单 #6a |
| 4 | 任务/勋章/活动消息 | 已裁决：不纳入首期（OpenAPI 72 条 admin 接口中的扩展部分），二期再纳入 |
| 5 | 首页频道配置 | 已裁决：`home_channels` 无 admin 接口，二期补充 |

### 7.2 首期范围冻结

**做（首期）**：

- 登录：account + password，纯内存会话（整页刷新重新登录）
- 看板：现有 4 个接口真实字段展示（口径文案如实标注）
- 用户管理：昵称关键词搜索 + 封禁/解封 + 信用分调整 + 资质队列（依赖任务单 #5）
- 内容管理：三级分类 + 聚合热门分类 + blocks DSL JSON 编辑器 + Banner + 服务标签
- 交易管理：固定状态动作 + status 筛选 + 退款裁定（双向必填 reason）
- 客服：接待列表 + 会话流转 + 历史消息查看
- 系统设置：系统配置 + 信用分规则 + 服务费配置 + 操作日志

**不做（二期）**：

- 趋势图与日期/来源筛选看板（后端任务单 #2）
- Cookie 持久登录
- 用户详情的交易 / 信用 / 发布内容 Tab
- 订单详情的履约 / 时间轴 Tab
- IM 发送链路（后端任务单 #6b，独立排期）
- 表单可视化编辑器
- 热门分类排序修改（PUT，后端任务单 #7）
- 任务 / 勋章 / 活动消息管理
- 管理员页面开户

**禁止项（红线）**：

- 前端对缺失指标补 0 伪装
- 前端当前页过滤伪装全量搜索
- 遍历用户列表拼资质队列
- 默认全用户会话豁免（客服仅能访问自己接待中的会话）
- 把 mock 数据当作「接口已就绪」或「已验收」依据
