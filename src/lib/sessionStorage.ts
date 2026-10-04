// 标签页会话仅保存令牌，不持久化密码、用户角色或业务缓存。
import type { Tokens } from "../types/common";

const key = "sxdg-admin-session-v1";
export function saveTokens(tokens: Tokens | null) {
  try {
    if (tokens)
      sessionStorage.setItem(
        key,
        JSON.stringify({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        }),
      );
    else sessionStorage.removeItem(key);
  } catch {
    /* 浏览器禁用存储时保留内存登录，不影响当前操作。 */
  }
}
export function readTokens(): Tokens | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (
      typeof value?.accessToken !== "string" ||
      !value.accessToken ||
      typeof value?.refreshToken !== "string" ||
      !value.refreshToken ||
      typeof value?.expiresIn !== "number" ||
      !Number.isFinite(value.expiresIn) ||
      value.expiresIn <= 0
    ) {
      saveTokens(null);
      return null;
    }
    return {
      accessToken: value.accessToken,
      refreshToken: value.refreshToken,
      expiresIn: value.expiresIn,
    };
  } catch {
    saveTokens(null);
    return null;
  }
}
