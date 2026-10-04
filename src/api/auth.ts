// 登录接口不进入受保护请求的自动刷新流程。

import { allowed, allRoles } from "../lib/permission";
import { clearSession, request } from "../lib/request/core";
import { ApiError } from "../lib/request/errors";
import { readTokens } from "../lib/sessionStorage";
import { useAuth } from "../store/auth";
import type { LoginResult, UserIdentity } from "../types/common";
export async function login(account: string, password: string) {
  clearSession();
  const data = await request<LoginResult>("/api/v1/auth/login", {
    method: "POST",
    body: { account, password },
    public: true,
  });
  if (!data.user.isAdmin || !allowed(data.user.adminRole, allRoles))
    throw new ApiError("该账号无后台权限", 403);
  useAuth.getState().set(data, data.user);
  try {
    const user = await request<UserIdentity>("/api/v1/auth/me");
    if (!user.isAdmin || !allowed(user.adminRole, allRoles))
      throw new ApiError("该账号无后台权限", 403);
    useAuth.getState().identity(user);
  } catch (e) {
    clearSession();
    throw e;
  }
}
export async function logout() {
  try {
    await request("/api/v1/auth/logout", { method: "POST" });
  } finally {
    clearSession();
  }
}

// 启动恢复使用同飞，StrictMode重复挂载不会竞争轮换刷新令牌。
let restoration: Promise<void> | null = null;
export function restoreSession(): Promise<void> {
  if (restoration) return restoration;
  restoration = restoreSavedSession().finally(() => {
    restoration = null;
  });
  return restoration;
}
async function restoreSavedSession() {
  const tokens = readTokens();
  if (!tokens) return;
  useAuth.getState().resume(tokens);
  const epoch = useAuth.getState().epoch;
  try {
    const user = await request<UserIdentity>("/api/v1/auth/me");
    if (!user.isAdmin || !allowed(user.adminRole, allRoles))
      throw new ApiError("该账号无后台权限", 403);
    if (useAuth.getState().epoch === epoch) useAuth.getState().identity(user);
  } catch (e) {
    if (useAuth.getState().epoch !== epoch) return;
    if (e instanceof ApiError && [401, 403].includes(e.status)) {
      clearSession();
      return;
    }
    // 网络或服务端暂时失败保留保存的会话，启动门禁展示重试，不展示受保护页面。
    throw e;
  }
}
