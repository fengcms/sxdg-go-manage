# 管理后台规划 · 第三轮评审回复与产品决策

> 回复对象：[05-backend-supplement-review.md](./05-backend-supplement-review.md)（入口）→ [sxdg-be/docs/review/admin-backend-supplement-review.md](../../../../sxdg-be/docs/review/admin-backend-supplement-review.md)（主文档，T01~T06）
> 签发：产品 AI
> 日期：2026-10-04
> 性质：产品裁决记录，后端任务单 v3 与 PRD 修订的唯一依据

---

## 结论

6 项全部接受。三项 P1 全部源于后端真实代码与规划契约的差距（封禁元数据无来源、客服转接豁免仍在、信用配置无组合约束），均已写入后端任务单补文。#10 现状判断按事实纠正：**短信登录同样不更新 last_login_at**。执行顺序按用户要求冻结：**先补后端首批，再开发前端业务页面**。

---

## P1 裁决

### T01 封禁元数据无数据来源 → 任务 #3a/#4a 补文

- 接受全部建议。冻结契约：
  - DTO：`banned: boolean`、`banReason: string | null`、`bannedAt: string | null`
  - **保留现有布尔键格式**（`user_banned:<id>` = "true"/"false"），禁止改为 JSON（现有鉴权按字符串 true 判定，改格式会把封禁用户误放行）
  - 原因/时间来源：**沿用 admin_audit_logs 最近一次状态动作**——仅当前 banned=true 且最新动作为封禁时，取该记录的 reason 与 createdAt；解封后 banReason/bannedAt 返回 null；历史审计缺失返回 null，**不编造时间**
  - 首期**不做** lastStatusChange（最近解封原因）展示，避免语义混淆
  - 列表/详情**批量查询**，禁止逐用户查审计
  - **同批补后端校验**：封禁与解封 reason 非空（当前仅前端必填，adminUser status 分支不校验）
- 上述方案明确前，#3a/#4a 不开工

### T02 客服转接豁免与未绑定管理员矛盾 → 任务 #6a 补文 + modules/05 修正

- 接受。**服务端实现，不靠前端隐藏按钮**：
  - 转接权修改：**所有角色**必须满足 `conversation.user2Id == 当前用户 ID`；super_admin 本人正在接待可转，**非本人不得代转**（移除 transferCustomer 对 super_admin 的豁免）
  - cs/me 补 `isActive`（区分「已停用但仍有绑定」的客服）
  - online 转接目标接口：角色 = customer_service + super_admin；过滤在线且启用；**容量由转接事务再次校验**（列表过滤只是展示优化）；DTO 保留会话 `user1Id`/`user2Id` 供前端判断阅读资格
- **矛盾修正（modules/05 §1.3）**：未绑定的 super_admin ≠ 不进工作台——可查看全量会话**元信息**（列表管理权），但不能执行上线/接待动作、不能读取非参与消息；未绑定的普通客服展示绑定引导
- 权限表与验收矩阵同步（验收含：直接 HTTP 请求验证非参与 super_admin 转接被拒）

### T03 信用配置组合约束 → 任务 #9 补文

- 接受。冻结：
  - 组合约束：`0 ≤ credit_score_min ≤ credit_score_initial ≤ credit_score_max ≤ 100000`（上限沿用现有配置入口）；delta 独立为整数 -1000~1000
  - 修改任一项：同一事务内固定顺序锁定三项、校验修改后整体组合；失败返回参数错误且**不写成功审计**
  - 存量非法配置：不默默按反向区间截断；部署检查发现→修复→再启用依赖路径
  - **下调上限不批量重算存量用户**；后续分数变化按既定截断规则与真实 delta 记账
  - 覆盖路径：微信/短信注册、人工调分、普通行为调分

---

## P2 裁决

### T04 #10 现状纠正 → 任务改写为「统一登录时间维护」

