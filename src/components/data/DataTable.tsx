// 表格保持横向滚动，分页值直接来自服务端。
import type { ReactNode } from "react";
import { Button, Select } from "../ui";
export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
}
export function DataTable<T>({
  rows,
  columns,
  rowKey,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string | number;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)}>
              {columns.map((c) => (
                <td key={c.key}>{c.render(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (p: number, s: number) => void;
}) {
  return (
    <div className="pagination">
      <span>
        共 {total} 条 · 第 {page} / {Math.max(1, Math.ceil(total / pageSize))} 页
      </span>
      <Select
        aria-label="每页条数"
        value={pageSize}
        onChange={(e) => onChange(1, Number(e.target.value))}
      >
        {[10, 20, 50, 100].map((s) => (
          <option key={s} value={s}>
            {s} 条 / 页
          </option>
        ))}
      </Select>
      <Button variant="ghost" disabled={page <= 1} onClick={() => onChange(page - 1, pageSize)}>
        上一页
      </Button>
      <Button
        variant="ghost"
        disabled={page * pageSize >= total}
        onClick={() => onChange(page + 1, pageSize)}
      >
        下一页
      </Button>
    </div>
  );
}
