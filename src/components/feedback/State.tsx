// 加载保留布局，错误只重试当前查询，避免重载丢失内存登录。
import { Inbox, RotateCw, SearchX, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../ui";
export function State({
  loading,
  error,
  empty,
  retry,
  children,
  filtered = false,
}: {
  loading?: boolean;
  error?: Error | null;
  empty?: boolean;
  retry?: () => void;
  children: ReactNode;
  filtered?: boolean;
}) {
  if (loading)
    return (
      <div className="skeleton-table" role="status" aria-label="正在加载数据">
        <div className="skeleton skeleton-title" />
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="skeleton-row">
            <span className="skeleton" />
            <span className="skeleton" />
            <span className="skeleton" />
          </div>
        ))}
      </div>
    );
  if (error)
    return (
      <div className="state" role="alert">
        <TriangleAlert size={32} />
        <h3>数据加载失败</h3>
        <p>{error.message}</p>
        {retry && (
          <Button variant="outline" onClick={retry}>
            <RotateCw size={14} />
            重试
          </Button>
        )}
      </div>
    );
  if (empty) {
    const Icon = filtered ? SearchX : Inbox;
    return (
      <div className="state">
        <Icon size={32} />
        <h3>{filtered ? "没有符合条件的记录" : "暂无数据"}</h3>
        <p>{filtered ? "请调整或重置筛选条件后重试。" : "记录产生后将在这里展示。"}</p>
      </div>
    );
  }
  return children;
}
