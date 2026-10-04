# 前后端接口对接清单（合同版）

> 状态：v4（按 [review/06-third-round-decisions.md](./review/06-third-round-decisions.md) T02/T04/T06 裁决同步修订：看板缺口改「密码与短信登录暂不计入」、客服转接权服务端化与 cs/me 补 isActive、分类删除冻结「引用存在即拒绝」；v3 依据 [review/04-second-round-decisions.md](./review/04-second-round-decisions.md) S01/S02/S04/S08/S09）
> 日期：2026-10-04
> 权威性：本文是管理后台前端对接的**唯一合同**。与《管理后台前端技术栈与UI风格指导.md》冲突时，以本文为准。
> 后端待补接口见 [sxdg-be/docs/review/admin-backend-supplement-tasks.md](../../../sxdg-be/docs/review/admin-backend-supplement-tasks.md)（标注 ⏳ 的接口）。

---

## 0. 通用合同

### 0.1 响应信封

```json
{ "code": 0, "message": "success", "data": {} }
```

- `code === 0` 成功。**业务码与 HTTP 状态是两个维度**：`ApiError.status` 是 HTTP 状态码，`ApiError.code` 是业务码
- 信封不承诺 requestId/timestamp 字段；request ID 从响应头获取（如存在）

### 0.2 分页

- 请求参数：`page`（从 1 开始）、`page_size`
- 响应结构：`{ "items": [...], "total": N, "page": N, "pageSize": N }`（camelCase，与后端 `Page.Result` 一致）
- 前端 UI 若偏好其他形状，仅在 API adapter 层显式转换，禁止全局猜测命名转换

### 0.3 命名约定（S01 修订：逐接口 DTO 为准）

- **命名以各接口真实序列化 DTO 为准**：常规模型 JSON 为 **camelCase**（如用户 `avatarUrl` / `isEmployer` / `creditScore`，分类构树键 `parentId`）
- **已知例外清单**（不适用 camelCase，按各自真实键读取）：
  - **看板**：`service_gmv` / `active_users` / `new_users` / `available_balance` / `frozen_balance`（snake_case）
  - **fee-config**：`fee_rate` / `min_fee` / `split_ratio`（snake_case）
  - **订单快照内部协议**（`addressSnapshot` 等 JSONb 内部结构按其内部协议，非全局 camelCase）
- **禁止全局自动命名转换**（不做 snake_case ⇄ camelCase 的自动互转）；例外接口在各自模块单列注明，前端按逐接口定义读取

### 0.4 金额与日期

- 金额：十进制字符串（如 `"123.45"`），前端用 decimal 处理，禁止 float
- 日期：ISO 8601，前端 `date-fns` 格式化

### 0.5 开发代理

同源代理到后端（默认 8080，`SERVER_PORT` 可覆盖）：

```
/api/v1   → http://localhost:8080/api/v1
/uploads  → http://localhost:8080/uploads
```

> 无 `/files` 路径，无 11000 端口。生产环境需另行约定反向代理与 SPA 路由回退（二期）。

---

## 1. 鉴权

| 方法 | 路径 | 请求体 | 前端用途 |
|------|------|--------|---------|
| POST | `/api/v1/auth/login` | `{ account, password }` | 登录页（已实现） |
| POST | `/api/v1/auth/refresh` | `{ refreshToken }` | 401 拦截器（一次刷新） |
| POST | `/api/v1/auth/logout` | — | 顶部栏退出（撤销整个会话） |
| GET | `/api/v1/auth/me` | — | 角色恢复（⏳ 待补 isAdmin/adminRole） |

**登录响应**：
```json
{
  "code": 0,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 7200,
    "user": { "id": 1, "nickname": "超级管理员", "isAdmin": true, "adminRole": "super_admin" }
  }
}
```

**会话策略（冻结）**：
- 双令牌纯内存存储。**整页刷新 / 新标签页 = 重新登录**，bootstrap 只处理本次页面生命周期内的已有会话
- 刷新成功后**同时替换** accessToken 与 refreshToken
- 登录、refresh 请求本身 skipRefresh，失败不触发刷新循环
- 登录失败统一 code 20012（HTTP 401），**不区分**账号不存在/密码错误/未设置密码，表单只提示「账号或密码错误」
- 登录后校验 `user.isAdmin`，为 false 提示无后台权限并丢弃令牌
- 退出/换用户：清 Query 缓存、取消在途请求，防止旧用户数据回填

