// 素材上传返回服务端地址，不手工构造 URL；失败保留旧值。
import { useState } from "react";
import { toast } from "sonner";
import { request } from "../../lib/request/core";
import { Button, Input } from "../ui";
export function UploadInput({
  id,
  value,
  onChange,
  biz,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  biz: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="上传图片后自动填写地址"
      />
      <Input
        aria-label="选择上传图片"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          try {
            const data = new FormData();
            data.append("file", file);
            data.append("biz_type", biz);
            const result = await request<{ fileUrl: string }>("/api/v1/upload", {
              method: "POST",
              body: data,
            });
            onChange(result.fileUrl);
            toast.success("图片已上传，保存表单后生效");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "上传失败");
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
      {busy && <p role="status">上传中…</p>}
      {value.startsWith("/uploads/") && (
        <img className="upload-preview" src={value} alt="素材预览" />
      )}
      <Button variant="ghost" onClick={() => onChange("")}>
        清空引用
      </Button>
    </>
  );
}
