// 通道详情只展示真实字段，空值和未知通道不伪造成成功。
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { RefundChannel } from "./RefundChannel";

afterEach(cleanup);
it("缺少通道和历史记录时显示明确空态", () => {
  render(
    <RefundChannel row={{ id: 1, status: 1, createdAt: "", channelStatus: null, attempts: [] }} />,
  );
  expect(screen.getByText("暂无通道记录")).toBeTruthy();
  expect(screen.getByText("暂无尝试记录")).toBeTruthy();
  expect(screen.queryByText("退款成功")).toBeNull();
});
it("历史号与当前号分开且未知通道保留", () => {
  render(
    <RefundChannel
      row={{
        id: 1,
        status: 6,
        createdAt: "",
        refundNo: "NEW",
        channelStatus: "ABNORMAL",
        attempts: [
          {
            id: 1,
            refundId: 1,
            refundNo: "OLD",
            channelStatus: "CLOSED",
            createdAt: "2026-10-05T10:00:00Z",
          },
          {
            id: 2,
            refundId: 1,
            refundNo: "NEW",
            channelStatus: "FUTURE",
            createdAt: "2026-10-05T10:01:00Z",
          },
        ],
      }}
    />,
  );
  expect(screen.getByText("历史号")).toBeTruthy();
  expect(screen.getByText("当前号")).toBeTruthy();
  expect(screen.getByText("FUTURE")).toBeTruthy();
  expect(screen.getByText(/请在微信商户平台处理异常/)).toBeTruthy();
});