**错误码（登录域）**：
| code | HTTP | 场景 | 前端处理 |
|------|------|------|---------|
| 20012 | 401 | 账号或密码错误 | 登录表单提示，不触发刷新 |
| 20009 | 403 | 账号已被封禁 | 提示封禁 |

---

## 2. 数据看板（现有统计，无筛选参数）

| 方法 | 路径 | 响应数组元素字段（真实口径） |
|------|------|------------------------------|
| GET | `/api/v1/admin/dashboard/overview` | `users`（用户总数）、`orders`（订单总数）、`service_gmv`（**已支付订单金额合计**，非已完成）、`active_users`（**按已记录 `last_login_at` 统计的近 24 小时登录用户数**——用户行数，非登录次数；非自然日 DAU；**密码与短信登录暂不计入**，后端任务 #10 修复后覆盖） |
| GET | `/api/v1/admin/dashboard/orders` | `status`、`count`、`amount`（按状态分组） |
| GET | `/api/v1/admin/dashboard/users` | `date`、`new_users`、`active_users`（按注册日期分组；`active_users` = **该注册日期用户群中的近期活跃人数**，**每组 `active_users` ≤ `new_users`**） |
| GET | `/api/v1/admin/dashboard/finance` | `settled`、`fees`、`refunded`、`withdrawn`、`available_balance`、`frozen_balance` |

> 四个接口均返回**数组**，不接受日期/来源筛选。趋势图、日期筛选、自然日口径为二期（后端任务单 #2）。前端禁止将缺失指标补 0。
> **S08/T04 口径补充**：`active_users` 统计的是 `last_login_at` 落在近 24h 的**用户行数**（同一用户多次登录不重复计数）；users 序列的 `active_users` 是注册日期分组内的活跃人数（≤ 该组 `new_users`），**不能当全平台 DAU 趋势使用**。**密码与短信登录均不更新 `last_login_at`**（⏳ 后端任务 #10 改为「**统一登录时间维护（三入口）**」：有效登录 = 凭据校验通过**且封禁检查通过后**刷新 `last_login_at`；微信登录现有更新发生在封禁检查之前，时机一并修正），修复前该指标不含密码与短信登录用户。

---

## 3. 用户管理

| 方法 | 路径 | 请求 | 说明 |
|------|------|------|------|
| GET | `/api/v1/admin/users` | Query: `keyword`（仅匹配昵称）、`page`、`page_size` | 列表 |
| GET | `/api/v1/admin/users/:id` | — | 详情（单行模型） |
| PUT | `/api/v1/admin/users/:id/status` | Body: `{ banned: true/false, reason }` | **封禁/解封**（banned 布尔，不是 status 字符串） |
| PUT | `/api/v1/admin/users/:id/credit-score` | Body: `{ delta, reason }` | 调整信用分 |
| GET | `/api/v1/admin/users/:id/qualifications` | Query: `status`（**数字 0/1/2**）、`page`、`page_size` | 该用户资质 |
| GET | `/api/v1/admin/qualifications` ⏳ | Query: `status`、`page`、`page_size` | **全局资质队列（后端任务单 #5 待补）**，补齐前不可用 |
| PUT | `/api/v1/admin/qualifications/:id/approve` | Body 按后端现契约为准 | 审核通过 |
| PUT | `/api/v1/admin/qualifications/:id/reject` | Body 按后端现契约为准（含 reason） | 审核拒绝 |

**首期约束**：
- 列表筛选仅有昵称关键词；手机号/角色/封禁状态/注册时间筛选为二期（后端任务单 #3）
- **用户响应字段为 camelCase**（`avatarUrl` / `isEmployer` / `isProvider` / `isAdmin` / `creditScore` / `createdAt`，见 modules/02 §4 示例）
- **封禁状态依赖（S05）**：用户列表 `banned` 字段 ⏳ 后端任务 **#3a**、用户详情 `banned` 字段 ⏳ 后端任务 **#4a**（均为独立 **P0**）。字段就绪前列表/详情均无封禁状态——前端规则：**字段缺失 = 状态「未知」，封禁与解封按钮双双禁用**；`undefined ≠ false`，**禁止把未知当未封禁**；操作成功后重新拉取服务端状态，不本地翻转
- 资质 status 为数字：`0=待审核`、`1=已通过`、`2=已拒绝`（前端映射显示）
- 证件图片：`GET /api/v1/upload/cert/:fileId`，**鉴权 fetch + Bearer → Blob → Object URL**，用后释放；不走 JSON 信封解包器，禁止 `<img src>` 直链
- 用户模型不返回手机号（JSON 隐藏），列表无 phone_masked 字段，首期不展示手机号

