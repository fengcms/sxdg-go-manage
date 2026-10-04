// 路由与菜单共享读取角色，写入权限统一见 permission。
import type { Role } from "../lib/permission";
import { allRoles } from "../lib/permission";
export interface NavItem {
  path: string;
  title: string;
  group: string;
  roles: Role[];
}
export const navigation: NavItem[] = [
  ...["overview", "orders", "users", "finance"].map((v, i) => ({
    path: `/dashboard/${v}`,
    title: ["运营总览", "订单统计", "用户统计", "财务统计"][i],
    group: "数据中心",
    roles: v === "finance" ? (["finance"] as Role[]) : allRoles,
  })),
  { path: "/users", title: "用户管理", group: "平台治理", roles: allRoles },
  { path: "/users/qualifications", title: "资质审核", group: "平台治理", roles: ["operator"] },
  ...["categories", "featured-categories", "form-templates", "banners", "service-badges"].map(
    (v, i) => ({
      path: `/content/${v}`,
      title: ["分类体系", "热门分类", "动态表单", "Banner 管理", "服务标签"][i],
      group: "内容运营",
      roles: v === "form-templates" ? allRoles : (["operator"] as Role[]),
    }),
  ),
  ...["orders", "refunds", "services", "requirements"].map((v, i) => ({
    path: `/${v}`,
    title: ["订单管理", "退款裁定", "服务管理", "需求管理"][i],
    group: "交易管理",
    roles: v === "refunds" ? (["finance", "customer_service"] as Role[]) : allRoles,
  })),
  { path: "/cs/agents", title: "客服配置", group: "客服中心", roles: [] },
  { path: "/cs/sessions", title: "接待工作台", group: "客服中心", roles: ["customer_service"] },
  ...["configs", "credit-rules", "fee-config", "audit-logs"].map((v, i) => ({
    path: `/system/${v}`,
    title: ["系统参数", "信用分规则", "服务费配置", "操作日志"][i],
    group: "系统设置",
    roles: [] as Role[],
  })),
];
export function navigationFor(path: string) {
  return (
    navigation.find((n) => path === n.path) ||
    navigation
      .filter((n) => path.startsWith(`${n.path}/`))
      .sort((a, b) => b.path.length - a.path.length)[0]
  );
}
