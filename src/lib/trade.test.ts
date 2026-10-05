// 金额和状态边界与接口合同保持一致。
import { expect, it } from "vitest";
import {
  channelText,
  orderAction,
  refundChannelActions,
  refundReasonError,
  validRefund,
} from "./trade";

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

it.each([0, 1, 2, 3, 4, 5, 6, 7])("通道动作状态%s", (status) => {
  expect(refundChannelActions(status, "CLOSED")).toEqual({
    reconcile: [1, 4, 6].includes(status),
    retry: status === 6,
  });
  expect(refundChannelActions(status, "ABNORMAL").retry).toBe(false);
});
it("通道和原因边界", () => {
  expect(channelText(null)).toBe("暂无通道记录");
  expect(channelText("NEW")).toBe("NEW");
  expect(refundReasonError("  ")).toHaveProperty("reason");
  expect(refundReasonError("😀".repeat(255))).toEqual({});
  expect(refundReasonError("😀".repeat(256))).toHaveProperty("reason");
});
