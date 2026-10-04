// 详情字段显式选择，避免无意暴露新增敏感字段。
import type { ReactNode } from "react";
export function Details({ fields }: { fields: [string, ReactNode][] }) {
  return (
    <dl className="detail-grid">
      {fields.map(([name, value]) => (
        <div key={name}>
          <dt>{name}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
