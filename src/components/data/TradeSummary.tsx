// 聚合金额只读结算流水，未生成与待结算不会标为实收。
import { Link } from "react-router-dom";
import { actions, allowed } from "../../lib/permission";
import { dateText, money, text } from "../../lib/utils";
import { useAuth } from "../../store/auth";
import type { Trade } from "../../types/trade";
import { Details } from "../feedback/Details";
import { Card } from "../ui";
export function TradeSummary({ row, kind }: { row: Trade; kind: string }) {
  const role = useAuth((s) => s.user?.adminRole);
  if (kind === "refunds")
    return (
      <Card>
        <h2>退款来源</h2>
        {row.source ? (
          <Details
            fields={[
              [
                "来源",
                <Link
                  key="source"
                  to={`/${row.source.type === "order" ? "orders" : "requirements"}/${row.source.id}`}
                >
                  {row.source.type === "order" ? row.source.orderNo : `需求 #${row.source.id}`}
                </Link>,
              ],
              ["标题", text(row.source.title)],
              ...(row.source.type === "order"
                ? ([["关联订单金额", money(row.source.amount)]] as [string, React.ReactNode][])
                : []),
            ]}
          />
        ) : (
          <p>暂无来源摘要</p>
        )}
      </Card>
    );
  if (kind !== "orders") return null;
  return (
    <>
      <Card>
        <h2>交易双方</h2>
        <Details
          fields={[
            [
              "雇主",
              row.employer ? (
                <Link key="employer" to={`/users/${row.employer.id}`}>
                  {row.employer.nickname}（#{row.employer.id}）
                </Link>
              ) : (
                text(row.employerId)
              ),
            ],
            [
              "服务者",
              row.provider ? (
                <Link key="provider" to={`/users/${row.provider.id}`}>
                  {row.provider.nickname}（#{row.provider.id}）
                </Link>
              ) : (
                text(row.providerId)
              ),
            ],
          ]}
        />
      </Card>
      <Card>
        <h2>结算记录</h2>
        {row.settlement ? (
          <Details
            fields={[
              [
                "状态",
                ({ 0: "待结算", 1: "已入账", 2: "结算失败" } as Record<number, string>)[
                  row.settlement.status
                ] || `未知（${row.settlement.status}）`,
              ],
              [
                row.settlement.status === 1 ? "已入账金额" : "计划结算金额",
                money(row.settlement.amount),
              ],
              ["平台服务费", money(row.settlement.serviceFee)],
              ["入账时间", dateText(row.settlement.settledAt)],
            ]}
          />
        ) : (
          <p>暂无结算</p>
        )}
      </Card>
      <Card>
        <h2>关联退款</h2>
        {row.refunds?.length ? (
          row.refunds.map((r) => (
            <p key={r.id}>
              {allowed(role, [...actions.refund, "customer_service"]) ? (
                <Link to={`/refunds/${r.id}`}>{r.refundNo}</Link>
              ) : (
                r.refundNo
              )}{" "}
              · 申请金额 {money(r.applyAmount)}
            </p>
          ))
        ) : (
          <p>暂无关联退款</p>
        )}
      </Card>
    </>
  );
}
