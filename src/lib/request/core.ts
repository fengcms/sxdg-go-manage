// 请求内核：单次刷新、会话失效清理及过期响应隔离。
import { useAuth } from "../../store/auth";
import type { Query, Tokens } from "../../types/common";
import { queryClient } from "../queryClient";
import { ApiError } from "./errors";
export interface Options {
  method?: string;
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
  public?: boolean;
  blob?: boolean;
}
let flight: { epoch: number; promise: Promise<void> } | null = null;
export function clearSession() {
  useAuth.getState().clear();
  void queryClient.cancelQueries();
  queryClient.clear();
}
async function decode(response: Response, blob = false) {
  if (blob && response.ok) return response.blob();
  let data: { code: number; message: string; data: unknown };
  try {
    data = await response.json();
  } catch {
    throw new ApiError("服务器响应格式异常，请稍后重试", response.status);
  }
  if (!response.ok || data.code !== 0)
    throw new ApiError(data.message || "请求失败", response.status, data.code);
  return data.data;
}
async function refresh(epoch: number) {
  if (flight?.epoch === epoch) return flight.promise;
  const refreshToken = useAuth.getState().tokens?.refreshToken;
  if (!refreshToken) throw new ApiError("请重新登录", 401);
  const promise = (async () => {
    try {
      const r = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      const tokens = (await decode(r)) as Tokens;
      if (useAuth.getState().epoch !== epoch) throw new ApiError("会话已切换", 401);
      useAuth.getState().rotate(tokens);
    } catch (e) {
      if (useAuth.getState().epoch === epoch) clearSession();
      throw e;
    } finally {
      if (flight?.epoch === epoch) flight = null;
    }
  })();
  flight = { epoch, promise };
  return promise;
}
export async function request<T>(path: string, options: Options = {}): Promise<T> {
  const epoch = useAuth.getState().epoch;
  const sent = useAuth.getState().tokens?.accessToken;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(options.query || {}))
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  const run = async () => {
    const headers = new Headers();
    if (!options.public) {
      const token = useAuth.getState().tokens?.accessToken;
      if (!token) throw new ApiError("请重新登录", 401);
      headers.set("Authorization", `Bearer ${token}`);
    }
    const isForm = options.body instanceof FormData;
    if (options.body !== undefined && !isForm) headers.set("Content-Type", "application/json");
    try {
      return await fetch(`${path}${params.size ? `?${params}` : ""}`, {
        method: options.method || "GET",
        headers,
        body:
          options.body === undefined
            ? undefined
            : isForm
              ? (options.body as FormData)
              : JSON.stringify(options.body),
        signal: options.signal,
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") throw e;
      throw new ApiError("网络连接失败，请检查网络后重试");
    }
  };
  let r = await run();
  if (!options.public && useAuth.getState().epoch !== epoch) throw new ApiError("会话已切换", 401);
  if (r.status === 401 && !options.public) {
    if (sent === useAuth.getState().tokens?.accessToken) await refresh(epoch);
    if (useAuth.getState().epoch !== epoch) throw new ApiError("会话已切换", 401);
    r = await run();
    if (r.status === 401 && useAuth.getState().epoch === epoch) clearSession();
  }
  const data = await decode(r, options.blob);
  if (!options.public && useAuth.getState().epoch !== epoch) throw new ApiError("会话已切换", 401);
  return data as T;
}
