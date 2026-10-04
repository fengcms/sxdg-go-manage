# 管理后台开发计划与排期

> 状态：v4（按 [review/06-third-round-decisions.md](./review/06-third-round-decisions.md) T05 裁决修订：执行顺序改「**后端批次 A 先行**」、验收 mock 两级边界、依赖表契约冻结标注、#10 改名「统一登录时间维护（三入口）」；v3 依据 [review/04-second-round-decisions.md](./review/04-second-round-decisions.md) S05/S10）
> 创建日期：2026-10-04
> 技术栈：React 19 + Vite + TS + Tailwind v4 + TanStack Query + RHF/Zod
> 对接合同：[api-integration.md](./api-integration.md)（唯一权威）；后端任务单 [admin-backend-supplement-tasks.md](../../../sxdg-be/docs/review/admin-backend-supplement-tasks.md)

---

## 1. 开发原则

1. **先骨架后血肉**：先搭建项目基础设施（路由、请求层、权限、布局），再逐个填充业务页面
2. **按角色优先级开发**：super_admin 全功能 → operator 内容运营 → finance 财务 → customer_service 客服
3. **合同先行**：开发某页面前，先以 [api-integration.md](./api-integration.md) v4 核对该页全部接口的真实参数与响应字段，**合同未冻结不开工**；缺失能力登记后端任务单，不由前端伪装
4. **mock 必须显式标识**：接口未就绪时可用 mock 先行开发，但 mock 数据必须显式标识（如 UI 角标 + 代码注释），接口就绪后替换；mock 不作为「接口已就绪」或「已验收」依据。验收的 mock 两级边界见 §6（真实后端 HTTP/DB/Redis 必须真实；外部客户端允许 mock 且记录开关；前端假响应不替代后端能力验收）
5. **每个 Phase 可独立交付**：每个 Phase 结束后 `pnpm build` 通过，可部署预览（构建通过 ≠ 业务验收）

---

## 2. Phase 划分

### Phase 0：项目初始化（0.5 天）

**目标**：搭建可运行的项目骨架，通过四门门禁。

**任务**：
- [ ] 固定 Node / pnpm 版本（`.nvmrc` / `packageManager` 字段），验证依赖可安装、可构建后**提交锁文件**
- [ ] `pnpm create vite` + React TS 模板，安装技术栈文档 §1 全部依赖
- [ ] 配置 `vite.config.ts`：`@` 别名、`strictPort`、`/api/v1` 与 `/uploads` 两条同源代理（默认 8080，`SERVER_PORT` 可覆盖）
- [ ] 配置 Biome + `tsconfig.json`（strict）
- [ ] 建立 `lib/utils.ts` 的 `cn()`
- [ ] 写 `src/index.css`：oklch 令牌 + `@theme inline` + `app-bg` + 三级 elevation
- [ ] 建立 `components/ui/` 原子组件（Button / Input / Textarea / Card / Dialog / Select / Label / Badge / Tabs / Table / Skeleton）
- [ ] 建立 `lib/request/`（core / errors / session / helpers）+ `errorCodes.ts`，含 401 同飞去重与 skipRefresh
- [ ] 建立 `hooks/useTableQuery.ts` + `hooks/useToast.ts` + `lib/queryClient.ts`
- [ ] 建立 `components/form/FormField.tsx` + 上层字段组件
- [ ] 建立 `components/data/`（DataTable / TablePagination）与 `components/feedback/`（ConfirmDialog / StateShell / FullPageLoading / QueryErrorState）
- [ ] 建立 `layouts/AdminLayout`（三档响应式侧栏）+ `router/`（懒加载 + 守卫）
- [ ] 四门门禁全绿：`pnpm typecheck && pnpm lint && pnpm test && pnpm build`

> 技术指导中的参考组件源码**未交付**，原子组件按文档描述自行实现；JSON 编辑器不强制引入 Markdown 编辑器与全量 Radix 包（按需裁剪，裁决 R18）。

**交付物**：可运行的空壳后台，登录页 + 空白首页布局。

---

### Phase 1：鉴权与布局（0.5 天）

**目标**：完成登录流程、权限控制、基础布局。

