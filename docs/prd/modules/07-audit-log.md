# 模块七：操作日志

> 开发状态更新（2026-10-04）：后端 A/B 已交付。下文“待补”及旧能力描述保留为产品裁决上下文，实施时先读 [当前对接补充](../api-current.md)，以其中逐项更新为准；首期范围与二期边界不自动扩大。

> 状态：v3（按 [review/04-second-round-decisions.md](../review/04-second-round-decisions.md) S07 裁决修订：修正 IP 断言（后端有可空 ip 字段，详情抽屉可选展示）、信用分日志示例改为实际动作结构）
> 创建日期：2026-10-04
> 后端接口：`GET /api/v1/admin/audit-logs`
> 权限：仅 super_admin
> 契约权威：[api-integration.md §12](../api-integration.md)

操作日志记录管理员在后台的敏感操作，用于审计追溯。**日志结构以真实序列化为准**，不假设后端 join 管理员信息或保证固定枚举。

---

## 1. 日志列表 `/system/audit-logs`

### 1.1 筛选栏

| 筛选项 | 类型 | 说明 |
|--------|------|------|
| （分页） | — | `page` / `page_size`；默认按时间倒序 |

> 其他筛选（管理员 / 操作类型 / 目标类型 / 时间范围）**以后端实际支持的参数为准**，当前后端未处理这些筛选参数，首期不展示对应筛选控件（未支持的能力不伪装）。

### 1.2 表格列

| 列 | 说明 |
|----|------|
| 时间 | `createdAt`，`yyyy-MM-dd HH:mm:ss` |
| 操作人 | **展示 `adminId`**（后端不 join 管理员昵称/角色；补全操作人摘要登记 ⏳ 后端任务单 #9） |
| 操作类型 | `action`，已知值中文映射 + **未知值原样回退展示** |
| 目标类型 | `targetType`，已知值中文映射 + **未知值原样回退展示** |
| 目标 ID | `targetId`；**targetType 为已知可跳转类型时可点击跳转**，未知类型不可跳转 |
| 操作 | 查看详情 |

> **已删除的列**：`admin_name` / `admin_role`（后端不 join users 表，日志无这两个字段）。
> **IP（S07 修正）**：后端 `admin_audit_logs` **有 `ip` 字段（可空）**——「后端无 IP」为错误断言。裁决：**首期展示**，**列表不设 IP 列，`ip` 作为详情抽屉的可选字段展示**，空值（null）显示占位「—」。

### 1.3 详情抽屉

点击「查看详情」打开右侧抽屉，按**真实结构**展示：

```
┌─────────────────────────────────┐
│ 操作详情                         │
├─────────────────────────────────┤
│ 操作类型：credit-score            │
│ 目标类型：users（ID: 12345）       │
│ 操作时间：2026-10-04 14:30:00      │
│ 操作人：adminId 1                 │
│ IP：203.0.113.10                 │  ← 可选字段，可空；null 显示「—」
│ UA：Mozilla/5.0 ...              │
│                                 │
│ ── 变更详情（detail = {before, after}）── │
│ before: null                    │  ← 受控动作常为 null
│ after:  { "delta": -5,           │
│           "reason": "违规发布     │
│            虚假服务" }            │  ← delta 是请求增量，非调整后信用分
└─────────────────────────────────┘
```

**`detail` 的真实语义（不假设完整 diff）**：

- `detail` 为 `{ before, after }`，**部分受控动作 `before` 为 `null`**、`reason` 写在 `after` 中（**日志无顶层 `reason` 字段**）
- **信用分调整类动作（S07 修正）**：`after` 记录的是**请求增量结构**（如 `{ delta: -5, reason: "..." }`），**不是调整后的用户信用分模型**——`after.delta` 是本次增减量，**不得误标/误读为「调整后的信用分」**；不存在 `before.credit_score` / `after.credit_score` 形式的旧分/新分
- **配置类的 `before` / `after` 可能是字符串**（非对象），渲染时按实际类型处理
- **不假设每条日志都有完整 before/after diff**；字段缺失或为 null 时展示「—」

---

## 2. 操作类型与目标类型映射（真实值 + 未知回退）

后端 `action` / `targetType` **值不保证固定枚举**：实际可能是 `status`、`credit-score` 等动作名；目标可能是 `users`、`orders`、`form-templates` 等**复数或连字符**形式。前端策略：**已知值中文映射 + 未知值原样回退展示**（不做猜测翻译）。

### 操作类型 `action`（已知值示例）

| 值 | 中文 |
|----|------|
| `status` | 状态变更 |
| `credit-score` | 调整信用分 |
| `create` | 创建 |
| `update` | 更新 |
| `delete` | 删除 |

> 旧规划中 `adjust_credit` / `ban_user` / `unban_user` / `modify_order_status` 等枚举值**不保证出现**，已从映射表移除；映射表按实际日志值渐进维护。

### 目标类型 `targetType`（已知值示例）

| 值 | 中文 | 可跳转 |
|----|------|--------|
| `users` | 用户 | ✅ `/users/:id` |
| `orders` | 订单 | ✅ `/orders/:id` |
| `refunds` | 退款 | ✅ `/refunds/:id` |
| `services` | 服务 | ✅ `/services/:id` |
| `requirements` | 需求 | ✅ `/requirements/:id` |
| `categories` | 分类 | ✅ `/content/categories` |
| `banners` | Banner | ✅ `/content/banners` |
| `form-templates` | 表单模板 | ✅ `/content/form-templates` |

> **跳转规则**：`targetType` 为已知可跳转类型时，`targetId` 可点击跳转对应详情页；**未知类型原样展示、不可跳转**。

---

## 3. 技术实现要点

1. **JSON 渲染**：`detail` 是嵌套 JSON，写通用 `JsonDiffViewer` 组件递归渲染 `before` / `after` 差异；**兼容 `before` 为 null、值为字符串的情况**，缺失字段展示「—」
2. **未知值回退**：`action` / `targetType` 的映射函数找不到已知值时**原样展示原字符串**，不猜测、不隐藏该行
3. **跳转关联**：按 §2 跳转规则表驱动，未知 targetType 不渲染链接
4. **大数据量**：日志表数据量大，必须分页，默认按时间倒序
5. **只读**：操作日志不可编辑、不可删除

---

## 4. 后端接口契约摘要（对齐 api-integration.md，以后端任务单 #9 审计标准化为二期演进方向）

### GET /api/v1/admin/audit-logs

**Query**：`page`、`page_size`（其他筛选以后端实际支持为准）

**Response data**（真实结构）：
```json
{
  "items": [
    {
      "id": 1,
      "adminId": 1,
      "action": "credit-score",
      "targetType": "users",
      "targetId": 12345,
      "detail": {
        "before": null,
        "after": { "delta": -5, "reason": "违规发布虚假服务" }
      },
      "ip": "203.0.113.10",
      "userAgent": "Mozilla/5.0 ...",
      "createdAt": "2026-10-04T14:30:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

> 与旧规划的差异：字段为 `adminId` / `targetType` / `targetId` / `ip`（**可空**，null 时详情展示「—」）/ `userAgent` / `createdAt`（camelCase）；**无 `admin_name` / `admin_role`**（后端不 join，展示 `adminId`）；**无顶层 `reason`**（reason 在 `detail.after` 中）。
> **`detail.after.delta` 是请求增量（本次增减量），不是调整后的用户信用分**（S07 修正）；受控动作 `before` 为 `null`。操作人摘要补全与 action 枚举统一登记 ⏳ 后端任务单 #9。
