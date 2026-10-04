# 模块一：数据看板

> 状态：规划初稿
> 创建日期：2026-10-04
> 后端接口：`GET /api/v1/admin/dashboard/{overview,orders,users,finance}`

---

## 1. 页面概述

数据看板是管理员登录后的默认首页，提供平台运营数据的一站式概览。
按数据维度分为 4 个子页面，通过顶部 Tab 切换。

---

## 2. 运营总览 `/dashboard/overview`

### 2.1 顶部指标卡（4 张）

| 指标 | 数据源 | 说明 |
|------|--------|------|
| GMV（累计） | `overview.total_gmv` | 已完成订单金额合计 |
| 订单总数 | `overview.total_orders` | 全量订单数 |
| 注册用户数 | `overview.total_users` | 全量用户数 |
| 今日活跃用户 | `overview.today_dau` | 当日活跃 |

> 指标卡支持「今日 / 近 7 天 / 近 30 天」时间范围切换，右上角下拉选择。

### 2.2 趋势图

- **GMV 趋势**：折线图，按日聚合，支持时间范围切换
- **订单量趋势**：柱状图，按日聚合
- 图表使用 `recharts`，数据来自 `dashboard/orders` 接口

### 2.3 实时动态（可选，二期）

- 最新订单流水（最近 10 单）
- 最新退款申请
- 最新用户注册

---

## 3. 订单统计 `/dashboard/orders`

### 3.1 指标卡

| 指标 | 说明 |
|------|------|
| 待支付订单数 | `status=0` |
| 进行中订单数 | `status=3` |
| 待验收订单数 | `status=4` |
| 已完成订单数 | `status=5` |
| 退款中订单数 | `status=7` |

### 3.2 图表

- 订单状态分布饼图
- 订单量按日趋势（近 30 天）
- 订单金额按日趋势

### 3.3 筛选

- 时间范围：今日 / 近 7 天 / 近 30 天 / 自定义
- 订单来源：Service / Requirement

---

## 4. 用户统计 `/dashboard/users`

### 4.1 指标卡

| 指标 | 说明 |
|------|------|
| 累计注册用户 | 全量 |
| 今日新增 | 当日注册 |
| 今日活跃 | DAU |
| 服务者数 | `is_provider=true` |
| 雇主数 | `is_employer=true` |

### 4.2 图表

- 新增用户趋势（近 30 天折线）
- 用户角色分布饼图（雇主 / 服务者 / 双角色 / 未交易）
- 留存率柱状图（次日 / 7 日 / 30 日，如后端提供）

---

## 5. 财务统计 `/dashboard/finance`

> 仅 finance / super_admin 可见。

### 5.1 指标卡

| 指标 | 说明 |
|------|------|
| 平台累计收入 | 服务费总额 |
| 待结算金额 | `settlements.status=0` |
| 已结算金额 | `settlements.status=1` |
| 退款总额 | 已退款金额合计 |
| 提现总额 | 已提现金额合计 |

### 5.2 图表

- 收入趋势（按日）
- 结算 / 退款 / 提现占比
- 服务费收入趋势

---

## 6. 技术实现要点

1. **数据缓存**：看板接口用 TanStack Query 的 `staleTime` 控制刷新频率（如 60s），避免频繁请求
2. **日期范围**：统一使用 `date-fns` 格式化，传 `start_date` / `end_date` 参数
3. **加载态**：指标卡用骨架屏（`Skeleton`），图表用 `FullPageLoading`
4. **空数据**：接口返回空数组时显示「暂无数据」占位，不显示空白图表
5. **图表自适应**：容器宽度变化时重绘（recharts `responsive`）

---

## 7. 后端接口契约

### GET /api/v1/admin/dashboard/overview

**Query**：`start_date`, `end_date`（可选，默认近 30 天）

**Response data**：
```json
{
  "total_gmv": "123456.78",
  "total_orders": 1234,
  "total_users": 5678,
  "today_dau": 345,
  "today_new_users": 23,
  "today_orders": 45,
  "today_gmv": "6789.00"
}
```

### GET /api/v1/admin/dashboard/orders

**Response data**：
```json
{
  "by_status": { "0": 10, "2": 20, "3": 15, "4": 8, "5": 200, "7": 3 },
  "daily": [
    { "date": "2026-10-01", "count": 45, "amount": "6789.00" }
  ]
}
```

### GET /api/v1/admin/dashboard/users

**Response data**：
```json
{
  "total": 5678,
  "today_new": 23,
  "today_active": 345,
  "providers": 1234,
  "employers": 2345,
  "daily_new": [
    { "date": "2026-10-01", "count": 23 }
  ]
}
```

### GET /api/v1/admin/dashboard/finance

**Response data**：
```json
{
  "total_income": "5678.90",
  "pending_settlement": "1234.56",
  "settled": "4444.34",
  "refund_total": "345.67",
  "withdraw_total": "2345.67",
  "daily_income": [
    { "date": "2026-10-01", "income": "234.56" }
  ]
}
```

> 以上为推测契约，实际以后端 `internal/apidoc/openapi.json` 或 `docs/api-spec.md` 为准。开发前需与后端确认返回字段。