**任务**：
- [ ] 登录页（account + password）
  - `POST /api/v1/auth/login` 提交 `{ account, password }`
  - 失败统一 code 20012，提示「账号或密码错误」（不区分账号不存在 / 密码错误 / 未设置密码）；封禁 code 20009 单独提示
  - 登录 / refresh 请求 skipRefresh，401 不触发刷新
  - 校验返回的 `isAdmin`，非管理员提示「无后台权限」并丢弃令牌
- [ ] **纯内存会话**：双令牌仅存内存，**整页刷新 / 新标签页 = 重新登录**；bootstrap 仅处理本次页面生命周期内的已有会话
- [ ] 角色来源 = 登录响应 + `GET /api/v1/auth/me`（auth/me 补 isAdmin/adminRole 待后端任务单 #1，**未就绪前用登录响应兜底**）；二者不一致以 auth/me 为准，重算路由与菜单，清空旧角色 Query 缓存
- [ ] 刷新成功同时替换双令牌；登出撤销整个会话；**换用户清 Query 缓存、取消在途请求**
- [ ] `lib/permission.ts` 权限判定函数（未知 adminRole 默认拒绝）
- [ ] 路由守卫（未登录跳登录、无权限跳 403）
- [ ] 侧边栏菜单按权限渲染（派生自单一权限来源表）
- [ ] 顶部栏（管理员信息 + 退出登录）
- [ ] 403 / 404 页面

**依赖**：后端 login / refresh / logout 已实现；任务单 #1（auth/me 字段）就绪后启用角色校准。

**交付物**：登录 → 进入后台 → 按角色看到不同菜单；刷新页面重新登录。

---

### Phase 2：数据看板（1 天）

**目标**：展示后端现有 4 个统计接口的真实数据（现有口径，无趋势图、无日期筛选）。

**任务**：
- [ ] 运营总览页：4 个指标卡（users / orders / service_gmv / active_users）
- [ ] 订单统计页：按状态分组列表（status / count / amount）
- [ ] 用户统计页：按注册日期分组列表（date / new_users / active_users）
- [ ] 财务统计页（仅 finance / super_admin 可见）：余额与流水汇总
- [ ] **口径文案如实标注**：service_gmv = 已支付订单金额合计（非已完成）、active_users = **按已记录 last_login_at 统计的近 24 小时登录用户数**（用户行数非登录次数；**密码与短信登录暂不计入**，#10 修复后覆盖）、users 按注册日期分组（**每组 active_users ≤ new_users**，该注册日期用户群中的近期活跃人数）
- [ ] 不渲染任何后端不支持的日期 / 来源筛选控件；缺失指标**不补 0**

**依赖**：后端 `dashboard/*` 4 个接口已实现（现有口径）。

**交付物**：4 个看板页面，真实字段展示，口径标注清晰。

> 趋势图、日期筛选、GMV 自然日口径为二期（后端任务单 #2），首期不引入 recharts 相关任务。

---

### Phase 3：用户管理（1 天）

**目标**：管理员可查看用户、封禁/解封、调整信用分、审核资质。

**任务**：
- [ ] 用户列表页：筛选**仅昵称关键词**（后端 adminFilter 现状），status / 手机号 / 角色 / 注册时间筛选不渲染（任务单 #3）；响应字段 **camelCase**（avatarUrl / isEmployer / creditScore / createdAt）
- [ ] 用户详情页：首期 Tab 仅「基本信息 + 资质」；交易 / 信用 / 发布内容 Tab 移除（二期，任务单 #4）
- [ ] 封禁/解封操作：Body `{ banned: true/false, reason }`（二次确认 + **封禁与解封 reason 均必填**）；**状态门禁（S05）**：按钮仅由服务端 `banned` 字段决定，**字段缺失 = 状态「未知」，封禁与解封按钮双双禁用**（undefined ≠ false，禁止把未知当未封禁）；操作成功后**重新拉取服务端状态，不本地翻转**
- [ ] 调整信用分弹窗（仅 super_admin）：Body `{ delta, reason }`
- [ ] 资质审核列表页（operator）：全局队列 `GET /api/v1/admin/qualifications`（**依赖后端任务单 #5，未就绪则该页延后**，禁止遍历用户拼队列）
- [ ] 资质审核弹窗：status 数字 0/1/2 映射显示；证件图片走**鉴权 fetch Blob 方案**（Bearer token → Blob → Object URL，用后释放，禁止 `<img src>` 直链）

