// 会话隔离由请求层和退出流程共同负责；断网直接失败，避免后台查询永久暂停而无反馈。
import { QueryClient } from "@tanstack/react-query";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 15000, networkMode: "always" },
    mutations: { retry: false },
  },
});
export const qk = {
  resource: (path: string, query: unknown = {}) => ["resource", path, query] as const,
  identity: ["identity"] as const,
};
