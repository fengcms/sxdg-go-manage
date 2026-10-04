// 看板保持服务端数组口径，不补零或假造趋势。
import { useParams } from "react-router-dom";
import { useDetail } from "../api/admin";
import { DataTable } from "../components/data/DataTable";
import { State } from "../components/feedback/State";
import { Card } from "../components/ui";
import { money, text } from "../lib/utils";

const labels: Record<string, string> = {
  overview: "运营总览",
  orders: "订单统计",
  users: "用户统计",
  finance: "财务统计",
};
const names: Record<string, string> = {
  users: "注册用户",
  orders: "全量订单",
  service_gmv: "已支付订单金额",
  active_users: "近 24 小时活跃",
  settled: "已结算金额",
  fees: "服务费合计",
  refunded: "已退款金额",
  withdrawn: "已提现金额",
  available_balance: "可用余额",
  frozen_balance: "冻结余额",
};
const notes: Record<string, string> = {
  overview:
    "GMV 为已支付订单金额合计，不扣退款与取消。活跃按近 24 小时登录用户数统计，不是自然日 DAU。",
  orders: "按实际存在的订单状态分组，金额为该状态订单金额合计。",
  users: "按注册日期分组；活跃为该注册日期用户群中的近期活跃人数，不是全平台每日活跃趋势。",
  finance: "平台财务汇总；金额取服务端真实统计，不推算缺失指标。",
};
const orderStates: Record<string, string> = {
  "0": "待支付",
  "2": "已预约",
  "3": "进行中",
  "4": "待验收",
  "5": "已完成",
  "6": "已取消",
  "7": "退款中",
  "8": "退款完成",
  "9": "退款被拒",
};
export default function Dashboard() {
  const { kind = "overview" } = useParams();
  const valid = Object.hasOwn(labels, kind);
  const result = useDetail<Record<string, string | number>[]>(`dashboard/${kind}`, valid);
  if (!valid) return <div className="state">页面不存在</div>;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">平台运行概况</span>
          <h1>{labels[kind]}</h1>
          <p>清晰看见平台的每一步运转</p>
        </div>
        <span className="badge">实时接口数据</span>
      </div>
      <p className="notice">{notes[kind]}</p>
      <State
        loading={result.isLoading}
        error={result.error}
        empty={result.data?.length === 0}
        retry={() => void result.refetch()}
      >
        {result.data &&
          (kind === "overview" || kind === "finance" ? (
            <div className="stat-grid">
              {result.data.flatMap((row) =>
                Object.entries(names)
                  .filter(([key]) => Object.hasOwn(row, key))
                  .map(([key, label]) => (
                    <Card key={`${JSON.stringify(row)}-${key}`}>
                      <p className="hint">{label}</p>
                      <strong className="stat-number">
                        {key === "users" || key === "orders" || key === "active_users"
                          ? text(row[key])
                          : money(row[key])}
                      </strong>
                      <p className="hint">
                        {key === "active_users" ? "三入口有效登录 · 滚动 24 小时" : "后端聚合统计"}
                      </p>
                    </Card>
                  )),
              )}
            </div>
          ) : (
            <Card>
              <DataTable
                rows={result.data}
                rowKey={(r) => String(r.date ?? r.status)}
                columns={
                  kind === "orders"
                    ? [
                        {
                          key: "status",
                          label: "状态",
                          render: (r) => orderStates[String(r.status)] || `未知状态（${r.status}）`,
                        },
                        { key: "count", label: "订单数", render: (r) => text(r.count) },
                        { key: "amount", label: "金额合计", render: (r) => money(r.amount) },
                      ]
                    : [
                        { key: "date", label: "注册日期", render: (r) => text(r.date) },
                        { key: "new_users", label: "新增用户数", render: (r) => text(r.new_users) },
                        {
                          key: "active_users",
                          label: "该群体近期活跃",
                          render: (r) => text(r.active_users),
                        },
                      ]
                }
              />
            </Card>
          ))}
      </State>
    </>
  );
}
