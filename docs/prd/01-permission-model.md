# 管理后台权限模型与鉴权方案

> 状态：已按开发前审阅裁决修订（v2）
> 创建日期：2026-10-04
> 权威来源：后端 `internal/router/admin.go` 的 `adminRoutes` 角色映射 + `internal/middleware/middleware.go` 的 `Admin()` 中间件；对接合同以 [api-integration.md](./api-integration.md) 为准

---

## 1. 角色定义

后台共 4 种管理员角色，存储于 `users.admin_role`（`is_admin=true` 时有效）：

| 角色值 | 名称 | 定位 |
|--------|------|------|
| `super_admin` | 超级管理员 | 全部权限，含系统级敏感操作 |
| `operator` | 运营 | 内容运营 + 资质审核 |
| `finance` | 财务 | 退款审核 + 财务数据 |
| `customer_service` | 客服 | 订单监管 + 用户治理 + 客服接待 |

**后端校验逻辑**（`middleware.Admin`）：
- `super_admin` 直接放行，不做角色匹配
- 其他角色必须出现在路由声明的 `roles` 数组中
- `roles` 为空数组 `[]` → 仅 `super_admin` 可访问

**未知 `adminRole` 默认拒绝**：前端拿到的角色值不在上表四种已知角色内时，一律视为无权限——不渲染任何菜单与操作按钮，路由守卫直接跳 403。

---

## 2. 完整权限矩阵

下表基于后端 `adminRoutes` 逐条提取。✅ 表示该角色可访问，❌ 表示不可访问，🔒 表示仅 super_admin。

### 2.1 分类管理

| 操作 | super_admin | operator | finance | customer_service |
|------|:-----------:|:--------:|:-------:|:----------------:|
| 查看分类树 | ✅ | ✅ | ✅ | ✅ |
| 创建分类 | ✅ | ✅ | ❌ | ❌ |
| 更新分类 | ✅ | ✅ | ❌ | ❌ |
| 删除分类 | ✅ | ✅ | ❌ | ❌ |
| 查看热门分类 | ✅ | ✅ | ✅ | ✅ |
| 添加热门分类 | ✅ | ✅ | ❌ | ❌ |
| 移除热门分类 | ✅ | ✅ | ❌ | ❌ |

### 2.2 动态表单模板

| 操作 | super_admin | operator | finance | customer_service |
|------|:-----------:|:--------:|:-------:|:----------------:|
| 模板列表 | ✅ | ✅ | ✅ | ✅ |
| 新建模板 | ✅ | ✅ | ❌ | ❌ |
| 模板详情 | ✅ | ✅ | ✅ | ✅ |
| 编辑模板 | ✅ | ✅ | ❌ | ❌ |
| 删除模板 | ✅ | ✅ | ❌ | ❌ |
| 克隆模板 | ✅ | ✅ | ❌ | ❌ |

### 2.3 服务与需求

| 操作 | super_admin | operator | finance | customer_service |
|------|:-----------:|:--------:|:-------:|:----------------:|
| Service 列表 | ✅ | ✅ | ✅ | ✅ |
| Service 详情 | ✅ | ✅ | ✅ | ✅ |
| Service 上下架 | ✅ | ✅ | ❌ | ❌ |
| Service 删除 | ✅ | ✅ | ❌ | ❌ |
| Requirement 列表 | ✅ | ✅ | ✅ | ✅ |
| Requirement 详情 | ✅ | ✅ | ✅ | ✅ |
| Requirement 上下架 | ✅ | ✅ | ❌ | ❌ |
| Requirement 删除 | ✅ | ✅ | ❌ | ❌ |

### 2.4 订单

| 操作 | super_admin | operator | finance | customer_service |
|------|:-----------:|:--------:|:-------:|:----------------:|
| 订单列表 | ✅ | ✅ | ✅ | ✅ |
| 订单详情 | ✅ | ✅ | ✅ | ✅ |
| 取消未支付订单（0→6） | ✅ | ❌ | ❌ | ✅ |
| 验收完成（4→5） | ✅ | ❌ | ❌ | ✅ |

> 订单状态调整**只有两个固定动作**（`PUT /api/v1/admin/orders/:id/status`，Body `{ status, reason }`）：取消未支付订单 0→6、验收完成 4→5，均必填 reason。其余流转后端拒绝，前端**不提供通用状态下拉**（裁决 R12）。

### 2.5 退款

