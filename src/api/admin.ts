// 后台查询只接受明确资源路径，不自动转换 DTO。
import { useQuery } from "@tanstack/react-query";
import { qk } from "../lib/queryClient";
import { request } from "../lib/request/core";
import type { Page, Query } from "../types/common";
export const adminPath = (kind: string) => `/api/v1/admin/${kind}`;
export function useDetail<T>(kind: string, enabled = true) {
  return useQuery({
    queryKey: qk.resource(kind),
    queryFn: ({ signal }) => request<T>(adminPath(kind), { signal }),
    enabled,
  });
}
export function useList<T>(kind: string, query: Query = {}, enabled = true) {
  return useQuery({
    queryKey: qk.resource(kind, query),
    queryFn: ({ signal }) => request<Page<T>>(adminPath(kind), { query, signal }),
    enabled,
  });
}
export async function allPages<T>(kind: string, signal?: AbortSignal) {
  const rows: T[] = [];
  let page = 1;
  for (;;) {
    const data = await request<Page<T>>(adminPath(kind), {
      query: { page, page_size: 100 },
      signal,
    });
    rows.push(...data.items);
    if (rows.length >= data.total || !data.items.length) return rows;
    page++;
  }
}
