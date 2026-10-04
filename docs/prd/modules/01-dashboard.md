# 模块一：数据看板

> 开发状态更新（2026-10-04）：后端 A/B 已交付。下文“待补”及旧能力描述保留为产品裁决上下文，实施时先读 [当前对接补充](../api-current.md)，以其中逐项更新为准；首期范围与二期边界不自动扩大。

> 状态：v4（按 [review/06-third-round-decisions.md](../review/06-third-round-decisions.md) T04 事实纠正修订：**密码与短信登录均不更新 `last_login_at`**，缺口标注改「密码与短信登录暂不计入」；微信登录更新但发生在封禁检查之前，#10 一并修正时机；v3 依据 [review/04-second-round-decisions.md](../review/04-second-round-decisions.md) S08）
> 创建日期：2026-10-04
> 后端接口：`GET /api/v1/admin/dashboard/{overview,orders,users,finance}`（已实现）

---

## 1. 页面概述

数据看板是管理员登录后的默认首页，**首期仅展示后端现有 4 个统计接口的真实字段**。

**首期硬约束（冻结）**：

1. 四个看板接口**均返回数组、不接受任何筛选参数**（无日期、无来源筛选）
2. **不做趋势图、不做时间范围筛选、不做指标卡时间切换**——这些能力连同 GMV 自然日口径等指标定义，统一列为二期（后端任务单 #2）
3. **禁止前端将缺失指标补 0**、禁止将当前页数据当全平台统计
4. 每个指标在页面上如实标注口径文案（见各节），不使用推测口径

按数据维度分为 4 个子页面，通过顶部 Tab 切换。

---

## 2. 运营总览 `/dashboard/overview`

### 2.1 指标卡（4 张，无时间切换）

| 指标 | 数据源 | 页面标注口径文案 |
|------|--------|------------------|
| 用户总数 | `overview` 数组元素的 `users` 字段 | 平台注册用户总数 |
| 订单总数 | `overview` 数组元素的 `orders` 字段 | 全量订单数 |
| GMV | `overview` 数组元素的 `service_gmv` 字段 | **已支付订单金额合计（非已完成）** |
| 活跃用户 | `overview` 数组元素的 `active_users` 字段 | **按已记录 `last_login_at` 统计的近 24 小时登录用户数**（用户行数，非登录次数；非自然日 DAU） |

> 指标卡**不支持**「今日 / 近 7 天 / 近 30 天」切换（接口不接受筛选参数）。
> `service_gmv` 不扣除退款与取消，也不要求已完成口径；如需「已完成 GMV」「自然日 DAU」等产品化指标定义，二期由后端任务单 #2 补齐。
> **活跃用户口径缺口（如实标注）**：**密码与短信登录均不更新 `last_login_at`**（后端任务 #10 修复前），**密码与短信登录暂不计入该指标**；微信登录会更新但发生在封禁检查之前（#10 一并修正时机）。页面口径文案需带此标注。

---

## 3. 订单统计 `/dashboard/orders`

### 3.1 展示内容

接口返回按状态分组的数组，每个元素含 `status` / `count` / `amount`，以状态分组表格/列表展示：

| 列 | 说明 |
|----|------|
| 状态 | 按订单状态值映射中文（0=待支付、2=已预约、3=进行中、4=待验收、5=已完成、6=已取消、7=退款中、8=退款完成、9=退款被拒） |
| 数量 | 该状态的订单数（`count`） |
| 金额 | 该状态的金额合计（`amount`，十进制字符串，用 decimal 渲染） |

> 接口只返回实际有数据的状态分组；**前端不补齐空状态、不补 0**。
> 无按日趋势、无订单来源（Service / Requirement）筛选、无时间范围筛选——均为二期（后端任务单 #2）。

---

## 4. 用户统计 `/dashboard/users`

### 4.1 展示内容

接口返回数组，每个元素含 `date` / `new_users` / `active_users`，以日期分组表格展示：

