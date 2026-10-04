import { StatusTag } from "../components/ui/status";
// 系统配置逐键说明生效范围，审计保留原始结构和中文摘要。

import { useQuery } from "@tanstack/react-query";
import Decimal from "decimal.js";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { adminPath, allPages, useDetail } from "../api/admin";
import { ResourceList } from "../components/data/ResourceList";
import { ActionDialog, type ActionSpec } from "../components/feedback/ActionDialog";
import { Details } from "../components/feedback/Details";
import { State } from "../components/feedback/State";
import { Button, Card, Modal } from "../components/ui";
import { configNotes, creditValid, feeBody, feeErrors } from "../lib/config";
import { qk } from "../lib/queryClient";
import { dateText, money, text } from "../lib/utils";

interface Config {
  id: number;
  configKey: string;
  configValue: string;
  description: string | null;
  updatedAt: string;
}
interface Rule {
  id: number;
  behaviorKey: string;
  name: string;
  delta: number;
  isActive: boolean;
  updatedAt: string;
}
interface Fee {
  fee_rate: string;
  min_fee: string;
  payer: string;
  split_ratio: string | null;
}
interface Audit {
  id: number;
  adminId: number;
  admin?: { id: number; nickname: string; adminRole: string | null };
  action: string;
  actionLabel: string;
  targetType: string;
  targetLabel: string;
  targetId: number;
  detail: { before: unknown; after: unknown; reason?: string | null };
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}
export default function System() {
  const { kind } = useParams();
  if (kind === "configs" || kind === "credit-rules")
    return <ConfigRules rules={kind === "credit-rules"} />;
  if (kind === "fee-config") return <FeeConfig />;
  if (kind === "audit-logs") return <AuditLogs />;
  return <p>页面不存在</p>;
}
function ConfigRules({ rules }: { rules: boolean }) {
  const [action, setAction] = useState<ActionSpec | null>(null);
  const configs = useQuery({
    queryKey: qk.resource("all-system-configs"),
    queryFn: ({ signal }) => allPages<Config>("system-configs", signal),
  });
  const values = Object.fromEntries(
    (configs.data || []).map((c) => [c.configKey, Number(c.configValue)]),
  );
  const summary = `信用下限 ${values.credit_score_min ?? "—"} / 初始值 ${values.credit_score_initial ?? "—"} / 上限 ${values.credit_score_max ?? "—"}；不批量重算存量用户。`;
  function editConfig(r: Config) {
    setAction({
      title: `编辑 ${r.description || r.configKey}`,
      path: adminPath(`system-configs/${encodeURIComponent(r.configKey)}`),
      description: `原值：${r.configValue}。${configNotes[r.configKey] || "影响对应配置后续读取；具体业务范围待确认。"} ${r.configKey.startsWith("credit_score_") ? summary : ""}`,
      fields: [{ key: "value", label: "新配置值", required: true, default: r.configValue }],
      validate: (v) => {
        const e: Record<string, string> = {};
        if (!/^\d+$/.test(v.value) || Number(v.value) > 100000) e.value = "请输入0～100000整数";
        if (r.configKey.startsWith("credit_score_")) {
          const next = { ...values, [r.configKey]: Number(v.value) };
          if (!creditValid(next.credit_score_min, next.credit_score_initial, next.credit_score_max))
            e.value = "必须满足 0 ≤ 下限 ≤ 初始值 ≤ 上限 ≤ 100000";
        }
        return e;
      },
    });
  }
  return (
    <>
      <p className="notice">{summary}</p>
      {configs.error && (
        <p className="error">
          配置加载失败<Button onClick={() => void configs.refetch()}>重试</Button>
        </p>
      )}
      {rules ? (
        <ResourceList<Rule>
          kind="credit-rules"
          title="信用分规则"
          description="规则增减量独立于用户总分边界，允许负数扣分"
          columns={[
            { key: "key", label: "行为键", render: (r) => r.behaviorKey },
            { key: "name", label: "行为名称", render: (r) => r.name },
            { key: "delta", label: "分值增减", render: (r) => r.delta },
            {
              key: "active",
              label: "状态",
              render: (r) => <StatusTag label={r.isActive ? "启用" : "停用"} />,
            },
            { key: "updated", label: "更新时间", render: (r) => dateText(r.updatedAt) },
            {
              key: "action",
              label: "操作",
              render: (r) => (
                <Button
                  variant="ghost"
                  onClick={() =>
                    setAction({
                      title: "修改信用规则",
                      path: adminPath(`credit-rules/${r.id}`),
                      description: `${r.name}：原分值 ${r.delta}，原状态${r.isActive ? "启用" : "停用"}。仅影响后续触发行为。`,
                      fields: [
                        {
                          key: "delta",
                          label: "增减分值",
                          required: true,
                          default: String(r.delta),
                        },
                        {
                          key: "isActive",
                          label: "启用状态",
                          required: true,
                          type: "select",
                          default: String(r.isActive),
                          options: [
                            { value: "true", label: "启用" },
                            { value: "false", label: "停用" },
                          ],
                        },
                      ],
                      validate: (v): Record<string, string> =>
                        /^-?\d+$/.test(v.delta) && Math.abs(Number(v.delta)) <= 1000
                          ? {}
                          : { delta: "整数范围 -1000～1000" },
                      build: (v) => ({ delta: Number(v.delta), isActive: v.isActive === "true" }),
                    })
                  }
                >
                  编辑
                </Button>
              ),
            },
          ]}
        />
      ) : (
        <ResourceList<Config>
          kind="system-configs"
          title="系统参数"
          description="配置逐项更新，不重算已写入业务记录的截止时间"
          columns={[
            { key: "key", label: "配置键", render: (r) => r.configKey },
            { key: "desc", label: "说明", render: (r) => text(r.description) },
            { key: "value", label: "当前值", render: (r) => r.configValue },
            { key: "time", label: "更新时间", render: (r) => dateText(r.updatedAt) },
            {
              key: "action",
              label: "操作",
              render: (r) => (
                <Button variant="ghost" disabled={!configs.data} onClick={() => editConfig(r)}>
                  编辑
                </Button>
              ),
            },
          ]}
        />
      )}{" "}
      {action && <ActionDialog spec={action} onClose={() => setAction(null)} />}
    </>
  );
}
function FeeConfig() {
  const data = useDetail<Fee>("fee-config");
  const [action, setAction] = useState<ActionSpec | null>(null);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>服务费配置</h1>
          <p>明确费用比例与承担方，所有金额使用十进制字符串</p>
        </div>
      </div>
      <p className="notice">影响随后读取当前配置的业务；已预付需求后续订单仍使用原费率快照。</p>
      <State loading={data.isLoading} error={data.error} retry={() => void data.refetch()}>
        {data.data && (
          <Card>
            <Details
              fields={[
                ["服务费比例", `${data.data.fee_rate}%`],
                ["最低服务费", money(data.data.min_fee)],
                [
                  "承担方",
                  (
                    { provider: "服务者", employer: "雇主", split: "双方分摊" } as Record<
                      string,
                      string
                    >
                  )[data.data.payer] || data.data.payer,
                ],
                [
                  "雇主承担百分比",
                  data.data.split_ratio === null
                    ? "—"
                    : `${new Decimal(data.data.split_ratio).mul(100).toString()}%`,
                ],
              ]}
            />
            <div className="form-actions">
              <Button
                onClick={() => {
                  const r = data.data;
                  if (!r) return;
                  setAction({
                    title: "修改服务费配置",
                    path: adminPath("fee-config"),
                    description: `原费率 ${r.fee_rate}%，最低 ${r.min_fee}，承担方 ${r.payer}，雇主比例 ${r.split_ratio ?? "—"}。影响随后读取当前配置的业务；已预付需求沿用快照。`,
                    fields: [
                      { key: "fee_rate", label: "费率（%）", required: true, default: r.fee_rate },
                      { key: "min_fee", label: "最低服务费", required: true, default: r.min_fee },
                      {
                        key: "payer",
                        label: "承担方",
                        required: true,
                        type: "select",
                        default: r.payer,
                        options: [
                          { value: "provider", label: "服务者承担" },
                          { value: "employer", label: "雇主承担" },
                          { value: "split", label: "双方分摊" },
                        ],
                      },
                      {
                        key: "percent",
                        label: "雇主承担（%）",
                        default:
                          r.split_ratio === null
                            ? ""
                            : new Decimal(r.split_ratio).mul(100).toString(),
                        description:
                          "仅双方分摊时填写0～100整数；拒绝30.5等小数百分比，不静默取整。",
                      },
                    ],
                    validate: feeErrors,
                    build: feeBody,
                  });
                }}
              >
                编辑服务费
              </Button>
            </div>
          </Card>
        )}
      </State>
      {action && <ActionDialog spec={action} onClose={() => setAction(null)} />}
    </>
  );
}
function AuditLogs() {
  const [view, setView] = useState<Audit | null>(null);
  return (
    <>
      <ResourceList<Audit>
        kind="audit-logs"
        title="操作日志"
        filters={[
          { key: "admin_id", label: "管理员ID" },
          { key: "action", label: "操作标识" },
          { key: "target_type", label: "对象类型" },
          { key: "start_date", label: "起始日", type: "date" },
          { key: "end_date", label: "结束日", type: "date" },
        ]}
        description="HTTP 管理写操作审计；CLI 初始化记录在独立运维日志中"
        columns={[
          { key: "id", label: "编号", render: (r) => r.id },
          {
            key: "admin",
            label: "操作人",
            render: (r) => r.admin?.nickname || `管理员 #${r.adminId}`,
          },
          { key: "action", label: "操作", render: (r) => r.actionLabel || r.action },
          {
            key: "target",
            label: "对象",
            render: (r) => `${r.targetLabel || r.targetType} #${r.targetId}`,
          },
          { key: "time", label: "时间", render: (r) => dateText(r.createdAt) },
          {
            key: "detail",
            label: "详情",
            render: (r) => (
              <Button variant="ghost" onClick={() => setView(r)}>
                查看变更
              </Button>
            ),
          },
        ]}
      />
      <Modal title="审计日志详情" open={!!view} onClose={() => setView(null)}>
        {view && (
          <>
            <Details
              fields={[
                ["管理员", view.admin?.nickname || view.adminId],
                ["操作", view.actionLabel || view.action],
                ["对象", view.targetLabel || view.targetType],
                ["对象 ID", view.targetId],
                ["时间", dateText(view.createdAt)],
                ["IP", text(view.ip)],
                ["客户端", text(view.userAgent)],
                ["原因", text(view.detail.reason)],
              ]}
            />
            <details className="audit-raw">
              <summary>查看原始变更明细</summary>
              <h3>变更前</h3>
              <pre>{JSON.stringify(view.detail.before, null, 2)}</pre>
              <h3>变更后（请求增量或对象，以实际记录为准）</h3>
              <pre>{JSON.stringify(view.detail.after, null, 2)}</pre>
            </details>
          </>
        )}
      </Modal>
    </>
  );
}