---

## 4. 分类与热门分类

| 方法 | 路径 | 请求 | 说明 |
|------|------|------|------|
| GET | `/api/v1/admin/categories` | Query: `page`、`page_size` | **分页平铺列表**（非树），前端拉全部分页后按 **`parentId`**（camelCase）构树 |
| POST | `/api/v1/admin/categories` | Body: 分类对象 | 创建（最多三级，名称 ≤32 字） |
| PUT | `/api/v1/admin/categories/:id` | Body: 分类对象 | 更新 |
| DELETE | `/api/v1/admin/categories/:id` | — | 删除（**T06 冻结：引用存在即拒绝删除**，引用检查覆盖**全部状态**含历史已下架/已关闭记录；⏳ 任务单 #7 补 Service/Requirement 引用检查） |
| GET | `/api/v1/admin/featured-categories` | — | 热门聚合入口列表 |
| POST | `/api/v1/admin/featured-categories` | Body: `{ name, categoryIds: [...], sortOrder, isActive? }` | 创建聚合入口（**categoryIds 是数组**） |
| DELETE | `/api/v1/admin/featured-categories/:id` | — | 删除 |
| PUT | `/api/v1/admin/featured-categories/:id` ⏳ | — | 修改/排序（**后端无此路由，任务单 #7**，补齐前首期只做创建/删除） |

---

## 5. 动态表单模板（blocks DSL）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/form-templates` | 列表 |
| POST | `/api/v1/admin/form-templates` | 新建 |
| GET | `/api/v1/admin/form-templates/:id` | 详情 |
| PUT | `/api/v1/admin/form-templates/:id` | 编辑（version+1） |
| DELETE | `/api/v1/admin/form-templates/:id` | 软删除 |
| POST | `/api/v1/admin/form-templates/:id/clone` | 克隆 |

**模板结构（真实 DSL，与小程序共用，S02 修订）**：

```json
{
  "templateName": "家政服务描述模板",
  "categoryId": 12,
  "blocks": [
    {
      "blockId": "basic-info",
      "fields": [
        {
          "key": "area",
          "label": "房屋面积",
          "type": "single",
          "required": true,
          "options": [
            { "value": "lt50", "label": "50㎡ 以下" },
            { "value": "50-80", "label": "50-80㎡" },
            { "value": "80-120", "label": "80-120㎡" },
            { "value": "gt120", "label": "120㎡ 以上" }
          ]
        }
      ]
    }
  ]
}
```

- **`type` 合法值仅 5 种**：`single` / `multi` / `tags` / `drawer` / `wheel`。**`panel` 不是独立 type**——它是 `drawer` / `wheel` 字段的**嵌套属性**（`panel.mode`（chips/tab/wheel）/ `panel.multiple` / `panel.options` / `panel.groups` / `panel.wheels`），不存在 `type: "panel"`
- **必填 single/multi 必含非空 `options`**（`[{value, label}]`）——无 options 的必填单选「保存得进、发布用不了」（见下）
- 完整创建示例（含 tags/drawer/wheel 嵌套 panel 结构与对应提交值形态）见 [modules/03-content-management.md §3.3](./modules/03-content-management.md)
- 校验规则以 `service/form.go` / `validateTemplateResource` 为准；非法结构直接被拒绝
- 首期 JSON 编辑器 + 校验 + 预览；可视化编辑器为二期

> **⚠️ 「模板保存成功 ≠ 发布表单可提交」（S02 冻结）**：保存校验（`validateTemplateResource`：名称 1~64 字、key 唯一、type 合法）**不校验 options**；发布时的表单值校验（`ValidateForm`）要求提交值 ∈ options。JSON 编辑器需**同时跑两套规则**：保存校验 + 「必填单选/多选含非空 options、drawer/wheel 含合法 panel」的表单值校验预检，后者未通过要警告「可保存但无法用于发布」。

---

## 6. Service / Requirement 管理

