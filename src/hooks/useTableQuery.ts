// URL 只保留支持的筛选字段，修改筛选会回到第一页。
import { useSearchParams } from "react-router-dom";
export function useTableQuery() {
  const [params, set] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = [10, 20, 50, 100].includes(Number(params.get("page_size")))
    ? Number(params.get("page_size"))
    : 20;
  function patch(values: Record<string, string | number>, reset = true) {
    set(
      (old) => {
        const p = new URLSearchParams(old);
        if (reset) p.set("page", "1");
        for (const [k, v] of Object.entries(values)) {
          if (v === "") p.delete(k);
          else p.set(k, String(v));
        }
        return p;
      },
      { replace: true },
    );
  }
  return { params, page, pageSize, patch };
}
