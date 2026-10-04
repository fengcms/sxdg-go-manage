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