- 接受事实纠正：**微信更新（但发生在封禁检查之前）、短信不更新、密码不更新**——原任务「只修密码」不准确
- 范围改为三入口（wx-login / sms login / password login）统一：
  - 有效登录定义：**凭据校验通过且封禁检查通过后**才刷新 last_login_at；失败凭据/封禁拒绝不刷新；JWT refresh 不算新登录
  - 微信登录的更新时机顺移到封禁检查之后
- 看板缺口标注同步：**「密码与短信登录暂不计入（#10 修复后覆盖）」**

### T05 mock 边界 → 验收总则修订

- 接受。两级边界：
  - **接受**：真实后端 HTTP + PostgreSQL + Redis + 四角色账号的本地验收；外部客户端（微信/短信/IM）允许 mock，**必须记录开关**
  - **不接受**：前端假响应替代后端能力验收；把外部 mock 验收算成真实微信支付/腾讯 IM 对接完成
- #6b 与真实外部服务验收独立要求凭据与真实环境；纯后台接口不因此被阻断
- 验收报告逐项注明：真实组件 / mock 外部依赖 / 未覆盖范围，不用全局「已验收」混淆两种交付

### T06 P1 任务冻结产品选项 → 逐项写入任务单

| 任务 | 冻结决策 |
|------|---------|
| #3 | 日期筛选基于 `createdAt`、上海时区、`[start 00:00:00, end 23:59:59]` 闭区间；phone_hash 仅支持**标准化完整手机号精确匹配**（不承诺部分号模糊）；退款申请人角色按**退款对应交易中的身份**判定，不按用户全局角色标签 |
| #4 | 结算 status=0=待结算、status=1=已入账；返回**结算对象及状态**，无流水返回 null，**不把待结算金额标作实收**；订单列表首期**维持 ID 展示**（不新增批量摘要接口） |
| #6b | 先交独立 IM 合同设计文档（协议/权限/消息同步/外部验收），评审通过后再实现 |
| #7 | 冻结为「引用存在即拒绝删除、维持平铺分页」；**不做可选树接口**；引用检查覆盖**全部状态**（含历史已关闭记录） |
| #9 | 审计：保留历史 action/targetType 原样，新增明确映射；新 reason 放 detail 顶层且保留 after 兼容；**运维 CLI 初始化无登录 actor，单列运维留痕**（adminId 空 + 来源标记 system/bootstrap），不机械套用「写操作必有 admin_id」 |

---

## 执行顺序（按用户要求冻结）

1. **批次 A（后端首批，先行）**：#1 → #3a/#4a（同批，T01 补文落实后开工）→ #5 → #6a（T02 补文落实后开工）→ #8 → #10（T04 范围）
2. **批次 B**：#9（T03/T06 范围）+ 已冻结的 #3/#4/#7 语义
3. **批次 C（独立立项）**：#6b（先合同后实现）、#2（口径冻结后）
4. **首批后端交付门禁**：路由 + 中文 Swagger + DTO/错误码/角色 + 测试 + 本地实测（真实 HTTP/DB/Redis），交付后再进入前端业务页面开发；开发计划「后端与前端并行」据此更新为「后端首批先行，前端基建可并行、业务页面待接口」

## 修订清单

| 文档 | 修订项 |
|------|--------|
| 后端任务单 v3 | T01/T02/T03/T04/T06 全部补文、批次 A/B/C 排期、mock 验收边界 |
| [modules/02-user-management.md](../modules/02-user-management.md) | 封禁 DTO（banned/banReason/bannedAt） |
| [modules/05-customer-service.md](../modules/05-customer-service.md) | 转接权服务端化、未绑定 super_admin 矛盾修正、cs/me 补 isActive |
| [modules/01-dashboard.md](../modules/01-dashboard.md) + [api-integration.md](../api-integration.md) | 缺口标注改「密码与短信登录」 |
| [modules/06-system-config.md](../modules/06-system-config.md) | 信用配置组合约束 |
| [modules/04-order-refund.md](../modules/04-order-refund.md) | 结算对象状态语义、列表维持 ID |
| [modules/03-content-management.md](../modules/03-content-management.md) | 分类删除冻结语义 |
| [development-plan.md](../development-plan.md) | 执行顺序、批次依赖、mock 验收边界 |
