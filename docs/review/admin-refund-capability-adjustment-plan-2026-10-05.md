# 管理后台能力补充分析与开发调整计划

日期：2026-10-05。状态：待用户确认，本轮仅分析和撰写计划，未改业务代码、未调用资金操作接口。

## 结论

原核对报告基本合理。建议本次批准「退款处理闭环」：退款通道状态、尝试记录、主动对账、受控重试及文档/浏览器验收。现有后端接口足够支撑此范围，无需建表或修改冻结基线。

跨订单资金对账工作台属于新需求，先单独设计接口与财务口径，不与本次退款补齐捆绑。日常配置、资质审核、封禁、调分、客服验收、看板等已有能力继续复用，不重做。

## 核对结果及对报告的补充

| 项目 | 核对与判断 | 本次建议 |
| --- | --- | --- |
| 主动对账 | Trade.tsx 未接入；后端 reconcile 已有真实查单与幂等入账能力 | 必补 |
| 通道可观测性 | 详情已返回 channelStatus/retryCount/lastRetryAt/attempts；前端 Trade 类型和页面未接入 | 必补，属于前端缺口 |
| 退款状态6 | src/lib/trade.ts 未定义，因此列表筛选无「通道失败待处理」，详情显示未知 | 必补，报告遗漏的实际缺口 |
| 退款重试 | retry 后端已实现，但页面无入口；仅状态6且CLOSED可换号 | 建议与对账同批补齐，形成失败处置闭环 |
| 资金工作台 | 当前 admin 路由无跨订单结算、钱包流水、提现单分页接口 | 后续新需求；不能只增加一个前端页面 |
| 需求额度账本 | 当前退款 source 需求摘要只有type/id/title，无法证明完整需求预付及退款额度 | 本次不伪造账本；需独立补充接口设计 |
| PRD一致性 | 04-order-refund.md仍把已实现筛选、详情聚合写成二期，且漏通道接口及状态6 | 同批更新管理后台文档 |
| 审计展示 | 后端记录reconcile/retry，当前中文映射未覆盖这两类动作及单数refund对象 | 展示原值不妨碍审计；建议小幅补中文映射，非权限放宽 |

### 需要收紧的报告表述

1. 主动对账不能针对任何退款都显示：后端仅允许status=1、4、6；status=0、2、3、5不能调用。已完成4仍可重复查单核验幂等，不提供再次退款。
2. 重试必须同时满足status=6、channelStatus=CLOSED；ABNORMAL提示去微信商户平台处理，不能换号或人工标成功。
3. attempts只有id/refundId/refundNo/channelStatus/createdAt，不是完整事件时间线，也没有每次请求原因、失败堆栈或渠道退款回执号。不虚构这些字段，不把createdAt当完成时间。
4. 对账响应只是Refund对象，不含attempts聚合。成功后重新GET详情和刷新列表，不能用动作响应覆盖完整详情。PROCESSING等渠道返回不应一律解释为退款成功，页面区分「查询完成」与「退款已完成」。
5. attempts不能代替需求额度账本、钱包流水或微信实际到账证明；mock通过也不代表真实微信联调通过。
6. 前端隐藏按钮只是体验控制；服务端finance/super_admin校验仍是权限依据。客服可读退款详情；运营不能因新增按钮获得退款页面或操作权限。

## 推荐开发范围和阶段

### 阶段1：退款数据展示与契约补齐

- Trade类型补充channelStatus、retryCount、lastRetryAt和独立RefundAttempt类型。
- 增加status=6中文名称与筛选；通道SUCCESS/PROCESSING/CLOSED/ABNORMAL中文解释，未知值原样保留，null显示「暂无通道记录」。保留现有业务状态枚举，不将渠道状态混作业务状态。
- 退款详情增加「通道处理」区：当前退款号、业务状态、通道状态、换号次数、最近重试受理时间、最终金额；attempts按接口历史记录显示，标识当前号/历史号，空数组明确说明暂无记录。
- 金额使用已有decimal字符串展示；不按当前费率重算，不从通道状态推导人工到账。
- 同步管理后台PRD、api-current及权限说明，清理本模块已过时的待补说明；后端冻结文档不改。

验收：现有裁定、来源导航与订单结算展示不退化；状态6可筛选；空值、未知渠道、无历史、有多个历史号均显示正确。

### 阶段2：主动对账与受控重试