| 操作 | super_admin | operator | finance | customer_service |
|------|:-----------:|:--------:|:-------:|:----------------:|
| 退款单列表 | ✅ | ❌ | ✅ | ✅ |
| 退款详情 | ✅ | ❌ | ✅ | ✅ |
| 审核通过退款 | ✅ | ❌ | ✅ | ❌ |
| 审核拒绝退款 | ✅ | ❌ | ✅ | ❌ |

> 退款裁定（仅退款状态 0/3 可裁定）：通过 Body `{ reason, finalAmount? }`，**reason 必填**，`finalAmount ≤ 申请额`；拒绝 Body `{ reason }`，同样必填（裁决 R04/R12）。

### 2.6 用户管理

| 操作 | super_admin | operator | finance | customer_service |
|------|:-----------:|:--------:|:-------:|:----------------:|
| 用户列表 | ✅ | ✅ | ✅ | ✅ |
| 用户详情 | ✅ | ✅ | ✅ | ✅ |
| 封禁/解封用户 | ✅ | ❌ | ❌ | ✅ |
| 手动调整信用分 | ✅ | ❌ | ❌ | ❌ |
| 查看用户资质 | ✅ | ✅ | ✅ | ✅ |
| 审核通过资质 | ✅ | ✅ | ❌ | ❌ |
| 审核拒绝资质 | ✅ | ✅ | ❌ | ❌ |

> 封禁/解封 Body 为 `{ banned: true/false, reason }`（banned 布尔，**不是** `{status:"banned"}` 字符串），见 api-integration.md §3（裁决 R04）。
> 资质 status 为**数字 0/1/2**（0=待审核、1=已通过、2=已拒绝，前端映射显示）；全局资质队列 `GET /api/v1/admin/qualifications` 待后端任务单 #5，未就绪前该页延后。

### 2.7 内容管理（Banner / 服务标签）

| 操作 | super_admin | operator | finance | customer_service |
|------|:-----------:|:--------:|:-------:|:----------------:|
| Banner 列表 | ✅ | ✅ | ✅ | ✅ |
| 创建 Banner | ✅ | ✅ | ❌ | ❌ |
| 更新 Banner | ✅ | ✅ | ❌ | ❌ |
| 删除 Banner | ✅ | ✅ | ❌ | ❌ |
| 服务标签列表 | ✅ | ✅ | ✅ | ✅ |
| 新增服务标签 | ✅ | ✅ | ❌ | ❌ |
| 更新服务标签 | ✅ | ✅ | ❌ | ❌ |
| 删除服务标签 | ✅ | ✅ | ❌ | ❌ |

### 2.8 客服管理

| 操作 | super_admin | operator | finance | customer_service |
|------|:-----------:|:--------:|:-------:|:----------------:|
| 新增/编辑客服账号配置 | 🔒 | ❌ | ❌ | ❌ |
| 客服在线/离线切换 | ✅ | ❌ | ❌ | ✅ |
| 我的接待会话 | ✅ | ❌ | ❌ | ✅ |
| 会话流转 | ✅ | ❌ | ❌ | ✅ |
| 历史消息查看 | ✅ | ❌ | ❌ | ✅ |

> 授权模型（裁决 R09）：客服**仅能访问自己接待中的会话**，无全用户会话豁免；历史消息 `GET /api/v1/conversations/:id/messages` 需会话参与方授权。
> 会话转接 Body 为 `{ toAgentId }`，值是 **cs_agents.id（不是 users.id）**；客服列表 / 转接目标查询待后端任务单 #6a。
> `POST /api/v1/admin/cs/agents` 仅写 cs_agents 配置（不设置用户 isAdmin，不是提权接口）；IM 发送链路为任务单 #6b，独立排期，首期不包含。

### 2.9 系统级（仅 super_admin）

| 操作 | super_admin | operator | finance | customer_service |
|------|:-----------:|:--------:|:-------:|:----------------:|
| 信用分规则查看 | 🔒 | ❌ | ❌ | ❌ |
| 信用分规则更新 | 🔒 | ❌ | ❌ | ❌ |
| 系统配置查看 | 🔒 | ❌ | ❌ | ❌ |
| 系统配置更新 | 🔒 | ❌ | ❌ | ❌ |
| 服务费配置查看/更新 | 🔒 | ❌ | ❌ | ❌ |
| 操作日志查看 | 🔒 | ❌ | ❌ | ❌ |

> 服务费配置（`GET/PUT /api/v1/admin/fee-config`，snake_case 例外）仅 super_admin，已纳入首期（裁决 R14/R17）。

### 2.10 数据看板

