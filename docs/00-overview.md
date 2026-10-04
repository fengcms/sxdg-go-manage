# 四系点工 · 管理后台总体规划

> 状态：规划初稿
> 创建日期：2026-10-04
> 关联：后端 [api-spec.md](../../sxdg-be/docs/api-spec.md) / [enums.md](../../sxdg-be/docs/enums.md) / [schema.md](../../sxdg-be/docs/schema.md)

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

基于后端已冻结的 52 个 `/api/v1/admin/*` 接口，后台划分为 8 个功能域：

| # | 功能域 | 核心能力 | 对应后端接口数 |
|---|--------|---------|--------------|
| 1 | 数据看板 | GMV / 订单 / 用户 / 财务 四类聚合统计 | 4 |
| 2 | 用户管理 | 用户列表、详情、封禁/解封、信用分调整、资质审核 | 7 |
| 3 | 内容管理 | 分类树、热门分类、动态表单模板、Banner、服务标签 | 21 |
| 4 | 服务与需求 | Service / Requirement 列表、详情、上下架、删除 | 8 |
| 5 | 订单与退款 | 订单全量查询、状态手动调整、退款审核 | 7 |
| 6 | 客服管理 | 客服账号、在线状态、接待会话、会话流转 | 4 |
| 7 | 系统配置 | 系统参数、服务费配置、信用分规则 | 4+ |
| 8 | 操作日志 | 管理员操作审计 | 1 |

> 各模块详细设计见 `modules/` 目录。

---

## 4. 技术栈

严格遵循 [管理后台前端技术栈与UI风格指导.md](./管理后台前端技术栈与UI风格指导.md) 中的约定：

| 层 | 选型 |
|----|------|
| 框架 | React 19 + Vite + TypeScript (strict) |
| 样式 | Tailwind CSS v4（CSS-first，`@theme inline`） |
| UI 原语 | 自建 shadcn/ui 风格组件 + Radix（按需） |
| 数据请求 | @tanstack/react-query v5 |
| 表单 | react-hook-form + zod |
| 客户端状态 | zustand（仅会话/UI 偏好） |
| 路由 | react-router-dom v7 |
| 图表 | recharts |
| 格式化/Lint | Biome（不使用 ESLint/Prettier） |
| 包管理 | pnpm |

---

## 5. 与后端的对接约定

### 5.1 鉴权

- 后台管理员账号即 `users` 表中 `is_admin=true` 的用户，通过 `account` + `password` 登录
- 登录方式：**用户名密码登录**（`POST /api/v1/auth/login`，account 支持用户名或手机号）
- 该接口为通用能力，普通用户也可使用，小程序前端暂不开放入口
- 初始超级管理员账号由后端种子数据预置：用户名 `admin`，密码 `Admin.123`
- 登录成功后返回 `accessToken` + `refreshToken`，前端存储于内存（不落 localStorage）
- 请求头：`Authorization: Bearer <accessToken>`
- Token 过期：前端拦截 401，用 refreshToken 同飞去重刷新（详见技术栈文档 §7.1）

### 5.2 响应格式

统一信封：

```json
{ "code": 0, "message": "success", "data": {} }
```

- `code === 0` 成功，业务代码直接拿到 `data`
- 非 0 为业务错误，由 `lib/errorCodes.ts` 映射中文文案
- 分页：`data = { items, total, page, pageSize }`

### 5.3 接口前缀

全部后台接口前缀 `/api/v1/admin/`，开发期通过 Vite 代理转发到后端 `http://localhost:11000`。

### 5.4 权限

后端在路由层做角色校验（`middleware.Admin(roles...)`），前端据此做菜单与按钮级隐藏。
**前端隐藏是体验，后端校验才是安全底线**——即使前端显示了按钮，无权限调用也会返回 403。

---

## 6. 文档结构

```
docs/
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
├── api-integration.md              # 前后端接口对接清单
└── development-plan.md             # 开发计划与排期
```

---

## 7. 待确认事项

以下事项在动手开发前需要产品 owner 确认：

1. ✅ **管理员账号创建方式**：已确定——使用种子数据预置超级管理员，用户名 `admin`，密码 `Admin.123`。后端需新增 `username`/`password_hash` 字段与 `admin-login` 接口（任务已指派）。
2. ✅ **服务费配置**：已确定纳入首期，后端需新增 `fee-config` 接口（任务已指派）。
3. **客服账号管理**：`POST /api/v1/admin/cs/agents` 后端标注仅 super_admin，是否需要在后台提供客服账号的增删改界面？
4. **任务/勋章/活动消息**：后端已注册路由但 api-spec 未详细列出，首期管理后台暂不做，二期再纳入。
5. **首页频道配置**：`home_channels` 表存在但无 admin 接口，二期补充。