| 列 | 说明 |
|----|------|
| 日期 | `date` |
| 新增用户 | `new_users` |
| 活跃用户 | `active_users` |

> **口径标注（页面文案如实说明）：users 序列按注册日期分组**，即 `new_users` 为该注册日期的新增用户数；`active_users` 为**该注册日期用户群中的近期活跃人数**（按已记录 `last_login_at` 统计的近 24 小时登录口径，用户行数非登录次数）。因此**每组 `active_users` ≤ `new_users`**——它不是全平台当日活跃数，该序列**不能当作每日活跃趋势图使用**。
> 密码与短信登录暂不计入活跃口径（后端任务 #10 修复前，两者的 `last_login_at` 均不更新）。
> 不提供「服务者数 / 雇主数 / 留存率」等指标（后端无此字段，禁止补 0 伪装）。

---

## 5. 财务统计 `/dashboard/finance`

> 仅 finance / super_admin 可见。

### 5.1 展示内容

接口返回数组，元素字段为 `settled` / `fees` / `refunded` / `withdrawn` / `available_balance` / `frozen_balance`，以指标卡/汇总列表展示：

| 指标 | 数据源 |
|------|--------|
| 已结算金额 | `settled` |
| 服务费合计 | `fees` |
| 已退款金额 | `refunded` |
| 已提现金额 | `withdrawn` |
| 可用余额 | `available_balance` |
| 冻结余额 | `frozen_balance` |

> 全部金额为十进制字符串，前端用 decimal 格式化，禁止 float。
> 不提供按日收入趋势、结算/退款/提现占比图表（无数据支持，二期任务单 #2）。

---

## 6. 技术实现要点

1. **数据缓存**：看板接口用 TanStack Query 的 `staleTime` 控制刷新频率（如 60s），避免频繁请求
2. **加载态**：指标卡用骨架屏（`Skeleton`），加载失败展示错误态与重试按钮
3. **空数据**：接口返回空数组时显示「暂无数据」占位；**禁止前端补 0 伪装成有数据**
4. **无图表库**：首期看板无趋势图，**不引入 recharts**；二期图表需求就绪后再评估引入
5. **无筛选参数**：四个接口请求均不携带日期/来源参数（后端不接受，传了也无效果）

---

## 7. 后端接口契约（真实，v2 冻结）

> 契约来源：[api-integration.md §2](../api-integration.md)。四个接口均返回**数组**，不接受筛选参数。

### GET /api/v1/admin/dashboard/overview

**Response data**（数组）：
```json
[
  { "users": 5678, "orders": 1234, "service_gmv": "123456.78", "active_users": 345 }
]
```

- `service_gmv`：已支付订单金额合计（非已完成）
- `active_users`：按已记录 `last_login_at` 统计的近 24 小时登录用户数（用户行数，非登录次数；非自然日 DAU）；**密码与短信登录暂不计入**（后端任务 #10 修复后覆盖）

### GET /api/v1/admin/dashboard/orders

**Response data**（数组，按状态分组）：
```json
[
  { "status": 0, "count": 10, "amount": "3000.00" },
  { "status": 5, "count": 200, "amount": "60000.00" }
]
```

### GET /api/v1/admin/dashboard/users

**Response data**（数组，按注册日期分组）：
```json
[
  { "date": "2026-10-01", "new_users": 23, "active_users": 18 }
]
```

> `active_users` 为该注册日期用户群中的近期活跃人数，**每组 `active_users` ≤ `new_users`**（统计 SQL 决定，不可能出现 `new_users=23、active_users=345` 之类的数据）。

### GET /api/v1/admin/dashboard/finance

**Response data**（数组）：
```json
[
  {
    "settled": "4444.34",
    "fees": "5678.90",
    "refunded": "345.67",
    "withdrawn": "2345.67",
    "available_balance": "1234.56",
    "frozen_balance": "789.00"
  }
]
```

> 趋势图、时间范围筛选、GMV 完成口径等产品化指标定义为二期（后端任务单 #2），本文档不承诺。
