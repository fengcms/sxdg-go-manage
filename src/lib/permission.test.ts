// 权限测试覆盖未知身份和角色边界。
import { describe, expect, it } from "vitest";
import { actions, allowed } from "./permission";

describe("权限边界", () => {
  it.each([
    ["super_admin", true],
    ["operator", false],
    ["finance", true],
    ["customer_service", false],
    ["unknown", false],
    [null, false],
  ])("退款裁定 %s", (role, result) => expect(allowed(role, actions.refund)).toBe(result));
});