| 方法 | 路径 | 请求 | 说明 |
|------|------|------|------|
| GET | `/api/v1/admin/services` | Query: `status`、`category_id`、`page`、`page_size` | 列表 |
| GET | `/api/v1/admin/services/:id` | — | 详情 |
| PUT | `/api/v1/admin/services/:id/status` | Body: `{ status }` | 上下架 |
| DELETE | `/api/v1/admin/services/:id` | — | **已发布 = 下架（软删）**，仅草稿可能物理删除 |
| GET | `/api/v1/admin/requirements` | Query: `status`、`category_id`、`page`、`page_size` | 列表 |
| GET | `/api/v1/admin/requirements/:id` | — | 详情 |
| PUT | `/api/v1/admin/requirements/:id/status` | Body: `{ status }` | 状态调整（**关闭后不可恢复为已发布**） |
| DELETE | `/api/v1/admin/requirements/:id` | — | 关闭（走剩余预付款退款流程） |

> 关键词搜索为二期（后端任务单 #3）。需求关闭后前端不提供恢复按钮，提示「如需重新发布请复制并重新预付」。

---

## 7. 订单管理

| 方法 | 路径 | 请求 | 说明 |
|------|------|------|------|
| GET | `/api/v1/admin/orders` | Query: `status`、`page`、`page_size` | 列表（当前仅支持 status 筛选） |
| GET | `/api/v1/admin/orders/:id` | — | 详情（单行模型） |
| PUT | `/api/v1/admin/orders/:id/status` | Body: `{ status, reason }` | **仅两个合法流转**，见下 |

**合法状态流转（冻结，无通用状态下拉）**：

| 动作 | 流转 | 必填 |
|------|------|------|
| 取消未支付订单 | 0 → 6 | reason |
| 验收完成 | 4 → 5 | reason |

- 其余状态流转后端拒绝，前端只渲染上述两个动作按钮
- 金额展示取订单自身的费率快照字段，**不按当前配置现场重算**

---

## 8. 退款管理

| 方法 | 路径 | 请求 | 说明 |
|------|------|------|------|
| GET | `/api/v1/admin/refunds` | Query: `status`、`page`、`page_size` | 列表（当前仅 status 筛选） |
| GET | `/api/v1/admin/refunds/:id` | — | 详情 |
| POST | `/api/v1/admin/refunds/:id/approve` | Body: `{ reason, finalAmount? }` | **通过也必填 reason**；finalAmount ≤ 申请额 |
| POST | `/api/v1/admin/refunds/:id/reject` | Body: `{ reason }` | 拒绝必填 reason |

> 裁定范围：仅退款状态 0/3 可裁定。关键词/申请人角色/日期筛选为二期（任务单 #3）。

---

## 9. 客服管理（首期缩减，S04 修订）

| 方法 | 路径 | 请求 | 说明 |
|------|------|------|------|
| GET | `/api/v1/admin/cs/me` ⏳ | — | **当前客服身份查询（后端任务单 #6a，T02 契约已冻结）**：已绑定 → 200 + `{ agentId, isOnline, displayName, isActive }`（isActive 区分「已停用但仍有绑定」；停用客服不能上线/接待）；未绑定 → 200 + `{ agent: null }`（普通客服展示绑定引导；**未绑定 super_admin 仍可查看全量会话元信息**，不做本人上线/接待动作）；角色范围 = 客服账号 + super_admin |
| GET | `/api/v1/admin/cs/agents` ⏳ | Query: `page`、`page_size` | 客服列表（**后端无此路由，任务单 #6a**） |
| POST | `/api/v1/admin/cs/agents` | Body: 客服配置（写 cs_agents 配置，**不设置用户 isAdmin**） | 仅 super_admin |
| POST | `/api/v1/admin/cs/agents/:id/status` | Body: `{ isOnline }` | 切换在线状态（仅限本人绑定的 agent；停用客服不能上线） |
| GET | `/api/v1/admin/cs/agents/online` ⏳ | — | 可转接目标查询（**任务单 #6a**）：在线且启用；角色 = customer_service / super_admin；**容量由后端转接事务再次校验**（列表过滤仅为展示优化） |
| GET | `/api/v1/admin/cs/sessions` | Query: `page`、`page_size` | 会话列表（列表管理权：super_admin 全部 / 客服本人）；**单行模型无用户昵称/头像——用户摘要（昵称/头像）⏳ #6a 会话摘要 DTO（join users），就绪前仅展示用户 ID**；**DTO 保留 `user1Id`/`user2Id` 供前端判断阅读资格**；**无搜索参数** |
| POST | `/api/v1/admin/cs/sessions/:conv_id/transfer` | Body: `{ toAgentId }` | **值为 cs_agents.id，不是 users.id**；**转接权仅当前接待人（后端服务实现，所有角色无豁免）**：super_admin 本人正在接待可转、非本人不得代转；容量由转接事务再次校验 |
| GET | `/api/v1/conversations/:id/messages` | Query: `page`、`page_size` | 历史消息（**消息阅读权 = 严格会话参与方，super_admin 不例外，无全会话豁免**）；数据为**已入库消息记录**（本地 chat_messages：系统卡片 + 活动文本），完整腾讯 IM 历史随 #6b |

