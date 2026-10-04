// 管理员身份不能扩大参与方阅读与转接权。
import { expect, it } from "vitest";
import { canReadMessage, canTransfer } from "./customer";

it.each([
  [1, true, false],
  [2, true, true],
  [3, false, false],
])("用户%s会话权限", (id, read, transfer) => {
  expect(canReadMessage(id, { user1Id: 1, user2Id: 2 })).toBe(read);
  expect(canTransfer(id, { user2Id: 2 })).toBe(transfer);
});
