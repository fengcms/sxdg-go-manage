// URL 只保留支持的筛选字段，修改筛选会回到第一页。
import { useSearchParams } from "react-router-dom";
import { pageNumber } from "../lib/tableQuery";
export function useTableQuery(prefix = "") {
  const [params, set] = useSearchParams();
  const page = pageNumber(params.get(`${prefix}page`));
  const pageSize = [10, 20, 50, 100].includes(Number(params.get(`${prefix}page_size`)))
    ? Number(params.get(`${prefix}page_size`))
    : 20;
  function patch(values: Record<string, string | number>, reset = true) {
    set(
      (old) => {
        const p = new URLSearchParams(old);
        if (reset) p.set(`${prefix}page`, "1");
        for (const [k, v] of Object.entries(values)) {
          if (v === "") p.delete(`${prefix}${k}`);
          else p.set(`${prefix}${k}`, String(v));
        }
        return p;
      },
      { replace: true },
    );
  }
  return { params, page, pageSize, patch };
}
