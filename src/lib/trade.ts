// 交易操作采用固定状态动作，金额用十进制进行边界比较。
import Decimal from "decimal.js";
export const states: Record<string, Record<number, string>> = {
  orders: {
    0: "待支付",
    2: "已预约",
    3: "进行中",
    4: "待验收",
    5: "已完成",
    6: "已取消",
    7: "退款中",
    8: "退款完成",
    9: "退款被拒",
  },
  refunds: {
    0: "处理中",
    1: "已同意",
    2: "已拒绝",
    3: "平台审核中",
    4: "已完成",
    5: "已撤销",
    6: "通道失败待处理",
  },
  services: { 0: "草稿", 2: "已发布", 3: "已关闭" },
  requirements: { 0: "草稿", 1: "待支付", 2: "已发布", 3: "已关闭" },
};
export function orderAction(status: number) {
  return status === 0
    ? { title: "取消未支付订单", to: 6 }
    : status === 4
      ? { title: "验收完成", to: 5 }
      : null;
}
export function validRefund(value: string, maximum: string) {
  return (
    /^\d+(\.\d{1,2})?$/.test(value) && new Decimal(value).gte(0) && new Decimal(value).lte(maximum)
  );
}

// refundChannelActions 与服务端状态条件一致，不把查单当作退款重发。
export function refundChannelActions(status: number, channel?: string | null) {
  return { reconcile: [1, 4, 6].includes(status), retry: status === 6 && channel === "CLOSED" };
}
// channelText 未知通道保留原值，空值不冒充处理中。
export function channelText(channel?: string | null) {
  const labels: Record<string, string> = {
    SUCCESS: "退款成功",
    PROCESSING: "通道处理中",
    CLOSED: "通道已关闭",
    ABNORMAL: "通道异常",
  };
  return channel ? labels[channel] || channel : "暂无通道记录";
}
// refundReasonError 按Unicode字符计数，与后端rune校验保持一致。
export function refundReasonError(reason: string) {
  const size = Array.from(reason.trim()).length;
  return size >= 1 && size <= 255 ? {} : { reason: "请填写1～255个字符的操作原因" };
}
