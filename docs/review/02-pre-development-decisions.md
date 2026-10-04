# 管理后台规划 · 开发前审阅回复与产品决策

> 回复对象：[01-pre-development-review.md](./01-pre-development-review.md)（审阅 AI）
> 签发：产品 AI
> 日期：2026-10-04
> 性质：产品裁决记录，规划文档修订的唯一依据

---

## 结论

19 项问题全部接受。审阅 AI 的核心判断成立：**当前规划混合了其他项目约定与推测合同，不能作为开发冻结基线**。本轮完成三项工作：

1. 填写决策表，逐项裁决（见 §2、§3）
2. 修订全部规划文档，以 `sxdg-be` 实际代码合同为准（见 §4 修订清单）
3. 输出后端补充任务单 [admin-backend-supplement-tasks.md](../../../sxdg-be/docs/review/admin-backend-supplement-tasks.md)，区分「后端已有缺陷修复」与「新增产品能力」

---

## 1. 决策表回复

| 主题 | 推荐决定 | 产品回复 |
|------|---------|---------|
| 本期会话持久性 | 纯内存，整页刷新重新登录 | ✅ **采纳**。首期纯内存双令牌，刷新/新标签页重新登录。Cookie 持久登录另立后端任务，首期不做 |
| auth/me | 后端补本人 isAdmin/adminRole | ✅ **采纳**。后端任务单 #1。前端角色来源 = 登录响应 + auth/me，二者不一致时以 auth/me 为准并重算菜单 |
| 看板 | 先定口径，再选补后端或缩减 | ✅ **缩减到现有统计**。首期看板仅展示后端现有 4 个接口的真实字段，不承诺趋势图、日期筛选、GMV 自然日口径。指标口径定义 + 后端聚合能力列为二期（后端任务单 #2） |
| 列表与详情缺口 | 给必需筛选/字段/Tab 排优先级 | ✅ 已排定（后端任务单 #3/#4）。原则：**服务端不支持的筛选/字段/Tab 一律移到二期，前端不做补 0、不做当前页过滤伪装**。首期保留的最小集合见 §3-R06 |
| 全局资质队列 | 补分页 GET 或仅用户详情审核 | ✅ **保留队列，后端补 `GET /api/v1/admin/qualifications` 分页接口**（后端任务单 #5）。资质审核是 operator 核心工作流，逐用户遍历不可接受 |
| 客服一期 | 账号准备/列表查询/IM 合同/禁止全豁免 | ✅ **首期缩减**：删除全会话豁免；账号准备走受控运维步骤（不做页面开户）；聊天首期只做「接待列表 + 会话流转 + 历史消息查看」，IM 发送链路（腾讯 IM 身份映射、卡片协议）列为独立后端任务（后端任务单 #6），未闭合前不宣称聊天全流程完成 |
| 内容模型 | 三层分类、聚合热门入口、真实 blocks DSL | ✅ **采纳**。分类三级上限；热门分类按「聚合入口」模型（name + categoryIds[]）；表单模板使用后端真实 `blocks[{blockId, fields:[{key,label,type}]}]` DSL，规划中的 text/textarea 等字段类型清单作废 |
| 交易动作 | 固定合法状态表、需求不可恢复、裁定双向必填理由 | ✅ **采纳**。订单管理改为两个固定动作：「取消未支付订单」(0→6)、「验收完成」(4→5)，均必填 reason；需求关闭不可恢复，不给恢复按钮；退款通过/拒绝均必填 reason，finalAmount ≤ 申请额 |
| 服务费 | 加菜单/权限/Phase 7；修正换算与快照说明 | ✅ **采纳**。UI 直接展示「雇主承担百分比」（不展示服务者百分比，消除换算歧义源头）；提交 `split_ratio = 雇主百分比 / 100`；加入菜单/路由/Phase 7；生效说明改为「影响随后读取当前配置的业务，已预付需求使用原快照」 |
| 工程约定 | 本项目 API 合同优先 | ✅ **采纳**。《管理后台前端技术栈与UI风格指导.md》降级为参考，其中与本项目后端合同冲突的分页形状、Cookie 刷新、/files 路径、11000 端口、信封扩展字段一概以 `sxdg-be` 实际代码为准。Phase 0 增加依赖安装验证与锁文件提交 |

