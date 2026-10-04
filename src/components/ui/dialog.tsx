// 弹窗按内容分级，固定标题、可滚动正文，沿用 Radix 焦点管理。
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";
export function Modal({
  title,
  open,
  onClose,
  children,
  size = "standard",
  description,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: "small" | "standard" | "wide";
  description?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className={`modal modal-${size}`} aria-describedby={undefined}>
          <div className="modal-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="hint">{description}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="关闭弹窗">
                <X size={18} />
              </Button>
            </Dialog.Close>
          </div>
          <div className="modal-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
