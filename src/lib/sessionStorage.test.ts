// 标签页会话的存储边界，不保存密码和身份信息。
import { afterEach, expect, it, vi } from "vitest";
import { readTokens, saveTokens } from "./sessionStorage";

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});
it("只存双令牌和有效期，退出可清理", () => {
  const data = {
    accessToken: "a",
    refreshToken: "r",
    expiresIn: 60,
    password: "secret",
    user: { adminRole: "super_admin" },
  };
  saveTokens(data);
  expect(readTokens()).toEqual({ accessToken: "a", refreshToken: "r", expiresIn: 60 });
  expect(sessionStorage.getItem("sxdg-admin-session-v1")).not.toContain("secret");
  saveTokens(null);
  expect(readTokens()).toBeNull();
});
it.each(["{", "null", "{}", '{"accessToken":"a","refreshToken":"r","expiresIn":-1}'])(
  "丢弃损坏的存储：%s",
  (value) => {
    sessionStorage.setItem("sxdg-admin-session-v1", value);
    expect(readTokens()).toBeNull();
    expect(sessionStorage.getItem("sxdg-admin-session-v1")).toBeNull();
  },
);
it("浏览器禁用存储时不崩溃", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("disabled");
  });
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
    throw new Error("disabled");
  });
  expect(readTokens()).toBeNull();
  expect(() => saveTokens(null)).not.toThrow();
});
