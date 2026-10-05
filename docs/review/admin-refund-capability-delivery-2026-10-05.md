# 管理后台退款能力补齐交付与测试结果

日期：2026-10-05，Asia/Shanghai。结论：批准的阶段1～3全部完成，现有管理后台H5可使用。资金对账工作台按计划留作独立需求。

## 本次新增

- 退款列表增加状态6「通道失败待处理」筛选及警示状态色。
- 退款详情新增通道处理区：当前退款号、通道状态、换号次数、最近重试受理时间、最终金额、历史尝试记录与当前/历史号标识。
- 财务/超管在状态1/4/6可主动对账；仅状态6+CLOSED可重试。ABNORMAL提示去微信商户平台处理；客服只读、运营不得访问退款管理。
- 操作原因trim后1～255个Unicode字符，二次确认，执行中禁点击；成功刷新完整聚合详情与列表，显示前后状态；网络失败/70002保留输入且刷新核验，不自动重发。
- 重试成功明确提示「已受理」，不冒充到账；查询完成不等于退款成功。不提供手工成功、改余额、人工强制结算。
- 更新管理后台退款PRD及api-current。后端仅补退款对账/换号重试中文审计标签，未知标签原样回退；无表结构变更，无迁移，无冻结基线修改。

## 使用路径

当前开发服务：http://127.0.0.1:5173/ 。使用现有财务或超管账号登录，进入「交易管理 → 退款裁定」，打开退款详情。

- 已同意、已完成、通道失败待处理：按状态出现「主动对账」。
- 通道失败待处理且CLOSED：额外出现「重试退款」。
- 状态0/3：继续沿用原裁定通过/拒绝；通道操作不在这些状态出现。
- 通道异常ABNORMAL：只核验和商户平台处理，不出现重试。

后端8080健康、前端5173运行中。构建产物在dist/，生产部署仍需静态站点history路由回退及同源/api/v1代理。本轮没有部署到远程服务器。

## 代码与文档

- src/types/trade.ts、src/lib/trade.ts：字段、状态、通道解释和动作条件。
- src/components/data/RefundChannel.tsx、RefundChannelActions.tsx、src/pages/Trade.tsx：详情和受控操作。
- src/components/feedback/ActionDialog.tsx：可选结果/失败回调和操作成功文案，旧动作保持默认行为。
- src/components/ui/status.tsx：状态6警示色。
- 单元测试：src/lib/trade.test.ts、status.test.ts、components/data/RefundChannel.test.tsx。
- 浏览器测试：tests/refund-channel.spec.ts；独立夹具：scripts/prepare-refund-fixtures.mjs。
- .gitignore与biome.json排除私有令牌/凭据夹具，避免提交或扫描输出。
- 后端internal/service/admin_detail.go、admin_audit_labels_test.go：审计标签及测试。
- 过程流水账：../dev-log/2026-10-05-refund-channel.md。

## 检查结果

| 检查 | 结果 |
| --- | --- |
| TypeScript tsc --noEmit | 通过 |
| Biome全仓检查 | 通过（0错误，1条原有CSS specificity警告，5条原有配置/风格提示） |
| Vitest全量 | 14个测试文件、88项全部通过 |
| Vite生产构建 | 通过 |
| Playwright本模块完整验收 | 8项全部通过，约15秒，真实本地后端及四角色 |
| 后端go test ./... / go vet ./... | 全部通过（默认单测；未把默认跳过的PG集成测试计作已运行） |
| 后端修改文件gofmt/goimports | 通过，无后续diff |
| git diff --check | 通过 |

本机pnpm包装器尝试自动安装依赖但因非TTY失败，因此使用已安装node_modules/.bin并指定可用Node PATH执行typecheck/lint/test/build，检查内容等同pnpm check；未删依赖或修改锁文件。

### 浏览器8项结果

1. 财务真实查单，以及已完成退款重复查询。
2. 超管真实查单，以及已完成退款重复查询。
3. 财务CLOSED换号：换号次数=1，两条attempts；旧号CLOSED回调不改当前号/状态，新号SUCCESS回调重复两次后只累计退款50元。
4. ABNORMAL无重试按钮、客服只读、运营403；客服/运营直接POST retry/reconcile四次均真实403/20003。
5. 256个Unicode字符前端拒绝、70002保留原因并刷新；网络异常只一次请求，无自动重发。
6. 空历史与未知通道原值回退。
7. 255个Unicode字符可提交，首尾空白移除；延迟请求期间按钮禁用，实际仅一笔请求。
8. 状态6筛选可找到异常夹具；null通道明确空态，不冒充处理中。

其中角色、状态、换号、回调、权限均为真实HTTP；70002/网络异常/空历史/未知通道展示使用明确的浏览器响应拦截。金额50元是独立mock夹具，SUCCESS为本地手动模拟回调。微信真实凭据及真实退款到账不在本轮范围。

## 独立数据与证据

没有清库，没有覆盖原curl回归报告。前后两次完整验收各新增4笔独立退款/需求及1个mock用户，保留供核验；最终批次RCffc6b5a82b。既有curl证据不变。

- [8项浏览器结果](refund-channel-evidence-2026-10-05/browser-results.json)
- [最终批次退款/额度/审计核对](refund-channel-evidence-2026-10-05/database-result.json)
- [成功退款详情截图](refund-channel-evidence-2026-10-05/refund-channel-success.png)
- [空通道展示截图](refund-channel-evidence-2026-10-05/refund-channel-empty.png)（此截图空通道字段是浏览器拦截夹具）

原始令牌仅存忽略文件.refund-e2e.json，权限600，不进入交付证据。最终CLOSED夹具新号SUCCESS、status4、retryCount1，需求累计退款50元；PROCESSING仍status1/0元，ABNORMAL仍status6/0元，原SUCCESS仍status4/50元。只有真实操作写审计，故障拦截不冒充审计成功。

## 复跑

后端保持本地mock、docker容器名sxdg-be-postgres-1；准备忽略文件.refund-e2e-accounts.json，内容是四角色各自的{account,password}，勿提交。然后：

```bash
node scripts/prepare-refund-fixtures.mjs
pnpm exec playwright test tests/refund-channel.spec.ts
pnpm check
```

每次完整复跑先生成新夹具，避免已换号CLOSED记录被再次当成初始状态。夹具脚本只新增本地记录，不清库；四角色登录间隔13秒遵守限流。若本机pnpm包装器异常，可直接调用node_modules/.bin对应工具。

## 提交与限制

阶段1：2bef0f9（通道展示和状态6）。阶段2：4657c60（主动对账和受控重试）。后端审计配套：c41343c。阶段3为浏览器测试、夹具、交付证据及日志本地提交；均未push。

Mock退款查单当前固定返回PROCESSING，后台同步展示服务端持久化状态；已完成查询保持成功终态，不能据此声称测试过真实微信SUCCESS查单。历史尝试createdAt只是创建时间，当前API不提供完整处理事件线或通道到账回执。跨订单资金流水、需求额度账本、结算/提现对账工作台需要独立后端契约，不在本次批准范围。
