// 模板数据校验保留扩展展示属性；保存错误和可确认风险警告分别返回。
import { z } from "zod";
export interface Option {
  value: string;
  label: string;
  disabled?: boolean;
  [key: string]: unknown;
}
export interface Wheel {
  key: string;
  label?: string;
  options: Option[];
  defaultValue?: string;
  [key: string]: unknown;
}
export interface TabGroup {
  key: string;
  label: string;
  panel: Panel;
  [key: string]: unknown;
}
export interface Panel {
  mode: "chips" | "tab" | "wheel";
  title?: string;
  multiple?: boolean;
  options?: Option[];
  groups?: TabGroup[];
  wheels?: Wheel[];
  [key: string]: unknown;
}
export interface TemplateField {
  key: string;
  label: string;
  type: "single" | "multi" | "tags" | "drawer" | "wheel";
  required?: boolean;
  options?: Option[];
  maxCustom?: number;
  panel?: Panel;
  [key: string]: unknown;
}
export interface Block {
  blockId: string;
  title?: string;
  fields: TemplateField[];
  [key: string]: unknown;
}
const chars = (max: number) => z.string().refine((v) => [...v].length <= max, `最多${max}个字符`);
const option = z.looseObject({
  value: chars(100).refine((v) => v.length > 0, "选项值不能为空"),
  label: z.string().min(1),
  disabled: z.boolean().optional(),
});
const wheel = z.looseObject({
  key: z.string().min(1),
  label: z.string().optional(),
  options: z.array(option),
  defaultValue: z.string().optional(),
});
const panel: z.ZodType<Panel> = z.lazy(() =>
  z.looseObject({
    mode: z.enum(["chips", "tab", "wheel"]),
    title: chars(64).optional(),
    multiple: z.boolean().optional(),
    options: z.array(option).optional(),
    groups: z
      .array(z.looseObject({ key: z.string().min(1), label: z.string().min(1), panel }))
      .optional(),
    wheels: z.array(wheel).optional(),
  }),
);
const field = z.looseObject({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["single", "multi", "tags", "drawer", "wheel"]),
  required: z.boolean().optional(),
  options: z.array(option).optional(),
  maxCustom: z.number().int().nonnegative().optional(),
  panel: panel.optional(),
});
const blocks = z.array(
  z.looseObject({
    blockId: z.string().min(1),
    title: z.string().optional(),
    fields: z.array(field),
  }),
);
const unique = (values: string[], path: string) => {
  if (new Set(values).size !== values.length) throw new Error(`${path}：标识重复`);
};
export const parseTemplate = (raw: string): { blocks: Block[]; warnings: string[] } => {
  const parsed: unknown = JSON.parse(raw);
  const result = blocks.safeParse(parsed);
  if (!result.success)
    throw new Error(result.error.issues.map((i) => `${i.path.join(".")}：${i.message}`).join("；"));
  const warnings: string[] = [];
  unique(
    result.data.map((b) => b.blockId),
    "区块",
  );
  unique(
    result.data.flatMap((b) => b.fields.map((f) => f.key)),
    "顶层字段",
  );
  const checkOptions = (items: Option[] | undefined, path: string) => {
    if (items)
      unique(
        items.map((o) => o.value),
        `${path}.options`,
      );
  };
  const checkPanel = (p: Panel, path: string, depth: number) => {
    if (depth > 16) throw new Error(`${path}：根面板为0，面板深度不能超过16`);
    checkOptions(p.options, path);
    if (p.mode === "chips" && !p.options?.length)
      warnings.push(`${path}：面板缺少选项，可能无法填写或提交`);
    if (p.mode === "tab") {
      if (!p.groups?.length) warnings.push(`${path}：面板缺少分组`);
      unique(
        (p.groups || []).map((g) => g.key),
        `${path}.groups`,
      );
      for (const [i, g] of (p.groups || []).entries()) {
        if (g.panel.mode === "tab")
          warnings.push(`${path}.groups.${i}：小程序当前不支持嵌套tab展示，保留数据`);
        checkPanel(g.panel, `${path}.groups.${i}.panel`, depth + 1);
      }
    }
    if (p.mode === "wheel") {
      if (!p.wheels?.length) warnings.push(`${path}：面板缺少滚轮`);
      unique(
        (p.wheels || []).map((w) => w.key),
        `${path}.wheels`,
      );
      for (const [i, w] of (p.wheels || []).entries()) {
        checkOptions(w.options, `${path}.wheels.${i}`);
        if (!w.options.length) warnings.push(`${path}.wheels.${i}：滚轮缺少选项`);
      }
    }
  };
  for (const [bi, b] of result.data.entries())
    for (const [fi, f] of b.fields.entries()) {
      const path = `blocks.${bi}.fields.${fi}`;
      checkOptions(f.options, path);
      if (f.required && ["single", "multi"].includes(f.type) && !f.options?.length)
        warnings.push(`${path}：必填选择缺少选项，可能无法填写或提交`);
      if (["drawer", "wheel"].includes(f.type) && !f.panel)
        warnings.push(`${path}：缺少面板，可能无法填写或提交`);
      if (f.panel) checkPanel(f.panel, `${path}.panel`, 0);
    }
  return { blocks: result.data, warnings };
};
