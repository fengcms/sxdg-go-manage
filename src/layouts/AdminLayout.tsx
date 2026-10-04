// 响应式导航与身份校准，菜单只展示当前角色授权页面。

import { useQuery } from "@tanstack/react-query";
import {
  Award,
  Briefcase,
  ChartColumn,
  ChevronRight,
  ClipboardList,
  FileJson,
  FolderTree,
  Headphones,
  Image,
  Layers,
  LogOut,
  Menu,
  MessagesSquare,
  Moon,
  PanelLeft,
  Percent,
  RotateCcw,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Sun,
  Tags,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { logout } from "../api/auth";
import { Button } from "../components/ui";
import { navigation, navigationFor } from "../config/navigation";
import { allowed, roles } from "../lib/permission";
import { qk, queryClient } from "../lib/queryClient";
import { clearSession, request } from "../lib/request/core";
import { useAuth } from "../store/auth";
import { usePreferences } from "../store/preferences";
import type { UserIdentity } from "../types/common";

const navIcons = [
  ChartColumn,
  ChartColumn,
  Users,
  Wallet,
  Users,
  ShieldCheck,
  FolderTree,
  Star,
  FileJson,
  Image,
  Tags,
  ShoppingBag,
  RotateCcw,
  Briefcase,
  ClipboardList,
  Headphones,
  MessagesSquare,
  Settings,
  Award,
  Percent,
  ScrollText,
];
export default function AdminLayout() {
  const { theme, collapsed, toggleTheme, toggleSidebar } = usePreferences();
  const user = useAuth((s) => s.user);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const location = useLocation();
  const me = useQuery({
    queryKey: qk.identity,
    queryFn: ({ signal }) => request<UserIdentity>("/api/v1/auth/me", { signal }),
    refetchInterval: 60000,
  });
  useEffect(() => {
    if (!me.data) return;
    if (!me.data.isAdmin || !Object.hasOwn(roles, me.data.adminRole || "")) {
      clearSession();
      return;
    }
    if (me.data.adminRole !== useAuth.getState().user?.adminRole) {
      const tokens = useAuth.getState().tokens;
      if (tokens) {
        void queryClient.cancelQueries();
        queryClient.clear();
        useAuth.getState().set(tokens, me.data);
      }
    } else useAuth.getState().identity(me.data);
  }, [me.data]);
  const items = navigation.filter((n) => allowed(user?.adminRole, n.roles));
  const title = navigationFor(location.pathname)?.title || "工作台";
  return (
    <div className={`app-bg admin-shell ${collapsed ? "is-collapsed" : ""}`}>
      {open && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="关闭导航"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <NavLink className="logo" to="/dashboard/overview">
          <Layers />
          <span>
            四系点工<small>管理工作台</small>
          </span>
        </NavLink>
        <nav>
          {[...new Set(items.map((n) => n.group))].map((group) => (
            <div className="nav-group" key={group}>
              <p>{group}</p>
              {items
                .filter((n) => n.group === group)
                .map((n) => (
                  <NavLink
                    end={n.path === "/users"}
                    title={n.title}
                    aria-label={n.title}
                    onClick={() => setOpen(false)}
                    key={n.path}
                    to={n.path}
                  >
                    {(() => {
                      const Icon = navIcons[navigation.indexOf(n)] || Settings;
                      return <Icon size={16} aria-hidden="true" />;
                    })()}
                    <span>{n.title}</span>
                  </NavLink>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">{import.meta.env.DEV ? "开发环境" : "管理控制台"}</div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="actions">
            <Button
              className="menu-button"
              variant="ghost"
              aria-label="展开导航"
              onClick={() => setOpen(!open)}
            >
              <Menu size={20} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="collapse-button"
              aria-label={collapsed ? "展开侧边栏" : "折叠侧边栏"}
              onClick={toggleSidebar}
            >
              <PanelLeft size={18} />
            </Button>
            <span className="hint">工作台</span>
            <ChevronRight size={14} />
            <span>{title}</span>
          </div>
          <div className="actions">
            <Button variant="ghost" size="icon" aria-label="切换主题" onClick={toggleTheme}>
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </Button>
            <span className="avatar" aria-hidden="true">
              {user?.nickname?.slice(0, 1) || "管"}
            </span>
            <span className="account-name">{user?.nickname}</span>
            <span className="badge">
              {roles[user?.adminRole as keyof typeof roles] || "未知角色"}
            </span>
            <Button
              variant="ghost"
              aria-label="退出登录"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await logout();
                } catch {
                  toast.error("网络异常，本地会话已退出；服务端撤销状态未确认");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <LogOut size={16} />
            </Button>
          </div>
        </header>
        <main className="workspace">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
