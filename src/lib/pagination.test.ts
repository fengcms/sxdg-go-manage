// 大页数和边界窗口不泄漏非法页码。
import { describe, expect, it } from "vitest";
import { pageItems } from "./pagination";

describe("分页窗口", () => {
  it.each([
    [1, 0, [1]],
    [1, 3, [1, 2, 3]],
    [5, 10, [1, "gap-4", 4, 5, 6, "gap-10", 10]],
    [100, 3, [1, 2, 3]],
  ])("%s / %s", (p, t, expected) => expect(pageItems(p as number, t as number)).toEqual(expected));
});
