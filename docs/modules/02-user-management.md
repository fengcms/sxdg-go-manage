# 模块二：用户管理与资质审核

> 状态：规划初稿
> 创建日期：2026-10-04
> 后端接口：`/api/v1/admin/users`、`/api/v1/admin/qualifications`

---

## 1. 用户列表 `/users`

### 1.1 筛选栏

| 筛选项 | 类型 | 说明 |
|--------|------|------|
| 关键词 | 输入框 | 搜索昵称 / 手机号 / 用户 ID |
| 角色 | 下拉 | 全部 / 雇主 / 服务者 / 管理员 |
| 状态 | 下拉 | 全部 / 正常 / 已封禁 |
| 注册时间 | 日期范围 | 起止日期 |

### 1.2 表格列

| 列 | 说明 |
|----|------|
| 用户 ID | 点击跳转详情 |
| 头像 + 昵称 | 头像缩略图 + 昵称 |
| 手机号 | 脱敏显示（`183****4931`） |
| 角色 | 雇主 / 服务者徽标（可多选） |
| 信用分 | 数值，低于 300 标红 |
| 完成订单数 | 整数 |
| 注册时间 | `yyyy-MM-dd HH:mm` |
| 状态 | 正常 / 已封禁 徽标 |
| 操作 | 查看 / 封禁或解封 |

### 1.3 行操作

- **查看**：跳转 `/users/:id`
- **封禁 / 解封**：仅 customer_service / super_admin 可操作
  - 封禁：二次确认弹窗，需填写封禁原因（记录到 `admin_audit_logs.detail`）
  - 解封：二次确认即可

---

## 2. 用户详情 `/users/:id`

### 2.1 顶部摘要卡片

| 字段 | 说明 |
|------|------|
| 头像 + 昵称 | |
| 用户 ID | |
| 手机号 | 脱敏 |
| 角色 | 雇主 / 服务者 / 管理员 |
| 信用分 | 大字号显示 |
| 状态 | 正常 / 已封禁 |
| 注册时间 | |
| 最后登录时间 | |

### 2.2 Tab 分区

| Tab | 内容 |
|-----|------|
| 基本信息 | 昵称、头像、性别、生日、简介、实名状态 |
| 交易数据 | 作为雇主的订单数 / 金额；作为服务者的订单数 / 金额；完单率 |
| 信用记录 | 信用分变动时间线（`credit_score_logs`） |
| 资质认证 | 该用户提交的资质列表 + 审核状态 |
| 发布内容 | 该用户发布的 Service / Requirement 列表（可跳转详情） |

### 2.3 右上角操作

| 操作 | 权限 | 说明 |
|------|------|------|
| 封禁 / 解封 | customer_service / super_admin | 见上 |
| 调整信用分 | super_admin | 弹窗：输入调整分值（正/负）+ 原因，二次确认 |

---

## 3. 资质审核 `/users/qualifications`

> 仅 operator / super_admin 可见。

### 3.1 筛选栏

| 筛选项 | 类型 | 说明 |
|--------|------|------|
| 审核状态 | 下拉 | 全部 / 待审核 / 已通过 / 已拒绝 |
| 证件类型 | 下拉 | 来自 `certification_types` |

### 3.2 表格列

| 列 | 说明 |
|----|------|
| 申请 ID | |
| 用户 | 头像 + 昵称，点击跳转用户详情 |
| 证件类型 | 如身份证、驾驶证、技能证书 |
| 提交时间 | |
| 状态 | 待审核 / 已通过 / 已拒绝 徽标 |
| 操作 | 审核 / 查看 |

### 3.3 审核弹窗

点击「审核」打开抽屉或弹窗：

```
┌─────────────────────────────────┐
│ 资质审核              [审核人：管理员A] │
├─────────────────────────────────┤
│ 用户：张三（ID: 12345）            │
│ 证件类型：身份证                   │
│ 提交时间：2026-10-01 14:30         │
│                                 │
│ 证件照片：[图1] [图2] [图3]        │  ← 可点击放大
│                                 │
│ 审核意见：[________________]      │  ← 拒绝时必填
│                                 │
│        [拒绝]      [通过]         │
└─────────────────────────────────┘
```

**操作**：
- **通过**：`PUT /api/v1/admin/qualifications/:id/approve`
- **拒绝**：需填写拒绝原因，`PUT /api/v1/admin/qualifications/:id/reject`

---

## 4. 后端接口契约

### GET /api/v1/admin/users

**Query**：`keyword`, `role`(employer/provider/admin), `status`(normal/banned), `page`, `page_size`, `start_date`, `end_date`

**Response data**：
```json
{
  "items": [
    {
      "id": 12345,
      "nickname": "张三",
      "avatar_url": "https://...",
      "phone_masked": "183****4931",
      "is_employer": true,
      "is_provider": true,
      "is_admin": false,
      "credit_score": 650,
      "completed_orders": 23,
      "status": "normal",
      "created_at": "2026-09-15T10:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "page_size": 20
}
```

### GET /api/v1/admin/users/:id

**Response data**：用户完整信息（含交易数据汇总）

### PUT /api/v1/admin/users/:id/status

**Body**：`{ "status": "banned" | "normal", "reason": "string" }`

### PUT /api/v1/admin/users/:id/credit-score

**Body**：`{ "delta": -50, "reason": "违规行为" }`

### GET /api/v1/admin/users/:id/qualifications

**Query**：`status`(pending/approved/rejected), `page`, `page_size`

### PUT /api/v1/admin/qualifications/:id/approve

**Body**：`{}`

### PUT /api/v1/admin/qualifications/:id/reject

**Body**：`{ "reason": "证件照片模糊" }`

> 实际字段以后端 openapi.json 为准。
