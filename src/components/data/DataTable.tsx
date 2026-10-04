// 表格保持横向滚动，分页值直接来自服务端。
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { ReactNode } from "react";
import { pageItems } from "../../lib/pagination";
import { Button, Select } from "../ui";
export interface Column<T> {
  key: string;
  label: string;
  align?: "left" | "right";
  width?: number;
  wrap?: boolean;
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
              <th key={c.key} scope="col" style={{ textAlign: c.align, width: c.width }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={c.wrap ? "cell-wrap" : undefined}
                  style={{ textAlign: c.align }}
                >
                  {c.render(r)}
                </td>
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
  const last = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav className="pagination" aria-label="分页">
      <span className="pagination-total">
        共 <strong>{total}</strong> 条 · 第 {page} / {last} 页
      </span>
      <Select
        aria-label="每页条数"
        value={pageSize}
        onChange={(e) => onChange(1, Number(e.target.value))}
      >
        {[10, 20, 50, 100].map((n) => (
          <option key={n} value={n}>
            {n} 条 / 页
          </option>
        ))}
      </Select>
      <Button
        variant="outline"
        size="icon"
        aria-label="首页"
        disabled={page <= 1}
        onClick={() => onChange(1, pageSize)}
      >
        <ChevronsLeft size={14} />
      </Button>
      <Button
        variant="outline"
        size="icon"
        aria-label="上一页"
        disabled={page <= 1}
        onClick={() => onChange(page - 1, pageSize)}
      >
        <ChevronLeft size={14} />
      </Button>
      {pageItems(page, last).map((n) =>
        typeof n === "string" ? (
          <span key={n}>…</span>
        ) : (
          <Button
            key={n}
            className="page-number"
            size="icon"
            variant={page === n ? "default" : "outline"}
            aria-label={`第 ${n} 页`}
            aria-current={page === n ? "page" : undefined}
            onClick={() => onChange(n, pageSize)}
          >
            {n}
          </Button>
        ),
      )}
      <Button
        variant="outline"
        size="icon"
        aria-label="下一页"
        disabled={page >= last}
        onClick={() => onChange(page + 1, pageSize)}
      >
        <ChevronRight size={14} />
      </Button>
      <Button
        variant="outline"
        size="icon"
        aria-label="尾页"
        disabled={page >= last}
        onClick={() => onChange(last, pageSize)}
      >
        <ChevronsRight size={14} />
      </Button>
    </nav>
  );
}
