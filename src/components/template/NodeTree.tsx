// 结构树支持选中和同级排序；业务key修改不影响内部节点身份。
import type { EditorNode } from "../../lib/templateEditor";
import { Button } from "../ui";
export const nodeLabel = (node: EditorNode) =>
  String(
    node.data.label ||
      node.data.title ||
      node.data.key ||
      node.data.blockId ||
      node.data.mode ||
      node.kind,
  );
export const NodeTree = ({
  nodes,
  selected,
  onSelect,
  onMove,
  readOnly,
}: {
  nodes: EditorNode[];
  selected: string;
  onSelect: (id: string) => void;
  onMove: (id: string, offset: number) => void;
  readOnly: boolean;
}) => (
  <ul className="designer-tree">
    {nodes.map((node, index) => (
      <li key={node.id}>
        <div className="designer-tree-row">
          <Button
            variant={selected === node.id ? "outline" : "ghost"}
            onClick={() => onSelect(node.id)}
            aria-pressed={selected === node.id}
          >
            {node.kind === "option" ? "选项 · " : node.kind === "panel" ? "面板 · " : ""}
            {nodeLabel(node)}
          </Button>
          {!readOnly && (
            <span className="designer-order">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${nodeLabel(node)}上移`}
                disabled={index === 0}
                onClick={() => onMove(node.id, -1)}
              >
                ↑
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${nodeLabel(node)}下移`}
                disabled={index === nodes.length - 1}
                onClick={() => onMove(node.id, 1)}
              >
                ↓
              </Button>
            </span>
          )}
        </div>
        {Object.entries(node.children).map(([key, children]) => (
          <NodeTree
            key={key}
            nodes={children}
            selected={selected}
            onSelect={onSelect}
            onMove={onMove}
            readOnly={readOnly}
          />
        ))}
      </li>
    ))}
  </ul>
);
