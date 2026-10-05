// 订单、退款及发布内容共享列表骨架，写操作严格按领域状态机提供。
import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { adminPath, useDetail } from "../api/admin";
import { RefundChannel } from "../components/data/RefundChannel";
import { RefundChannelActions } from "../components/data/RefundChannelActions";
import { ResourceList } from "../components/data/ResourceList";
import { TradeSummary } from "../components/data/TradeSummary";
import { ActionDialog, type ActionSpec } from "../components/feedback/ActionDialog";
import { Details } from "../components/feedback/Details";
import { State } from "../components/feedback/State";
import { Button, Card } from "../components/ui";
import { StatusTag } from "../components/ui/status";
import { actions, allowed } from "../lib/permission";
import { orderAction, states, validRefund } from "../lib/trade";
import { dateText, money, text } from "../lib/utils";
import { useAuth } from "../store/auth";
import type { Trade as Row } from "../types/trade";

const titles: Record<string, string> = {
  orders: "订单管理",
  refunds: "退款裁定",
  services: "服务管理",
  requirements: "需求管理",
};
const reason = { key: "reason", label: "操作原因", type: "textarea" as const, required: true };
export default function Trade() {
  const kind = useLocation().pathname.split("/")[1];
  const { id } = useParams();
  const role = useAuth((s) => s.user?.adminRole);
  const [action, setAction] = useState<ActionSpec | null>(null);
  const result = useDetail<Row>(`${kind}/${id}`, !!id);
  const status = (r: Row) => states[kind][r.status] || `未知（${r.status}）`;
  function buttons(r: Row) {
    if (kind === "orders") {
      const op = orderAction(r.status);
      return op && allowed(role, actions.order) ? (
        <Button
          variant="ghost"
          onClick={() =>
            setAction({
              target: `${titles[kind]} #${r.orderNo || r.refundNo || r.id}`,
              title: op.title,
              path: adminPath(`${kind}/${r.id}/status`),
              fields: [reason],
              body: { status: op.to },
            })
          }
        >
          {op.title}
        </Button>
      ) : null;
    }
    if (kind === "refunds")
      return [0, 3].includes(r.status) && allowed(role, actions.refund) ? (
        <div className="actions">
          <Button
            onClick={() =>
              setAction({
                target: `${titles[kind]} #${r.orderNo || r.refundNo || r.id}`,
                title: "通过退款裁定",
                path: adminPath(`refunds/${r.id}/approve`),
                method: "POST",
                fields: [
                  reason,
                  {
                    key: "finalAmount",
                    label: "裁定金额",
                    default: r.applyAmount || "",
                    required: true,
                    description: `不得超过申请金额 ${r.applyAmount}`,
                  },
                ],
                validate: (v): Record<string, string> =>
                  validRefund(v.finalAmount, r.applyAmount || "0")
                    ? {}
                    : { finalAmount: "请输入不超过申请金额的非负金额，最多两位小数" },
              })
            }
          >
            通过
          </Button>
          <Button
            variant="danger"
            onClick={() =>
              setAction({
                target: `${titles[kind]} #${r.orderNo || r.refundNo || r.id}`,
                title: "拒绝退款裁定",
                path: adminPath(`refunds/${r.id}/reject`),
                method: "POST",
                fields: [reason],
              })
            }
          >
            拒绝
          </Button>
        </div>
      ) : null;
    if (!allowed(role, actions.content)) return null;
    return (
      <div className="actions">
        {kind === "services" && [2, 3].includes(r.status) && (
          <Button
            variant="ghost"
            onClick={() =>
              setAction({
                target: `${titles[kind]} #${r.orderNo || r.refundNo || r.id}`,
                title: r.status === 2 ? "下架服务" : "恢复发布",
                path: adminPath(`services/${r.id}/status`),
                body: { status: r.status === 2 ? 3 : 2 },
              })
            }
          >
            {r.status === 2 ? "下架" : "恢复发布"}
          </Button>
        )}
        {(r.status === 0 || (kind === "requirements" && r.status !== 3)) && (
          <Button
            variant="danger"
            onClick={() =>
              setAction({
                target: `${titles[kind]} #${r.orderNo || r.refundNo || r.id}`,
                title: r.status === 0 ? "删除草稿" : "关闭需求",
                path: adminPath(`${kind}/${r.id}`),
                method: "DELETE",
                description:
                  r.status === 0
                    ? "删除草稿不可恢复，请确认。"
                    : "关闭需求将触发剩余预付款退款流程。关闭后不可恢复；如需重新发布，请复制并重新预付。",
              })
            }
          >
            {r.status === 0 ? "删除草稿" : "关闭需求"}
          </Button>
        )}
      </div>
    );
  }
  const user = (uid?: number) => <Link to={`/users/${uid}`}>用户 #{uid}</Link>;
  return (
    <>
      {id ? (
        <>
          <div className="page-heading">
            <div>
              <h1>{titles[kind]} · 详情</h1>
              <Link to={`/${kind}`}>返回列表</Link>
            </div>
            <div className="actions">
              {result.data && buttons(result.data)}
              {kind === "refunds" && result.data && (
                <RefundChannelActions key={result.data.id} row={result.data} />
              )}
            </div>
          </div>
          <State
            loading={result.isLoading}
            error={result.error}
            retry={() => void result.refetch()}
          >
            {result.data && (
              <Card>
                <div className="trade-summary-header">
                  <div>
                    <span className="hint">
                      {kind === "orders"
                        ? "订单编号"
                        : kind === "refunds"
                          ? "退款编号"
                          : "内容编号"}
                    </span>
                    <h2>{result.data.orderNo || result.data.refundNo || `#${result.data.id}`}</h2>
                  </div>
                  <StatusTag label={status(result.data)} />
                </div>
                <h2 className="section-heading">基本信息与履约记录</h2>
                <Details
                  fields={[
                    ["编号", result.data.orderNo || result.data.refundNo || result.data.id],
                    ["标题", text(result.data.title)],
                    ["创建时间", dateText(result.data.createdAt)],
                    ...(kind === "orders"
                      ? ([
                          ["雇主", user(result.data.employerId)],
                          ["服务者", user(result.data.providerId)],
                          ["订单金额", money(result.data.amount)],
                          ["服务费快照", money(result.data.serviceFee)],
                          ["预约开始", dateText(result.data.appointmentAt)],
                          ["预约结束", dateText(result.data.appointmentEndAt)],
                          ["支付时间", dateText(result.data.paidAt)],
                          ["完成时间", dateText(result.data.completedAt)],
                        ] as [string, React.ReactNode][])
                      : kind === "refunds"
                        ? ([
                            ["申请人", user(result.data.applicantId)],
                            ["申请金额", money(result.data.applyAmount)],
                            ["最终金额", money(result.data.finalAmount)],
                            ["申请原因", text(result.data.reason)],
                            ["平台原因", text(result.data.platformReason)],
                            [
                              "退款来源",
                              <Link
                                key="source"
                                to={`/${result.data.sourceType === 0 ? "orders" : "requirements"}/${result.data.sourceId}`}
                              >
                                {result.data.sourceType === 0 ? "订单" : "需求"} #
                                {result.data.sourceId}
                              </Link>,
                            ],
                          ] as [string, React.ReactNode][])
                        : ([
                            ["发布者", user(result.data.publisherId)],
                            ["展示价格", money(result.data.displayPrice)],
                            ["分类ID", text(result.data.categoryId)],
                            ["地区代码", text(result.data.regionCode)],
                            ["地址", text(result.data.addressDetail)],
                            ["说明", text(result.data.description)],
                          ] as [string, React.ReactNode][])),
                  ]}
                />
              </Card>
            )}
          </State>
          {kind === "refunds" && result.data && <RefundChannel row={result.data} />}
          {result.data && <TradeSummary row={result.data} kind={kind} />}
        </>
      ) : (
        <ResourceList<Row>
          key={kind}
          kind={kind}
          title={titles[kind]}
          description={
            kind === "refunds"
              ? "核对退款来源与申请金额，审慎处理平台裁定"
              : "查询业务记录，按合法状态执行受控操作"
          }
          filters={[
            {
              key: "keyword",
              label:
                kind === "orders"
                  ? "订单号"
                  : kind === "refunds"
                    ? "退款号 / 订单号"
                    : "标题关键词",
            },
            ...(["orders", "refunds"].includes(kind)
              ? [
                  { key: "start_date", label: "创建起始日", type: "date" },
                  { key: "end_date", label: "创建结束日", type: "date" },
                ]
              : []),
            ...(kind === "orders"
              ? [
                  {
                    key: "delivery_type",
                    label: "交付方式",
                    options: [
                      { value: "to_store", label: "到店" },
                      { value: "offline", label: "线下" },
                      { value: "online", label: "线上" },
                    ],
                  },
                ]
              : []),
            ...(kind === "refunds"
              ? [
                  {
                    key: "applicant_role",
                    label: "申请方身份",
                    options: [
                      { value: "employer", label: "雇主" },
                      { value: "provider", label: "服务者" },
                    ],
                  },
                ]
              : []),
            {
              key: "status",
              label: "状态",
              options: Object.entries(states[kind]).map(([value, label]) => ({ value, label })),
            },
            ...(["services", "requirements"].includes(kind)
              ? [{ key: "category_id", label: "分类 ID" }]
              : []),
          ]}
          columns={[
            {
              key: "no",
              label: "编号 / 标题",
              render: (r) => (
                <Link to={`/${kind}/${r.id}`}>
                  {r.orderNo || r.refundNo || r.title || `#${r.id}`}
                </Link>
              ),
            },
            { key: "status", label: "状态", render: (r) => <StatusTag label={status(r)} /> },
            {
              key: "amount",
              label: kind === "refunds" ? "申请金额" : "金额",
              align: "right",
              render: (r) => money(r.applyAmount ?? r.amount ?? r.displayPrice),
            },
            ...(kind === "orders"
              ? [
                  { key: "employer", label: "雇主", render: (r: Row) => user(r.employerId) },
                  { key: "provider", label: "服务者", render: (r: Row) => user(r.providerId) },
                ]
              : []),
            { key: "created", label: "创建时间", render: (r) => dateText(r.createdAt) },
            { key: "actions", label: "操作", render: buttons },
          ]}
        />
      )}{" "}
      {action && <ActionDialog spec={action} onClose={() => setAction(null)} />}
    </>
  );
}
