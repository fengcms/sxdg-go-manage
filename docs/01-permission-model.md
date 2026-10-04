# 管理后台权限模型与鉴权方案

> 状态：规划初稿
> 创建日期：2026-10-04
> 权威来源：后端 `internal/router/admin.go` 的 `adminRoutes` 角色映射 + `internal/middleware/middleware.go` 的 `Admin()` 中间件

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
| 手动修改订单状态 | ✅ | ❌ | ❌ | ✅ |

### 2.5 退款

| 操作 | super_admin | operator | finance | customer_service |
|------|:-----------:|:--------:|:-------:|:----------------:|
| 退款单列表 | ✅ | ❌ | ✅ | ✅ |
| 退款详情 | ✅ | ❌ | ✅ | ✅ |
| 审核通过退款 | ✅ | ❌ | ✅ | ❌ |
| 审核拒绝退款 | ✅ | ❌ | ✅ | ❌ |

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
| 新增/编辑客服账号 | 🔒 | ❌ | ❌ | ❌ |
| 客服在线/离线切换 | ✅ | ❌ | ❌ | ✅ |
| 我的接待会话 | ✅ | ❌ | ❌ | ✅ |
| 会话流转 | ✅ | ❌ | ❌ | ✅ |

### 2.9 系统级（仅 super_admin）

| 操作 | super_admin | operator | finance | customer_service |
|------|:-----------:|:--------:|:-------:|:----------------:|
| 信用分规则查看 | 🔒 | ❌ | ❌ | ❌ |
| 信用分规则更新 | 🔒 | ❌ | ❌ | ❌ |
| 系统配置查看 | 🔒 | ❌ | ❌ | ❌ |
| 系统配置更新 | 🔒 | ❌ | ❌ | ❌ |
| 操作日志查看 | 🔒 | ❌ | ❌ | ❌ |

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

登录成功后，`GET /api/v1/auth/me` 返回的用户信息中包含 `isAdmin` 与 `adminRole`。
前端在 `lib/permission.ts` 中基于 `adminRole` 做纯函数判定，**不依赖后端逐接口返回权限列表**。

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
用户输入账号 + 密码
    │
    ▼
POST /api/v1/auth/login  { account, password }
    │
    ├─ 账号或密码错误 → 提示「账号或密码错误」
    ├─ 该账号未设置密码 → 提示「该账号未设置密码」
    │
    ▼ 成功
返回 { accessToken, refreshToken, user: { isAdmin, adminRole, ... } }
    │
    ▼
若 isAdmin === false → 提示「该账号无后台权限」并清除本地会话
若 isAdmin === true  → 写入会话，跳转首页
```

> `account` 字段支持用户名或手机号。初始超级管理员：用户名 `admin`，密码 `Admin.123`。
> 该接口为通用登录能力，普通用户也可使用，小程序前端暂不开放入口。

### 4.2 Token 刷新

- `accessToken` 有效期 2 小时，`refreshToken` 30 天
- 请求 401 时，前端拦截并同飞去重调用 `POST /api/v1/auth/refresh`
- 刷新成功后用新 token 重放原请求；刷新失败则跳登录页
- 实现细节见技术栈文档 §7.1

### 4.3 登出

- 调用 `POST /api/v1/auth/logout`，后端将 refreshToken 加入 Redis 黑名单
- 前端清除内存会话，跳转登录页

---

## 5. 安全红线

1. **前端权限控制只做体验，不做安全**——所有敏感操作后端都会二次校验角色
2. **accessToken 不落 localStorage**，仅存内存；刷新依赖内存 refreshToken 或 HttpOnly Cookie
3. **操作日志全覆盖**：后端对所有 admin 写操作记录 `admin_audit_logs`，前端无需额外处理
4. **信用分调整、系统配置、规则修改**等敏感操作必须二次确认（`ConfirmDialog`），且需填写变更原因（后端 detail 字段记录 before/after）
