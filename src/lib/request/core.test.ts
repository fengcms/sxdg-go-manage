// 并发刷新及退出竞态测试通过 HTTP 替身验证真实请求内核。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../store/auth";
import { clearSession, request } from "./core";

const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ code: status === 200 ? 0 : 20001, message: "过期", data }), {
    status,
  });
beforeEach(() => {
  useAuth
    .getState()
    .set(
      { accessToken: "old", refreshToken: "r1", expiresIn: 1 },
      { id: 1, nickname: "甲", isAdmin: true, adminRole: "operator" },
    );
});
afterEach(() => {
  clearSession();
  vi.unstubAllGlobals();
});
describe("会话请求", () => {
  it("并发401只刷新一次并轮换双令牌", async () => {
    let count = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        if (url.includes("refresh")) {
          count++;
          await new Promise((r) => setTimeout(r, 10));
          return response({ accessToken: "new", refreshToken: "r2", expiresIn: 60 });
        }
        return new Headers(init.headers).get("Authorization") === "Bearer old"
          ? response(null, 401)
          : response("ok");
      }),
    );
    expect(await Promise.all([request("/a"), request("/b")])).toEqual(["ok", "ok"]);
    expect(count).toBe(1);
    expect(useAuth.getState().tokens?.refreshToken).toBe("r2");
  });
  it("登录失败不触发刷新", async () => {
    const f = vi.fn(async () => response(null, 401));
    vi.stubGlobal("fetch", f);
    await expect(request("/auth/login", { public: true })).rejects.toThrow();
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("退出后的响应拒绝回填", async () => {
    let finish: (v: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((r) => {
            finish = r;
          }),
      ),
    );
    const p = request("/slow");
    clearSession();
    finish(response("秘密"));
    await expect(p).rejects.toThrow("会话已切换");
  });
  it("刷新失败清除会话，不循环重试", async () => {
    const f = vi.fn(async () => response(null, 401));
    vi.stubGlobal("fetch", f);
    await expect(request("/private")).rejects.toThrow();
    expect(f).toHaveBeenCalledTimes(2);
    expect(useAuth.getState().user).toBeNull();
  });
});
