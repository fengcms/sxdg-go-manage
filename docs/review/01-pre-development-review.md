# 管理后台规划开发前审阅

审阅日期：2026-10-04。接收方：产品 AI / 产品 owner。审阅范围：docs 下全部 14 份现有规划、技术指导及模块文档，对照后端当前分支 `codex/password-login-fee-config`（功能提交 `7afb63c`）、路由、handler/service/model、OpenAPI 和本地实际响应。

## 结论

产品分域、四角色模型、分阶段交付、统一组件/设计令牌和质量门禁方向合理，可作为后台规划骨架。**当前版本还不能作为直接开发的冻结合同**：文档混合了其他项目的技术约定、推测响应，以及尚未具备的后端能力。仅写“实际以后端为准”不能解决页面必需字段和接口缺失。

本次发现 **19 项问题：14 项 P1（相关模块开发前应解决）、5 项 P2（规划一致性与交付要求）**。其中不仅有文档错误，也有现有后端的真实缺口，分别列明。建议先确认 P1 的合同与补充范围，再下发实现任务；无需推翻技术栈或整个信息架构。

本轮只审阅和写文档，没有创建前端项目、改业务代码、修改原规划、调用业务写接口或发送消息给其他会话。使用本地开发账号登录后，对 9 个只读接口核验了响应字段；未保存密码、令牌、用户记录或金额数据，字段级证据见 [附录](01-api-shape-evidence.json)。

## 一、P1：开发前需明确的合同与能力

### R01：auth/me 实际不返回管理员身份，身份恢复逻辑无法成立

- 规划：`01-permission-model.md §3.1`、`development-plan.md Phase 1` 依赖 `GET /auth/me` 返回 isAdmin/adminRole。
- 证据：后端 `service.Profile`（`internal/service/profile.go`）及本地响应均缺少这两个字段；登录成功响应才有管理员摘要。
- 影响：按文档启动/刷新角色信息会把管理员误判为无权限，或只能一直使用登录时的陈旧角色。
- 建议：**后端补充本人身份接口的 isAdmin/adminRole**（只给本人，不扩大公开资料字段），并更新 OpenAPI；前端角色变化时重算路由与菜单、清除旧角色的 Query 缓存。不要用管理员用户详情接口解决身份自举。
- 责任：后端合同补充 + 权限文档修订。

### R02：内存双令牌与刷新页面静默恢复相矛盾

- 规划：总体 §5.1 要求两种 token 只在内存；技术指导 §7.1 又允许“空体借 HttpOnly Cookie”恢复；Phase 1 要求启动恢复会话。
- 证据：后端 Refresh handler 要求 JSON `{refreshToken}`；未设置 refresh cookie。auth/me 本身也需要 access token。
- 影响：浏览器整页刷新后两个 token 都消失，不能恢复；空体刷新会参数错误。
- 推荐首期：**保持纯内存，整页刷新或新标签页需重新登录**，bootstrap 只处理本次页面生命周期中的已有会话；若必须持久登录，单独批准 Cookie/BFF 合同，不把它当成已实现能力。
- 刷新成功必须同时替换 accessToken 与 refreshToken；logout 实际撤销会话，access/refresh 都失效，修正文档“仅把 refreshToken 加黑名单”的描述。退出/换用户要清 Query 缓存并处理在途请求，避免旧用户数据回填。
- 责任：产品明确体验 + 请求层合同。

### R03：把 HTTP 状态当业务码，会误处理登录失败和刷新流程

- 规划：`api-integration.md §17.2` 把 400/401/403 等写进 code 表；权限流程还保留“未设置密码”的独立提示。
- 证据：实际信封 code 是 10001、20001、20002、20003、20009、20012 等；密码登录统一失败为 HTTP 401 / code 20012。
- 建议：明确区分 `ApiError.status` 与 `ApiError.code`。仅受保护请求的令牌失效走一次 refresh；登录/refresh 请求必须 skipRefresh，20012 留在登录表单提示。不得对每个 HTTP 401 无条件刷新。移除独立“未设置密码”分支。
- 责任：对接清单与请求层规范。

### R04：请求命名、分页和响应字段存在多套互不兼容合同