**依赖**：后端 users 接口已实现；资质队列 ⏳ 任务单 #5；**封禁状态字段 ⏳ 任务单 #3a（列表，独立 P0）+ #4a（详情，独立 P0）**——#3a/#4a 就绪前封禁/解封按「未知态 + 按钮禁用」交付。

**交付物**：用户管理首期流程（资质队列页视任务单 #5 就绪情况交付）。

---

### Phase 4：内容管理（2 天）

**目标**：运营可维护前台展示内容（按真实内容模型）。

**任务**：
- [ ] 分类体系页：**三级分类上限、名称 ≤32 字**（后端 validateCategory 约束）；GET 为**分页平铺列表，拉全部分页后构树**（禁止只用第一页）
- [ ] 热门分类页：**聚合入口模型**（`{ name, categoryIds[], sortOrder, isActive? }`，categoryIds 多选三级分类）；首期仅创建/删除，PUT 修改/排序待任务单 #7（不做删除重建伪装更新）
- [ ] 动态表单模板列表页
- [ ] 表单模板编辑器：blocks DSL（`blocks[{blockId, fields:[{key,label,type,required,options,maxCustom,panel}]}]`，**type 仅 single/multi/tags/drawer/wheel 五种；panel 是 drawer/wheel 的嵌套属性而非独立 type**）**JSON 编辑器 + 校验 + 预览**；保存校验与表单值校验（必填单选/多选含非空 options）**两套规则同时跑**；不做可视化编辑器（二期）
- [ ] Banner 管理页（列表 + 新建/编辑弹窗）：图片上传依赖 biz_type 白名单扩展（**任务单 #8，未就绪保留占位**，不接入不可用的上传）
- [ ] 服务标签页（列表 + 新增/编辑/删除）：Body `{ name, sortOrder, isActive? }`

**依赖**：后端 categories / form-templates / banners / service-badges 接口已实现；热门 PUT ⏳ #7、Banner 上传 ⏳ #8。

**交付物**：内容管理全部页面（Banner 图片上传视任务单 #8 就绪情况交付）。

---

### Phase 5：交易管理（1.5 天）

**目标**：可监控订单、裁定退款、管理服务/需求（按真实状态机）。

**任务**：
- [ ] 订单列表页：仅 status 筛选（后端现状）；状态徽标；**订单双方（雇主/服务者）仅展示用户 ID + 跳转链接**（单行模型无昵称/头像，禁止猜值与 N+1 拼凑；**列表维持 ID 展示（T06 冻结）**——#4 聚合仅详情，不做批量摘要）
- [ ] 订单详情页：首期 Tab 仅「基本信息」；履约 / 时间轴 / 退款 / 评价 Tab 移除（二期，任务单 #4）；**「服务者结算金额」首期不展示**（后端无该字段，禁止按当前费率现场推导；⏳ #4 聚合就绪后展示**结算对象及状态**——status=0=待结算、1=已入账，无流水返回 null 展示「暂无结算」，**不把待结算金额标作实收**）；**订单列表维持双方 ID 展示**（#4 聚合仅详情，不做批量摘要）
- [ ] **固定状态动作**（customer_service / super_admin，二次确认 + 必填 reason）：「取消未支付订单」0→6、「验收完成」4→5；**不提供通用状态下拉**
- [ ] 退款列表页（finance / customer_service）：仅 status 筛选；**来源列按 sourceType 导航**（sourceType=0 → 订单详情，sourceType=1 → 需求详情，**需求流拍退款不得链接到订单**）；关联订单号/金额列首期不展示（⏳ #4）
- [ ] 退款详情页 + 审核操作：通过 `{ reason, finalAmount? }`（finalAmount ≤ 申请额）、拒绝 `{ reason }`，**均必填 reason**（仅退款状态 0/3 可裁定）；**处理时间线首期不展示**（单行模型无数据，⏳ #4）
- [ ] 服务管理页（列表 + 详情 + 上下架 + 删除）：已发布内容 DELETE = 下架/关闭（软删），按钮文案「下架/关闭」；**可服务时段首期不展示**（二期随 #4 聚合 DTO）
- [ ] 需求管理页（列表 + 详情 + 关闭）：关闭走剩余预付款退款流程，**无恢复按钮**，提示「如需重新发布请复制并重新预付」