**首期范围（冻结）**：
- **授权三分（S04，T02 升级）**：列表管理权（super_admin 看全部、客服看本人）/ 转接权（仅当前接待人，**后端校验 `conversation.user2Id == 当前用户 ID`，所有角色无豁免**）/ 消息阅读权（**严格参与方，super_admin 不例外**）。super_admin 在列表点开非本人参与会话时，**前端不发消息读取请求**，展示「仅参与方可查看历史消息」占位；**未绑定的 super_admin 仍可查看全量会话元信息**，但不能执行本人上线/接待动作、不能读取非参与消息；未绑定的普通客服展示绑定引导
- 做接待列表、会话流转、历史消息查看（已入库消息记录）；**无会话搜索**（服务端无参数支持）
- IM 发送链路（腾讯 IM 签名、身份映射、订单卡片协议、普通客服消息落库与 IM 全量历史）为独立后端任务（任务单 #6b），闭合前**不宣称聊天全流程完成**
- 客服账号准备走受控运维（seed / 初始化命令指定 admin_role），页面不做开户；POST agents 只是配置绑定，不是提权

---

## 10. Banner 与服务标签

| 方法 | 路径 | 请求 | 说明 |
|------|------|------|------|
| GET | `/api/v1/admin/banners` | — | 列表 |
| POST | `/api/v1/admin/banners` | Body: Banner 对象 | 创建 |
| PUT | `/api/v1/admin/banners/:id` | Body: Banner 对象 | 更新 |
| DELETE | `/api/v1/admin/banners/:id` | — | 删除 |
| GET | `/api/v1/admin/service-badges` | — | 列表 |
| POST | `/api/v1/admin/service-badges` | Body: `{ name, sortOrder, isActive? }` | 新增 |
| PUT | `/api/v1/admin/service-badges/:id` | Body: 标签对象 | 更新 |
| DELETE | `/api/v1/admin/service-badges/:id` | — | 删除 |

> Banner 图片上传依赖 biz_type 白名单扩展（`banner`、`category`，⏳ 任务单 #8）；补齐前 Banner/分类图标上传不可用。

---

## 11. 信用分规则 / 系统配置 / 服务费配置

| 方法 | 路径 | 请求 | 说明 |
|------|------|------|------|
| GET | `/api/v1/admin/credit-rules` | — | 规则列表 |
| PUT | `/api/v1/admin/credit-rules/:id` | Body: `{ delta, isActive }` | 更新（camelCase） |
| GET | `/api/v1/admin/system-configs` | — | 配置列表 |
| PUT | `/api/v1/admin/system-configs/:key` | Body: `{ value: "字符串" }` | 更新（value 为字符串） |
| GET | `/api/v1/admin/fee-config` | — | 服务费配置（已实现） |
| PUT | `/api/v1/admin/fee-config` | Body: `{ fee_rate, min_fee, payer, split_ratio? }` | 更新（**snake_case 例外**） |

**fee-config 字段（snake_case）**：
- `fee_rate`：十进制字符串，0~100，5 表示 5%
- `min_fee`：十进制字符串，≥ 0，**上限 9999999999.99**
- `payer`：`provider` / `employer` / `split`
- `split_ratio`：**雇主承担比例 0~1**；UI 直接展示「雇主承担百分比」，提交 `split_ratio = 雇主百分比 / 100`；payer≠split 时为 null

