// 退款通道只展示后端证据，历史号不代表新的资金占用。
import { channelText } from "../../lib/trade";
import { dateText, money } from "../../lib/utils";
import type { Trade } from "../../types/trade";
import { Details } from "../feedback/Details";
import { Card } from "../ui";
export function RefundChannel({ row }: { row: Trade }) {
  return (
    <Card>
      <h2>通道处理</h2>
      <Details
        fields={[
          ["当前退款号", row.refundNo || "—"],
          ["通道状态", channelText(row.channelStatus)],
          ["换号次数", row.retryCount ?? 0],
          ["最近重试受理时间", dateText(row.lastRetryAt)],
          ["最终退款金额", money(row.finalAmount)],
        ]}
      />
      {row.channelStatus === "ABNORMAL" && (
        <p className="notice">
          请在微信商户平台处理异常，再主动对账核验结果；不能换号重试或人工标记成功。
        </p>
      )}
      <h3>退款号尝试记录</h3>
      <p className="hint">记录创建时间不是到账时间；历史号保留用于核验，不重复占用退款额度。</p>
      {row.attempts?.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>退款号</th>
                <th>标识</th>
                <th>通道状态</th>
                <th>记录创建时间</th>
              </tr>
            </thead>
            <tbody>
              {row.attempts.map((a) => (
                <tr key={a.id}>
                  <td>{a.refundNo}</td>
                  <td>{a.refundNo === row.refundNo ? "当前号" : "历史号"}</td>
                  <td>{channelText(a.channelStatus)}</td>
                  <td>{dateText(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>暂无尝试记录</p>
      )}
    </Card>
  );
}