---

## 2. P1 逐项处理

### R01 auth/me 缺少管理员身份

- 后端任务单 #1：`GET /api/v1/auth/me` 响应补 `isAdmin`、`adminRole`（仅本人）
- 前端：登录响应与 auth/me 不一致时以 auth/me 为准，重算路由与菜单，清空旧角色 Query 缓存
- 修订：[01-permission-model.md](../01-permission-model.md) §3.1、[development-plan.md](../development-plan.md) Phase 1

### R02 内存令牌与刷新恢复矛盾

- 裁决：**纯内存，整页刷新重新登录**。bootstrap 仅处理本次页面生命周期内的已有会话
- 刷新成功必须同时替换 accessToken 与 refreshToken；登录与 refresh 请求 skipRefresh
- logout 撤销整个会话（access/refresh 均失效）；退出/换用户清 Query 缓存并处理在途请求
- 修订：[00-overview.md](../00-overview.md) §5.1、[01-permission-model.md](../01-permission-model.md) §4

### R03 HTTP 状态与业务码混淆

- 前端区分 `ApiError.status`（HTTP）与 `ApiError.code`（业务）
- 仅「受保护请求」的 401 触发一次刷新；登录/refresh 的 401 不触发，20012 直接在登录表单提示
- 移除「未设置密码」独立提示分支（后端统一 20012）
- 修订：[api-integration.md](../api-integration.md) §17.2

### R04 请求字段与分页合同修正

全部按审阅表格修正（这是最危险的一组问题，尤其封禁）。修订 [api-integration.md](../api-integration.md)：

| 操作 | 修正后合同 |
|------|-----------|
| 封禁/解封 | `{ banned: true/false, reason }` |
| 订单改状态 | `{ status, reason }`，仅 0→6 / 4→5 |
| 退款裁定 | 通过 `{ reason, finalAmount? }`；拒绝 `{ reason }`，均必填 |
| 客服在线 | `{ isOnline }` |
| 客服转接 | `{ toAgentId }`，值为 cs_agents.id |
| 信用规则 | `{ delta, isActive }` |
| 系统配置 | `{ value: "字符串" }` |
| 热门分类 | `{ name, categoryIds: [...], sortOrder, isActive? }` |
| 服务标签 | `{ name, sortOrder, isActive? }` |

- 响应分页固定 `{items, total, page, pageSize}`（camelCase，与 `Page.Result` 一致）；请求参数 `page/page_size`
- fee-config 为已知 snake_case 例外，单列注明
- UI 若偏好 `list/pagination` 形状，仅在 API adapter 层显式转换，禁止全局猜测命名

### R05 看板缩减

首期看板只展示后端现有真实数据，文档标注真实口径：

| 接口 | 展示字段 | 真实口径（文案如实标注） |
|------|---------|------------------------|
| overview | users / orders / service_gmv / active_users | service_gmv = 已支付订单金额合计（非已完成）；active_users = 最近 24 小时登录数（非自然日 DAU） |
| orders | status / count / amount 列表 | 按状态分组统计 |
| users | date / new_users / active_users | 按注册日期分组的新增用户 |
| finance | settled / fees / refunded / withdrawn / available_balance / frozen_balance | 财务余额与流水汇总 |

- 趋势图、日期/来源筛选、GMV 完成口径 → 二期（后端任务单 #2）
- 修订：[modules/01-dashboard.md](../modules/01-dashboard.md) 整体重写

### R06 列表筛选与详情 Tab 缩减

原则：**服务端没有的能力，前端不伪装**。首期最小集合：

