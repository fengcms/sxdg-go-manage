// 模板保存与发布预检分开；递归深度对齐后端，拒绝无效面板。
import { z } from "zod";
export interface Option {
  value: string;
  label: string;
}
export interface TemplateField {
  key: string;
  label: string;
  type: "single" | "multi" | "tags" | "drawer" | "wheel";
  required?: boolean;
  options?: Option[];
  maxCustom?: number;
  panel?: {
    mode: "chips" | "tab" | "wheel";
    multiple?: boolean;
    options?: Option[];
    groups?: TemplateField[];
    wheels?: TemplateField[];
  };
}
export interface Block {
  blockId: string;
  fields: TemplateField[];
}
const option = z.object({ value: z.string().min(1).max(100), label: z.string().min(1) });
const field: z.ZodType<TemplateField> = z.lazy(() =>
  z.object({
    key: z.string().min(1),
    label: z.string().min(1),
    type: z.enum(["single", "multi", "tags", "drawer", "wheel"]),
    required: z.boolean().optional(),
    options: z.array(option).optional(),
    maxCustom: z.number().int().nonnegative().optional(),
    panel: z
      .object({
        mode: z.enum(["chips", "tab", "wheel"]),
        multiple: z.boolean().optional(),
        options: z.array(option).optional(),
        groups: z.array(field).optional(),
        wheels: z.array(field).optional(),
      })
      .optional(),
  }),
);
const blocks = z.array(z.object({ blockId: z.string().min(1), fields: z.array(field) }));
export function parseTemplate(raw: string): { blocks: Block[]; warnings: string[] } {
  const parsed: unknown = JSON.parse(raw);
  const result = blocks.parse(parsed);
  const seen = new Set<string>();
  const warnings: string[] = [];
  function check(f: TemplateField, depth: number) {
    if (depth > 16) throw new Error("面板嵌套不能超过16层");
    if (f.required && ["single", "multi"].includes(f.type) && !f.options?.length)
      warnings.push(`${f.label}：必填选择缺少选项，可保存但无法用于发布`);
    if (f.options && new Set(f.options.map((o) => o.value)).size !== f.options.length)
      throw new Error(`${f.label}选项值重复`);
    if (["drawer", "wheel"].includes(f.type)) {
      if (!f.panel) {
        warnings.push(`${f.label}：缺少面板，无法用于发布`);
        return;
      }
      const p = f.panel;
      if (p.mode === "chips" && !p.options?.length) warnings.push(`${f.label}：面板缺少选项`);
      const nested = p.mode === "wheel" ? p.wheels : p.groups;
      if (p.mode !== "chips" && !nested?.length) warnings.push(`${f.label}：面板缺少分组`);
      for (const child of nested || []) check(child, depth + 1);
    }
  }
  for (const block of result) {
    for (const f of block.fields) {
      if (seen.has(f.key)) throw new Error(`字段 ${f.key} 重复`);
      seen.add(f.key);
      check(f, 0);
    }
  }
  return { blocks: result, warnings };
}
