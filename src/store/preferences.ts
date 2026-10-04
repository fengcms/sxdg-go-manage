// 界面偏好独立持久化，绝不保存令牌或业务数据。
import { create } from "zustand";

type Theme = "light" | "dark";
function saved(key: string) {
  try {
    return localStorage.getItem(`sxdg-ui-${key}`);
  } catch {
    return null;
  }
}
function persist(key: string, value: string) {
  try {
    localStorage.setItem(`sxdg-ui-${key}`, value);
  } catch {
    /* 禁用存储时仅本次生效。 */
  }
}
const initialTheme: Theme = saved("theme") === "dark" ? "dark" : "light";
document.documentElement.dataset.theme = initialTheme;
export const usePreferences = create<{
  theme: Theme;
  collapsed: boolean;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  collapseSidebar: () => void;
}>((set) => ({
  theme: initialTheme,
  collapsed: saved("collapsed") === "true",
  toggleTheme: () =>
    set((s) => {
      const theme = s.theme === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = theme;
      persist("theme", theme);
      return { theme };
    }),
  collapseSidebar: () => set({ collapsed: true }),
  toggleSidebar: () =>
    set((s) => {
      persist("collapsed", String(!s.collapsed));
      return { collapsed: !s.collapsed };
    }),
}));