**输入精度冻结（S09，首期冻结）**：
- **雇主承担百分比为 0~100 的整数步进（UI 侧约束）**；`30.5%` 等小数百分比**前端明确拒绝**（30.5 → 0.305 会被后端拒绝），**不静默四舍五入**（资金分摊不允许静默改值）
- **所有提交值（fee_rate / min_fee / split_ratio）最多两位小数**，超出前端拦截
- **禁止科学计数法输入**（如 `1e-2`）
- 若未来需要小数百分比，**另立后端精度变更任务**（首期不做）

**生效范围**：影响随后读取当前配置的业务；已预付需求后续产生的订单仍使用原费率快照。

---

## 12. 操作日志

| 方法 | 路径 | 请求 | 说明 |
|------|------|------|------|
| GET | `/api/v1/admin/audit-logs` | Query: `page`、`page_size`（其他筛选以后端实际支持为准） | 日志列表 |

**真实结构**：`adminId`、`targetType`、`targetId`、`ip`（**可空**，后端有该字段；详情抽屉可选展示，null 显示「—」）、`userAgent`、`createdAt`；detail 为 `{ before, after }`。

- 不 join 管理员昵称/角色，前端展示 adminId（日志标准化 ⏳ 任务单 #9）
- action/targetType 值不保证枚举固定（可能是 `status`、`credit-score`、`users`、`orders`、`form-templates` 等），**未知值原样回退展示**
- 某些受控动作 before 为 null、reason 在 after 中；不假设每条日志都有完整 diff
- **信用分动作的 `after` 为请求增量结构（`{ delta, reason }`），`delta` 不是调整后的用户信用分**（S07 修正）

---

## 13. 文件上传

| 方法 | 路径 | 请求 | 响应 | 说明 |
|------|------|------|------|------|
| POST | `/api/v1/upload` | FormData: `file`、`biz_type` | `{ fileId, fileUrl }` | 单文件 |
| POST | `/api/v1/upload/batch` | FormData: **`files`（同名重复）**、`biz_type` | `{ files: [...] }` | 批量 |
| DELETE | `/api/v1/upload/:fileId` | — | — | 删除 |
| GET | `/api/v1/upload/cert/:fileId` | 鉴权 Bearer | **二进制** | 证件图片，Blob 方案 |

- biz_type 白名单：`avatar` / `background` / `cover` / `detail` / `checkin` / `review` / `cert`；**banner、category 待扩展**（⏳ 任务单 #8）
- 公开静态文件路径为 `/uploads/...`，附件一律使用服务端返回的 fileUrl，不手工拼 ORIGIN

---

## 14. 错误处理约定

| 维度 | 规则 |
|------|------|
| 成功 | `code === 0`，直接取 data |
| 参数错误 | HTTP 400 系，toast message |
| 令牌失效 | **仅受保护请求**的 HTTP 401 触发一次 refresh（同飞去重）；登录/refresh 的 401 不触发 |
| 无权限 | HTTP 403，按场景跳 403 页或 toast |
| 资源不存在 | code 10002 |
| 业务失败 | 按各域业务码（20001/20002/20003/20009/20012 等）映射 `lib/errorCodes.ts` |
| 未知 code | 展示 message 原文，不猜测 |

---

## 15. 首期接口子集状态

| 模块 | 首期接口数 | 状态 |
|------|-----------|------|
| 鉴权（login/refresh/logout/me） | 4 | login/refresh/logout 已实现；me 待补字段 ⏳#1 |
| 看板 | 4 | 已实现（现有统计口径） |
| 用户管理 | 7 | 已实现；全局资质队列 ⏳#5 |
| 分类/热门 | 7 | 已实现；热门 PUT ⏳#7 |
| 表单模板 | 6 | 已实现 |
| Service/Requirement | 8 | 已实现 |
| 订单 | 3 | 已实现 |
| 退款 | 4 | 已实现 |
| 客服 | 7 | agents 列表/目标/身份查询（cs/me）⏳#6a；IM 发送链路与全量历史 ⏳#6b |
| Banner/标签 | 8 | 已实现；banner 上传 biz_type ⏳#8 |
| 信用规则/系统配置/服务费 | 6 | 已实现（fee-config 在分支 codex/password-login-fee-config，提交 7afb63c） |
| 操作日志 | 1 | 已实现（标准化 ⏳#9） |

> OpenAPI 实际有 72 条 admin 接口；任务/勋章/活动消息等扩展不纳入首期。本清单为首期冻结子集。
