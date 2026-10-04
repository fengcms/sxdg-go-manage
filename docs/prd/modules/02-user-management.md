# 模块二：用户管理与资质审核

> 开发状态更新（2026-10-04）：后端 A/B 已交付。下文“待补”及旧能力描述保留为产品裁决上下文，实施时先读 [当前对接补充](../api-current.md)，以其中逐项更新为准；首期范围与二期边界不自动扩大。

> 状态：v4（按 [review/06-third-round-decisions.md](../review/06-third-round-decisions.md) T01 裁决修订：封禁 DTO 冻结为 `banned`/`banReason`/`bannedAt`，原因/时间取自审计日志最近一次状态动作、解封后置 null、历史缺失不编造；封禁/解封 reason 后端已同步加非空校验；v3 依据 [review/04-second-round-decisions.md](../review/04-second-round-decisions.md) S01/S05）
> 创建日期：2026-10-04
> 后端接口：`/api/v1/admin/users`、`/api/v1/admin/qualifications`
> 契约权威：[api-integration.md §3](../api-integration.md)

---

## 1. 用户列表 `/users`

### 1.1 筛选栏（首期最小集合）

| 筛选项 | 类型 | 说明 |
|--------|------|------|
| 昵称关键词 | 输入框 | **仅匹配昵称**（后端 `adminFilter` 现状） |

> 手机号 / 角色 / 封禁状态 / 注册时间筛选为**二期**（后端任务单 #3）。服务端不支持的能力前端不伪装：不做当前页过滤伪装全量搜索。

### 1.2 表格列

| 列 | 说明 |
|----|------|
| 用户 ID | 点击跳转详情 |
| 头像 + 昵称 | 头像缩略图 + 昵称 |
| 角色 | 雇主 / 服务者徽标（可多选） |
| 信用分 | 数值展示 |
| 注册时间 | `yyyy-MM-dd HH:mm` |
| 状态 | 以后端返回的封禁 DTO 为准：`banned: boolean`、`banReason: string | null`、`bannedAt: string | null`（⏳ 后端任务 #3a 补齐列表字段前，该列可能缺失）。**字段缺失 = 状态「未知」**（灰色徽标），封禁与解封按钮**双双禁用**；`undefined ≠ false`，**禁止把未知当未封禁**；`banReason` / `bannedAt` 为 null 时显示「—」，**不编造** |
| 操作 | 查看 / 封禁或解封 |

> **已删除的列与原因**：
> - 手机号列：后端 JSON 隐藏手机号，模型无 `phone_masked` 字段，首期不展示
> - 完成订单数列：模型无 `completed_orders` 字段（二期，任务单 #3/#4）
> - 信用分标红：**不使用 300 阈值等硬编码规则**，边界以 `credit_score_max` / `credit_score_min` 配置为准

### 1.3 行操作

- **查看**：跳转 `/users/:id`
- **封禁 / 解封**：仅 customer_service / super_admin 可操作
  - **前置状态门禁（S05 冻结规则）**：按钮是否可用**仅由服务端 `banned` 字段决定**——`banned=true` 显示「解封」、`banned=false` 显示「封禁」；**字段缺失（undefined/null）= 状态「未知」，封禁与解封按钮双双禁用**。`undefined ≠ false`，禁止把未知态当未封禁处理
  - 封禁：二次确认弹窗，需填写封禁原因（**reason 必填**——前端保持必填提示；后端已同步加非空校验，随 #3a/#4a 同批交付）
  - 解封：二次确认弹窗，需填写解封原因（**reason 必填**，与权限文档「原因必填」一致；后端非空校验同上）
  - **封禁原因/时间的数据来源语义（T01 冻结）**：`banReason` / `bannedAt` 来自 `admin_audit_logs` **最近一次状态动作**——仅当前 `banned=true` 且最新动作为封禁时，取该记录的 reason 与 createdAt 展示；**解封后两者返回 null**；历史审计缺失时返回 null，展示「—」，**不编造时间**。首期不做「最近解封原因」展示
  - **操作成功后重新拉取服务端状态**（重新请求列表/详情），**不本地翻转按钮与状态徽标**；提交失败则保持原状态并提示
  - 请求体见 §4（`{ banned, reason }`，**合同红线，见下**）