- 规划：总体使用 `{items,total,page,pageSize}`；接口清单使用 page_size 响应；技术指导 §6.1 强制 `list + pagination`。多个写接口用数据库 snake_case。
- 证据：后端 `Page.Result` 实际返回 `{items,total,page,pageSize}`，请求分页为 page/page_size；常规模型多为 camelCase，**fee-config 是已明确的 snake_case 例外**。
- 以下必须逐项修正，不能全局猜测或无差别转换命名：

| 操作 | 规划写法 | 当前后端实际合同 |
|---|---|---|
| 封禁/解封 | `{status:"banned"/"normal",reason}` | `{banned:true/false,reason}` |
| 订单改状态 | `{target_status,reason}` | `{status,reason}` |
| 退款裁定通过 | `{}` 或 `{amount}` | `{reason,finalAmount?}`，通过和拒绝均要求理由 |
| 客服在线 | `{is_online}` | `{isOnline}` |
| 客服转接 | `{target_agent_id}` | `{toAgentId}`，值为 cs_agents.id，不是 users.id |
| 信用规则 | `{delta,is_active}` | `{delta,isActive}` |
| 系统配置 | `{config_value}` | `{value:"字符串"}` |
| 热门分类 | `{category_id,sort_order}` | `{name,categoryIds:[...],sortOrder,isActive?}` |
| 服务标签 | `{name,sort_order}` | `{name,sortOrder,isActive?}` |

- **封禁尤其危险**：通用绑定忽略未知 status，banned 留为 false，可能把“封禁”操作执行成解封。该问题不能仅作为显示文案差异处理。
- 建议：固定本项目传输合同，若 UI 偏好 list/pagination，仅在 API adapter 显式转换；更新实际请求/响应例子和生成类型，不能让参考项目的硬性分页形状覆盖本项目 API。
- 证据位置：`handler/admin.go`、`service/admin_action.go`、`service/admin_resource.go`、`service/pagination.go`。

### R05：看板主要字段、趋势与时间筛选尚未实现

- 规划：`modules/01-dashboard.md` 给出 total_gmv、today_dau、daily、daily_income 等对象响应，并承诺日期/来源筛选。
- 实际：`service.Dashboard` **四个接口均返回数组**，没有接收日期或来源过滤：

| 接口 | 当前数组元素字段 |
|---|---|
| overview | users、orders、service_gmv、active_users |
| orders | status、count、amount |
| users | date、new_users、active_users |
| finance | settled、fees、refunded、withdrawn、available_balance、frozen_balance |

- 指标口径也不相同：service_gmv 汇总已支付订单 amount，而规划称已完成订单金额；active_users 是最近 24 小时登录计数，不是按自然日事件统计的 DAU；users 按注册日期分组，不能当作每日活跃趋势。
- 建议：产品确定 GMV（退款、取消是否扣除）、活跃定义、上海时区自然日边界、筛选作用范围与零数据表现；后端补正式 DTO/聚合查询，或首期删去趋势和未提供指标。**不允许前端将缺失指标补 0、将当前页数据当全平台统计。**
- 责任：指标产品定义 + 后端新增能力，不能只改字段映射。

### R06：大量列表筛选与详情 Tab 没有对应数据支持

- 规划：用户手机号/ID/角色/封禁/日期筛选、订单多维筛选、退款关键词/角色/日期、日志多维筛选；用户交易/信用/发布内容、订单打卡/时间轴/退款/评价 Tab。
- 证据：`service.AdminRead/adminFilter` 目前用户 keyword 只匹配昵称；订单/退款只处理 status；服务/需求处理 status、category_id；后台日志未处理规划筛选。详情通常仅返回单行模型，不自动 join 或聚合附件、履约记录等。用户模型不返回 phone_masked、封禁状态、completed_orders，手机号被 JSON 隐藏。
- 建议：给每张表与每个 Tab 标明实际来源和合同；关键筛选在服务端实现，不能过滤当前一页伪装全量搜索。用户封禁状态需后端读取现有封禁配置并返回，不能由前端猜测。详情聚合接口/子资源接口须另立后端任务，未具备项移到二期。
- 同时修订 OpenAPI：当前若干后台响应仍是开放 data schema，单靠 openapi-typescript 并不能生成规划中的业务字段。

### R07：全平台资质审核列表不存在，不能靠逐用户遍历补齐