| 操作 | super_admin | operator | finance | customer_service |
|------|:-----------:|:--------:|:-------:|:----------------:|
| 总览数据 | ✅ | ✅ | ✅ | ✅ |
| 订单统计 | ✅ | ✅ | ✅ | ✅ |
| 用户统计 | ✅ | ✅ | ✅ | ✅ |
| 财务统计 | ✅ | ❌ | ✅ | ❌ |

---

## 3. 前端权限实现方案

### 3.1 权限判定数据来源

角色来源 = **登录响应**（`user.isAdmin` / `user.adminRole`）+ **`GET /api/v1/auth/me`**（后端补充 `isAdmin` / `adminRole` 字段，任务单 #1；未就绪前以登录响应兜底）。

- 登录成功后前端先用登录响应中的角色初始化路由与菜单
- 页面生命周期内调用 `GET /api/v1/auth/me` 校准角色；**二者不一致时以 auth/me 为准**，重算路由与菜单，并清空旧角色相关的 Query 缓存（防止旧权限数据回填）
- 前端在 `lib/permission.ts` 中基于 `adminRole` 做纯函数判定（见 §6 单一权限来源表）；未知 `adminRole` 默认拒绝

### 3.2 权限工具函数

```ts
// lib/permission.ts
export type AdminRole = 'super_admin' | 'operator' | 'finance' | 'customer_service'

/** 判断当前角色是否具备指定权限（任一匹配即通过） */
export const hasPermission = (role: AdminRole | undefined, allowed: AdminRole[]): boolean => {
  if (!role) return false
  if (role === 'super_admin') return true
  return allowed.includes(role)
}
```

### 3.3 菜单级控制

路由表中每个菜单项声明 `allowedRoles`，`router/guards.tsx` 校验当前角色，无权限则：
- 侧边栏不渲染该菜单项
- 直接访问 URL 跳转到 403 页

### 3.4 按钮级控制

封装 `<PermissionGate allowed={[...]}>` 组件，包裹操作按钮，无权限时不渲染。
适用于「创建」「删除」「审核」「调整信用分」等敏感操作。

### 3.5 页面级控制

数据看板中的「财务统计」卡片仅 finance / super_admin 可见，其余角色看到「无权限查看」占位。

---

## 4. 鉴权流程

### 4.1 登录

```
用户输入 account + password
    │
    ▼
POST /api/v1/auth/login  { account, password }
    │
    ├─ 失败（HTTP 401 / code 20012）→ 统一提示「账号或密码错误」
    │   （不区分账号不存在 / 密码错误 / 未设置密码）
    ├─ 封禁（HTTP 403 / code 20009）→ 提示「账号已被封禁」
    │
    ▼ 成功
返回 { accessToken, refreshToken, user: { isAdmin, adminRole, ... } }
    │
    ▼
若 isAdmin === false → 提示「该账号无后台权限」并丢弃令牌
若 isAdmin === true  → 双令牌写入内存会话，跳转首页
```

> 登录失败统一 code 20012，表单只提示「账号或密码错误」，**不设「未设置密码」独立分支**（裁决 R03）。登录请求本身 skipRefresh，401 不触发刷新。
> 四角色账号准备走受控运维步骤（本地 seed + 初始化命令指定 `admin_role`，任务单 #6a）；`admin/Admin.123` 仅为本地开发 seed，不作为部署默认账号。

### 4.2 Token 刷新

- **纯内存策略（冻结）**：双令牌只存内存，**整页刷新 / 新标签页 = 重新登录**；bootstrap 仅处理本次页面生命周期内的已有会话，不做跨刷新恢复
- **仅受保护请求**的 401 触发一次刷新（同飞去重）；登录、refresh 请求本身的 401 **不触发**刷新（skipRefresh），避免刷新循环
- 刷新成功后**同时替换 accessToken 与 refreshToken**，并用新 token 重放原请求
- 刷新失败（refreshToken 失效/被撤销）→ 清空会话跳登录页
- 实现以 [api-integration.md](./api-integration.md) §1 为准；技术指导 §7.1 的 Cookie 空体刷新方案不适用本项目

### 4.3 登出与换用户

- 调用 `POST /api/v1/auth/logout`，后端**撤销整个会话**（accessToken 与 refreshToken 均失效，不是仅将 refreshToken 加黑名单）
- 前端清空内存会话与 **Query 缓存**，取消在途请求（AbortController），防止旧用户数据回填
- 跳转登录页；换用户登录同样走完整清缓存流程

---

## 5. 安全红线

