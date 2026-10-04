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
it("真实分组滚轮无需type，扩展展示属性无损保留", () => {
  const value = [
    {
      blockId: "b",
      title: "区块",
      extra: false,
      fields: [
        {
          key: "f",
          label: "字段",
          type: "drawer",
          placeholder: "选择",
          panel: {
            mode: "tab",
            title: "标题",
            groups: [
              {
                key: "age",
                label: "年龄",
                panel: {
                  mode: "wheel",
                  wheels: [
                    {
                      key: "age",
                      options: [{ value: "1", label: "一", disabled: false }],
                      defaultValue: "1",
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  ];
  expect(parseTemplate(JSON.stringify(value)).blocks).toEqual(value);
});
it("标题按Unicode码点校验且局部标识可跨面板重复", () => {
  const data = (title: string) =>
    JSON.stringify([
      {
        blockId: "b",
        fields: [
          {
            key: "f",
            label: "f",
            type: "wheel",
            panel: {
              mode: "wheel",
              title,
              wheels: [{ key: "f", options: [{ value: "a", label: "a" }] }],
            },
          },
        ],
      },
    ]);
  expect(() => parseTemplate(data("😀".repeat(64)))).not.toThrow();
  expect(() => parseTemplate(data("😀".repeat(65)))).toThrow();
});
it("重复局部滚轮和选项拒绝并提供结构路径", () => {
  const data = [
    {
      blockId: "b",
      fields: [
        {
          key: "f",
          label: "f",
          type: "wheel",
          panel: {
            mode: "wheel",
            wheels: [
              { key: "a", options: [] },
              { key: "a", options: [] },
            ],
          },
        },
      ],
    },
  ];
  expect(() => parseTemplate(JSON.stringify(data))).toThrow("wheels");
});
it("嵌套深度根面板为0，边界16可导入且17拒绝", () => {
  let p: Record<string, unknown> = { mode: "chips", options: [{ value: "a", label: "a" }] };
  const wrap = () => {
    p = { mode: "tab", groups: [{ key: "g", label: "分组", panel: p }] };
  };
  for (let i = 0; i < 16; i++) wrap();
  const raw = () =>
    JSON.stringify([
      { blockId: "b", fields: [{ key: "f", label: "f", type: "drawer", panel: p }] },
    ]);
  expect(() => parseTemplate(raw())).not.toThrow();
  wrap();
  expect(() => parseTemplate(raw())).toThrow("深度");
});
it("历史null标题保持原样并使用客户端缺省语义", () => {
  const value = [
    {
      blockId: "b",
      title: null,
      fields: [
        {
          key: "f",
          label: "f",
          type: "drawer",
          panel: { mode: "chips", title: null, options: [{ value: "a", label: "a" }] },
        },
      ],
    },
  ];
  expect(parseTemplate(JSON.stringify(value)).blocks).toEqual(value);
});
