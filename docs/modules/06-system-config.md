# 模块六：系统配置与信用分规则

> 状态：规划初稿
> 创建日期：2026-10-04
> 后端接口：`/api/v1/admin/system-configs`、`/api/v1/admin/credit-rules`
> 权限：仅 super_admin

系统设置是平台的「控制中枢」，所有参数调整都会影响前台业务行为，操作需格外谨慎。

---

## 1. 系统配置 `/system/configs`

### 1.1 配置项列表

后端 `system_configs` 表已预置以下配置项（见 `schema.md §9.1`）：

| 配置键 | 说明 | 类型 | 默认值 |
|--------|------|------|--------|
| `gps_checkin_radius_m` | 打卡围栏半径（米） | 数字 | 500 |
| `order_payment_timeout_hour` | 订单待支付超时（小时） | 数字 | 1 |
| `service_payment_timeout_hour` | 需求待支付超时（小时） | 数字 | 3 |
| `auto_accept_hours` | 自动验收时间（小时） | 数字 | 24 |
| `refund_opponent_timeout_hours` | 退款对手处理超时（小时） | 数字 | 24 |
| `review_timeout_days` | 评价超时（天） | 数字 | 7 |
| `settlement_delay_hours` | 结算延迟小时数 | 数字 | 0 |
| `credit_score_initial` | 信用分初始值 | 数字 | 600 |
| `credit_score_max` | 信用分上限 | 数字 | 1000 |
| `credit_score_min` | 信用分下限 | 数字 | 0 |

### 1.2 编辑

- 点击某一行的「编辑」，弹出内联编辑或弹窗
- 修改后调用 `PUT /api/v1/admin/system-configs/:key`
- **二次确认**：所有系统配置修改必须二次确认，提示「修改后立即生效，可能影响正在进行的业务」

### 1.3 交互约定

- 数值类型校验：只允许数字，信用分相关需 0~1000
- 不可删除配置项（配置项由后端种子数据初始化）
- 配置变更记录到 `admin_audit_logs`（后端自动处理）

---

## 2. 信用分规则 `/system/credit-rules`

### 2.1 规则列表

后端 `behavior_rules` 表存储信用分规则（见 `schema.md §9.3`），运营可调整分值，无需发版。

| 列 | 说明 |
|----|------|
| 行为键 | G-1~G-10（加分）/ B-1~B-10（扣分） |
| 行为名称 | 如「完成订单」「爽约」 |
| 分值 | 正数为加分，负数为扣分，可编辑 |
| 启用 | 开关，停用后该行为不触发信用分变动 |
| 更新时间 | |

### 2.2 编辑

- 分值可直接在列表内联编辑（点击数值变为输入框）
- 启用开关即时保存
- 调用 `PUT /api/v1/admin/credit-rules/:id`，Body：`{ "delta": 10, "is_active": true }`

### 2.3 规则说明（只读展示）

在列表上方展示信用分机制说明：

- 初始值：600
- 上限：1000，下限：0
- 加分行为：完成订单、好评、连续无差评、实名认证、资质认证、签到、邀请好友等
- 扣分行为：爽约、取消订单、迟到早退、差评、围栏外打卡、退款纠纷、违规被下架、举报成立等

> 规则分值调整会影响后续触发的行为，历史信用分不受影响。

---

## 3. 服务费配置 `/system/fee-config`

> 后端 `fee_config` 表已存在，接口已指派给后端开发 AI 新增（见 `sxdg-be/docs/review/admin-login-and-fee-config.md`）。
> 权限：仅 super_admin。

### 3.1 规划字段

| 字段 | 说明 | 默认值 |
|------|------|--------|
| 服务费比例 (fee_rate) | 百分比，0~100，5 表示 5% | 5% |
| 最低服务费 (min_fee) | 金额，≥ 0 | 0 |
| 服务费承担方 (payer) | provider / employer / split | provider |
| 分摊比例 (split_ratio) | **雇主承担比例，0~1**（如 0.30 表示雇主承担 30%） | — |

> **注意**：`split_ratio` 语义为「雇主承担比例 0~1」，不是服务者承担比例。
> 前端如展示「服务者承担百分比」，用 `服务者百分比 = (1 - split_ratio) × 100` 转换，提交时除以 100。
> 当 payer ≠ split 时，split_ratio 为 null。

### 3.2 交互

- 仅允许一行生效（后端唯一索引约束）
- 修改后立即影响新订单，历史订单不受影响
- payer 切换为非 split 时，分摊比例输入框禁用并清空
- 数值用十进制字符串提交，禁止 float

---

## 4. 安全要求

1. 所有操作二次确认
2. 修改后 toast 提示「已更新，立即生效」
3. 操作日志自动记录（后端 `admin_audit_logs`）
4. 建议增加「变更前预览」：弹窗显示旧值 → 新值，确认后提交

---

## 5. 后端接口契约摘要

### 系统配置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/system-configs` | 配置列表 |
| PUT | `/api/v1/admin/system-configs/:key` | 更新配置项 |

### 信用分规则

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/credit-rules` | 规则列表 |
| PUT | `/api/v1/admin/credit-rules/:id` | 更新规则（delta, is_active） |
