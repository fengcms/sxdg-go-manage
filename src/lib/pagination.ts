// 页码窗口长度有界，避免上万页生成上万个按钮。
export function pageItems(page: number, total: number): (number | string)[] {
  const last = Math.max(1, total);
  const current = Math.min(last, Math.max(1, page));
  const pages = [...new Set([1, last, current - 1, current, current + 1])]
    .filter((n) => n >= 1 && n <= last)
    .sort((a, b) => a - b);
  return pages.flatMap((n, i) => (i && n - pages[i - 1] > 1 ? [`gap-${n}`, n] : [n]));
}
