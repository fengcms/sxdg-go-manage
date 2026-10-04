// 统一分页查询与详情入口；筛选只由页面提供支持的白名单。

import { RotateCw, Search } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useList } from "../../api/admin";
import { useTableQuery } from "../../hooks/useTableQuery";
import { State } from "../feedback/State";
import { DateInput } from "../form/DateInput";
import { FormField } from "../form/FormField";
import { Button, Card, Input, Select } from "../ui";
import { type Column, DataTable, Pagination } from "./DataTable";
import { PageHeader } from "./PageHeader";
export interface Filter {
  key: string;
  label: string;
  options?: { value: string; label: string }[];
  type?: string;
}
export function ResourceList<T extends { id: number }>({
  kind,
  title,
  description,
  columns,
  filters = [],
  actions,
  extra,
  queryPrefix = "",
}: {
  kind: string;
  title: string;
  description?: string;
  columns: Column<T>[];
  filters?: Filter[];
  actions?: ReactNode;
  extra?: ReactNode;
  queryPrefix?: string;
}) {
  const { params, page, pageSize, patch } = useTableQuery(queryPrefix);
  const query = {
    page,
    page_size: pageSize,
    ...Object.fromEntries(
      filters.map((f) => [f.key, params.get(`${queryPrefix}${f.key}`) || undefined]),
    ),
  };
  const result = useList<T>(kind, query);
  const [draft, setDraft] = useState<Record<string, string>>({});
  return (
    <>
      <PageHeader
        title={title}
        description={description || "查看与管理平台数据"}
        actions={actions}
      />
      {extra}
      {filters.length > 0 && (
        <Card className="filter-card">
          <form
            className="filters"
            onSubmit={(e) => {
              e.preventDefault();
              patch(draft);
            }}
          >
            {filters.map((f) => (
              <FormField key={f.key} id={`filter-${f.key}`} label={f.label}>
                <FilterInput
                  filter={f}
                  value={draft[f.key] ?? params.get(`${queryPrefix}${f.key}`) ?? ""}
                  change={(v) => setDraft((s) => ({ ...s, [f.key]: v }))}
                />
              </FormField>
            ))}
            <Button type="submit">
              <Search size={15} />
              查询
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setDraft({});
                patch(Object.fromEntries(filters.map((f) => [f.key, ""])));
              }}
            >
              重置
            </Button>
          </form>
        </Card>
      )}
      <Card className="list-card">
        <div className="list-toolbar">
          <span>{title}列表</span>
          <Button
            variant="ghost"
            size="sm"
            aria-label="刷新列表"
            disabled={result.isFetching}
            onClick={() => void result.refetch()}
          >
            <RotateCw size={14} />
            刷新
          </Button>
        </div>
        <State
          filtered={filters.some((f) => !!query[f.key as keyof typeof query])}
          loading={result.isLoading}
          error={result.error}
          empty={result.data?.items.length === 0}
          retry={() => void result.refetch()}
        >
          {result.data && (
            <DataTable rows={result.data.items} columns={columns} rowKey={(r) => r.id} />
          )}
        </State>
        {result.data && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={result.data.total}
            onChange={(p, s) => patch({ page: p, page_size: s }, false)}
          />
        )}
      </Card>
    </>
  );
}
function FilterInput({
  filter: f,
  value,
  change,
}: {
  filter: Filter;
  value: string;
  change: (v: string) => void;
}) {
  if (f.type === "date") return <DateInput id={`filter-${f.key}`} value={value} change={change} />;
  return f.options ? (
    <Select id={`filter-${f.key}`} value={value} onChange={(e) => change(e.target.value)}>
      <option value="">全部</option>
      {f.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  ) : (
    <Input
      id={`filter-${f.key}`}
      type={f.type || "text"}
      value={value}
      onChange={(e) => change(e.target.value)}
    />
  );
}
