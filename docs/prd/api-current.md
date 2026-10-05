# 当前对接补充与开工矩阵

2026-10-04。A/B 后端提交 a2085e1。此文覆盖 api-integration.md v4 中过时的实现状态；原业务范围和权限裁决不变。

| 页面域 | 接口与变化 | 角色及验收重点 |
|---|---|---|
| 登录 | auth/login、refresh、logout、me；me 已有 isAdmin/adminRole | 四角色；标签页会话恢复、轮换与换用户隔离（见 review/09-session-restoration-decision.md） |
| 看板 | dashboard 四接口仍数组；三入口有效登录更新 last_login_at | 财务仅 finance/超管；近24h不是自然日 |
| 用户 | users 列表/详情有 banned/banReason/bannedAt；封禁显式布尔及原因 | 封禁客服/超管，调分仅超管；未知态禁用 |
| 资质 | GET admin/qualifications 全局分页，status 数字0/1/2与user摘要 | operator/超管；证件鉴权 Blob |
| 内容 | banner/category 上传可用；featured PUT 可用；分类全状态引用保护 | operator/超管；分类拉全分页构树 |
| 交易 | 订单仅0→6、4→5；退款0/3可裁定 | 客服改订单；财务裁退款；原因必填 |
| 客服 | agents、agents/online 分页；cs/me绑定或agent:null；sessions有user摘要 | agents超管；其余客服/超管；转接限user2Id，读消息限参与方 |
| 配置 | 初始信用配置生效，0≤min≤initial≤max≤100000；delta独立-1000..1000 | 超管；不重算历史用户 |
| 审计 | admin摘要、actionLabel/targetLabel、detail.reason及旧after兼容 | 超管；CLI是独立运维日志，不混入HTTP审计 |

增强批次的字段精确契约见 [后端 API §18](../../../sxdg-be/docs/api-spec.md)：用户keyword昵称或完整手机号、role=employer/provider；订单keyword及delivery_type；退款keyword及applicant_role；用户/订单/退款/审计start_date/end_date按上海半开区间；审计admin_id/action/target_type；服务/需求keyword标题。用户详情phoneMasked/completedOrders，子资源credit-logs/services/requirements。订单详情employer/provider/settlement/refunds；退款source。订单列表仍ID展示。

OpenAPI现有80条admin、总计183接口，不全数映射首期页面。IM发送和看板升级仍未实现。无新表迁移。

## 2026-10-05 退款通道接入

POST `/api/v1/admin/refunds/:id/reconcile`：finance/super_admin，status=1/4/6。
POST `/api/v1/admin/refunds/:id/retry`：finance/super_admin，status=6且channelStatus=CLOSED。
均提交`{reason}`（trim后1～255 Unicode字符），返回Refund；随后GET详情获取attempts聚合。
详情增加channelStatus、retryCount、lastRetryAt、attempts[{id,refundId,refundNo,channelStatus,createdAt}]。status=6表示通道失败待处理。未知通道原值回退，null不冒充处理中。
