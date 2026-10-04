// 基础控件的稳定出口，页面不依赖具体样式实现。
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

export { Button } from "./button";
export { Modal } from "./dialog";
export { Badge } from "./status";
export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn("control", className)} {...props} />;
}
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn("control textarea", className)} {...props} />;
}
export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn("control select-control", className)} {...props} />;
}
export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("card", className)} {...props} />;
}
