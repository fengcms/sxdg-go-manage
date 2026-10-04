# 模块七：操作日志

> 状态：规划初稿
> 创建日期：2026-10-04
> 后端接口：`GET /api/v1/admin/audit-logs`
> 权限：仅 super_admin

操作日志记录所有管理员在后台的敏感操作，用于审计追溯。

---

## 1. 日志列表 `/system/audit-logs`

### 1.1 筛选栏

| 筛选项 | 类型 | 说明 |
|--------|------|------|
| 管理员 | 下拉 | 选择管理员账号 |
| 操作类型 | 下拉 | create / update / delete / approve / reject / adjust_credit 等 |
| 目标类型 | 下拉 | user / order / refund / service / requirement / category / banner 等 |
| 时间范围 | 日期范围 | |

### 1.2 表格列

| 列 | 说明 |
|----|------|
| 时间 | `yyyy-MM-dd HH:mm:ss` |
| 管理员 | 昵称 + 角色 |
| 操作类型 | 中文映射（创建 / 更新 / 删除 / 审核通过 / 审核拒绝 / 调整信用分） |
| 目标类型 | 中文映射（用户 / 订单 / 退款 / 服务 / 需求 / 分类 / Banner） |
| 目标 ID | 可点击跳转对应详情页 |
| IP 地址 | 操作来源 IP |
| 操作 | 查看详情 |

### 1.3 详情抽屉

点击「查看详情」打开右侧抽屉，展示 `detail` JSON 字段的友好展示：

```
┌─────────────────────────────────┐
│ 操作详情                         │
├─────────────────────────────────┤
│ 操作类型：调整信用分               │
│ 目标用户：张三（ID: 12345）        │
│ 操作时间：2026-10-04 14:30:00      │
│ 操作人：管理员A                    │
│ IP：192.168.1.100                 │
│                                 │
│ ── 变更详情 ──                    │
│ 信用分：600 → 550（-50）           │
│ 原因：违规发布虚假服务              │
└─────────────────────────────────┘
```

`detail` 字段为 JSONB，结构为 `{ "before": ..., "after": ..., "reason": "..." }`，前端按字段类型渲染 diff。

---

## 2. 操作类型与目标类型映射

后端 `admin_audit_logs` 字段为英文枚举，前端做中文映射：

### 操作类型 `action`

| 值 | 中文 |
|----|------|
| create | 创建 |
| update | 更新 |
| delete | 删除 |
| approve | 审核通过 |
| reject | 审核拒绝 |
| adjust_credit | 调整信用分 |
| ban_user | 封禁用户 |
| unban_user | 解封用户 |
| modify_order_status | 修改订单状态 |

### 目标类型 `target_type`

| 值 | 中文 |
|----|------|
| user | 用户 |
| order | 订单 |
| refund | 退款 |
| service | 服务 |
| requirement | 需求 |
| category | 分类 |
| banner | Banner |
| form_template | 表单模板 |
| service_badge | 服务标签 |
| qualification | 资质 |
| system_config | 系统配置 |
| credit_rule | 信用分规则 |

---

## 3. 技术实现要点

1. **JSON 渲染**：`detail` 字段是嵌套 JSON，前端写一个通用的 `JsonDiffViewer` 组件，递归渲染 before/after 差异
2. **跳转关联**：目标 ID 可点击，根据 target_type 跳转到对应详情页（如 user → `/users/:id`，order → `/orders/:id`）
3. **大数据量**：日志表数据量大，必须分页，默认按时间倒序
4. **只读**：操作日志不可编辑、不可删除

---

## 4. 后端接口契约摘要

### GET /api/v1/admin/audit-logs

**Query**：`admin_id`, `action`, `target_type`, `start_date`, `end_date`, `page`, `page_size`

**Response data**：
```json
{
  "items": [
    {
      "id": 1,
      "admin_id": 1,
      "admin_name": "管理员A",
      "admin_role": "super_admin",
      "action": "adjust_credit",
      "target_type": "user",
      "target_id": 12345,
      "detail": {
        "before": { "credit_score": 600 },
        "after": { "credit_score": 550 },
        "reason": "违规发布虚假服务"
      },
      "ip": "192.168.1.100",
      "user_agent": "Mozilla/5.0 ...",
      "created_at": "2026-10-04T14:30:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "page_size": 20
}
```

> 实际字段以后端 openapi.json 为准。`admin_name` / `admin_role` 可能需要后端 join users 表返回，或前端二次请求补全。
