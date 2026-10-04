// 用户预览值只在组件内存在；确认面板才写入，取消不修改，结构变化重置预览。
import { useId, useState } from "react";
import { type Option, type Panel, parseTemplate, type TemplateField } from "../../lib/template";
import { Button, Input, Modal, Select } from "../ui";
export type PreviewValue = string | string[] | { [key: string]: PreviewValue };
const defaultPanel = (p: Panel): PreviewValue =>
  p.mode === "chips"
    ? p.multiple
      ? []
      : ""
    : p.mode === "wheel"
      ? p.wheels?.length === 1
        ? String(p.wheels[0].defaultValue ?? "")
        : Object.fromEntries((p.wheels || []).map((w) => [w.key, String(w.defaultValue ?? "")]))
      : Object.fromEntries((p.groups || []).map((g) => [g.key, defaultPanel(g.panel)]));
const toggle = (selected: string[], value: string) =>
  value === "all"
    ? selected.includes(value)
      ? []
      : [value]
    : selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected.filter((v) => v !== "all"), value];
const Chips = ({
  options = [],
  multiple = false,
  value,
  onChange,
}: {
  options?: Option[];
  multiple?: boolean;
  value: PreviewValue;
  onChange: (v: PreviewValue) => void;
}) => {
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return (
    <div className="designer-chips">
      {options.map((o) => (
        <Button
          key={o.value}
          variant={values.includes(o.value) ? "default" : "outline"}
          disabled={o.disabled}
          aria-pressed={values.includes(o.value)}
          onClick={() => onChange(multiple ? toggle(values, o.value) : o.value)}
        >
          {o.label}
        </Button>
      ))}
      {!options.length && <p className="hint">无可填写选项</p>}
    </div>
  );
};
const PanelInput = ({
  panel: p,
  value,
  onChange,
}: {
  panel: Panel;
  value: PreviewValue;
  onChange: (v: PreviewValue) => void;
}) => {
  const controlID = useId();
  const [tab, setTab] = useState(p.groups?.[0]?.key || "");
  if (p.mode === "chips")
    return <Chips options={p.options} multiple={p.multiple} value={value} onChange={onChange} />;
  if (p.mode === "wheel")
    return (
      <div className="designer-wheel">
        {p.wheels?.map((w) => (
          <label key={w.key} htmlFor={`${controlID}-${w.key}`}>
            {w.label || w.key}
            <Select
              id={`${controlID}-${w.key}`}
              aria-label={w.label || w.key}
              value={
                typeof value === "string"
                  ? value
                  : !Array.isArray(value)
                    ? String(value[w.key] ?? "")
                    : ""
              }
              onChange={(e) =>
                onChange(
                  p.wheels?.length === 1
                    ? e.target.value
                    : {
                        ...(typeof value === "object" && !Array.isArray(value) ? value : {}),
                        [w.key]: e.target.value,
                      },
                )
              }
            >
              <option value="">请选择</option>
              {w.options.map((o) => (
                <option key={o.value} value={o.value} disabled={o.disabled}>
                  {o.label}
                </option>
              ))}
            </Select>
          </label>
        ))}
      </div>
    );
  const active = p.groups?.find((g) => g.key === tab) || p.groups?.[0];
  const record = typeof value === "object" && !Array.isArray(value) ? value : {};
  return (
    <div>
      <div className="designer-chips">
        {p.groups?.map((g) => (
          <Button
            key={g.key}
            variant={active?.key === g.key ? "default" : "outline"}
            onClick={() => setTab(g.key)}
          >
            {g.label}
          </Button>
        ))}
      </div>
      {active?.panel.mode === "tab" ? (
        <p className="error">小程序当前不支持此嵌套tab展示，数据将保留。</p>
      ) : (
        active && (
          <PanelInput
            key={active.key}
            panel={active.panel}
            value={record[active.key] ?? defaultPanel(active.panel)}
            onChange={(v) => onChange({ ...record, [active.key]: v })}
          />
        )
      )}
    </div>
  );
};
const PreviewField = ({
  field: f,
  value,
  onChange,
}: {
  field: TemplateField;
  value: PreviewValue;
  onChange: (v: PreviewValue) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PreviewValue>("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const selected = Array.isArray(value) ? value : [];
  const custom = selected.filter((v) => !f.options?.some((o) => o.value === v));
  const addTag = () => {
    const next = text.trim();
    if (!next) return;
    if ([...next].length > 100) {
      setError("标签最多100个字符");
      return;
    }
    if (selected.includes(next)) {
      setError("标签已存在");
      return;
    }
    if (custom.length >= (f.maxCustom ?? 0)) {
      setError("自定义标签已达到上限");
      return;
    }
    onChange([...selected.filter((v) => v !== "all"), next]);
    setText("");
    setError("");
  };
  return (
    <div className="designer-preview-field">
      <strong>
        {f.label}
        {f.required ? " *" : ""}
      </strong>
      {f.type === "single" || f.type === "multi" ? (
        <Chips
          options={f.options}
          multiple={f.type === "multi"}
          value={value}
          onChange={onChange}
        />
      ) : f.type === "tags" ? (
        <>
          <Chips options={f.options} multiple value={value} onChange={onChange} />
          <div className="designer-chips">
            {custom.map((v) => (
              <Button
                key={v}
                variant="secondary"
                onClick={() => onChange(selected.filter((s) => s !== v))}
                aria-label={`删除标签${v}`}
              >
                {v} ×
              </Button>
            ))}
          </div>
          <p className="hint">自定义上限 {f.maxCustom ?? 0} 个</p>
          {(f.maxCustom ?? 0) > 0 && (
            <div className="actions">
              <Input
                aria-label={`${f.label}自定义标签`}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <Button variant="outline" onClick={addTag}>
                添加标签
              </Button>
            </div>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </>
      ) : f.panel ? (
        <>
          <Button
            variant="outline"
            onClick={() => {
              setDraft(structuredClone(value));
              setOpen(true);
            }}
          >
            {(value &&
              (typeof value === "string"
                ? value
                : Array.isArray(value)
                  ? value.join("、")
                  : Object.values(value).some((v) => v !== "")
                    ? "已选择"
                    : "")) ||
              String(f.placeholder || "请选择")}{" "}
            ›
          </Button>
          <Modal
            title={f.panel.title ?? f.label}
            open={open}
            onClose={() => setOpen(false)}
            description="预览选择不会保存到模板"
          >
            <PanelInput panel={f.panel} value={draft} onChange={setDraft} />
            <div className="actions">
              <Button variant="outline" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button
                onClick={() => {
                  onChange(draft);
                  setOpen(false);
                }}
              >
                确定选择
              </Button>
            </div>
          </Modal>
        </>
      ) : (
        <p className="error">缺少面板，无法预览该字段</p>
      )}
    </div>
  );
};
const PreviewBody = ({ raw }: { raw: string }) => {
  const parsed = parseTemplate(raw);
  const [values, setValues] = useState<Record<string, PreviewValue>>(
    () =>
      Object.fromEntries(
        parsed.blocks.flatMap((b) =>
          b.fields.map((f) => [
            f.key,
            f.defaultValue ?? (f.panel ? defaultPanel(f.panel) : f.type === "single" ? "" : []),
          ]),
        ),
      ) as Record<string, PreviewValue>,
  );
  return (
    <div className="template-preview">
      <Button variant="ghost" onClick={() => setValues({})}>
        重置预览
      </Button>
      {parsed.blocks.map((b) => (
        <fieldset key={b.blockId}>
          <legend>{b.title || b.blockId}</legend>
          {b.fields.map((f) => (
            <PreviewField
              key={f.key}
              field={f}
              value={
                values[f.key] ?? (f.panel ? defaultPanel(f.panel) : f.type === "single" ? "" : [])
              }
              onChange={(v) => setValues({ ...values, [f.key]: v })}
            />
          ))}
        </fieldset>
      ))}
      <details>
        <summary>预览提交值（不会保存）</summary>
        <pre>{JSON.stringify(values, null, 2)}</pre>
      </details>
    </div>
  );
};
export const TemplatePreview = ({ raw }: { raw: string }) => {
  try {
    parseTemplate(raw);
  } catch (e) {
    return <p className="error">无法预览：{e instanceof Error ? e.message : "模板结构无效"}</p>;
  }
  return <PreviewBody key={raw} raw={raw} />;
};
