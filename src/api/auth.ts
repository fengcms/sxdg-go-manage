// 登录接口不进入受保护请求的自动刷新流程。

import { allowed, allRoles } from "../lib/permission";
import { clearSession, request } from "../lib/request/core";
import { ApiError } from "../lib/request/errors";
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
