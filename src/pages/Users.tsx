// 用户列表和详情共享受控操作，封禁未知态不可执行。
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminPath, useDetail } from "../api/admin";
import { ResourceList } from "../components/data/ResourceList";
import { UserResources } from "../components/data/UserResources";
import { ActionDialog, type ActionSpec } from "../components/feedback/ActionDialog";
import { Details } from "../components/feedback/Details";
import { State } from "../components/feedback/State";
import { Badge, Button, Card } from "../components/ui";
import { actions, allowed } from "../lib/permission";
import { dateText, text } from "../lib/utils";
import { useAuth } from "../store/auth";
import type { User } from "../types/user";
import { Qualifications } from "./Qualifications";

const reason = { key: "reason", label: "操作原因", type: "textarea" as const, required: true };
export default function Users() {
  const { id } = useParams();
  const [action, setAction] = useState<ActionSpec | null>(null);
  const role = useAuth((s) => s.user?.adminRole);
  const detail = useDetail<User>(`users/${id}`, !!id);
  const buttons = (u: User) => (
    <div className="actions">
      {allowed(role, actions.ban) && !u.isAdmin && (
        <Button
          variant={u.banned ? "ghost" : "danger-ghost"}
          disabled={typeof u.banned !== "boolean"}
          onClick={() =>
            setAction({
              title: u.banned ? "解封用户" : "封禁用户",
              path: adminPath(`users/${u.id}/status`),
              body: { banned: !u.banned },
              fields: [reason],
            })
          }
        >
          {typeof u.banned !== "boolean" ? "封禁状态未知" : u.banned ? "解封" : "封禁"}
        </Button>
      )}
      {allowed(role, actions.credit) && (
        <Button
          variant="ghost"
          onClick={() =>
            setAction({
              title: "调整信用分",
              path: adminPath(`users/${u.id}/credit-score`),
              fields: [
                {
                  key: "delta",
                  label: "增减分值",
                  required: true,
                  type: "number",
                  description: "非零整数，-1000 至 1000",
                },
                reason,
              ],
              validate: (v): Record<string, string> =>
                /^-?\d+$/.test(v.delta) &&
                Number(v.delta) !== 0 &&
                Math.abs(Number(v.delta)) <= 1000
                  ? {}
                  : { delta: "请输入非零整数，范围 -1000～1000" },
              build: (v) => ({ delta: Number(v.delta), reason: v.reason }),
            })
          }
        >
          调整信用分
        </Button>
      )}
    </div>
  );
  return (
    <>
      {id ? (
        <>
          <div className="page-heading">
            <div>
              <h1>用户详情</h1>
              <Link to="/users">返回用户列表</Link>
            </div>
            {detail.data && buttons(detail.data)}
          </div>
          <State
            loading={detail.isLoading}
            error={detail.error}
            retry={() => void detail.refetch()}
          >
            {detail.data && (
              <Card>
                <Details
                  fields={[
                    ["用户 ID", detail.data.id],
                    ["昵称", detail.data.nickname],
                    ["信用分", detail.data.creditScore],
                    ["脱敏手机号", text(detail.data.phoneMasked)],
                    ["完成订单数", text(detail.data.completedOrders)],
                    [
                      "交易身份",
                      [detail.data.isEmployer ? "雇主" : "", detail.data.isProvider ? "服务者" : ""]
                        .filter(Boolean)
                        .join(" / ") || "未设置",
                    ],
                    [
                      "封禁状态",
                      typeof detail.data.banned === "boolean"
                        ? detail.data.banned
                          ? "已封禁"
                          : "正常"
                        : "未知",
                    ],
                    ["封禁原因", text(detail.data.banReason)],
                    ["封禁时间", dateText(detail.data.bannedAt)],
                    ["注册时间", dateText(detail.data.createdAt)],
                    ["最近登录", dateText(detail.data.lastLoginAt)],
                  ]}
                />
              </Card>
            )}
          </State>
          <Qualifications userId={Number(id)} />
          <UserResources id={Number(id)} />
        </>
      ) : (
        <ResourceList<User>
          kind="users"
          title="用户管理"
          description="查看用户资料，维护平台信用与使用秩序"
          filters={[
            { key: "keyword", label: "昵称 / 完整手机号" },
            {
              key: "banned",
              label: "封禁状态",
              options: [
                { value: "true", label: "已封禁" },
                { value: "false", label: "正常" },
              ],
            },
            {
              key: "role",
              label: "交易身份",
              options: [
                { value: "employer", label: "雇主" },
                { value: "provider", label: "服务者" },
              ],
            },
            { key: "start_date", label: "注册起始日", type: "date" },
            { key: "end_date", label: "注册结束日", type: "date" },
          ]}
          columns={[
            { key: "id", label: "用户 ID", render: (u) => u.id },
            {
              key: "nickname",
              label: "昵称",
              render: (u) => (
                <Link className="user-cell" to={`/users/${u.id}`}>
                  <span className="avatar" aria-hidden="true">
                    {u.nickname?.slice(0, 1) || "用"}
                  </span>
                  <span className="cell-title">{u.nickname || `用户 #${u.id}`}</span>
                </Link>
              ),
            },
            { key: "credit", label: "信用分", render: (u) => u.creditScore },
            {
              key: "banned",
              label: "账号状态",
              render: (u) => (
                <Badge
                  tone={typeof u.banned !== "boolean" ? "neutral" : u.banned ? "danger" : "success"}
                >
                  {typeof u.banned === "boolean" ? (u.banned ? "已封禁" : "正常") : "未知"}
                </Badge>
              ),
            },
            { key: "created", label: "注册时间", render: (u) => dateText(u.createdAt) },
            { key: "actions", label: "操作", render: buttons },
          ]}
        />
      )}{" "}
      {action && <ActionDialog spec={action} onClose={() => setAction(null)} />}
    </>
  );
}
