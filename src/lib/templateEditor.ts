// 编辑器节点身份与业务key独立，序列化仅写原始DSL属性，不写内部ID。
import type { Block } from "./template";
export type NodeKind = "block" | "field" | "panel" | "group" | "wheel" | "option";
export interface EditorNode {
  id: string;
  kind: NodeKind;
  data: Record<string, unknown>;
  children: Record<string, EditorNode[]>;
}
const kindFor: Record<string, NodeKind> = {
  fields: "field",
  panel: "panel",
  groups: "group",
  wheels: "wheel",
  options: "option",
};
export const buildNode = (value: Record<string, unknown>, kind: NodeKind): EditorNode => {
  const data = { ...value };
  const children: EditorNode["children"] = {};
  for (const [key, childKind] of Object.entries(kindFor)) {
    // 只解析当前节点的DSL容器；扩展属性中的同名数据保持原样。
    const allowed =
      kind === "block"
        ? ["fields"]
        : kind === "field"
          ? ["panel", "options"]
          : kind === "panel"
            ? ["groups", "wheels", "options"]
            : kind === "group"
              ? ["panel"]
              : kind === "wheel"
                ? ["options"]
                : [];
    if (!allowed.includes(key)) continue;
    const raw = data[key];
    if (key === "panel" && raw && typeof raw === "object" && !Array.isArray(raw)) {
      children[key] = [buildNode(raw as Record<string, unknown>, childKind)];
      delete data[key];
    } else if (Array.isArray(raw)) {
      children[key] = raw.map((v) => buildNode(v, childKind));
      delete data[key];
    }
  }
  return { id: crypto.randomUUID(), kind, data, children };
};
export const editorNodes = (blocks: Block[]) => blocks.map((b) => buildNode(b, "block"));
export const serializeNode = (node: EditorNode): Record<string, unknown> => {
  const data = { ...node.data };
  for (const [key, children] of Object.entries(node.children)) {
    if (key === "panel") {
      if (children[0]) data[key] = serializeNode(children[0]);
    } else data[key] = children.map(serializeNode);
  }
  return data;
};
export const serializeNodes = (nodes: EditorNode[]) => nodes.map(serializeNode);
export const findNode = (nodes: EditorNode[], id: string): EditorNode | undefined => {
  for (const node of nodes) {
    if (node.id === id) return node;
    for (const children of Object.values(node.children)) {
      const found = findNode(children, id);
      if (found) return found;
    }
  }
};
export const editNode = (
  nodes: EditorNode[],
  id: string,
  change: (node: EditorNode) => EditorNode,
): EditorNode[] =>
  nodes.map((node) =>
    node.id === id
      ? change(node)
      : {
          ...node,
          children: Object.fromEntries(
            Object.entries(node.children).map(([key, children]) => [
              key,
              editNode(children, id, change),
            ]),
          ),
        },
  );
export const removeNode = (nodes: EditorNode[], id: string): EditorNode[] =>
  nodes
    .filter((n) => n.id !== id)
    .map((node) => ({
      ...node,
      children: Object.fromEntries(
        Object.entries(node.children).map(([key, children]) => [key, removeNode(children, id)]),
      ),
    }));
export const moveNode = (nodes: EditorNode[], id: string, offset: number): EditorNode[] => {
  const index = nodes.findIndex((n) => n.id === id);
  if (index >= 0) {
    const next = [...nodes];
    const target = index + offset;
    if (target >= 0 && target < nodes.length)
      [next[index], next[target]] = [next[target], next[index]];
    return next;
  }
  return nodes.map((n) => ({
    ...n,
    children: Object.fromEntries(
      Object.entries(n.children).map(([key, children]) => [key, moveNode(children, id, offset)]),
    ),
  }));
};
export const newNode = (kind: NodeKind): EditorNode => {
  const key = crypto.randomUUID().slice(0, 8);
  const values: Record<NodeKind, Record<string, unknown>> = {
    block: { blockId: `block_${key}`, fields: [] },
    field: { key: `field_${key}`, label: "新字段", type: "single", options: [] },
    panel: { mode: "chips", options: [], multiple: false },
    group: {
      key: `group_${key}`,
      label: "新分组",
      panel: { mode: "chips", options: [], multiple: false },
    },
    wheel: { key: `wheel_${key}`, label: "新滚轮", options: [] },
    option: { value: `value_${key}`, label: "新选项" },
  };
  return buildNode(values[kind], kind);
};
// stableJSON 消除对象属性顺序差异，避免无修改进入页面即触发离开保护。
export const stableJSON = (value: unknown): string =>
  JSON.stringify(value, (_key, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]]),
        )
      : item,
  );
// panelDepth 返回根面板0的业务深度；非面板节点继承当前面板深度。
export const panelDepth = (nodes: EditorNode[], id: string, depth = -1): number => {
  for (const node of nodes) {
    const next = depth + (node.kind === "panel" ? 1 : 0);
    if (node.id === id) return next;
    for (const children of Object.values(node.children)) {
      const found = panelDepth(children, id, next);
      if (found !== -99) return found;
    }
  }
  return -99;
};
