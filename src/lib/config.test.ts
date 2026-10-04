// 费用转换无浮点误差，信用分组合独立校验。
import { expect, it } from "vitest";
import { creditValid, feeBody, feeErrors } from "./config";

it.each([
  ["0", "0.00"],
  ["30", "0.30"],
  ["100", "1.00"],
])("分摊%s正确转换", (percent, ratio) =>
  expect(feeBody({ fee_rate: "5", min_fee: "0", payer: "split", percent }).split_ratio).toBe(ratio),
);
it.each(["30.5", "1e2", "-1", "101"])("拒绝非法百分比%s", (percent) =>
  expect(feeErrors({ fee_rate: "5", min_fee: "0", payer: "split", percent }).percent).toBeTruthy(),
);
it("金额精度和上限", () => {
  expect(
    feeErrors({ fee_rate: "0.001", min_fee: "10000000000", payer: "provider" }),
  ).toHaveProperty("fee_rate");
  expect(feeErrors({ fee_rate: "5", min_fee: "9999999999.99", payer: "provider" })).toEqual({});
});
it.each([
  [0, 600, 1000, true],
  [800, 600, 1000, false],
  [0, 1001, 1000, false],
  [0, 1, 100001, false],
])("信用组合校验", (min, initial, max, ok) =>
  expect(creditValid(min as number, initial as number, max as number)).toBe(ok),
);
