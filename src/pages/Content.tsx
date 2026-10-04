import { format } from "date-fns";
import { StatusTag } from "../components/ui/status";
// 内容运营表单显式白名单提交；分类读取全部分页，删除交给后端引用保护。

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { adminPath, allPages } from "../api/admin";
import { ResourceList } from "../components/data/ResourceList";
import { ActionDialog, type ActionSpec, type FieldSpec } from "../components/feedback/ActionDialog";
import { Button } from "../components/ui";
import { qk } from "../lib/queryClient";
import { parseTemplate } from "../lib/template";
import { text } from "../lib/utils";
export interface Category {
  id: number;
  parentId: number | null;
  name: string;
  level: number;
  iconUrl: string | null;
  sortOrder: number;
  showOnHome: boolean;
  isActive: boolean;
}
interface ContentRow {
  id: number;
  name?: string;
  templateName?: string;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  iconUrl?: string;
  parentId?: number | null;
  categoryId?: number | null;
  categoryIds?: number[];
  level?: number;
  blocks?: unknown;
  priority?: number;
  sortOrder?: number;
  showOnHome?: boolean;
  isActive: boolean;
  jumpType?: string;
  jumpTarget?: string;
  startAt?: string;
  endAt?: string;
  version?: number;
}
const titles: Record<string, string> = {
  categories: "分类体系",
  "featured-categories": "热门分类",
  "form-templates": "动态表单",
  banners: "Banner 管理",
  "service-badges": "服务标签",
};
const yesNo = [
  { value: "true", label: "启用" },
  { value: "false", label: "停用" },
];
export function categoryPath(row: Category, rows: Category[]) {
  const seen = new Set<number>();
  let current: Category | undefined = row;
  const names: string[] = [];
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    names.unshift(current.name);
    current = rows.find((r) => r.id === current?.parentId);
  }
  return names.join(" / ");
}
export default function Content() {
  const { kind = "categories" } = useParams();
  const [action, setAction] = useState<ActionSpec | null>(null);
  const cats = useQuery({
    queryKey: qk.resource("all-categories"),
    queryFn: ({ signal }) => allPages<Category>("categories", signal),
  });
  const valid = Object.hasOwn(titles, kind);
  if (!valid) return <p>页面不存在</p>;
  const rows = cats.data || [];
  function edit(row?: ContentRow) {
    const base: FieldSpec[] = [];
    const add = (
      key: string,
      label: string,
      type: FieldSpec["type"] = "text",
      required = false,
      options?: FieldSpec["options"],
    ) =>
      base.push({
        key,
        label,
        type,
        required,
        options,
        default:
          row && row[key as keyof ContentRow] != null
            ? typeof row[key as keyof ContentRow] === "object"
              ? JSON.stringify(row[key as keyof ContentRow])
              : String(row[key as keyof ContentRow])
            : key === "isActive"
              ? "true"
              : key === "jumpType"
                ? "none"
                : key === "blocks"
                  ? "[]"
                  : ["sortOrder", "priority"].includes(key)
                    ? "0"
                    : "",
      });
    if (kind === "form-templates") {
      add("templateName", "模板名称", "text", true);
      add(
        "categoryId",
        "适用分类",
        "select",
        false,
        rows.map((c) => ({ value: String(c.id), label: categoryPath(c, rows) })),
      );
      add("blocks", "模板 JSON", "json", true);
      add("priority", "优先级", "number", true);
    } else if (kind === "banners") {
      add("title", "标题");
      add("subtitle", "副标题");
      add("imageUrl", "横幅图片", "image", true);
      add(
        "jumpType",
        "跳转类型",
        "select",
        true,
        ["none", "service", "requirement", "user", "url"].map((v, i) => ({
          value: v,
          label: ["不跳转", "服务", "需求", "用户", "链接"][i],
        })),
      );
      add("jumpTarget", "跳转目标");
      add("startAt", "开始时间", "datetime-local");
      add("endAt", "结束时间", "datetime-local");
    } else {
      add("name", "名称", "text", true);
      if (kind === "categories") {
        add(
          "parentId",
          "父分类",
          "select",
          false,
          rows
            .filter((c) => c.level < 3 && c.id !== row?.id)
            .map((c) => ({ value: String(c.id), label: categoryPath(c, rows) })),
        );
        add("iconUrl", "分类图片", "image");
        add("showOnHome", "首页展示", "select", true, [
          { value: "false", label: "不展示" },
          { value: "true", label: "展示" },
        ]);
        base[base.length - 1].default = String(row?.showOnHome ?? false);
      }
      if (kind === "featured-categories") {
        add(
          "categoryIds",
          "三级分类",
          "multi",
          true,
          rows
            .filter((c) => c.level === 3)
            .map((c) => ({ value: String(c.id), label: categoryPath(c, rows) })),
        );
        base[base.length - 1].default = (row?.categoryIds || []).join(",");
      }
    }
    if (kind !== "form-templates") add("sortOrder", "排序值", "number", true);
    add("isActive", "启用状态", "select", true, yesNo);
    for (const f of base)
      if (f.type === "datetime-local" && f.default)
        f.default = format(new Date(f.default), "yyyy-MM-dd'T'HH:mm");
    setAction({
      title: `${row ? "编辑" : "新建"}${titles[kind]}`,
      path: adminPath(`${kind}${row ? `/${row.id}` : ""}`),
      method: row ? "PUT" : "POST",
      fields: base,
      validate: (v) => {
        const errors: Record<string, string> = {};
        for (const f of base)
          if (f.type === "number" && !/^-?\d+$/.test(v[f.key])) errors[f.key] = "请输入整数";
        if (v.name && [...v.name].length > 32) errors.name = "名称最多32字";
        if (v.templateName && [...v.templateName].length > 64)
          errors.templateName = "模板名称最多64字";
        if (v.blocks) {
          try {
            const r = parseTemplate(v.blocks);
            if (r.warnings.length) errors.blocks = r.warnings.join("；");
          } catch (e) {
            errors.blocks = e instanceof Error ? e.message : "JSON 无效";
          }
        }
        if (v.startAt && v.endAt && v.endAt <= v.startAt) errors.endAt = "结束时间必须晚于开始时间";
        return errors;
      },
      build: (v) =>
        Object.fromEntries(
          base.map((f) => {
            const value = v[f.key];
            return [
              f.key,
              f.key === "blocks"
                ? parseTemplate(value).blocks
                : f.key === "categoryIds"
                  ? value.split(",").filter(Boolean).map(Number)
                  : ["isActive", "showOnHome"].includes(f.key)
                    ? value === "true"
                    : ["categoryId", "parentId"].includes(f.key)
                      ? value
                        ? Number(value)
                        : null
                      : f.type === "number"
                        ? Number(value)
                        : f.type === "datetime-local"
                          ? value
                            ? new Date(value).toISOString()
                            : null
                          : value || null,
            ];
          }),
        ),
    });
  }
  return (
    <>
      <ResourceList<ContentRow>
        key={kind}
        kind={kind}
        title={titles[kind]}
        description={
          kind === "categories"
            ? "分类最多三级；存在任何历史服务或需求引用时不能删除"
            : kind === "form-templates"
              ? "编辑 blocks JSON，预检保存与发布规则，并交互预览"
              : "维护小程序展示内容"
        }
        actions={
          <Button disabled={cats.isLoading || cats.isError} onClick={() => edit()}>
            新建{titles[kind]}
          </Button>
        }
        extra={
          cats.error ? (
            <p className="error">
              分类选项加载失败：{cats.error.message}
              <Button onClick={() => void cats.refetch()}>重试</Button>
            </p>
          ) : undefined
        }
        columns={[
          { key: "id", label: "编号", render: (r) => r.id },
          {
            key: "name",
            label: "名称 / 标题",
            wrap: true,
            render: (r) =>
              kind === "categories" ? (
                <div className="category-cell">
                  <span className="hint">{r.level}级分类</span>
                  <strong>{r.name}</strong>
                  <small>{categoryPath(r as Category, rows)}</small>
                </div>
              ) : (
                text(r.name ?? r.templateName ?? r.title)
              ),
          },
          {
            key: "sort",
            label: kind === "form-templates" ? "版本" : "排序",
            render: (r) => text(r.version ?? r.sortOrder),
          },
          ...(kind === "banners"
            ? [
                {
                  key: "image",
                  label: "图片",
                  render: (r: ContentRow) =>
                    r.imageUrl ? (
                      <img className="table-thumbnail" src={r.imageUrl} alt={r.title || "横幅"} />
                    ) : (
                      "—"
                    ),
                },
              ]
            : []),
          {
            key: "active",
            label: "状态",
            render: (r) => <StatusTag label={r.isActive ? "启用" : "停用"} />,
          },
          {
            key: "actions",
            label: "操作",
            render: (r) => (
              <div className="actions">
                <Button
                  variant="ghost"
                  disabled={cats.isLoading || cats.isError}
                  onClick={() => edit(r)}
                >
                  编辑
                </Button>
                {kind === "form-templates" && (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setAction({
                        title: "克隆模板",
                        path: adminPath(`${kind}/${r.id}/clone`),
                        method: "POST",
                        body: {},
                      })
                    }
                  >
                    克隆
                  </Button>
                )}
                <Button
                  variant="danger-ghost"
                  onClick={() =>
                    setAction({
                      title: kind === "featured-categories" ? "删除热门入口" : "停用 / 删除",
                      danger: true,
                      target: `${r.name || r.templateName || r.title || "记录"}（#${r.id}）`,
                      path: adminPath(`${kind}/${r.id}`),
                      method: "DELETE",
                      description:
                        "热门入口直接删除；其余素材由服务端停用。分类有子分类或历史业务引用会拒绝操作。",
                    })
                  }
                >
                  删除
                </Button>
              </div>
            ),
          },
        ]}
      />
      {action && <ActionDialog spec={action} onClose={() => setAction(null)} />}
    </>
  );
}
