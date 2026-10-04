// 模板预检覆盖后端保存校验遗漏的发布条件。
import { expect, it } from "vitest";
import { parseTemplate } from "./template";

it("必填无选项明确警告", () => {
  expect(
    parseTemplate(
      JSON.stringify([
        { blockId: "a", fields: [{ key: "a", label: "选项", type: "single", required: true }] },
      ]),
    ).warnings,
  ).toHaveLength(1);
});
it("拒绝重复字段与非法类型", () => {
  for (const fields of [
    [{ key: "a", label: "a", type: "panel" }],
    [
      { key: "a", label: "a", type: "tags" },
      { key: "a", label: "b", type: "tags" },
    ],
  ])
    expect(() => parseTemplate(JSON.stringify([{ blockId: "a", fields }]))).toThrow();
});
it("合法嵌套滚轮可预览", () =>
  expect(
    parseTemplate(
      JSON.stringify([
        {
          blockId: "a",
          fields: [
            {
              key: "a",
              label: "日期",
              type: "wheel",
              panel: {
                mode: "wheel",
                wheels: [
                  {
                    key: "year",
                    label: "年",
                    type: "single",
                    options: [{ value: "2026", label: "2026" }],
                  },
                ],
              },
            },
          ],
        },
      ]),
    ).warnings,
  ).toEqual([]));
