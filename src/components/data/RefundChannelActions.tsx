// 查单与重试严格按角色及状态渲染；请求异常只核验，不自动重放。
import { useState } from "react";
import { adminPath } from "../../api/admin";
import { actions, allowed } from "../../lib/permission";
import { queryClient } from "../../lib/queryClient";
import { channelText, refundChannelActions, refundReasonError, states } from "../../lib/trade";
import { useAuth } from "../../store/auth";
import type { Trade } from "../../types/trade";
import { ActionDialog, type ActionSpec } from "../feedback/ActionDialog";
import { Button } from "../ui";
export function RefundChannelActions({ row }: { row: Trade }) {
  const role = useAuth((s) => s.user?.adminRole);
  const [action, setAction] = useState<ActionSpec | null>(null);
  const [summary, setSummary] = useState("");
  if (!allowed(role, actions.refund)) return null;
  const available = refundChannelActions(row.status, row.channelStatus);
  function open(retry: boolean) {
    const before = `${states.refunds[row.status] || row.status} / ${channelText(row.channelStatus)}`;
    setAction({
      title: retry ? "重试退款" : "主动对账",
      target: `退款 ${row.refundNo || row.id} · ${row.sourceType === 0 ? "订单" : "需求"} #${row.sourceId} · 最终金额 ${row.finalAmount ?? "未裁定"}`,
      path: adminPath(`refunds/${row.id}/${retry ? "retry" : "reconcile"}`),
      method: "POST",
      danger: retry,
      description: retry
        ? "生成新退款号，保留原意图和退款额度；由后台任务继续派发，受理不等于到账。"
        : "查询微信通道并同步已确认结果；不重发退款，也不能人工设置成功。",
      fields: [{ key: "reason", label: "操作原因", type: "textarea", required: true }],
      validate: (values) => refundReasonError(values.reason),
      build: (values) => ({ reason: values.reason.trim() }),
      successMessage: retry ? "重试已受理，请查看通道处理结果" : "查询完成，请核对退款状态",
      onResult: (value) => {
        const result = value as Trade;
        setSummary(
          `${retry ? "重试受理" : "对账完成"}：${before} → ${states.refunds[result.status] || result.status} / ${channelText(result.channelStatus)}；当前退款号 ${result.refundNo}`,
        );
      },
      onFailure: async () => {
        setSummary(
          "操作未确认完成，请核验刷新后的状态和退款号；网络异常不能自动重发。原因已保留，可关闭弹窗查看最新详情。",
        );
        await queryClient.invalidateQueries({ queryKey: ["resource"] });
      },
    });
  }
  return (
    <div>
      <div className="actions">
        {available.reconcile && (
          <Button variant="ghost" onClick={() => open(false)}>
            主动对账
          </Button>
        )}
        {available.retry && (
          <Button variant="danger" onClick={() => open(true)}>
            重试退款
          </Button>
        )}
      </div>
      {summary && (
        <p role="status" className="notice">
          {summary}
        </p>
      )}
      {action && <ActionDialog spec={action} onClose={() => setAction(null)} />}
    </div>
  );
}
