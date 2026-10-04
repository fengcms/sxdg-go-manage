# 管理后台规划 · 第二轮审阅回复与产品决策

> 回复对象：[03-pre-development-review.md](./03-pre-development-review.md)（第二轮审阅）
> 签发：产品 AI
> 日期：2026-10-04
> 性质：产品裁决记录，本轮文档修订与后端任务更新的唯一依据
> 状态标注约定：每项裁决标注【改文档】【补后端】【首期移除】三选一（或多选），区分「产品接受」「文档修订完成」「后端实现完成」

---

## 结论

10 项全部接受。本轮新增后端能力缺陷 2 项（密码登录不更新 last_login_at、订单/退款详情无聚合数据），已并入后端任务单；其余为文档修正。S01~S05 修订完成后对应前端合同即可冻结。

---

## P1 逐项裁决

### S01 用户/分类 JSON 示例命名错误 【改文档】

- 接受。示例统一修正为 camelCase（avatarUrl/isEmployer/isProvider/isAdmin/creditScore/createdAt）；分类构树键改 `parentId`
- 命名约定改写为「**逐接口 DTO 为准**」：常规 camelCase，已知例外=看板（service_gmv/active_users/new_users/available_balance/frozen_balance）、fee-config、订单快照内部协议；保留「禁止全局自动转换」约定
- 修订：modules/02 §4、modules/03 §1.3、api-integration §0.3

### S02 表单模板 DSL 错误 【改文档】

- 接受。**删除 panel 作为独立字段类型**（它是 drawer/wheel 字段的嵌套属性，非第六种 type）；合法 type 仅 single/multi/tags/drawer/wheel
- 补 `panel.mode/options/groups/wheels` 嵌套结构与提交值示例；补完整可用创建示例（templateName、categoryId、blocks），单选必含合法 options
- 明确「模板保存成功 ≠ 发布表单可提交」：JSON 编辑器校验同时跑保存校验与 ValidateForm 两套规则
- 修订：modules/03 §3.3、api-integration §5

### S03 交易展示数据缺失 【改文档 + 补后端】

- 接受「逐列标明来源」原则。首期呈现规则：
  - 订单列表/详情：已有字段直接展示；**双方仅展示 ID + 跳转链接**（昵称/头像缺失不猜值）；「服务者结算金额」**首期移除**（后端无该字段，禁止按当前费率推导）
  - 退款：按 sourceType 导航（sourceType=0 → 订单详情，=1 → 需求详情）；不存在的订单号/金额列移除；处理时间线**首期移除**
  - 服务详情可服务时段：首期不在管理后台展示（二期随聚合 DTO）
- 【补后端】需要保留的展示项列入任务 #4 聚合 DTO（P1）：订单双方昵称/头像、服务者结算金额（语义=结算流水实际金额）、退款关联单号/申请金额
- 修订：modules/04 全文逐列标注来源

### S04 客服授权与身份查询缺口 【改文档 + 补后端】

- **权限裁决**：区分三种权力——列表管理权（super_admin 看全部、客服看本人）、转接权（仅客服本人）、消息阅读权（**严格参与方，super_admin 也不例外**）。super_admin 在列表点开非本人参与的会话时，前端不发消息读取请求，展示「仅参与方可查看」占位；**不扩大消息豁免**
- 【补后端】#6a 冻结「当前客服身份查询」契约：`GET /api/v1/admin/cs/me` → 200 + `{ agentId, isOnline, displayName }`；未绑定客服返回 200 + `{ agent: null }`（前端引导「当前账号未绑定客服」）；角色范围=客服账号 + super_admin
- 【补后端】#6a 会话摘要 DTO：列表补用户昵称/头像（join users）
- 删除首期会话搜索（无服务端参数）；历史消息标注为「**已入库消息记录**」（本地 chat_messages，含系统卡片与活动文本；普通客服文本的落库与腾讯 IM 全量历史随 #6b）
- 修订：modules/05 §0/§1.3/§2、api-integration §9、后端任务单 #6a

### S05 封禁按钮无状态依据 【改文档 + 补后端】

- 接受。封禁字段为**首期 P0 依赖**：#3a（列表 banned 字段）+ #4a（详情 banned 字段）从原任务独立拆出
- 前端规则：字段缺失 = 状态「未知」，封禁/解封按钮**双双禁用**；`undefined ≠ false`，禁止把未知当未封禁；操作成功后重新拉取服务端状态，不本地翻转
- 解封 reason 必填（与权限文档一致）
- 修订：modules/02 §1/§2、development-plan §4（依赖表 #3a/#4a 独立 P0）

---

## P2 逐项裁决

### S06 信用规则 delta 与总分边界混用 【改文档】

- 接受。delta = 单次增减整数 **-1000~1000**（后端 BehaviorRule.Delta 现状），允许负值；与 credit_score_min/max（总分边界）**分开两个校验域**，文档分开定义
- 初始分说明区标注「credit_score_initial 配置待修复（#9），当前实际生效值 600」
- 修订：modules/06 §2

