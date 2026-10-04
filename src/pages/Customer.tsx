import { StatusTag } from "../components/ui/status";
// 客服首期只读消息和流转；供应商发送链路尚未开放。

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { adminPath, allPages, useDetail, useList } from "../api/admin";
import { DataTable, Pagination } from "../components/data/DataTable";
import { ResourceList } from "../components/data/ResourceList";
import { ActionDialog, type ActionSpec } from "../components/feedback/ActionDialog";
import { State } from "../components/feedback/State";
import { Button, Card } from "../components/ui";
import { useTableQuery } from "../hooks/useTableQuery";
import { canReadMessage, canTransfer } from "../lib/customer";
import { qk, queryClient } from "../lib/queryClient";
import { request } from "../lib/request/core";
import { dateText, text } from "../lib/utils";
import { useAuth } from "../store/auth";
import type { Page } from "../types/common";
import type { Summary } from "../types/user";

interface Agent {
  id: number;
  userId: number;
  nickname: string;
  isOnline: boolean;
  isActive: boolean;
  maxConcurrent: number;
  currentCount: number;
  user?: Summary;
}
interface Conversation {
  id: number;
  user1Id: number;
  user2Id: number | null;
  orderId: number | null;
  user?: Summary;
  lastMessage: string | null;
  lastMessageAt: string | null;
}
interface Message {
  id: number;
  senderId: number | null;
  type: string;
  content: string | null;
  cardPayload: unknown;
  createdAt: string;
}
type Me =
  | { agent: null }
  | { agentId: number; displayName: string; isOnline: boolean; isActive: boolean };
