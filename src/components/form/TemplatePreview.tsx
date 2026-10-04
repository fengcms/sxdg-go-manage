// JSON 模板可交互预览，五类字段使用同一语义控件，不发送业务表单。
import { useState } from "react";
import { type Option, parseTemplate, type TemplateField } from "../../lib/template";
import { Input, Select } from "../ui";
import { FormField } from "./FormField";
export function TemplatePreview({ raw }: { raw: string }) {
  try {
    const result = parseTemplate(raw);
    return (
      <div className="template-preview">
        <h3>表单预览</h3>
        {result.warnings.map((w) => (
          <p key={w} className="error">
            {w}
          </p>
        ))}
        {result.blocks.map((b) => (
          <fieldset key={b.blockId}>
            <legend>{b.blockId}</legend>
            {b.fields.map((f) => (
              <PreviewField key={f.key} field={f} prefix={b.blockId} />
            ))}
          </fieldset>
        ))}
      </div>
    );
  } catch (e) {
    return <p className="error">模板预检：{e instanceof Error ? e.message : "JSON 无效"}</p>;
  }
}
function Choices({
  id,
  options = [],
  multiple = false,
}: {
  id: string;
  options?: Option[];
  multiple?: boolean;
}) {
  return (
    <Select id={id} multiple={multiple} defaultValue={multiple ? [] : ""}>
      {!multiple && <option value="">请选择</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
function PreviewField({ field: f, prefix }: { field: TemplateField; prefix: string }) {
  const id = `preview-${prefix}-${f.key}`;
  const [tags, setTags] = useState("");
  const p = f.panel;
  return (
    <FormField
      id={id}
      label={`${f.label}${f.required ? " *" : ""}`}
      description={f.type === "tags" ? `可自定义 ${f.maxCustom || 0} 个标签，逗号分隔` : undefined}
    >
      {f.type === "single" || f.type === "multi" ? (
        <Choices id={id} options={f.options} multiple={f.type === "multi"} />
      ) : f.type === "tags" ? (
        <>
          <Choices id={id} options={f.options} multiple />
          {!!f.maxCustom && (
            <Input
              aria-label={`${f.label}自定义标签`}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          )}
        </>
      ) : p?.mode === "chips" ? (
        <Choices id={id} options={p.options} multiple={p.multiple} />
      ) : (
        <div id={id}>
          {(p?.mode === "wheel" ? p.wheels : p?.groups)?.map((child) => (
            <PreviewField
              key={child.key}
              field={{
                ...child,
                label: child.label ?? child.key,
                type: "panel" in child ? "drawer" : "single",
              }}
              prefix={id}
            />
          ))}
        </div>
      )}
    </FormField>
  );
}
