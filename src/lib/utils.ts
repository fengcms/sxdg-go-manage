// 通用显示工具，不改变接口字段名。
import { type ClassValue, clsx } from "clsx";
import { format } from "date-fns";
import Decimal from "decimal.js";
import { twMerge } from "tailwind-merge";
export const cn = (...values: ClassValue[]) => twMerge(clsx(values));
export const dateText = (v: unknown) =>
  typeof v === "string" && !Number.isNaN(Date.parse(v))
    ? format(new Date(v), "yyyy-MM-dd HH:mm")
    : "—";
export function money(v: unknown) {
  if (typeof v !== "string" && typeof v !== "number") return "—";
  try {
    return `¥${new Decimal(v).toFixed(2)}`;
  } catch {
    return "—";
  }
}
export const text = (v: unknown): string =>
  v === null || v === undefined || v === ""
    ? "—"
    : typeof v === "object"
      ? JSON.stringify(v)
      : typeof v === "boolean"
        ? v
          ? "是"
          : "否"
        : String(v);
