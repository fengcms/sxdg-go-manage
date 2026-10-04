// 会话隔离由请求层和退出流程共同负责。
import { QueryClient } from "@tanstack/react-query";
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 15000 }, mutations: { retry: false } },
});
export const qk = {
  resource: (path: string, query: unknown = {}) => ["resource", path, query] as const,
  identity: ["identity"] as const,
};
