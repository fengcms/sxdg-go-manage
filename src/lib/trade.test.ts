// 金额和状态边界与接口合同保持一致。
import { expect, it } from "vitest";
import { orderAction, validRefund } from "./trade";

it.each([
  ["0", true],
  ["99.99", true],
  ["100", false],
  ["1e1", false],
  ["0.001", false],
  ["-1", false],
])("退款金额 %s", (v, ok) => expect(validRefund(v, "99.99")).toBe(ok));
it("仅待支付和待验收允许后台动作", () => {
  expect(orderAction(0)?.to).toBe(6);
  expect(orderAction(4)?.to).toBe(5);
  for (const s of [1, 2, 3, 5, 6, 7, 8, 9]) expect(orderAction(s)).toBeNull();
});
