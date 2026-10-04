// 按钮变体分清操作层级，图标按钮由调用方提供可访问名称。
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";
export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ComponentProps<"button"> & {
  variant?: "default" | "outline" | "secondary" | "ghost" | "danger" | "danger-ghost";
  size?: "default" | "sm" | "icon";
}) {
  return (
    <button
      type="button"
      className={cn("button", `button-${variant}`, `button-${size}`, className)}
      {...props}
    />
  );
}
