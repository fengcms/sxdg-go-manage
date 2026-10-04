// 选项行编辑复用于字段、chips面板及滚轮，直接操作内部节点ID。
import type { EditorNode } from "../../lib/templateEditor";
import { Button, Input } from "../ui";
export const OptionListEditor = ({
  nodes,
  readOnly,
  onChange,
  onMove,
  onDelete,
}: {
  nodes: EditorNode[];
  readOnly: boolean;
  onChange: (id: string, data: Record<string, unknown>) => void;
  onMove: (id: string, offset: number) => void;
  onDelete: (id: string) => void;
}) => (
  <div className="designer-option-list">
    {nodes.map((node, index) => (
      <div key={node.id} className="designer-option-row">
        <Input
          aria-label={`选项${index + 1}提交值`}
          disabled={readOnly}
          value={String(node.data.value ?? "")}
          onChange={(e) => onChange(node.id, { ...node.data, value: e.target.value })}
        />
        <Input
          aria-label={`选项${index + 1}名称`}
          disabled={readOnly}
          value={String(node.data.label ?? "")}
          onChange={(e) => onChange(node.id, { ...node.data, label: e.target.value })}
        />
        {!readOnly && (
          <div className="actions">
            <Button
              variant="ghost"
              disabled={index === 0}
              aria-label={`选项${index + 1}上移`}
              onClick={() => onMove(node.id, -1)}
            >
              ↑
            </Button>
            <Button
              variant="ghost"
              disabled={index === nodes.length - 1}
              aria-label={`选项${index + 1}下移`}
              onClick={() => onMove(node.id, 1)}
            >
              ↓
            </Button>
            <Button
              variant="danger-ghost"
              aria-label={`删除选项${index + 1}`}
              onClick={() => onDelete(node.id)}
            >
              删除
            </Button>
          </div>
        )}
      </div>
    ))}
  </div>
);
