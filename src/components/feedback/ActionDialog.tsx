// 写操作先校验再二次确认，失败保留输入，完成后刷新服务端状态。

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { queryClient } from "../../lib/queryClient";
import { request } from "../../lib/request/core";
import { FormField } from "../form/FormField";
import { Button, Input, Modal, Select, Textarea } from "../ui";
export interface FieldSpec {
  key: string;
  label: string;
  type?: "text" | "number" | "textarea" | "select" | "checkbox" | "datetime-local";
  options?: { value: string; label: string }[];
  description?: string;
  default?: string;
  required?: boolean;
}
export interface ActionSpec {
  title: string;
  path: string;
  method?: string;
  description?: string;
  fields?: FieldSpec[];
  body?: Record<string, unknown>;
  validate?: (values: Record<string, string>) => Record<string, string>;
  build?: (values: Record<string, string>) => Record<string, unknown>;
  after?: () => void;
}
export function ActionDialog({ spec, onClose }: { spec: ActionSpec; onClose: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [discard, setDiscard] = useState(false);
  const fields = spec.fields || [];
  const shape: Record<string, z.ZodString> = {};
  for (const f of fields)
    shape[f.key] = f.required ? z.string().trim().min(1, "此项必填") : z.string();
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<Record<string, string>>({
    resolver: zodResolver(z.object(shape)),
    defaultValues: Object.fromEntries(fields.map((f) => [f.key, f.default ?? ""])),
  });
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);
  const close = () => {
    if (isSubmitting) return;
    if (isDirty) setDiscard(true);
    else onClose();
  };
  return (
    <>
      <Modal title={confirm ? `确认${spec.title}` : spec.title} open onClose={close}>
        <p className="notice">{spec.description || "请核对操作内容，成功后将记录管理操作日志。"}</p>
        <form
          onSubmit={handleSubmit(async (values) => {
            const invalid = spec.validate?.(values) || {};
            for (const [k, message] of Object.entries(invalid)) setError(k, { message });
            if (Object.keys(invalid).length) return;
            if (!confirm) {
              setConfirm(true);
              return;
            }
            try {
              await request(spec.path, {
                method: spec.method || "PUT",
                body:
                  spec.method === "DELETE"
                    ? undefined
                    : spec.build
                      ? spec.build(values)
                      : { ...spec.body, ...values },
              });
              await queryClient.invalidateQueries({ queryKey: ["resource"] });
              toast.success("操作成功");
              spec.after?.();
              onClose();
            } catch (e) {
              setError("root", { message: e instanceof Error ? e.message : "操作失败" });
              setConfirm(false);
            }
          })}
        >
          {confirm ? (
            <dl className="detail-grid">
              {fields.map((f) => (
                <div key={f.key}>
                  <dt>{f.label}</dt>
                  <dd>
                    {f.type === "select"
                      ? f.options?.find((o) => o.value === getValues(f.key))?.label ||
                        getValues(f.key)
                      : getValues(f.key) || "—"}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            fields.map((f) => (
              <FormField
                key={f.key}
                id={`action-${f.key}`}
                label={f.label}
                description={f.description}
                error={errors[f.key]?.message}
              >
                <ActionInput field={f} register={register} />
              </FormField>
            ))
          )}
          {errors.root && (
            <p role="alert" className="error">
              {errors.root.message}
            </p>
          )}
          <div className="form-actions">
            <Button
              variant="ghost"
              onClick={() => (confirm ? setConfirm(false) : close())}
              disabled={isSubmitting}
            >
              {confirm ? "返回修改" : "取消"}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "处理中…" : confirm ? "确认执行" : "核对操作"}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal title="放弃未保存的修改？" open={discard} onClose={() => setDiscard(false)}>
        <p>关闭后本次输入不会保存。</p>
        <div className="form-actions">
          <Button variant="ghost" onClick={() => setDiscard(false)}>
            继续编辑
          </Button>
          <Button variant="danger" onClick={onClose}>
            放弃修改
          </Button>
        </div>
      </Modal>
    </>
  );
}
function ActionInput({
  field: f,
  register,
}: {
  field: FieldSpec;
  register: ReturnType<typeof useForm<Record<string, string>>>["register"];
}) {
  const props = { id: `action-${f.key}`, ...register(f.key) };
  if (f.type === "textarea") return <Textarea {...props} />;
  if (f.type === "select")
    return (
      <Select {...props}>
        {!f.required && <option value="">请选择</option>}
        {f.options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    );
  return (
    <Input
      type={f.type === "number" ? "text" : f.type || "text"}
      inputMode={f.type === "number" ? "numeric" : undefined}
      {...props}
    />
  );
}