**依赖**：后端 orders / refunds / services / requirements 接口已实现。

**交付物**：交易管理首期全流程（固定动作 + 状态筛选 + 退款裁定）。

---

### Phase 6：客服管理（1 天）

**目标**：客服可查看接待会话并流转（首期缩减范围）。

**任务**：
- [ ] 客服账号管理页（super_admin）：客服配置绑定（**列表 / 转接目标 / 当前身份查询依赖后端任务单 #6a**，未就绪该部分延后）；区分 user ID / agent ID
- [ ] 客服工作台初始化：`GET /api/v1/admin/cs/me`（⏳ #6a）——已绑定取 `{ agentId, isOnline, displayName, isActive }`（`isActive=false` 停用客服不能上线/接待）；未绑定（`{ agent: null }`）按角色区分：**普通客服**展示引导态「当前账号未绑定客服」，**super_admin 仍可查看全量会话元信息**（不做本人上线/接待动作）
- [ ] 客服工作台：接待会话列表（`GET /api/v1/admin/cs/sessions`；客服仅自己接待中的会话，super_admin 看全部——列表管理权）；**无搜索框**（服务端无参数）；**用户仅展示 ID**（昵称/头像 ⏳ #6a 会话摘要 DTO）
- [ ] 在线状态切换：Body `{ isOnline }`
- [ ] 会话流转：转接 Body `{ toAgentId }`（值为 cs_agents.id；**转接权仅当前接待人——后端服务校验所有角色无豁免**：super_admin 本人接待可转、非本人不得代转；容量由转接事务再次校验）
- [ ] 历史消息查看：`GET /api/v1/conversations/:id/messages`（**消息阅读权 = 严格会话参与方，super_admin 不例外**；super_admin 打开非本人参与会话**不发请求**、展示「仅参与方可查看历史消息」占位）；页面标注「**已入库消息记录**」（完整腾讯 IM 历史随 #6b）

> **IM 发送链路移除**（任务单 #6b，独立排期）：文本 / 图片 / 订单卡片发送、已读上报、实时推送不在首期；闭合前不宣称聊天全流程完成。

**依赖**：后端 cs 会话接口已实现；agents 列表 / 目标查询 ⏳ 任务单 #6a；IM 链路 ⏳ 任务单 #6b（二期）。

**交付物**：接待列表 + 流转 + 历史消息查看。

---

### Phase 7：系统设置（0.5 天）

**目标**：super_admin 可调整系统参数、信用分规则与服务费配置。

**任务**：
- [ ] 系统配置页（列表 + 编辑 + 二次确认）：Body `{ value: "字符串" }`；生效语义按「键 / 范围 / 单位 / 读取时机 / 是否影响存量」逐键说明（见 modules/06-system-config.md），不做笼统「立即生效」承诺
- [ ] 信用分规则页（列表 + 分值编辑 + 启用开关）：Body `{ delta, isActive }`（camelCase）；流程统一「编辑 → 二次确认 → 保存」；**delta 校验为独立域：整数 -1000~1000（允许负值扣分规则），与 credit_score_min/max 总分边界分开**；初始分说明区标注「credit_score_initial 配置待修复（#9），当前实际生效值 600」
- [ ] 服务费配置页：**雇主承担百分比直展**（不展示服务者百分比）；提交 `split_ratio = 雇主百分比 / 100`（decimal 计算）；**首期精度冻结（S09）：百分比 0~100 整数步进（30.5% 前端明确拒绝、不静默四舍五入）、所有提交值最多两位小数、min_fee 上限 9999999999.99、禁止科学计数法**；**snake_case 例外**（`fee_rate` / `min_fee` / `split_ratio`）；生效说明=影响随后读取当前配置的业务，已预付需求沿用原快照
- [ ] 操作日志页（列表 + 详情抽屉）：真实结构展示（adminId / targetType / targetId / **ip（可空，null 显示「—」）** / userAgent / createdAt + detail `{before, after}`，信用分动作 after 为 `{delta, reason}` 请求增量结构），未知值原样回退

**依赖**：后端 system-configs / credit-rules / fee-config / audit-logs 接口已实现（fee-config 见提交 7afb63c）。

**交付物**：系统设置全部页面（含服务费配置）。

---

## 3. 分阶段总排期

