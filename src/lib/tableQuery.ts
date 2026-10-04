// URL分页参数只允许正安全整数，防止小数和Infinity进入接口。
export function pageNumber(raw: string | null) {
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : 1;
}