> **开发依赖（S05，独立 P0）**：封禁/解封功能依赖后端任务 **#3a（用户列表封禁 DTO，列表操作入口的状态依据）** + **#4a（用户详情封禁 DTO，详情操作入口的状态依据）**，两项均为独立 P0 任务（**T01 契约已冻结**：DTO = `banned: boolean`、`banReason: string | null`、`bannedAt: string | null`；原因/时间读审计日志最近一次状态动作，后端批量查询、禁止逐用户 N+1）。字段就绪前列表/详情的封禁入口按「未知态 + 按钮禁用」交付，不伪装可用。

---

## 2. 用户详情 `/users/:id`

### 2.1 顶部摘要卡片

| 字段 | 说明 |
|------|------|
| 头像 + 昵称 | |
| 用户 ID | |
| 角色 | 雇主 / 服务者 / 管理员 |
| 信用分 | 大字号显示 |
| 状态 | 以后端返回的封禁 DTO 为准：`banned: boolean`、`banReason: string | null`、`bannedAt: string | null`（⏳ 后端任务 #4a 补齐详情字段前可能缺失）。**字段缺失 = 状态「未知」**（灰色徽标），详情页封禁/解封按钮**双双禁用**；`undefined ≠ false`，禁止把未知当未封禁 |
| 封禁原因 | `banReason`，null 显示「—」，**不编造**（来源语义见 §1.3：审计日志最近一次状态动作） |
| 封禁时间 | `bannedAt`，null 显示「—」，**不编造** |
| 注册时间 | |
| 最后登录时间 | |

> 不展示手机号（后端 JSON 隐藏，无 `phone_masked`）。

### 2.2 Tab 分区（首期缩减）

| Tab | 内容 | 状态 |
|-----|------|------|
| 基本信息 | 昵称、头像、性别、生日、简介、实名状态（后端单行模型字段） | 首期 |
| 资质认证 | 该用户提交的资质列表 + 审核状态（`GET /admin/users/:id/qualifications`） | 首期 |

> **移至二期**（后端详情聚合/子资源接口，任务单 #4）：交易数据 Tab、信用记录 Tab、发布内容 Tab。首期不渲染这三个 Tab，禁止用 N+1 拼凑。

### 2.3 右上角操作

| 操作 | 权限 | 说明 |
|------|------|------|
| 封禁 / 解封 | customer_service / super_admin | 见 §1.3 与 §4；详情状态依据为 `banned` 字段（⏳ 任务 #4a），缺失 = 未知态、按钮禁用，操作成功后重新拉取详情 |
| 调整信用分 | super_admin | 弹窗：输入调整分值（正/负）+ 原因，二次确认 |

---

## 3. 资质审核 `/users/qualifications`

> 仅 operator / super_admin 可见。

### 3.1 页面可用性说明

本页为**全平台资质审核队列**，依赖后端 `GET /api/v1/admin/qualifications`（分页，⏳ 后端任务单 #5）。**接口补齐前本页不可上线**；禁止前端遍历用户列表逐个请求拼凑队列。补齐前审核入口仅保留在用户详情「资质认证」Tab。

### 3.2 筛选栏

| 筛选项 | 类型 | 说明 |
|--------|------|------|
| 审核状态 | 下拉 | 全部 / 待审核 / 已通过 / 已拒绝，提交参数 `status` 为**数字 0/1/2**（前端做 0=待审核、1=已通过、2=已拒绝映射） |

> 证件类型筛选**已删除**：后端无证件类型字典支持。

### 3.3 表格列

| 列 | 说明 |
|----|------|
| 申请 ID | |
| 用户 | 头像 + 昵称，点击跳转用户详情 |
| 提交时间 | |
| 状态 | 待审核 / 已通过 / 已拒绝 徽标（数字映射） |
| 操作 | 审核 / 查看 |

### 3.4 审核弹窗

```
┌─────────────────────────────────┐
│ 资质审核                          │
├─────────────────────────────────┤
│ 用户：张三（ID: 12345）            │
│ 提交时间：2026-10-01 14:30         │
│                                 │
│ 证件照片：[图1] [图2] [图3]        │  ← 鉴权 Blob 加载，点击放大
│                                 │
│ 审核意见：[________________]      │  ← 拒绝时必填
│                                 │
│        [拒绝]      [通过]         │
└─────────────────────────────────┘
```

**操作**：
- **通过**：`PUT /api/v1/admin/qualifications/:id/approve`（Body 按后端现契约为准）
- **拒绝**：需填写拒绝原因，`PUT /api/v1/admin/qualifications/:id/reject`（含 reason）