- 规划：`modules/02-user-management.md §3` 独立全平台待审核列表，支持状态与证件类型筛选。
- 证据：路由仅有按用户的 `/admin/users/:id/qualifications` 和单项审核，没有全平台 GET qualifications；现有状态是数字 0/1/2，不是 pending/approved/rejected 字符串。
- 建议：补分页审核队列与合法过滤、必要用户摘要/证件类型字典；或者明确首期只从用户详情审核。禁止前端遍历用户列表拼队列。
- 证件图片使用鉴权的 `/api/v1/upload/cert/:fileId`：仅把 URL 塞进 img 不能附加 Bearer token，需鉴权 fetch Blob、释放 Object URL，并按二进制响应处理，不能走 JSON 信封解包器。

### R08：客服账号配置不等于管理员开户，且缺少查询与授权管理入口

- 规划：`modules/05-customer-service.md §1` 有客服列表、用户选择、编辑、在线切换、转接目标列表。
- 证据：只有 POST agents 与 POST agents/:id/status，没有 GET agents/当前客服身份查询。POST 写的是 cs_agents.userId 等配置；不会为 users 设置 isAdmin/adminRole，也不会创建密码。当前仅有一次性超级管理员初始化命令，没有 operator/finance/customer_service 的开户授权入口。
- 影响：绑定普通注册用户后，这个用户仍不能登录后台工作台；页面也无法可靠取得 agent ID、目标客服与容量。
- 建议：本期明确四角色账号如何安全准备/维护（受控运维步骤或单独开户任务），补客服分页列表、可转接目标、当前客服身份查询。区分 user ID / agent ID。不要偷偷把 POST agents 扩展成不经审批的提权接口。

### R09：客服全会话豁免与当前参与者隔离冲突，发送链路也未闭合

- 规划：客服模块末尾称客服角色可访问“所有用户的会话”，并要求历史、已读、文本/图片/订单卡片与实时推送。
- 证据：`service.Conversation` 只允许 user1_id/user2_id；普通客服只列出自己接待的 cs 会话。super_admin 能看后台会话列表，并不意味着能调用用户端消息接口读取所有会话。当前有 `POST /im/signature` 与服务端卡片投递，没有通用 HTTP 文本发送接口，也没有本项目 WebSocket 路由。
- 建议：删除默认全用户会话豁免，首期按“当前接待客服”授权；若要监督查阅，另设最小范围、可审计的后台消息权限。明确采用腾讯 IM SDK 的身份映射、发送/历史/已读归属、订单卡片协议、转接后的权限变化、mock 行为与真实凭据验收。不能把实时聊天当成仅差前端 UI。
- 责任：产品权限裁决 + IM 集成合同。首期未具备时拆出可交付的接待列表与转接，不宣称聊天全流程完成。

### R10：分类与热门分类的对象模型被误解

- 规划：内容模块 §1 允许无限级；热门分类按“每行一个分类”管理和拖拽排序；列表称后端返回分类树。
- 证据：`validateCategory` 最多三级（名称最多 32 字，规划为 16 可作为更严格 UI 约束但需明确）；GET admin/categories 实际是分页平铺列表。featured_categories 是**有名称、包含多个三级 categoryIds 的聚合入口**，不是 category_id 关联行；当前没有热门入口 PUT 排序路由。
- 建议：分类限定三级；明确树形接口补充或拉取全部分页后构树，不能只用第一页。热门页改为聚合入口编辑模型；现阶段只支持创建/删除，修改/排序若保留需补后端接口，不用删除再建模拟更新。
- 分类删除另有后端差异：规划要求已引用不能删，当前 adminDelete 只检查子分类并软删，未检查 Service/Requirement 引用。应登记后端补检验或裁决允许软停用语义，不把规划描述为已具备。

### R11：动态表单编辑器的字段 DSL 与后端完全不同

- 规划：内容模块 §3 使用 field/type=text、textarea、number、select、radio、image 等；名称 key 为 field。
- 证据：`service/form.go` 与 `validateTemplateResource` 使用 `blocks[{blockId,fields:[{key,label,type,...}]}]`，支持 single/multi/tags/drawer/wheel 及递归 panel。规划类型会直接被拒绝。
- 建议：先冻结和小程序共用的真实 DSL、完整有效样例、校验/预览规则；首期用 JSON 编辑器 + 校验 + 预览即可。“字段类型选择器 + JSON 预览”实际上已增加结构编辑能力，应单独估工作量。不要换成另一项目的表单协议。