仅报纯开发工期**不作为可上线交付时间**（须叠加联调与验收）。Phase 0~7 标注工期合计 **8 天**（0.5 + 0.5 + 1 + 1 + 2 + 1.5 + 1 + 0.5），与下表「前端实现」一致：

| 阶段 | 内容 | 工期 | 说明 |
|------|------|------|------|
| 1. 合同确认 | 各方复核 api-integration.md v4 与模块文档 | 0.5 天 | 冻结基线；前端基建（Phase 0~1：工具链/布局/会话/权限/分页骨架）可与后端批次 A 并行启动 |
| 2. 后端批次 A（**先行**） | **#1 → #3a/#4a（同批）→ #5 → #6a → #8 → #10**，通过交付门禁（路由 + 中文 Swagger + DTO/错误码/角色 + 测试 + 本地实测：真实 HTTP/DB/Redis + 四角色账号） | 前端基建并行期间 | **执行顺序（T05 冻结）：后端批次 A 先行**——交付门禁通过后**才进入前端业务页面开发**；前端基建不空等，业务页面待接口 |
| 3. 前端实现 | Phase 0~7 | 8 天 | 基建（Phase 0~1）与批次 A 并行；**业务页面（Phase 2~7）在批次 A 交付门禁通过后开发**；单人全职估算 |
| 4. 四角色联调 | super_admin / operator / finance / customer_service 全链路 | 1.5 天 | 含越权用例与刷新/换用户会话用例 |
| 5. 验收 | 按 §6 验收矩阵逐项核验 | 1 天 | 含金额边界与上传鉴权用例；mock 两级边界见 §6 说明 |

> **总排期含联调与验收**：约 11 天（0.5 + 8 + 1.5 + 1）。**不再表述为「后端与前端并行」**——正确顺序为：后端批次 A 先行，交付门禁通过后再进入前端业务页面开发；**前端基建（工具链/布局/会话/权限/分页骨架）可与后端批次 A 并行**。实际工期视后端任务单交付与需求变更调整。

### 3.1 部署范围（S10 裁决，冻结）

- **首期 = 本地联调交付**：Vite 开发代理将 `/api/v1` 与 `/uploads` 同源代理到后端（默认 8080，`SERVER_PORT` 可覆盖）。首期验收在本地联调环境完成
- **以下为二期部署验收项，首期不承诺**：生产环境反向代理（API/静态资源分流）、SPA 深链接回退（刷新非根路由不 404）、`/uploads` 静态路由的生产部署。首期文档与代码不宣称「可部署上线」

---

## 4. 前置依赖与风险

### 4.1 后端任务单状态（admin-backend-supplement-tasks.md，#1~#10，S05/S10 修订）

**优先级与批次总口径（第三轮冻结）**：**批次 A（先行）= #1 → #3a/#4a → #5 → #6a → #8 → #10**（#1/#3a/#4a/#5/#6a/#8 为 P0，#10 为 P1 紧接首批）；**批次 B（与前端业务开发并行）= #9（T03/T06 范围）+ 已冻结语义的 #3 其余 / #4 聚合 / #7**；**批次 C（独立立项）= #6b（先交 IM 合同再实现）、#2（口径冻结后）**。

