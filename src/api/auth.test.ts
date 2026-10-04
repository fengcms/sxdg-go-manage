// 验证刷新恢复时以服务端身份为准，异常和退出不导致旧会话复活。
import { afterEach, expect, it, vi } from "vitest";
import { clearSession } from "../lib/request/core";
import { readTokens, saveTokens } from "../lib/sessionStorage";
import { useAuth } from "../store/auth";
import { restoreSession } from "./auth";

const tokens = { accessToken: "old", refreshToken: "r1", expiresIn: 60 };
const user = { id: 1, nickname: "甲", isAdmin: true, adminRole: "operator" };
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ code: status === 200 ? 0 : 20001, message: "失败", data }), {
    status,
  });
afterEach(() => {
  clearSession();
  vi.unstubAllGlobals();
});
it("并发启动只校验一次身份且不信任缓存角色", async () => {
  saveTokens(tokens);
  const fetcher = vi.fn(async () => response(user));
  vi.stubGlobal("fetch", fetcher);
  await Promise.all([restoreSession(), restoreSession()]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(useAuth.getState().user).toEqual(user);
});
it("访问令牌失效时续期并保存新双令牌", async () => {
  saveTokens(tokens);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) =>
      url.includes("refresh")
        ? response({ ...tokens, accessToken: "new", refreshToken: "r2" })
        : new Headers(init.headers).get("Authorization") === "Bearer old"
          ? response(null, 401)
          : response(user),
    ),
  );
  await restoreSession();
  expect(readTokens()?.refreshToken).toBe("r2");
  expect(useAuth.getState().user).toEqual(user);
});
it.each([401, 403])("无效会话或权限被撤销时清理存储：%s", async (status) => {
  saveTokens(tokens);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => response(null, status)),
  );
  await restoreSession();
  expect(readTokens()).toBeNull();
  expect(useAuth.getState().user).toBeNull();
});
it("非管理员不能恢复后台身份", async () => {
  saveTokens(tokens);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => response({ ...user, isAdmin: false })),
  );
  await restoreSession();
  expect(readTokens()).toBeNull();
  expect(useAuth.getState().user).toBeNull();
});
it("网络失败保留会话但不开放页面，重试后恢复", async () => {
  saveTokens(tokens);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValueOnce(new TypeError("offline")).mockResolvedValue(response(user)),
  );
  await expect(restoreSession()).rejects.toThrow("网络连接失败");
  expect(readTokens()).toEqual(tokens);
  expect(useAuth.getState().user).toBeNull();
  await restoreSession();
  expect(useAuth.getState().user).toEqual(user);
});
it("续期服务暂时失败保留令牌", async () => {
  saveTokens(tokens);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => response(null, url.includes("refresh") ? 503 : 401)),
  );
  await expect(restoreSession()).rejects.toThrow();
  expect(readTokens()).toEqual(tokens);
  expect(useAuth.getState().user).toBeNull();
});
it("恢复请求进行中退出不会重新写入身份", async () => {
  saveTokens(tokens);
  let finish: (response: Response) => void = () => {};
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    ),
  );
  const pending = restoreSession();
  clearSession();
  finish(response(user));
  await pending;
  expect(readTokens()).toBeNull();
  expect(useAuth.getState().user).toBeNull();
});