### R12：交易按钮需按实际状态机收窄，尤其需求不能恢复上架

- 规划：交易模块泛称选择目标状态、需求下架/恢复/删除，金额摘要标固定 5%。
- 证据：后台订单仅允许 **0→6、4→5**（需 reason）；需求关闭走剩余预付款退款流程，`adminListingStatus` 明确拒绝关闭需求恢复为 2。已发布内容 DELETE 实际为下架/关闭，只有草稿可能物理删除。平台退款支持状态 0/3 裁定，finalAmount 不超过申请额，通过也必须 reason。
- 建议：用动作名与可执行状态表，分别展示“取消未支付订单”“验收完成”“关闭需求并处理剩余退款”；关闭需求引导复制并重新预付，不给恢复按钮。退款裁定填必需原因及上限校验。订单实付、服务价款、服务费、结算应取该笔冻结字段，不按当前 5% 现场重算。

### R13：上传代理、字段和文件读取约定来自旧项目

- 规划：技术指导代理 11000 与 /files，附件拼 ORIGIN+/files；内容模块读取 file_url；批量上传 files[]。
- 实际：默认后端 8080，公开文件 `/uploads/...`；上传返回 `{fileId,fileUrl}`，批量 multipart 名为 **files**（重复同名），响应 `{files:[...]}`。biz_type 白名单 avatar/background/cover/detail/checkin/review/cert，没有 banner/category。
- 建议：同源代理 `/api/v1` 与 `/uploads`，使用服务端返回 fileUrl。明确分类/Banner 使用哪个允许的 biz_type；证件访问按 R07。开发代理不是生产配置，还需约定生产反向代理与 SPA 路由回退。

### R14：费用分摊的提交换算仍然错误

- 位置：`modules/06-system-config.md §3.1`：“服务者百分比 = (1 - split_ratio) × 100，提交时除以 100”。
- 正确：如果输入的是服务者百分比，提交必须 **`split_ratio = 1 - 服务者百分比 / 100`**。输入服务者 70%，应提交雇主比例 `"0.30"`，不是 `"0.70"`。
- 推荐 UI 直接展示“雇主承担百分比”，降低歧义；必须用 decimal 转换。示例：价款 100、费率 5%、雇主比例 .30 → 实付 101.50、服务者结算 96.50。
- “修改后影响所有新订单”也需细化：已预付需求随后产生的订单仍使用原需求费率快照。

## 二、P2：规划与交付一致性

### R15：审计页假设的结构与真实日志不一致

- 规划 `modules/07-audit-log.md` 使用 admin_id/admin_name/admin_role、target_type 及顶层 reason，期望 ban_user/adjust_credit 等动作。
- 实际日志序列化是 adminId、targetType、targetId、userAgent、createdAt；不 join 管理员昵称/角色。audit 保存 `{before,after}`，具体动作可能为 status、credit-score，目标可能是 users/orders/form-templates 等复数或连字符。某些受控动作 before 为 null、reason 在 after 中；配置的 before/after 可能是字符串。
- 建议：基于真实样例制定映射并保留未知值回退；不能声称每条日志都有完整 before/after diff。需要标准化审计/补全操作人/记录所有变更原因时，列为后端任务。系统配置/信用规则当前并不普遍接收独立 reason，不能仅前端填一框就声称已审计。

### R16：配置“立即生效”需要逐键定义，现有后端也有缺口

- 规划 `modules/06-system-config.md §1/§4` 对全部配置统一承诺立即影响业务。
- 证据：付款/验收截止时间和结算时间在业务发生时写入，不会因为修改配置自动重算历史行；credit_score_initial 虽有种子配置，当前微信/短信注册代码仍直接使用 600，不能宣称改配置即改变新用户初始分。信用分边界在部分路径读取配置，管理员人工调整仍硬编码 0～1000。
- 建议：形成“键/范围/单位/读取时机/是否影响存量”的表；初始分和边界一致性登记后端修复。把泛化的“立即生效”改为具体提示。信用规则开关“即时保存”和“所有操作二次确认”二选一写清流程。

### R17：权限矩阵、菜单与开发任务尚未同步