| # | 任务 | 优先级 | 阻塞的前端页面 | 状态 |
|---|------|--------|---------------|------|
| #1 | auth/me 返回 isAdmin/adminRole | P0 | Phase 1 角色校准（可先以登录响应兜底） | ⏳ 待补 |
| #2 | 看板指标口径升级 | P1 | 二期（趋势图/日期筛选） | ⏳ 二期 |
| #3 | 列表筛选能力补齐（**除封禁字段外的其余部分**：关键词/时间等筛选） | P1 | 各列表筛选控件（二期） | ⏳ 待补 |
| **#3a** | **用户列表封禁 DTO（`banned` / `banReason` / `bannedAt`）与筛选**（从 #3 拆出，**T01 契约已冻结**） | **P0** | **Phase 3 用户列表封禁状态列与行操作入口**（就绪前「未知态 + 按钮禁用」） | ⏳ 待补 |
| **#4a** | **用户详情封禁 DTO（`banned` / `banReason` / `bannedAt`）**（从 #4 拆出，**T01 契约已冻结**，与 #3a 同批） | **P0** | **Phase 3 用户详情封禁/解封操作入口**（就绪前「未知态 + 按钮禁用」） | ⏳ 待补 |
| #4 | **订单/退款详情聚合 DTO**（双方昵称/头像、**结算对象及状态**（T06 冻结：status=0=待结算、1=已入账，无流水返回 null，不把待结算金额标作实收）、退款关联单号/申请金额；用户详情扩展 Tab 亦属此项；**仅详情聚合，订单列表不做批量摘要**） | P1 | 交易展示升级（回填首期移除项）与用户详情扩展 Tab（二期） | ⏳ 待补 |
| #5 | 全局资质审核队列 | P0 | Phase 3 资质审核列表页 | ⏳ 待补 |
| #6a | 客服基础查询：agents 列表 / 转接目标 / **`GET /api/v1/admin/cs/me` 当前身份查询**（未绑定返回 `{agent:null}`；已绑定含 `isActive`）/ **会话摘要 DTO（用户昵称/头像，保留 `user1Id`/`user2Id`）** / **转接权服务端校验（所有角色须 `conversation.user2Id == 当前用户 ID`，移除 super_admin 豁免）**（**T02 已冻结**） | P0 | Phase 6 客服账号页、转接目标、工作台身份初始化；会话列表用户摘要 | ⏳ 待补 |
| #6b | IM 集成合同（发送链路、已读回执、普通客服消息落库、腾讯 IM 全量历史） | P1 | 二期（IM 发送链路） | ⏳ 二期 |
| #7 | 热门分类 PUT / 分类删除校验（**T06 已冻结**：引用存在即拒绝删除、引用检查覆盖全部状态；维持平铺分页、不做树接口） | P1 | Phase 4 热门分类修改/排序 | ⏳ 待补 |
| #8 | 上传 biz_type 扩展（banner/category） | P0 | Phase 4 Banner/分类图片上传 | ⏳ 待补 |
| #9 | 审计日志标准化 / 配置一致性（含 credit_score_initial 修复） | P1 | Phase 7 日志操作人展示（先按现状展示 adminId） | ⏳ 待补 |
| **#10** | **统一登录时间维护（三入口）**：密码 / 短信 / 微信登录统一——有效登录 = 凭据校验通过**且封禁检查通过后**刷新 `last_login_at`（现状：密码与短信均不更新；微信更新但发生在封禁检查之前，时机一并修正） | P1 | Phase 2 看板活跃口径补全（修复前标注「密码与短信登录暂不计入」） | ⏳ 待补 |

> 密码登录 + fee-config 已实现（分支 codex/password-login-fee-config，提交 7afb63c），不再是前置依赖。开发前建议跑一次 `scripts/smoke_curl.py` 验证已实现接口。
> **S05 修正说明**：原表把 #4 整项列为二期、详情仅引用 #3，导致封禁按钮在首期没有状态依据——现已拆出 **#3a（列表）/ #4a（详情）为独立 P0**；#4 聚合 DTO 为 P1，仅承载首期移除展示项的回填。

### 4.2 风险项

| 风险 | 影响 | 应对 |
|------|------|------|
| 封禁状态字段未就绪（#3a/#4a 独立 P0） | 封禁/解封按钮无状态依据 | 字段缺失 = 状态「未知」，封禁与解封按钮**双双禁用**；undefined ≠ false，禁止把未知当未封禁；操作成功重新拉取服务端状态 |
| IM 发送链路未闭合（#6b 独立排期） | 客服模块无法全流程交付 | 首期只交付接待列表 + 流转 + 历史查看（已入库消息记录）；不宣称聊天完成 |
| 热门分类 PUT 未补（#7） | 热门入口无法修改/排序 | 首期只做创建/删除；不做删除重建伪装更新 |
| banner biz_type 未扩展（#8） | Banner/分类图片不可上传 | 页面保留占位与说明，不接入不可用上传 |
| 资质队列未补（#5） | operator 核心工作流缺失 | 该页延后至任务单就绪；禁止遍历用户拼队列 |
| 后端接口未全部就绪 | 阻塞对应页面 | 依赖任务单的页面顺延；mock 必须显式标识，接口就绪后替换 |
| 动态表单可视化编辑器开发量大 | 超出首期范围 | 首期 JSON 编辑器 + 校验 + 预览；可视化二期单列工作量 |

