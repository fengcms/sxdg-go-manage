// 费率与信用配置校验，字符串保留精度，拒绝科学计数法。
import Decimal from "decimal.js";
export function decimalRange(value: string, max: string) {
  return (
    /^\d+(\.\d{1,2})?$/.test(value) && new Decimal(value).gte(0) && new Decimal(value).lte(max)
  );
}
export function feeErrors(v: Record<string, string>) {
  const e: Record<string, string> = {};
  if (!decimalRange(v.fee_rate, "100")) e.fee_rate = "费率应为0～100，最多两位小数";
  if (!decimalRange(v.min_fee, "9999999999.99"))
    e.min_fee = "最低费用应为0～9999999999.99，最多两位小数";
  if (v.payer === "split" && (!/^\d+$/.test(v.percent) || new Decimal(v.percent).gt(100)))
    e.percent = "雇主承担百分比须为0～100整数";
  return e;
}
export function feeBody(v: Record<string, string>) {
  return {
    fee_rate: v.fee_rate,
    min_fee: v.min_fee,
    payer: v.payer,
    split_ratio: v.payer === "split" ? new Decimal(v.percent).div(100).toFixed(2) : null,
  };
}
export function creditValid(min: number, initial: number, max: number) {
  return (
    [min, initial, max].every(Number.isInteger) &&
    min >= 0 &&
    min <= initial &&
    initial <= max &&
    max <= 100000
  );
}
export const configNotes: Record<string, string> = {
  gps_checkin_radius_m: "单位：米；后续打卡校验时读取，只影响后续打卡。",
  order_payment_timeout_hour: "单位：小时；新订单创建时写入截止时间，不重算存量订单。",
  service_payment_timeout_hour: "单位：小时；新需求创建时写入截止时间，不重算存量需求。",
  auto_accept_hours: "单位：小时；订单进入待验收时写入，不重算存量订单。",
  refund_opponent_timeout_hours: "单位：小时；退款发起时写入，不重算存量退款。",
  review_timeout_days: "单位：天；订单完成时写入，不重算存量订单。",
  settlement_delay_hours: "单位：小时；结算业务触发时读取，影响随后触发的结算。",
  credit_score_initial: "单位：分；用于新注册用户，不重算存量用户。",
  credit_score_max: "单位：分；后续信用变动按新边界截断，不批量重算历史用户。",
  credit_score_min: "单位：分；后续信用变动按新边界截断，不批量重算历史用户。",
};