### S07 审计 IP 断言与信用分示例错误 【改文档】

- 接受。后端有 `ip` 字段（可空）——裁决：**首期展示**，详情抽屉列为可选字段，空值显示占位；修正「后端无 IP」错误断言
- 信用分日志示例改为实际动作结构（before=null、after={delta, reason}），不把请求增量误标为最终信用分
- 修订：modules/07 §1.2/§1.3/§4

### S08 活跃口径与密码登录缺口 【改文档 + 补后端】

- 接受。文案统一改为「**按已记录 last_login_at 统计的近 24 小时登录用户数**」（用户行数非登录次数）；注册日期序列口径写明「该注册日期用户群中的近期活跃人数」，示例改为可由该 SQL 产生的一致数据（如 new_users=23、active_users≤23）
- 【补后端】新任务 **#10（缺陷修复）**：`password.go:Login` 成功后更新 `last_login_at`，与微信/验证码登录一致；未修复前活跃指标标注「密码登录暂不计入」
- 修订：modules/01 §2/§4/§7、api-integration §2、后端任务单 #10

### S09 服务费精度未冻结 【改文档】

- 接受。首期冻结：雇主百分比 **0~100 整数步进**（UI 侧约束），30.5% 前端明确拒绝、不静默四舍五入；所有提交值最多两位小数；min_fee 上限 9999999999.99；禁止科学计数法
- 若未来需要小数百分比，另立后端精度变更任务（首期不做）
- 修订：modules/06 §3、api-integration §11

### S10 排期与任务清单不同步 【改文档】

- 接受。四项修正：
  1. 后端任务单头部优先级重写：**P0 = #1、#3a、#4a、#5、#6a、#8**；P1 = #3 其余、#4 其余、#6b、#7、#9、#10；**#2 = 二期**（口径确认后）
  2. development-plan 建立统一依赖表（任务 ID 拆分后逐页面对应），Phase 估时与总排期可加总对齐
  3. 修复后端任务单两条断链（`docs/review/` → `docs/prd/review/`）
  4. 部署范围裁决：**首期=本地联调交付**（代理同源 /api/v1 + /uploads）；生产反向代理、SPA 深链接回退、上传静态路由部署为二期部署验收项，首期文档不再承诺
- 修订：development-plan §2~§4、后端任务单头部与排期

---

## 本轮后端能力扩展汇总（对应用户要求：指出后端缺陷并扩展）

| 编号 | 缺陷/缺口 | 类型 | 优先级 | 说明 |
|------|----------|------|--------|------|
| #3a（拆分） | 用户列表无封禁状态字段与筛选 | 新增能力 | **P0** | 封禁/解封按钮的状态依据 |
| #4a（拆分） | 用户详情无 banned 字段 | 新增能力 | **P0** | 详情页操作依据 |
| #4（扩展） | 订单/退款详情聚合 DTO：双方昵称头像、服务者结算金额、退款关联单号 | 新增能力 | P1 | 首期先移除展示，DTO 就绪后回填 |
| #6a（细化） | `GET /api/v1/admin/cs/me` 当前客服身份查询；会话摘要 DTO（用户昵称头像） | 新增能力 | **P0** | 未绑定返回 {agent:null} |
| #10（新增） | 密码登录不更新 last_login_at | **缺陷修复** | P1 | 活跃统计失真，与微信/验证码登录对齐 |

## 本轮修订清单

| 文档 | 修订项 |
|------|--------|
| [modules/01-dashboard.md](../modules/01-dashboard.md) | S08：口径文案、示例数据一致性、密码登录缺口标注 |
| [modules/02-user-management.md](../modules/02-user-management.md) | S01：camelCase 示例；S05：封禁未知态与按钮禁用 |
| [modules/03-content-management.md](../modules/03-content-management.md) | S01：parentId 构树；S02：DSL 修正与完整示例 |
| [modules/04-order-refund.md](../modules/04-order-refund.md) | S03：逐列标来源、移除无数据展示、退款按来源导航 |
| [modules/05-customer-service.md](../modules/05-customer-service.md) | S04：三权分立、cs/me 契约、删除搜索、历史标注 |
| [modules/06-system-config.md](../modules/06-system-config.md) | S06：delta/总分分开；S09：整数步进精度 |
| [modules/07-audit-log.md](../modules/07-audit-log.md) | S07：IP 可选展示、实际动作结构示例 |
| [api-integration.md](../api-integration.md) | S01：逐接口命名原则；S02/S04/S08/S09 同步 |
| [development-plan.md](../development-plan.md) | S05/S10：依赖表、#3a/#4a、估时对齐、部署范围 |
| 后端任务单 | 拆分 #3a/#4a、细化 #6a、新增 #10、修断链、优先级重写 |

## 下一步

1. S01~S05 文档修订完成后，前端对应合同冻结，可启动开发
2. 后端按新优先级执行：#1 → #3a/#4a → #5/#6a/#8；#10 随 #9 批次
3. 修订后的 PRD 可提交第三轮复审（重点复核 S01~S05 是否关闭）
