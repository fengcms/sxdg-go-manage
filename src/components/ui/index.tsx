// 无业务的基础控件统一尺寸、焦点和语义色。

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/utils";
export function Button({
  className,
  variant = "default",
  ...props
}: ComponentProps<"button"> & { variant?: "default" | "ghost" | "danger" }) {
  return (
    <button type="button" className={cn("button", `button-${variant}`, className)} {...props} />
  );
}
export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn("control", className)} {...props} />;
}
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn("control textarea", className)} {...props} />;
}
export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn("control", className)} {...props} />;
}
export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("card", className)} {...props} />;
}
export function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>;
}
export function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal" aria-describedby={undefined}>
          <div className="modal-heading">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" aria-label="关闭弹窗">
                <X size={18} />
              </Button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