export default function Customer() {
  return useLocation().pathname.endsWith("/agents") ? <Agents /> : <Sessions />;
}
function Agents() {
  const [action, setAction] = useState<ActionSpec | null>(null);
  function edit(r?: Agent) {
    setAction({
      title: r ? "编辑客服配置" : "绑定客服账号",
      path: adminPath("cs/agents"),
      method: "POST",
      description: "仅绑定已存在账号，不创建用户、不授予管理员权限。账号初始化由运维完成。",
      fields: [
        { key: "userId", label: "用户 ID", required: true, default: r ? String(r.userId) : "" },
        { key: "nickname", label: "客服显示名", required: true, default: r?.nickname || "" },
        {
          key: "maxConcurrent",
          label: "最大接待数",
          required: true,
          default: String(r?.maxConcurrent || 10),
        },
        {
          key: "isActive",
          label: "启用状态",
          required: true,
          type: "select",
          default: String(r?.isActive ?? true),
          options: [
            { value: "true", label: "启用" },
            { value: "false", label: "停用并下线" },
          ],
        },
      ],
      validate: (v) => {
        const errors: Record<string, string> = {};
        if (!/^[1-9]\d*$/.test(v.userId)) errors.userId = "请输入有效用户ID";
        if (
          !/^\d+$/.test(v.maxConcurrent) ||
          Number(v.maxConcurrent) < 1 ||
          Number(v.maxConcurrent) > 100
        )
          errors.maxConcurrent = "范围1～100的整数";
        return errors;
      },
      build: (v) => ({
        ...(r ? { id: r.id } : {}),
        userId: Number(v.userId),
        nickname: v.nickname,
        maxConcurrent: Number(v.maxConcurrent),
        isActive: v.isActive === "true",
      }),
    });
  }
  return (
    <>
      <ResourceList<Agent>
        kind="cs/agents"
        title="客服配置"
        description="为已有管理员账号绑定接待身份，维护接待容量"
        actions={<Button onClick={() => edit()}>绑定客服</Button>}
        columns={[
          { key: "id", label: "客服 ID", render: (r) => r.id },
          {
            key: "user",
            label: "用户",
            render: (r) => (
              <Link to={`/users/${r.userId}`}>{r.user?.nickname || `用户 #${r.userId}`}</Link>
            ),
          },
          { key: "name", label: "显示名", render: (r) => r.nickname },
          {
            key: "online",
            label: "在线状态",
            render: (r) => <StatusTag label={r.isOnline ? "在线" : "离线"} />,
          },
          {
            key: "active",
            label: "启用状态",
            render: (r) => <StatusTag label={r.isActive ? "启用" : "停用"} />,
          },
          {
            key: "capacity",
            label: "当前 / 最大接待",
            render: (r) => `${r.currentCount} / ${r.maxConcurrent}`,
          },
          {
            key: "action",
            label: "操作",
            render: (r) => (
              <Button variant="ghost" onClick={() => edit(r)}>
                编辑配置
              </Button>
            ),
          },
        ]}
      />
      {action && <ActionDialog spec={action} onClose={() => setAction(null)} />}
    </>
  );
}
function Sessions() {
  const user = useAuth((s) => s.user);
  const { page, pageSize, patch } = useTableQuery();
  const [selected, setSelected] = useState<number | null>(null);
  const [action, setAction] = useState<ActionSpec | null>(null);
  const me = useDetail<Me>("cs/me");
  const list = useList<Conversation>("cs/sessions", { page, page_size: pageSize });
  const current = list.data?.items.find((r) => r.id === selected);
  const targets = useQuery({
    queryKey: qk.resource("all-online-agents"),
    queryFn: ({ signal }) => allPages<Agent>("cs/agents/online", signal),
  });
  const bound = me.data && "agentId" in me.data ? me.data : null;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>接待工作台</h1>
          <p>接待列表 · 会话转接 · 已入库消息记录</p>
        </div>
        {bound && (
          <Button
            disabled={!bound.isActive}
            onClick={() =>
              setAction({
                title: bound.isOnline ? "切换离线" : "切换在线",
                path: adminPath(`cs/agents/${bound.agentId}/status`),
                method: "POST",
                body: { isOnline: !bound.isOnline },
              })
            }
          >
            {bound.isActive
              ? bound.isOnline
                ? "当前在线 · 切换离线"
                : "当前离线 · 切换在线"
              : "客服已停用"}
          </Button>
        )}
      </div>
      <p className="notice">
        消息回复能力建设中。以下为本地已入库记录，不代表完整腾讯 IM 聊天历史。
      </p>
      <State loading={me.isLoading} error={me.error} retry={() => void me.refetch()}>
        {!bound && (
          <p className="notice">
            当前账号未绑定客服。
            {user?.adminRole === "super_admin"
              ? "可查看全量会话元信息，但不能代转或读取非参与会话消息。"
              : "请联系超级管理员绑定后再接待。"}
          </p>
        )}
      </State>
      <div className="cs-grid">
        <Card>
          <h2>接待会话</h2>
          <State
            loading={list.isLoading}
            error={list.error}
            empty={list.data?.items.length === 0}
            retry={() => void list.refetch()}
          >
            {list.data && (
              <DataTable
                rows={list.data.items}
                rowKey={(r) => r.id}
                columns={[
                  {
                    key: "user",
                    label: "会话用户",
                    render: (r) => (
                      <Button
                        variant="ghost"
                        className={selected === r.id ? "selected-session" : undefined}
                        aria-pressed={selected === r.id}
                        onClick={() => setSelected(r.id)}
                      >
                        {r.user?.nickname || `用户 #${r.user1Id}`}
                      </Button>
                    ),
                  },
                  {
                    key: "message",
                    label: "最近消息",
                    render: (r) => <span className="message-excerpt">{text(r.lastMessage)}</span>,
                  },
                  { key: "time", label: "消息时间", render: (r) => dateText(r.lastMessageAt) },
                ]}
              />
            )}
          </State>
          {list.data && (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={list.data.total}
              onChange={(p, s) => {
                setSelected(null);
                patch({ page: p, page_size: s }, false);
              }}
            />
          )}
        </Card>
        <Card className="message-panel">
          {current ? (
            <>
              <h2>会话 #{current.id}</h2>
              <p>
                <Link to={`/users/${current.user1Id}`}>查看用户资料</Link>
                {current.orderId && (
                  <>
                    {" "}
                    · <Link to={`/orders/${current.orderId}`}>订单 #{current.orderId}</Link>
                  </>
                )}
              </p>
              {user && canTransfer(user.id, current) && bound?.isActive && (
                <Button
                  disabled={targets.isLoading || targets.isError}
                  onClick={() =>
                    setAction({
                      title: "转接会话",
                      path: adminPath(`cs/sessions/${current.id}/transfer`),
                      method: "POST",
                      fields: [
                        {
                          key: "toAgentId",
                          label: "目标客服",
                          type: "select",
                          required: true,
                          options: [
                            { value: "", label: "请选择在线客服" },
                            ...(targets.data || [])
                              .filter(
                                (a) => a.userId !== user.id && a.currentCount < a.maxConcurrent,
                              )
                              .map((a) => ({
                                value: String(a.id),
                                label: `${a.nickname}（${a.currentCount}/${a.maxConcurrent}）`,
                              })),
                          ],
                        },
                      ],
                      build: (v) => ({ toAgentId: Number(v.toAgentId) }),
                      after: () => {
                        setSelected(null);
                        queryClient.removeQueries({ queryKey: ["resource", "messages"] });
                      },
                    })
                  }
                >
                  转接会话
                </Button>
              )}
              {targets.error && (
                <p className="error">
                  转接目标加载失败<Button onClick={() => void targets.refetch()}>重试</Button>
                </p>
              )}
              {user && canReadMessage(user.id, current) ? (
                <Messages key={current.id} id={current.id} />
              ) : (
                <p className="notice">仅参与方可查看历史消息</p>
              )}
            </>
          ) : (
            <div className="state">从左侧选择一条会话</div>
          )}
        </Card>
      </div>
      {action && <ActionDialog spec={action} onClose={() => setAction(null)} />}
    </>
  );
}
function Messages({ id }: { id: number }) {
  const [page, setPage] = useState(1);
  const data = useQuery({
    queryKey: ["resource", "messages", id, page],
    queryFn: ({ signal }) =>
      request<Page<Message>>(`/api/v1/conversations/${id}/messages`, {
        signal,
        query: { page, page_size: 20 },
      }),
    refetchInterval: 15000,
  });
  return (
    <>
      <State
        loading={data.isLoading}
        error={data.error}
        empty={data.data?.items.length === 0}
        retry={() => void data.refetch()}
      >
        <div className="message-scroll">
          {data.data?.items.map((m) => (
            <article className="chat-message" key={m.id}>
              <p className="hint">
                {m.senderId ? `用户 #${m.senderId}` : "系统"} · {dateText(m.createdAt)}
              </p>
              {m.type === "image" && m.content?.startsWith("/uploads/") ? (
                <img className="upload-preview" src={m.content} alt="消息图片" />
              ) : (
                <p>{m.content}</p>
              )}
              {m.cardPayload != null && <pre>{JSON.stringify(m.cardPayload, null, 2)}</pre>}
            </article>
          ))}
        </div>
      </State>
      {data.data && (
        <Pagination
          page={page}
          pageSize={20}
          total={data.data.total}
          onChange={(p) => setPage(p)}
        />
      )}
    </>
  );
}