### 3.5 证件图片鉴权访问（合同要点）

证件图片**必须**通过鉴权接口 `GET /api/v1/upload/cert/:fileId` 获取：

- **鉴权 fetch + Bearer token → Blob → Object URL**，图片组件使用 Object URL 渲染
- 组件卸载 / 切换时调用 `URL.revokeObjectURL` 释放
- 该接口返回**二进制**，**不走 JSON 信封解包器**
- **禁止 `<img src>` 直链**（无法附加 Bearer token，且路径非公开静态资源）

`useCertImage` hook 示意（TypeScript，箭头函数）：

```typescript
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiClient';

const useCertImage = (fileId: string | null) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let revoked = false;
    let createdUrl: string | null = null;

    const loadCertImage = async () => {
      if (!fileId) return;
      setLoading(true);
      setError(null);
      try {
        // 鉴权 fetch，响应为二进制，不走 JSON 解包器
        const response = await apiFetch(`/api/v1/upload/cert/${fileId}`, {
          parseAs: 'blob',
        });
        createdUrl = URL.createObjectURL(response as Blob);
        if (revoked) {
          URL.revokeObjectURL(createdUrl);
          return;
        }
        setObjectUrl(createdUrl);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('证件图片加载失败'));
      } finally {
        setLoading(false);
      }
    };

    loadCertImage();

    // 组件卸载或 fileId 变化时释放 Object URL
    return () => {
      revoked = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
      setObjectUrl(null);
    };
  }, [fileId]);

  return { objectUrl, loading, error };
};
```

---

## 4. 后端接口契约（对齐 api-integration.md v4）

### GET /api/v1/admin/users

**Query**：`keyword`（仅匹配昵称）、`page`、`page_size`

**Response data**（真实序列化，**camelCase**）：
```json
{
  "items": [
    {
      "id": 12345,
      "nickname": "张三",
      "avatarUrl": "https://...",
      "isEmployer": true,
      "isProvider": true,
      "isAdmin": false,
      "creditScore": 650,
      "createdAt": "2026-09-15T10:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

> ⚠️ **字段命名（S01 修正）**：用户模型真实序列化为 **camelCase**（`avatarUrl` / `isEmployer` / `isProvider` / `isAdmin` / `creditScore` / `createdAt`），**不是** `avatar_url` / `is_employer` 等数据库命名——按 snake_case 绑定会渲染出空列。响应分页固定 `{items, total, page, pageSize}`（camelCase）。无 `phone_masked`、无 `completed_orders`；封禁 DTO（`banned` / `banReason` / `bannedAt`）⏳ 任务单 #3a 补齐（**T01 契约已冻结**：原因/时间读审计日志最近一次状态动作，缺失为 null 不编造）。

### GET /api/v1/admin/users/:id

**Response data**：用户单行模型（不自动 join 交易汇总、信用记录、发布内容）。封禁 DTO（`banned: boolean`、`banReason: string | null`、`bannedAt: string | null`）⏳ 任务单 #4a 补齐，契约与 #3a 同批冻结（见 §1.3 数据来源语义）。

### PUT /api/v1/admin/users/:id/status（封禁/解封）

**Body**：`{ "banned": true, "reason": "违规行为" }` / `{ "banned": false, "reason": "申诉通过" }`（**封禁与解封的 reason 均必填**——前端保持必填提示；后端已同步加非空校验，随 #3a/#4a 同批交付）

> ⚠️ **合同红线**：`banned` 是**布尔值**，不是状态字符串枚举。若误按旧的字符串状态字段方式绑定，后端解析到未知字段时 `banned` 保持零值 false，**会把「封禁」执行成「解封」**。前端类型必须显式声明 `banned: boolean`，禁止任何字符串到布尔的隐式转换。

### PUT /api/v1/admin/users/:id/credit-score

**Body**：`{ "delta": -50, "reason": "违规行为" }`

### GET /api/v1/admin/users/:id/qualifications

**Query**：`status`（**数字 0/1/2**）、`page`、`page_size`

### GET /api/v1/admin/qualifications（⏳ 后端任务单 #5）

**Query**：`status`（数字 0/1/2）、`page`、`page_size`。补齐前不可用，禁止遍历用户列表拼队列。

### PUT /api/v1/admin/qualifications/:id/approve

**Body**：按后端现契约为准。

### PUT /api/v1/admin/qualifications/:id/reject

**Body**：`{ "reason": "证件照片模糊" }`