---

## 5. 质量门禁（每个 Phase 提交前）

```bash
pnpm typecheck   # tsc -b --noEmit，0 error
pnpm lint        # biome check .
pnpm test        # vitest run
pnpm build       # tsc -b && vite build
```

**自查清单**：
- [ ] 所有表单字段走 `FormField` 统一外壳
- [ ] 无硬编码色值，全部用语义令牌；**无内联样式**
- [ ] 阴影使用 `shadow-e1/e2/e3`，无 `shadow-md`
- [ ] 列表页空/错/加载三态齐全
- [ ] 破坏性操作经过 `ConfirmDialog`
- [ ] 权限控制：菜单 + 按钮级隐藏（未知 adminRole 默认拒绝）
- [ ] 分页状态写入 URL，刷新可还原
- [ ] **金额一律十进制字符串 + decimal 处理**，禁止 float 运算
- [ ] 分页与请求字段以 api-integration.md v4 **逐字核对**（请求 `page/page_size`，响应 `{items,total,page,pageSize}`；camelCase）
- [ ] **未经后端支持的筛选不渲染控件**（不做当前页过滤伪装）
- [ ] **逐接口 DTO 为准**：常规 camelCase；已知 snake_case 例外 = 看板（service_gmv/active_users 等）与 fee-config（fee_rate/min_fee/split_ratio），不做全局自动命名转换

---

## 6. 验收矩阵

业务验收逐项核验（`pnpm build` 通过**不作为业务验收替代**；mock 数据**不作为已验收依据**）：

| # | 验收项 | 通过标准 |
|---|--------|---------|
| 1 | 登录失败不触发刷新循环 | 错误密码连续提交，Network 无 refresh 请求；20012 仅表单提示 |
| 2 | 并发 refresh 同飞去重 | accessToken 过期时并发多请求，仅发出一次 refresh，全部重放成功 |
| 3 | 换用户后旧数据不回填 | 用户 A 退出 → 用户 B 登录，列表/详情无 A 的角色可见数据；Query 缓存已清空 |
| 4 | 四角色越权访问 | 各角色直接访问无权限 URL 返回 403 页；按钮越权调用返回 403 toast |
| 5 | 分页筛选真实性 | 修改 page/page_size/status 参数后请求结果实际变化（非前端本地过滤） |
| 6 | 金额边界 | split_ratio 雇主百分比 0/100 边界提交正确；**30.5% 小数百分比被前端明确拒绝（不静默四舍五入）**；退款 finalAmount > 申请额被前端 zod 拦截 |
| 7 | 证件图片带 token 访问 | 资质证件走鉴权 fetch Blob，无 token 直链请求；Object URL 用后释放 |
| 8 | 客服转接失权与阅读权 | 客服转接后原会话不可再访问/操作；非参与方访问会话消息被拒；**super_admin 打开非本人参与会话不发消息请求，展示「仅参与方可查看」占位**；**直接 HTTP 请求验证：非参与 super_admin 转接被拒（后端校验）**、本人接待的 super_admin 与普通客服可转；未绑定 super_admin 可查看元信息；停用客服与满容量目标行为明确 |
| 8a | 封禁未知态 | `banned` 字段缺失时状态显示「未知」且封禁/解封按钮双双禁用（undefined ≠ false）；操作成功后重新拉取服务端状态 |
| 9 | 列表三态齐全 | 各列表页空/错/加载三态均可触发且展示正确 |
| 10 | （可选）暗色下操作可达 | 暗色主题下键盘可完成核心操作（Tab/Enter/Esc） |

> 每项以真实后端接口实测为准（curl / 浏览器 Network 核对）。
>
> **mock 验收边界（T05 冻结，两级）**：
> - **接受**：真实后端 HTTP + PostgreSQL + Redis + 四角色账号的本地验收；微信 / 短信 / IM 等**外部客户端允许 mock**，但**必须记录开关状态**
> - **不接受**：前端假响应替代后端能力验收；把外部 mock 验收**算成**真实微信支付 / 腾讯 IM 对接完成
> - 验收报告**逐项注明**：真实组件 / mock 外部依赖 / 未覆盖范围；不以全局「已验收」混淆两种交付
> - #6b 与真实外部服务验收独立要求凭据与真实环境，纯后台接口不因此被阻断
