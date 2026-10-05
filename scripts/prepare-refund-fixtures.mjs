// 本地独立通道夹具：新增唯一需求及退款，禁止清库；凭据与令牌只保存忽略文件。
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";

const base = "http://127.0.0.1:8080";
const accounts = JSON.parse(
  fs.readFileSync(process.env.SXDG_REFUND_ACCOUNTS || ".refund-e2e-accounts.json", "utf8"),
);
async function api(path, body, token) {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (result.code !== 0) throw new Error(`${path}: ${result.message}`);
  return result.data;
}
const sessions = {};
for (const [role, account] of Object.entries(accounts)) {
  sessions[role] = await api("/api/v1/auth/login", account);
  await new Promise((resolve) => setTimeout(resolve, 13000));
}
const run = `RC${randomUUID().replaceAll("-", "").slice(0, 10)}`;
const user = await api("/api/v1/auth/wx-login", { code: `mock:${run}` });
function sql(query) {
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "sxdg-be-postgres-1",
      "psql",
      "-U",
      "postgres",
      "-d",
      "sxdg",
      "-Atq",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input: query, encoding: "utf8" },
  ).trim();
}
const category = Number(sql("SELECT id FROM categories WHERE level=3 ORDER BY id LIMIT 1;"));
const fixtures = {};
for (const [label, status, channel] of [
  ["closed", 6, "CLOSED"],
  ["abnormal", 6, "ABNORMAL"],
  ["processing", 1, "PROCESSING"],
  ["success", 4, "SUCCESS"],
]) {
  const req = Number(
    sql(
      `INSERT INTO requirements(publisher_id,category_id,title,display_price,status,deposit_amount,refunded_amount,paid_at,payment_no) VALUES(${user.user.id},${category},'通道浏览器验收${run}-${label}',50,3,50,${status === 4 ? 50 : 0},now(),'PAY${run}${label}') RETURNING id;`,
    ),
  );
  const number = `${run}${label}`;
  const id = Number(
    sql(
      `INSERT INTO refunds(refund_no,source_type,source_id,applicant_id,reason,apply_amount,final_amount,status,channel_status) VALUES('${number}',1,${req},${user.user.id},'独立通道浏览器夹具',50,50,${status},'${channel}') RETURNING id;`,
    ),
  );
  sql(
    `INSERT INTO refund_attempts(refund_id,refund_no,channel_status) VALUES(${id},'${number}','${channel}');`,
  );
  if (status === 6)
    sql(
      `INSERT INTO system_configs(config_key,config_value) VALUES('internal:refund_terminal:${id}','${channel}') ON CONFLICT(config_key) DO UPDATE SET config_value=EXCLUDED.config_value;`,
    );
  fixtures[label] = { id, requirementId: req, refundNo: number };
}
fs.writeFileSync(".refund-e2e.json", JSON.stringify({ run, sessions, fixtures }, null, 2), {
  mode: 0o600,
});
console.log(`独立退款夹具已创建：${run}（4笔，不清库）`);