1. **前端权限控制只做体验，不做安全**——所有敏感操作后端都会二次校验角色
2. **双令牌纯内存存储**（不落 localStorage / sessionStorage / Cookie），整页刷新 / 新标签页重新登录；不依赖 HttpOnly Cookie 恢复会话（该方案如需引入须另行批准后端任务，非首期能力）
3. **操作日志全覆盖**：后端对所有 admin 写操作记录 `admin_audit_logs`；日志结构为 adminId / targetType / targetId / userAgent / createdAt + detail `{before, after}`，前端按真实结构展示，未知值原样回退（标准化见任务单 #9）
4. **信用分调整、系统配置、规则修改**等敏感操作必须二次确认（`ConfirmDialog`）；reason 字段按各接口实际合同执行（如封禁 `{banned, reason}`、退款 `{reason}` 均必填；系统配置 PUT 仅 `{value}`，前端不虚构审计字段）

---

## 6. 单一权限来源表

本表是管理后台**导航菜单与按钮权限的唯一派生来源**（裁决 R17）。路由表、菜单树（[02-information-architecture.md](./02-information-architecture.md)）、权限矩阵（本文 §2）与本表**不得互相矛盾**；新增页面必须先改本表。

> 「全部」= super_admin / operator / finance / customer_service；写入角色不含 super_admin 时，super_admin 仍默认拥有（后端直通）。

| 页面/路由 | 读取角色 | 写入角色 | 可执行动作 |
|-----------|---------|---------|-----------|
| `/dashboard/overview` | 全部 | — | 查看现有统计（口径如实标注） |
| `/dashboard/orders` | 全部 | — | 查看按状态分组统计 |
| `/dashboard/users` | 全部 | — | 查看按注册日期分组统计 |
| `/dashboard/finance` | finance / super_admin | — | 查看财务汇总 |
| `/users` | 全部 | customer_service / super_admin（封禁）；super_admin（信用分） | 昵称关键词搜索；封禁/解封 `{banned, reason}`；调整信用分 `{delta, reason}` |
| `/users/:id` | 全部 | 同上 | 查看详情（首期仅基本信息 + 资质 Tab） |
| `/users/qualifications` | operator / super_admin | operator / super_admin | 资质队列审核（status 0/1/2；⏳ 任务单 #5） |
| `/content/categories` | operator / super_admin | operator / super_admin | 三级分类增删改；分页平铺拉全后构树 |
| `/content/featured-categories` | operator / super_admin | operator / super_admin | 聚合入口创建/删除（PUT ⏳ 任务单 #7） |
| `/content/form-templates` | operator / super_admin | operator / super_admin | blocks DSL JSON 编辑 + 校验 + 预览 |
| `/content/banners` | operator / super_admin | operator / super_admin | Banner 增删改（图片上传 ⏳ 任务单 #8） |
| `/content/service-badges` | operator / super_admin | operator / super_admin | 标签增删改 `{name, sortOrder, isActive?}` |
| `/orders` | 全部 | customer_service / super_admin | status 筛选；取消未支付订单 0→6、验收完成 4→5（均必填 reason） |
| `/orders/:id` | 全部 | 同上 | 查看详情（首期仅基本信息） |
| `/refunds` | finance / customer_service / super_admin | finance / super_admin | status 筛选；退款裁定（通过 `{reason, finalAmount?}` / 拒绝 `{reason}`，均必填） |
| `/services` | 全部（与后端合同一致） | operator / super_admin | status + category_id 筛选；上下架；删除（已发布=下架） |
| `/requirements` | 全部（与后端合同一致） | operator / super_admin | status + category_id 筛选；关闭需求（无恢复按钮） |
| `/cs/agents` | super_admin | super_admin | 客服配置绑定（列表/目标查询 ⏳ 任务单 #6a；不做页面开户） |
| `/cs/sessions` | customer_service / super_admin | customer_service / super_admin | 接待列表；在线切换 `{isOnline}`；转接 `{toAgentId}`（cs_agents.id）；历史消息查看 |
| `/system/configs` | super_admin | super_admin | 配置更新 `{value: "字符串"}` |
| `/system/credit-rules` | super_admin | super_admin | 规则更新 `{delta, isActive}`（编辑 → 二次确认 → 保存） |
| `/system/fee-config` | super_admin | super_admin | 服务费配置（雇主承担百分比直展，`split_ratio = 雇主百分比 / 100`，snake_case 例外） |
| `/system/audit-logs` | super_admin | — | 日志查看（真实结构，未知值回退；标准化 ⏳ 任务单 #9） |

> 派生规则：导航菜单可见性 ← 读取角色；操作按钮渲染（`<PermissionGate>`）← 写入角色与可执行动作；`roles` 声明与本表不一致时以本表为准并回改文档。