- 退款详情提供「主动对账」：finance/super_admin且status为1/4/6；POST /api/v1/admin/refunds/:id/reconcile。
- 提供「重试退款」：finance/super_admin且status=6且CLOSED；POST /api/v1/admin/refunds/:id/retry。确认提示会生成新退款号、保留原退款意图与额度，由后台任务继续派发，受理不等于到账。
- 两个操作均使用现有ActionDialog二次确认；原因trim后1～255个Unicode字符，与Go rune校验一致；确认时显示退款号、来源对象及金额。
- 执行中禁重复提交。网络超时保留原因并提醒结果待核验；先刷新详情，不自动重放资金操作。遇到70002刷新最新状态并提示状态已变化。
- 操作成功刷新详情/列表，展示查询前后业务状态与通道状态摘要；重试后显示最新退款号和attempts。复用现有全局资源缓存失效机制，补针对性测试，避免丢失详情聚合。
- 不增加手工成功、任意状态编辑、批量退款或人工结算按钮。
- 可同时给后端auditLabels补reconcile/retry及refund中文映射，保留原action/targetType，测试未知值回退；这项无需改接口和表。

验收：财务/超管可执行，客服只读、运营无入口；直接越权请求仍403；同一已完成退款重复对账不重复入账；CLOSED重试一次后状态/退款号更新，ABNORMAL及其他状态无重试入口。

### 阶段3：浏览器联调与交付

- 真实后台页面验证finance/super_admin/customer_service/operator四角色；校验详情、筛选、确认、成功/失败提示、刷新和路由权限。
- 独立mock测试数据覆盖PROCESSING、SUCCESS、CLOSED、ABNORMAL和状态并发变化，不清空或污染现有演示回归证据。CLOSED换号后核验历史号保留和旧号迟到通知隔离。
- 组件/逻辑测试覆盖角色×状态动作矩阵、原因长度、空attempts、未知渠道、接口失败输入保留、成功重新获取聚合详情、重复点击。
- 运行pnpm check（typecheck/lint/test/build）；如补审计映射，按后端规范运行gofmt/goimports/go vet/go test。浏览器验收保存脱敏证据与新报告。
- 每阶段本地Conventional Commits提交，中文描述；开发判断和问题流水账写docs/dev-log，不push。

交付：代码、同步后的管理后台文档、开发日志、测试结果与已知限制。外部通道目前mock，真实微信验证单独安排。

## 后续阶段：只读资金对账工作台（本次暂不执行）

如果财务需要将本轮27项数据库断言变成日常操作能力，先出独立PRD和后端任务单。至少包含：结算分页、钱包流水分页、提现单分页、退款及尝试关联查询、需求预付/退款额度明细、按业务引用关联的差异检查。

- 查看/导出建议finance/super_admin；客服继续看单笔业务摘要，运营不扩大资金数据权限。
- 日期口径区分创建、完成、入账、提现完成，上海时区；分页、服务端筛选与金额decimal契约明确。导出单独确定规模、脱敏与权限，不能把当前页导出称全量导出。
- 差异检查由服务端基于账本和期初期末余额计算；不能只用筛选期间「结算-提现=当前余额」，退款、冻结、其他流水类型与时间差都需要完整口径。
- 只有数据完整且规则批准后才提示差异；只读页面不开放补账、改余额、强制结算、强制提现成功。
- 该阶段需要先评审后端契约，批准后先开发后端，再开发前端；不承诺现有API足够。

## 待确认的开发决定

推荐批准阶段1～3：同时补通道信息、状态6、主动对账及CLOSED受控重试，更新文档并做浏览器验收；审计中文映射作为小幅后端配套。资金工作台另立需求，暂不实施。

本计划依据报告、当前代码与已批准接口静态核对；本轮没有运行管理后台浏览器回归，因此不将计划中的验收描述为已通过。

## 主要核对文件

- 原报告：docs/review/curl-regression-admin-capability-2026-10-05.md
- 前端：src/pages/Trade.tsx、src/types/trade.ts、src/lib/trade.ts、src/lib/permission.ts、src/components/data/TradeSummary.tsx、src/components/feedback/ActionDialog.tsx。
- 管理后台需求：docs/prd/modules/04-order-refund.md、docs/prd/api-current.md。
- 后端：sxdg-be/docs/api-spec.md §18～19、internal/service/refund_channel_admin.go、internal/service/admin_detail.go、internal/handler/refund_channel.go、internal/router/admin.go、internal/model/refunds.go、internal/model/refund_attempts.go。
