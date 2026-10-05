// 状态色不能把未知值标成成功。
import { expect, it } from "vitest";
import { statusTone } from "../components/ui/status";

it.each([
  ["已完成", "success"],
  ["已封禁", "danger"],
  ["通道失败待处理", "danger"],
  ["待审核", "warning"],
  ["进行中", "info"],
  ["未知（99）", "neutral"],
])("状态 %s", (label, tone) => expect(statusTone(label)).toBe(tone));