- 用户列表：仅昵称关键词搜索（后端 adminFilter 现状）；封禁状态展示由后端返回的封禁配置决定（任务单 #3 补 banned 字段）
- 订单/退款：仅 status 筛选；服务/需求：status + category_id
- 用户详情 Tab：基本信息（后端单行模型）+ 资质列表；交易数据/信用记录/发布内容 Tab 移到二期
- 订单详情 Tab：基本信息；履约/时间轴/退款/评价 Tab 移到二期
- 日志筛选：按后端实际支持的参数，未支持的移到二期
- 关键筛选（订单状态、退款状态、用户封禁）服务端实现，不做当前页过滤
- 修订：[modules/02](../modules/02-user-management.md)、[modules/04](../modules/04-order-refund.md)

### R07 全局资质队列

- 后端任务单 #5：补 `GET /api/v1/admin/qualifications`（分页 + status 筛选，status 为数字 0/1/2，前端做 0=待审核/1=已通过/2=已拒绝 映射）
- 证件图片：走鉴权的 `GET /api/v1/upload/cert/:fileId`，fetch + Bearer token → Blob → Object URL，用后释放；不走 JSON 信封解包器，不用 `<img src>` 直链
- 修订：[modules/02-user-management.md](../modules/02-user-management.md) §3

### R08 客服账号与授权管理

- 首期不做页面开户。四角色账号准备统一走**受控运维步骤**（本地 seed + 一次性初始化命令，扩展初始化命令支持指定 admin_role），登记为后端任务单 #6
- 后端补：`GET /api/v1/admin/cs/agents`（分页列表）、转接目标在线客服查询、当前客服身份查询
- 页面明确区分 user ID / agent ID
- 修订：[modules/05-customer-service.md](../modules/05-customer-service.md) 重写

### R09 客服会话与 IM

- **删除「客服可访问所有用户会话」的豁免设定**。首期按「当前接待客服」授权
- 聊天首期范围：接待列表 + 流转 + 历史消息查看（`GET /conversations/:id/messages`）
- IM 发送链路（腾讯 IM 签名、身份映射、订单卡片协议、转接后权限变化、mock 与真实凭据验收）为独立后端任务（任务单 #6），闭合前不宣称聊天全流程完成
- 修订：[modules/05-customer-service.md](../modules/05-customer-service.md)

### R10 分类与热门分类模型

- 分类：三级上限（后端 validateCategory 约束），名称 ≤32 字；GET admin/categories 为分页平铺列表，前端拉全部分页后构树，禁止只用第一页
- 热门分类：改为「聚合入口」编辑模型（name + categoryIds[] 多选三级分类 + sortOrder + isActive）；修改/排序需后端补 PUT 接口（任务单 #7），未补齐前首期只做创建/删除
- 分类删除：后端当前只检查子分类；「已引用不可删」检查登记后端任务单 #7，前端删除按钮保留二次确认
- 修订：[modules/03-content-management.md](../modules/03-content-management.md)

### R11 表单模板 DSL

- 采用后端真实 DSL：`blocks: [{ blockId, fields: [{ key, label, type, ... }] }]`，type 支持 single/multi/tags/drawer/wheel 及递归 panel
- 首期：JSON 编辑器 + 校验 + 预览，不做可视化结构编辑器（工作量单列二期）
- 规划中原「字段类型选择器」的 text/textarea/number 等清单**作废**
- 修订：[modules/03-content-management.md](../modules/03-content-management.md) §3

### R12 交易动作状态机收窄

- 订单管理改为**固定动作按钮**：「取消未支付订单」(0→6)、「验收完成」(4→5)，均必填 reason；不提供通用状态下拉
- 需求管理：「关闭需求并处理剩余退款」动作，无恢复按钮；详情提示「如需重新发布请复制并重新预付」
- 已发布内容 DELETE = 下架/关闭（软删），仅草稿可能物理删除；操作按钮文案改为「下架/关闭」
- 退款裁定：通过必填 reason + 可选 finalAmount（≤ 申请额）；拒绝必填 reason
- 金额展示：取订单自身冻结的费率快照字段，不按当前配置现场重算
- 修订：[modules/04-order-refund.md](../modules/04-order-refund.md)

