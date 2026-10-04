// 客服三权分立，超级管理员也不能绕过会话参与方限制。
export function canReadMessage(userId: number, conv: { user1Id: number; user2Id: number | null }) {
  return conv.user1Id === userId || conv.user2Id === userId;
}
export function canTransfer(userId: number, conv: { user2Id: number | null }) {
  return conv.user2Id === userId;
}