- 后端和权限矩阵允许 finance/customer_service 查看服务、需求及部分内容，但路由与菜单只给 operator；这是可选的产品收窄，需明确，不应三份文档互相矛盾。
- `/system/fee-config` 已纳入首期，但菜单表、路由表、Phase 7 任务和权限矩阵系统小节未完整加入。
- 建议：维护一份“页面/读取角色/写入角色/可执行动作”的来源，派生导航和按钮；未知 adminRole 默认拒绝。登录初始化方式同步改为显式 mock seed / 独立部署命令，不把 admin/Admin.123 作为部署默认账号。

### R18：技术指导需要一份本项目适配清单，不能整份照搬为硬约束

- 可以沿用 React/TS 分层、Query、RHF/Zod、Biome、语义令牌、三态与无障碍目标。
- 必须替换旧项目特有的分页、Cookie、/files、11000 和信封扩展字段约定。后端信封不承诺 requestId/timestamp 必填；request ID 可从实际响应头获取，不能据缺字段判协议错误。
- 其他需统一：空串不能全局转 null（按字段合同处理）；bg-white 示例与“全部颜色语义化”、输入 text-sm 与“正文至少 16px”的适用范围需明确；语义令牌本身不能证明对比度达标，需实际测量。
- 文档称有可直接复制的参考组件，但当前 manage 目录只有文档，未交付参考组件源码。明确是否提供参考仓库或独立实现；JSON 模板编辑无需强制安装文章 Markdown 编辑器及全部 Radix 包。
- 本次未联网核验文档列出的具体依赖版本是否可安装，也不将版本组合判为不兼容；Phase 0 应固定 Node/pnpm、验证安装与构建后提交锁文件。未安装依赖、未初始化工程。

### R19：排期与验收还未覆盖真实依赖

- 8 天明确不含测试联调，因此不能作为可上线交付时间。Phase 0 的完整通用组件、请求刷新与四门门禁在半天内完成依赖于是否有可用脚手架；当前尚无。
- 接口总数“52”已过时：本地 OpenAPI 实际有 **72 条 admin 方法+路径**，包含本期未纳入的任务/勋章/活动扩展。应列首期实际子集而非按总数证明完备。密码登录与 fee-config 已实现，更新依赖状态。
- 建议将“合同确认/后端补齐/前端实现/四角色联调/验收”分别排期。纳入登录错误不刷新、并发 refresh、换用户清缓存、四角色越权、分页筛选、金额边界、上传鉴权、客服转接失权、数据三态、暗色键盘操作的验收，不以 pnpm build 代替业务验收。Mock 可用于开发，必须标识，不能作为接口已就绪或已验收的依据。

## 三、建议产品 AI 回复的决策表

| 主题 | 推荐决定 | 产品回复 |
|---|---|---|
| 本期会话持久性 | 纯内存，整页刷新重新登录；Cookie 持久登录另立后端任务 | 待填写 |
| auth/me | 后端补本人 isAdmin/adminRole，并输出明确 schema | 待填写 |
| 看板 | 先定指标口径，再选“补后端”或“缩减到现有统计” | 待填写 |
| 列表与详情缺口 | 给必需筛选/字段/Tab 排优先级，明确后端工单 | 待填写 |
| 全局资质队列 | 首期保留则补分页 GET；否则仅用户详情审核 | 待填写 |
| 客服一期 | 明确账号准备、列表/目标查询、IM 发送合同；禁止默认全会话豁免 | 待填写 |
| 内容模型 | 三层分类、聚合热门入口、真实 blocks DSL | 待填写 |
| 交易动作 | 固定合法状态表，需求关闭不可恢复，裁定双向必填理由 | 待填写 |
| 服务费 | 加入菜单/权限/Phase 7；修正换算和预付快照生效说明 | 待填写 |
| 工程约定 | 本项目 API 合同优先于参考项目写法；补运行环境/部署/验收约定 | 待填写 |

## 四、建议下一版交付给开发 AI 的材料

1. 同步更新总体、权限、导航、模块与接口清单，不只修改某一份。
2. 一份可执行合同：真实请求/响应样例、HTTP 与业务码、DTO 命名、分页、状态表、读写角色、失败行为。
3. 独立后端补充任务单，区分已有实现缺陷与新增产品能力；不要要求前端通过 N+1 查询或当前页过滤补出缺失能力。
4. 首期保留/删减/延期清单及验收矩阵。

修订后即可复审 P1 并开始开发，不需要重新设计整个后台。本轮没有修改任何后端代码或接口，评审结果也不视为已批准上述后端扩展。
