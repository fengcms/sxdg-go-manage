// 模板设计工作区保存完整DSL；预览值独立，服务端版本为权威。
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useBeforeUnload, useBlocker, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { adminPath, allPages } from "../api/admin";
import { FormField } from "../components/form/FormField";
import { TemplatePreview } from "../components/form/TemplatePreview";
import { NodeProperties } from "../components/template/NodeProperties";
import { NodeTree } from "../components/template/NodeTree";
import { Button, Card, Input, Modal, Select, Textarea } from "../components/ui";
import { actions, allowed } from "../lib/permission";
import { queryClient } from "../lib/queryClient";
import { request } from "../lib/request/core";
import { parseTemplate } from "../lib/template";
import {
  editNode,
  editorNodes,
  findNode,
  moveNode,
  type NodeKind,
  newNode,
  panelDepth,
  removeNode,
  serializeNodes,
  stableJSON,
} from "../lib/templateEditor";
import { useAuth } from "../store/auth";
import { type Category, categoryPath } from "./Content";

interface Template {
  id: number;
  templateName: string;
  categoryId: number | null;
  priority: number;
  isActive: boolean;
  version: number;
  blocks: unknown;
}
const empty: Template = {
  id: 0,
  templateName: "",
  categoryId: null,
  priority: 0,
  isActive: true,
  version: 0,
  blocks: [],
};
const FormDesigner = () => {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["template-editor", id],
    queryFn: ({ signal }) => request<Template>(adminPath(`form-templates/${id}`), { signal }),
    enabled: id !== "new",
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  if (id !== "new" && query.isPending) return <p className="state">正在加载模板…</p>;
  if (query.error)
    return (
      <p className="error">
        加载失败：{query.error.message}
        <Button onClick={() => void query.refetch()}>重试</Button>
      </p>
    );
  return <Workspace key={id} initial={id === "new" ? empty : query.data || empty} />;
};
export default FormDesigner;
const Workspace = ({ initial }: { initial: Template }) => {
  const navigate = useNavigate();
  const role = useAuth((s) => s.user?.adminRole);
  const readOnly = !allowed(role, actions.content);
  const [meta, setMeta] = useState(initial);
  const [nodes, setNodes] = useState(() =>
    editorNodes(Array.isArray(initial.blocks) ? initial.blocks : []),
  );
  const [selected, setSelected] = useState("");
  const [baseline, setBaseline] = useState(stableJSON(initial));
  const [savedID, setSavedID] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [jsonMode, setJsonMode] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const cats = useQuery({
    queryKey: ["designer-categories"],
    queryFn: ({ signal }) => allPages<Category>("categories", signal),
  });
  const draft = { ...meta, blocks: serializeNodes(nodes) };
  const raw = JSON.stringify(draft.blocks, null, 2);
  const dirty = stableJSON(draft) !== baseline;
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (savedID && !dirty) {
      navigate(`/content/form-templates/${savedID}`, { replace: true });
      setSavedID(0);
    }
  }, [savedID, dirty, navigate]);
  useBeforeUnload((event) => {
    if (dirty) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  let warnings: string[] = [];
  let validation = "";
  try {
    warnings = parseTemplate(raw).warnings;
  } catch (e) {
    validation = e instanceof Error ? e.message : "模板结构无效";
  }
  const node = findNode(nodes, selected);
  const save = async () => {
    if (readOnly || saving) return;
    setError("");
    if (
      !meta.templateName.trim() ||
      [...meta.templateName].length > 64 ||
      !Number.isInteger(meta.priority)
    ) {
      setError("请填写有效模板名称（最多64字）及整数优先级");
      return;
    }
    if (validation) {
      setError(validation);
      return;
    }
    if (warnings.length && !window.confirm(`存在风险警告，仍要保存吗？\n${warnings.join("\n")}`))
      return;
    setSaving(true);
    try {
      if (meta.id) {
        const latest = await request<Template>(adminPath(`form-templates/${meta.id}`));
        if (
          latest.version !== meta.version &&
          !window.confirm("模板已被其他管理员修改，继续保存会覆盖最新内容。是否继续？")
        )
          return;
      }
      const result = await request<Template>(
        adminPath(`form-templates${meta.id ? `/${meta.id}` : ""}`),
        {
          method: meta.id ? "PUT" : "POST",
          body: {
            templateName: meta.templateName,
            categoryId: meta.categoryId,
            priority: meta.priority,
            isActive: meta.isActive,
            blocks: draft.blocks,
          },
        },
      );
      if (!meta.id) setSavedID(result.id);
      setMeta(result);
      setNodes(editorNodes(parseTemplate(JSON.stringify(result.blocks)).blocks));
      setSelected("");
      setBaseline(stableJSON(result));
      void queryClient.invalidateQueries({ queryKey: ["resource", "form-templates"] });
      toast.success("模板已保存");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败，编辑内容已保留");
    } finally {
      setSaving(false);
    }
  };
  const changeData = (data: Record<string, unknown>, reset = false) =>
    setNodes((prev) =>
      editNode(prev, selected, (n) => {
        if (!reset) {
          if (data.title === "" && n.data.title === undefined) delete data.title;
          return { ...n, data };
        }
        const children: typeof n.children = {};
        const mode = data.mode;
        const type = data.type;
        if (n.kind === "panel")
          children[mode === "chips" ? "options" : mode === "tab" ? "groups" : "wheels"] = [];
        else if (type === "drawer" || type === "wheel") {
          const p = newNode("panel");
          if (type === "wheel") {
            p.data.mode = "wheel";
            p.children = { wheels: [] };
          }
          children.panel = [p];
        } else {
          children.options = [];
          if (type === "tags") data.maxCustom = 0;
        }
        return { ...n, data, children };
      }),
    );
  const add = (key: string, kind: NodeKind) => {
    if (kind === "panel" && panelDepth(nodes, selected) >= 16) {
      setError("根面板为0，不能增加深度超过16的面板");
      return;
    }
    setNodes((prev) =>
      editNode(prev, selected, (n) => ({
        ...n,
        children: { ...n.children, [key]: [...(n.children[key] || []), newNode(kind)] },
      })),
    );
  };
  return (
    <div className="designer">
      <div className="designer-heading">
        <div>
          <h1>{meta.id ? `模板设计 · #${meta.id}` : "新建表单模板"}</h1>
          <p className="hint">
            版本 {meta.version} · {readOnly ? "只读查看" : dirty ? "有未保存修改" : "已保存"}
          </p>
        </div>
        <div className="actions">
          <Button variant="outline" onClick={() => navigate("/content/form-templates")}>
            返回列表
          </Button>
          <Button variant="outline" onClick={() => setJsonMode((v) => !v)}>
            {jsonMode ? "设计模式" : "JSON模式"}
          </Button>
          {!readOnly && (
            <Button disabled={saving || Boolean(validation)} onClick={() => void save()}>
              {saving ? "保存中…" : "保存模板"}
            </Button>
          )}
        </div>
      </div>
      <p className="designer-notice">
        已创建草稿及已发布内容保留原模板快照；修改模板影响后续新建内容。预览为近似交互，不提交业务数据。
      </p>
      <Card className="designer-meta">
        <FormField id="templateName" label="模板名称">
          <Input
            id="templateName"
            disabled={readOnly || saving}
            value={meta.templateName}
            onChange={(e) => setMeta({ ...meta, templateName: e.target.value })}
          />
        </FormField>
        <FormField id="categoryId" label="适用分类">
          <Select
            id="categoryId"
            disabled={readOnly || saving}
            value={meta.categoryId ?? ""}
            onChange={(e) =>
              setMeta({ ...meta, categoryId: e.target.value ? Number(e.target.value) : null })
            }
          >
            <option value="">全局模板</option>
            {cats.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryPath(c, cats.data || [])}
              </option>
            ))}
          </Select>
          {cats.error && (
            <p className="error">
              分类加载失败<Button onClick={() => void cats.refetch()}>重试</Button>
            </p>
          )}
        </FormField>
        <FormField id="priority" label="优先级">
          <Input
            id="priority"
            type="number"
            disabled={readOnly || saving}
            value={meta.priority}
            onChange={(e) => setMeta({ ...meta, priority: Number(e.target.value) })}
          />
        </FormField>
        <label className="designer-check">
          <input
            type="checkbox"
            disabled={readOnly || saving}
            checked={meta.isActive}
            onChange={(e) => setMeta({ ...meta, isActive: e.target.checked })}
          />
          启用模板
        </label>
      </Card>
      {(validation || error) && (
        <p role="alert" className="error">
          {error || validation}
        </p>
      )}
      {warnings.length > 0 && (
        <details className="designer-notice">
          <summary>{warnings.length}项风险警告（可确认保存）</summary>
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </details>
      )}
      {jsonMode ? (
        <Card>
          <div className="actions">
            <Button
              variant="outline"
              onClick={() => {
                void navigator.clipboard
                  .writeText(raw)
                  .then(() => toast.success("已复制JSON"))
                  .catch(() => setError("复制失败，请手动选择JSON"));
              }}
            >
              复制JSON
            </Button>
            {!readOnly && (
              <Button variant="outline" disabled={saving} onClick={() => setImporting(true)}>
                从JSON导入
              </Button>
            )}
          </div>
          <Textarea aria-label="模板JSON（只读）" readOnly value={raw} rows={24} />
        </Card>
      ) : (
        <div className="designer-grid">
          <Card>
            <h2>结构树</h2>
            {!readOnly && (
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => {
                  const b = newNode("block");
                  setNodes([...nodes, b]);
                  setSelected(b.id);
                }}
              >
                添加区块
              </Button>
            )}
            <NodeTree
              nodes={nodes}
              selected={selected}
              onSelect={setSelected}
              onMove={(id, offset) => setNodes(moveNode(nodes, id, offset))}
              readOnly={readOnly || saving}
            />
            {!nodes.length && <p className="hint">添加区块开始设计</p>}
          </Card>
          <Card>
            <h2>用户预览</h2>
            <TemplatePreview raw={raw} />
          </Card>
          <Card>
            <h2>属性面板</h2>
            {node ? (
              <NodeProperties
                node={node}
                nestedPanel={node.kind === "panel" && panelDepth(nodes, node.id) > 0}
                readOnly={readOnly || saving}
                onOptionChange={(id, data) =>
                  setNodes(editNode(nodes, id, (n) => ({ ...n, data })))
                }
                onOptionMove={(id, offset) => setNodes(moveNode(nodes, id, offset))}
                onOptionDelete={(id) => setNodes(removeNode(nodes, id))}
                onData={changeData}
                onAdd={add}
                onDelete={() => {
                  if (window.confirm("删除节点及所有子项？")) {
                    setNodes(removeNode(nodes, selected));
                    setSelected("");
                  }
                }}
              />
            ) : (
              <p className="hint">选择左侧节点进行编辑</p>
            )}
          </Card>
        </div>
      )}
      <Modal title="从JSON导入" open={importing} onClose={() => setImporting(false)}>
        <Textarea
          aria-label="待导入JSON"
          rows={12}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        <Button
          onClick={() => {
            try {
              const result = parseTemplate(importText);
              if (
                window.confirm(`导入将覆盖当前结构。${result.warnings.length}项警告，是否继续？`)
              ) {
                setNodes(editorNodes(result.blocks));
                setSelected("");
                setImporting(false);
                setError("");
              }
            } catch (e) {
              setError(e instanceof Error ? e.message : "导入失败");
            }
          }}
        >
          检查并导入
        </Button>
        {error && <p className="error">{error}</p>}
      </Modal>
      <Modal
        title="存在未保存修改"
        open={blocker.state === "blocked"}
        onClose={() => blocker.reset?.()}
      >
        <p>离开后当前修改将丢失。</p>
        <div className="actions">
          <Button variant="outline" onClick={() => blocker.reset?.()}>
            继续编辑
          </Button>
          <Button variant="danger" onClick={() => blocker.proceed?.()}>
            放弃修改并离开
          </Button>
        </div>
      </Modal>
    </div>
  );
};
