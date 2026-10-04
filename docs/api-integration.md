# 前后端接口对接清单（合同版）

> 状态：v2（按 [review/01-pre-development-review.md](./review/01-pre-development-review.md) R03/R04/R13 修正，以 sxdg-be 实际代码为准）
> 日期：2026-10-04
> 权威性：本文是管理后台前端对接的**唯一合同**。与《管理后台前端技术栈与UI风格指导.md》冲突时，以本文为准。
> 后端待补接口见 [sxdg-be/docs/review/admin-backend-supplement-tasks.md](../../sxdg-be/docs/review/admin-backend-supplement-tasks.md)（标注 ⏳ 的接口）。

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

### 0.3 命名约定

- 常规模型 JSON 为 **camelCase**
- **唯一已知例外**：`fee-config` 接口使用 snake_case（`fee_rate` / `min_fee` / `split_ratio`），单列注明，不做自动转换
- 数据库字段为 snake_case，但不出现在 JSON 传输中

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
| GET | `/api/v1/admin/dashboard/overview` | `users`（用户总数）、`orders`（订单总数）、`service_gmv`（**已支付订单金额合计**，非已完成）、`active_users`（**最近 24 小时登录数**，非自然日 DAU） |
| GET | `/api/v1/admin/dashboard/orders` | `status`、`count`、`amount`（按状态分组） |
| GET | `/api/v1/admin/dashboard/users` | `date`、`new_users`、`active_users`（按注册日期分组） |
| GET | `/api/v1/admin/dashboard/finance` | `settled`、`fees`、`refunded`、`withdrawn`、`available_balance`、`frozen_balance` |

> 四个接口均返回**数组**，不接受日期/来源筛选。趋势图、日期筛选、自然日口径为二期（后端任务单 #2）。前端禁止将缺失指标补 0。

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
- 资质 status 为数字：`0=待审核`、`1=已通过`、`2=已拒绝`（前端映射显示）
- 证件图片：`GET /api/v1/upload/cert/:fileId`，**鉴权 fetch + Bearer → Blob → Object URL**，用后释放；不走 JSON 信封解包器，禁止 `<img src>` 直链
- 用户模型不返回手机号（JSON 隐藏），列表无 phone_masked 字段，首期不展示手机号

---

## 4. 分类与热门分类

| 方法 | 路径 | 请求 | 说明 |
|------|------|------|------|
| GET | `/api/v1/admin/categories` | Query: `page`、`page_size` | **分页平铺列表**（非树），前端拉全部分页后构树 |
| POST | `/api/v1/admin/categories` | Body: 分类对象 | 创建（最多三级，名称 ≤32 字） |
| PUT | `/api/v1/admin/categories/:id` | Body: 分类对象 | 更新 |
| DELETE | `/api/v1/admin/categories/:id` | — | 删除（后端当前仅检查子分类，引用检查 ⏳ 任务单 #7） |
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

**模板结构（真实 DSL，与小程序共用）**：

```json
{
  "blocks": [
    {
      "blockId": "...",
      "fields": [
        { "key": "area", "label": "房屋面积", "type": "single", "required": true }
      ]
    }
  ]
}
```

- `type` 支持：`single` / `multi` / `tags` / `drawer` / `wheel`，及递归 `panel`
- 校验规则以 `service/form.go` / `validateTemplateResource` 为准；非法结构直接被拒绝
- 首期 JSON 编辑器 + 校验 + 预览；可视化编辑器为二期

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

## 9. 客服管理（首期缩减）

| 方法 | 路径 | 请求 | 说明 |
|------|------|------|------|
| GET | `/api/v1/admin/cs/agents` ⏳ | Query: `page`、`page_size` | 客服列表（**后端无此路由，任务单 #6**） |
| POST | `/api/v1/admin/cs/agents` | Body: 客服配置（写 cs_agents 配置，**不设置用户 isAdmin**） | 仅 super_admin |
| POST | `/api/v1/admin/cs/agents/:id/status` | Body: `{ isOnline }` | 切换在线状态 |
| GET | `/api/v1/admin/cs/agents/online` ⏳ | — | 可转接目标查询（**任务单 #6**） |
| GET | `/api/v1/admin/cs/sessions` | Query: `page`、`page_size` | 我的接待中会话 |
| POST | `/api/v1/admin/cs/sessions/:conv_id/transfer` | Body: `{ toAgentId }` | **值为 cs_agents.id，不是 users.id** |
| GET | `/api/v1/conversations/:id/messages` | Query: `page`、`page_size` | 历史消息（需会话参与方授权） |

**首期范围（冻结）**：
- 授权模型：客服仅能访问**自己接待中**的会话，**无全用户会话豁免**
- 做接待列表、会话流转、历史消息查看
- IM 发送链路（腾讯 IM 签名、身份映射、订单卡片协议）为独立后端任务（任务单 #6），闭合前**不宣称聊天全流程完成**
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
- `min_fee`：十进制字符串，≥0
- `payer`：`provider` / `employer` / `split`
- `split_ratio`：**雇主承担比例 0~1**；UI 直接展示「雇主承担百分比」，提交 `split_ratio = 雇主百分比 / 100`；payer≠split 时为 null

**生效范围**：影响随后读取当前配置的业务；已预付需求后续产生的订单仍使用原费率快照。

---

## 12. 操作日志

| 方法 | 路径 | 请求 | 说明 |
|------|------|------|------|
| GET | `/api/v1/admin/audit-logs` | Query: `page`、`page_size`（其他筛选以后端实际支持为准） | 日志列表 |

**真实结构**：`adminId`、`targetType`、`targetId`、`userAgent`、`createdAt`；detail 为 `{ before, after }`。

- 不 join 管理员昵称/角色，前端展示 adminId（日志标准化 ⏳ 任务单 #9）
- action/targetType 值不保证枚举固定（可能是 `status`、`credit-score`、`users`、`orders`、`form-templates` 等），**未知值原样回退展示**
- 某些受控动作 before 为 null、reason 在 after 中；不假设每条日志都有完整 diff

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
| 客服 | 6 | agents 列表/目标查询 ⏳#6；IM 发送链路 ⏳#6 |
| Banner/标签 | 8 | 已实现；banner 上传 biz_type ⏳#8 |
| 信用规则/系统配置/服务费 | 6 | 已实现（fee-config 在分支 codex/password-login-fee-config，提交 7afb63c） |
| 操作日志 | 1 | 已实现（标准化 ⏳#9） |

> OpenAPI 实际有 72 条 admin 接口；任务/勋章/活动消息等扩展不纳入首期。本清单为首期冻结子集。