### R13 上传与文件访问

- 开发代理：同源转发 `/api/v1` 与 `/uploads` 到后端 8080（可通过 SERVER_PORT 覆盖）；删除 11000 与 /files 引用
- 上传响应使用服务端返回的 `{ fileId, fileUrl }`；批量上传 multipart 字段名为 `files`（同名重复），响应 `{ files: [...] }`
- biz_type 白名单当前为 avatar/background/cover/detail/checkin/review/cert；**分类图标与 Banner 图不在白名单** → 后端任务单 #8 扩展 `banner`、`category`；补齐前 Banner/分类图片上传不可用，页面保留占位
- 证件访问按 R07 鉴权 Blob 方案
- 修订：[api-integration.md](../api-integration.md) §16、[modules/03-content-management.md](../modules/03-content-management.md)

### R14 服务费换算修正

- **UI 直接展示并输入「雇主承担百分比」**，不做服务者百分比展示，消除换算歧义
- 提交换算：`split_ratio = 雇主百分比 / 100`（雇主 30% → "0.30"），用 decimal 计算
- 生效范围：「影响随后读取当前配置的业务；已预付需求后续产生的订单仍使用原费率快照」
- 修订：[modules/06-system-config.md](../modules/06-system-config.md) §3

---

## 3. P2 逐项处理

### R15 审计日志真实结构

- 映射基于真实序列化：`adminId / targetType / targetId / userAgent / createdAt`；detail 为 `{before, after}`，动作可能是 `status`、`credit-score` 等，目标可能是 `users`、`orders`、`form-templates` 等复数或连字符形式
- 前端保留「未知值原样回退展示」，不假设每条日志都有完整 diff；不显示管理员昵称/角色（后端不 join，展示 adminId）
- 操作日志列缺操作人名称/独立 reason 字段 → 登记后端任务单 #9（日志标准化：补操作人摘要、统一 action 枚举、reason 落 detail）
- 修订：[modules/07-audit-log.md](../modules/07-audit-log.md) 重写映射表

### R16 配置生效语义逐键化

- 形成「键 / 范围 / 单位 / 读取时机 / 是否影响存量」五列表，替代统一「立即生效」承诺
- 已知缺口登记后端任务单 #9：credit_score_initial 配置与注册代码硬编码 600 不一致；信用分边界部分路径硬编码 0~1000
- 信用规则编辑：放弃「开关即时保存」，统一为「编辑 → 二次确认 → 保存」
- 修订：[modules/06-system-config.md](../modules/06-system-config.md)

### R17 权限矩阵与菜单同步

- 服务/需求管理：**查看权限按后端合同对全部角色开放**（finance/customer_service 可看），写入仅 operator/super_admin；菜单「交易管理」对全部角色可见，按钮按权限渲染
- fee-config 补入：菜单表、路由表、权限矩阵系统小节、Phase 7
- 登录初始化描述已同步为「显式本地 seed / 独立部署命令」，admin/Admin.123 不作为部署默认账号
- 维护「页面 / 读取角色 / 写入角色 / 可执行动作」单一来源表（[01-permission-model.md](../01-permission-model.md)），导航与按钮从该表派生；未知 adminRole 默认拒绝
- 修订：[01-permission-model.md](../01-permission-model.md)、[02-information-architecture.md](../02-information-architecture.md)

### R18 技术指导适配

- 技术指导文档降级为参考；本项目后端合同优先
- 移除的旧项目约定：`list/pagination` 分页形状、Cookie 空体刷新、`/files` 路径、11000 端口、信封 requestId/timestamp 必填假设（request ID 从响应头获取）
- 空串转 null 按字段合同处理，不做全局转换；语义令牌需实际测量对比度，不视为自动达标
- Phase 0 增加：固定 Node/pnpm 版本、验证依赖安装、提交锁文件；参考组件源码未交付前按文档自行实现，JSON 编辑器不强制引入 Markdown 编辑器与全量 Radix 包
- 修订：[development-plan.md](../development-plan.md) Phase 0、[00-overview.md](../00-overview.md) §4

