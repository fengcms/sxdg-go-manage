// 属性编辑只改选中节点已知属性，未编辑的扩展属性原样保留。
import type { EditorNode, NodeKind } from "../../lib/templateEditor";
import { FormField } from "../form/FormField";
import { Button, Input, Select } from "../ui";
import { OptionListEditor } from "./OptionListEditor";
export const NodeProperties = ({
  node,
  readOnly,
  nestedPanel,
  onData,
  onAdd,
  onDelete,
  onOptionChange,
  onOptionMove,
  onOptionDelete,
}: {
  node: EditorNode;
  readOnly: boolean;
  nestedPanel: boolean;
  onData: (data: Record<string, unknown>, reset?: boolean) => void;
  onAdd: (key: string, kind: NodeKind) => void;
  onDelete: () => void;
  onOptionChange: (id: string, data: Record<string, unknown>) => void;
  onOptionMove: (id: string, offset: number) => void;
  onOptionDelete: (id: string) => void;
}) => {
  const set = (key: string, value: unknown) => onData({ ...node.data, [key]: value });
  const text = (key: string, label: string) => (
    <FormField key={key} id={`node-${key}`} label={label}>
      <Input
        id={`node-${key}`}
        value={String(node.data[key] ?? "")}
        disabled={readOnly}
        onChange={(e) => set(key, e.target.value)}
      />
    </FormField>
  );
  const changeKind = (key: string, value: string) => {
    if (window.confirm("切换类型会清除当前节点的选项或子面板，是否继续？"))
      onData({ ...node.data, [key]: value }, true);
  };
  const mode = node.data.mode;
  return (
    <div className="designer-properties">
      <p className="hint">选中节点：{node.kind} · 扩展属性原样保留</p>
      {node.kind === "block" ? (
        <>
          {text("blockId", "区块标识")}
          {text("title", "区块标题（可选）")}
        </>
      ) : node.kind === "panel" ? (
        <>
          {text("title", "面板标题（可选，最多64字）")}
          <FormField id="panel-mode" label="面板形态">
            <Select
              id="panel-mode"
              disabled={readOnly}
              value={String(mode)}
              onChange={(e) => changeKind("mode", e.target.value)}
            >
              <option value="chips">标签选项</option>
              <option value="tab" disabled={nestedPanel}>
                分组
              </option>
              <option value="wheel">滚轮</option>
            </Select>
          </FormField>
        </>
      ) : (
        <>
          {text(
            node.kind === "option" ? "value" : "key",
            node.kind === "option" ? "提交值" : "字段标识",
          )}
          {text("label", "显示名称")}
        </>
      )}
      {node.kind === "field" && (
        <>
          <FormField id="field-type" label="字段类型">
            <Select
              id="field-type"
              disabled={readOnly}
              value={String(node.data.type)}
              onChange={(e) => changeKind("type", e.target.value)}
            >
              {["single", "multi", "tags", "drawer", "wheel"].map((v, i) => (
                <option key={v} value={v}>
                  {["单选", "多选", "标签", "抽屉", "滚轮"][i]}
                </option>
              ))}
            </Select>
          </FormField>
          <label className="designer-check">
            <input
              type="checkbox"
              disabled={readOnly}
              checked={node.data.required === true}
              onChange={(e) => set("required", e.target.checked)}
            />
            必填
          </label>
          {node.data.type === "tags" && (
            <FormField id="maxCustom" label="自定义标签上限">
              <Input
                id="maxCustom"
                type="number"
                min={0}
                disabled={readOnly}
                value={String(node.data.maxCustom ?? 0)}
                onChange={(e) => set("maxCustom", Number(e.target.value))}
              />
            </FormField>
          )}
        </>
      )}
      {node.kind === "panel" && mode === "chips" && (
        <label className="designer-check">
          <input
            type="checkbox"
            disabled={readOnly}
            checked={node.data.multiple === true}
            onChange={(e) => set("multiple", e.target.checked)}
          />
          允许多选
        </label>
      )}
      {node.kind === "option" && (
        <label className="designer-check">
          <input
            type="checkbox"
            disabled={readOnly}
            checked={node.data.disabled === true}
            onChange={(e) => set("disabled", e.target.checked)}
          />
          预览禁用（展示属性）
        </label>
      )}
      {node.children.options && (
        <OptionListEditor
          nodes={node.children.options}
          readOnly={readOnly}
          onChange={onOptionChange}
          onMove={onOptionMove}
          onDelete={onOptionDelete}
        />
      )}
      {!readOnly && (
        <div className="designer-add">
          {node.kind === "block" && (
            <Button variant="outline" onClick={() => onAdd("fields", "field")}>
              添加字段
            </Button>
          )}
          {(node.kind === "wheel" ||
            (node.kind === "panel" && mode === "chips") ||
            (node.kind === "field" &&
              ["single", "multi", "tags"].includes(String(node.data.type)))) && (
            <Button variant="outline" onClick={() => onAdd("options", "option")}>
              添加选项
            </Button>
          )}
          {node.kind === "panel" && mode === "tab" && (
            <Button variant="outline" onClick={() => onAdd("groups", "group")}>
              添加分组
            </Button>
          )}
          {node.kind === "panel" && mode === "wheel" && (
            <Button variant="outline" onClick={() => onAdd("wheels", "wheel")}>
              添加滚轮
            </Button>
          )}
          {["field", "group"].includes(node.kind) && !node.children.panel?.length && (
            <Button variant="outline" onClick={() => onAdd("panel", "panel")}>
              添加面板
            </Button>
          )}
          <Button variant="danger-ghost" onClick={onDelete}>
            删除节点及子项
          </Button>
        </div>
      )}
    </div>
  );
};
