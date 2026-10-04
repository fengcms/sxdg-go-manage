// 状态编辑验证扩展属性无损、节点身份独立、同级排序及删除不影响兄弟。
import { expect, it } from "vitest";
import {
  editNode,
  editorNodes,
  moveNode,
  removeNode,
  serializeNodes,
  stableJSON,
} from "./templateEditor";

it("业务key改变保持节点ID，内部ID不进入JSON", () => {
  const raw = [
    {
      blockId: "b",
      extra: 0,
      fields: [
        {
          key: "f",
          label: "f",
          type: "single" as const,
          placeholder: "提示",
          options: [{ value: "a", label: "a", disabled: false }],
        },
      ],
    },
  ];
  const nodes = editorNodes(raw);
  const id = nodes[0].children.fields[0].id;
  expect(serializeNodes(nodes)).toEqual(raw);
  const changed = editNode(nodes, id, (n) => ({ ...n, data: { ...n.data, key: "new" } }));
  expect(changed[0].children.fields[0].id).toBe(id);
  expect(JSON.stringify(serializeNodes(changed))).not.toContain(id);
  expect(stableJSON({ a: 1, b: 2 })).toBe(stableJSON({ b: 2, a: 1 }));
});
it("移动只在同级数组发生，删除保留兄弟节点", () => {
  const nodes = editorNodes([
    {
      blockId: "b",
      fields: [
        { key: "a", label: "a", type: "tags" },
        { key: "b", label: "b", type: "tags" },
      ],
    },
  ]);
  const id = nodes[0].children.fields[1].id;
  const moved = moveNode(nodes, id, -1);
  expect(moved[0].children.fields[0].data.key).toBe("b");
  expect(removeNode(moved, id)[0].children.fields[0].data.key).toBe("a");
});
