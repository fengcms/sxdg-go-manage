// 非法URL输入回退第一页，不把非法偏移传给数据库。
import { expect, it } from "vitest";
import { pageNumber } from "./tableQuery";

it.each([
  [null, 1],
  ["0", 1],
  ["-1", 1],
  ["1.5", 1],
  ["Infinity", 1],
  ["abc", 1],
  ["2", 2],
])("分页 %s", (raw, result) => expect(pageNumber(raw as string | null)).toBe(result));
