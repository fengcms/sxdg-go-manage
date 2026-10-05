// 颜色只辅助辨识，状态始终包含中文文字。
import type { ReactNode } from "react";
export type Tone = "success" | "warning" | "danger" | "info" | "neutral";
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`badge badge-${tone}`}>
      <span className="status-dot" aria-hidden="true" />
      {children}
    </span>
  );
}

// 只识别已知中文状态，未知状态保持中性色，避免误报成功。
export function statusTone(label: string): Tone {
  if (
    ["正常", "启用", "在线", "已通过", "已同意", "已完成", "已发布", "已入账", "退款完成"].includes(
      label,
    )
  )
    return "success";
  if (["已封禁", "已拒绝", "退款被拒", "结算失败", "通道失败待处理"].includes(label))
    return "danger";
  if (["待审核", "待支付", "待验收", "处理中", "平台审核中", "退款中", "待结算"].includes(label))
    return "warning";
  if (["进行中", "已预约"].includes(label)) return "info";
  return "neutral";
}
export function StatusTag({ label }: { label: string }) {
  return <Badge tone={statusTone(label)}>{label}</Badge>;
}
