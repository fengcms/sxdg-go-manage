// 仅用于本地联调：通过真实HTTP与明确SQL创建唯一测试记录，不改既有业务。

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";

const accounts = JSON.parse(fs.readFileSync(".e2e-accounts.json", "utf8"));
const base = "http://127.0.0.1:8080";
async function api(path, body, token, method = "POST", retries = 0) {
  const r = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const j = await r.json();
  if (j.code === 10003 && retries < 8) {
    await new Promise((resolve) => setTimeout(resolve, 15000));
    return api(path, body, token, method, retries + 1);
  }
  if (j.code !== 0) throw Error(j.message);
  return j.data;
}
const admins = {};
for (const [role, account] of Object.entries(accounts))
  admins[role] = await api("/api/v1/auth/login", account);
const run = randomUUID().slice(0, 8);
const user = await api("/api/v1/auth/wx-login", { code: `mock:ui-business-${run}` });
const provider = await api("/api/v1/auth/wx-login", { code: `mock:ui-provider-${run}` });
const admin = admins.super_admin.accessToken;
const cats = [];
for (let level = 1; level <= 3; level++)
  cats.push(
    await api(
      "/api/v1/admin/categories",
      { name: `验收${run}-${level}`, parentId: cats.at(-1)?.id ?? null, sortOrder: 0 },
      admin,
    ),
  );
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
const serviceId = Number(
  sql(
    `INSERT INTO services(publisher_id,category_id,title,display_price,status) VALUES(${provider.user.id},${cats[2].id},'界面验收服务${run}',100,2) RETURNING id;`,
  ),
);
const billing = JSON.stringify({
  billing: {
    amount: "100",
    fee: "5",
    employerFee: "0",
    providerFee: "5",
    paid: "100",
    settlement: "95",
  },
});
const orderIds = [];
for (const status of [0, 4, 7])
  orderIds.push(
    Number(
      sql(
        `INSERT INTO orders(order_no,employer_id,provider_id,source_type,source_id,service_id,title,amount,service_fee,delivery_type,status,prev_status,address_snapshot,pay_deadline) VALUES('UI${run}${status}',${user.user.id},${provider.user.id},'service',${serviceId},${serviceId},'界面验收订单',100,5,'online',${status},2,'${billing}',now()+interval '1 day') RETURNING id;`,
      ),
    ),
  );
const refundId = Number(
  sql(
    `INSERT INTO refunds(refund_no,source_type,source_id,applicant_id,respondent_id,reason,apply_amount,status) VALUES('RFUI${run}',0,${orderIds[2]},${user.user.id},${provider.user.id},'本地界面退款验收',50,3) RETURNING id;`,
  ),
);
const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1sAAAAASUVORK5CYII=",
  "base64",
);
const form = new FormData();
form.append("file", new Blob([pixel], { type: "image/png" }), "cert.png");
form.append("biz_type", "cert");
const upload = await (
  await fetch(base + "/api/v1/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${user.accessToken}` },
    body: form,
  })
).json();
if (upload.code !== 0) throw Error(upload.message);
const certId = Number(
  sql(
    `INSERT INTO user_certifications(user_id,cert_type,cert_no,image_urls) VALUES(${user.user.id},'ui-test','UITEST',ARRAY['${upload.data.fileUrl}']) RETURNING id;`,
  ),
);
const agents = [];
for (const role of ["customer_service", "super_admin"]) {
  agents.push(
    await api(
      "/api/v1/admin/cs/agents",
      {
        userId: admins[role].user.id,
        nickname: `验收客服${role === "super_admin" ? "甲" : "乙"}`,
        maxConcurrent: 10,
        isActive: true,
        isOnline: true,
      },
      admin,
    ),
  );
}
const convId = Number(
  sql(
    `INSERT INTO conversations(type,user1_id,user2_id,last_message,last_message_at) VALUES('cs',${user.user.id},${admins.customer_service.user.id},'界面验收消息',now()) RETURNING id;`,
  ),
);
sql(
  `INSERT INTO chat_messages(conversation_id,sender_id,type,content) VALUES(${convId},${user.user.id},'text','界面验收消息'); UPDATE cs_agents SET current_count=current_count+1 WHERE id=${agents[0].id};`,
);
const out = {
  run,
  userId: user.user.id,
  providerId: provider.user.id,
  categories: cats.map((c) => c.id),
  serviceId,
  orderIds,
  refundId,
  certId,
  certUrl: upload.data.fileUrl,
  convId,
  agents: agents.map((a) => a.id),
};
fs.writeFileSync(".e2e-fixtures.json", JSON.stringify(out, null, 2));
console.log("本地业务测试记录已创建：" + run);
