// 页面状态统一出口，失败可重试。
import type { ReactNode } from "react";
import { Button } from "../ui";
export function State({
  loading,
  error,
  empty,
  retry,
  children,
}: {
  loading?: boolean;
  error?: Error | null;
  empty?: boolean;
  retry?: () => void;
  children: ReactNode;
}) {
  if (loading)
    return (
      <div className="state" role="status">
        正在加载数据…
      </div>
    );
  if (error)
    return (
      <div className="state" role="alert">
        <p>{error.message}</p>
        <Button onClick={retry}>重试</Button>
      </div>
    );
  if (empty)
    return (
      <div className="state">
        <strong>暂无数据</strong>
        <p>试试调整筛选条件，或稍后刷新。</p>
      </div>
    );
  return children;
}
