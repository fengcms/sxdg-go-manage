// 单一权限映射，未知角色默认拒绝。
export const roles = {
  super_admin: "超级管理员",
  operator: "运营",
  finance: "财务",
  customer_service: "客服",
};
export type Role = keyof typeof roles;
export const allRoles: Role[] = ["super_admin", "operator", "finance", "customer_service"];
export function isRole(role: unknown): role is Role {
  return typeof role === "string" && Object.hasOwn(roles, role);
}
export function allowed(role: unknown, list: readonly Role[]) {
  return isRole(role) && (role === "super_admin" || list.includes(role));
}
export const actions = {
  content: ["operator"],
  ban: ["customer_service"],
  credit: [],
  qualification: ["operator"],
  order: ["customer_service"],
  refund: ["finance"],
  customer: ["customer_service"],
  system: [],
} satisfies Record<string, Role[]>;
export type Action = keyof typeof actions;
