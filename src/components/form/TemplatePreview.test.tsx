// 预览确认取消和标签额度通过用户操作验证，避免预览值混入模板。
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { TemplatePreview } from "./TemplatePreview";

afterEach(cleanup);
const raw = JSON.stringify([
  {
    blockId: "b",
    fields: [
      {
        key: "f",
        label: "抽屉",
        type: "drawer",
        panel: { mode: "chips", title: "选择", options: [{ value: "a", label: "选项A" }] },
      },
      { key: "t", label: "标签", type: "tags", maxCustom: 1 },
    ],
  },
]);
it("面板取消不提交，确定后提交", () => {
  render(<TemplatePreview raw={raw} />);
  fireEvent.click(screen.getByText(/请选择/));
  fireEvent.click(screen.getByRole("button", { name: "选项A" }));
  fireEvent.click(screen.getByRole("button", { name: "取消" }));
  expect(screen.getByText(/请选择/)).toBeTruthy();
  fireEvent.click(screen.getByText(/请选择/));
  fireEvent.click(screen.getByRole("button", { name: "选项A" }));
  fireEvent.click(screen.getByRole("button", { name: "确定选择" }));
  expect(screen.getByRole("button", { name: /a ›/ })).toBeTruthy();
});
it("标签最多一个自定义，删除后可重新添加", () => {
  render(<TemplatePreview raw={raw} />);
  const input = screen.getByLabelText("标签自定义标签");
  fireEvent.change(input, { target: { value: "一" } });
  fireEvent.click(screen.getByRole("button", { name: "添加标签" }));
  fireEvent.change(input, { target: { value: "二" } });
  fireEvent.click(screen.getByRole("button", { name: "添加标签" }));
  expect(screen.getByRole("alert").textContent).toContain("上限");
  fireEvent.click(screen.getByRole("button", { name: "删除标签一" }));
  fireEvent.click(screen.getByRole("button", { name: "添加标签" }));
  expect(screen.getByRole("button", { name: "删除标签二" })).toBeTruthy();
});