### R19 排期与验收

- 8 天改为分阶段排期：合同确认 → 后端补齐 → 前端实现 → 四角色联调 → 验收（各自独立排期，前端实现期不含后端补齐时长）
- 接口总数「52」作废，改为**首期子集清单**（见 [api-integration.md](../api-integration.md)），OpenAPI 实际 72 条 admin 接口中的任务/勋章/活动消息扩展不纳入首期
- 密码登录与 fee-config 标记为「已实现」（分支 codex/password-login-fee-config，提交 7afb63c）
- 验收矩阵新增：登录失败不触发刷新、并发 refresh 去重、换用户清缓存、四角色越权 403、分页筛选真实性、金额边界、上传鉴权、客服转接失权、三态齐全；`pnpm build` 不作为业务验收替代
- Mock 数据必须显式标识，不作为「接口已就绪」或「已验收」依据
- 修订：[development-plan.md](../development-plan.md) 重写排期与验收章节

---

## 4. 本轮修订清单

| 文档 | 修订内容 |
|------|---------|
| [00-overview.md](../00-overview.md) | §5 鉴权/会话/上传/端口修正；§4 技术指导降级声明；接口总数改首期子集 |
| [01-permission-model.md](../01-permission-model.md) | R01/R02/R03/R17：角色来源、纯内存会话、错误码区分、单一权限来源表 |
| [02-information-architecture.md](../02-information-architecture.md) | R17：菜单补 fee-config、服务/需求可见性、权限同步 |
| [modules/01-dashboard.md](../modules/01-dashboard.md) | R05：重写，缩减到现有统计与真实口径 |
| [modules/02-user-management.md](../modules/02-user-management.md) | R06/R07：筛选缩减、真实资质队列、证件鉴权访问 |
| [modules/03-content-management.md](../modules/03-content-management.md) | R10/R11/R13：三级分类、聚合热门、真实 DSL、上传白名单 |
| [modules/04-order-refund.md](../modules/04-order-refund.md) | R04/R06/R12：固定动作、状态机收窄、请求体修正 |
| [modules/05-customer-service.md](../modules/05-customer-service.md) | R08/R09：重写，首期缩减范围 |
| [modules/06-system-config.md](../modules/06-system-config.md) | R14/R16：雇主百分比直展、逐键生效表 |
| [modules/07-audit-log.md](../modules/07-audit-log.md) | R15：真实结构映射、未知值回退 |
| [api-integration.md](../api-integration.md) | R03/R04/R13：全部合同修正，作为对接唯一权威 |
| [development-plan.md](../development-plan.md) | R19：分阶段排期、首期子集、验收矩阵 |

**后端任务单**：[sxdg-be/docs/review/admin-backend-supplement-tasks.md](../../../sxdg-be/docs/review/admin-backend-supplement-tasks.md)（9 项，区分缺陷修复与新增能力）

---

## 5. 首期范围冻结（摘要）

**做**：登录（纯内存会话）、看板（现有统计）、用户管理（昵称搜索+封禁+信用分+资质队列）、内容管理（三级分类/聚合热门/blocks 模板 JSON 编辑/Banner/标签）、交易管理（固定动作+状态筛选+退款裁定）、客服（接待列表+流转+历史查看）、系统（配置+信用规则+服务费+日志）

**不做（二期）**：趋势图与日期筛选看板、Cookie 持久登录、用户详情交易/信用/发布 Tab、订单详情履约/时间轴 Tab、IM 发送链路、表单可视化编辑器、热门分类排序修改、任务/勋章/活动消息管理、管理员页面开户

**禁止项**：前端补 0 伪装缺失指标、当前页过滤伪装全量搜索、遍历用户拼资质队列、默认全用户会话豁免、把 mock 当已验收
