import { StatusTag } from "../components/ui/status";
// 资质队列与用户资质复用分页组件，证件走受保护二进制请求。

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminPath } from "../api/admin";
import { ResourceList } from "../components/data/ResourceList";
import { ActionDialog, type ActionSpec } from "../components/feedback/ActionDialog";
import { State } from "../components/feedback/State";
import { Button, Modal } from "../components/ui";
import { actions, allowed } from "../lib/permission";
import { qk } from "../lib/queryClient";
import { request } from "../lib/request/core";
import { dateText } from "../lib/utils";
import { useAuth } from "../store/auth";
import type { Qualification } from "../types/user";
export function Certificate({ url }: { url: string }) {
  const [src, setSrc] = useState("");
  const valid = /^\/api\/v1\/upload\/cert\/[a-zA-Z0-9._-]+$/.test(url);
  const result = useQuery({
    queryKey: qk.resource(url),
    queryFn: ({ signal }) => request<Blob>(url, { blob: true, signal }),
    enabled: valid,
    gcTime: 0,
  });
  useEffect(() => {
    if (!result.data) return;
    const value = URL.createObjectURL(result.data);
    setSrc(value);
    return () => URL.revokeObjectURL(value);
  }, [result.data]);
  if (!valid) return <p className="error">证件路径无效，未向外部地址发送令牌。</p>;
  return (
    <State loading={result.isLoading} error={result.error} retry={() => void result.refetch()}>
      {src && <img className="certificate-image" src={src} alt="资质证件" />}
    </State>
  );
}
export function Qualifications({ userId }: { userId?: number }) {
  const role = useAuth((s) => s.user?.adminRole);
  const [action, setAction] = useState<ActionSpec | null>(null);
  const [view, setView] = useState<Qualification | null>(null);
  return (
    <>
      <ResourceList<Qualification>
        queryPrefix={userId ? "cert_" : ""}
        kind={userId ? `users/${userId}/qualifications` : "qualifications"}
        title={userId ? "用户资质" : "资质审核"}
        description="审核真实资料；证件图片仅通过鉴权请求读取"
        filters={[
          {
            key: "status",
            label: "审核状态",
            options: [
              { value: "0", label: "待审核" },
              { value: "1", label: "已通过" },
              { value: "2", label: "已拒绝" },
            ],
          },
        ]}
        columns={[
          { key: "id", label: "编号", render: (r) => r.id },
          {
            key: "user",
            label: "用户",
            render: (r) => (
              <Link to={`/users/${r.userId}`}>{r.user?.nickname || `用户 #${r.userId}`}</Link>
            ),
          },
          { key: "type", label: "资质类型", render: (r) => r.certType },
          {
            key: "status",
            label: "状态",
            render: (r) => (
              <StatusTag
                label={["待审核", "已通过", "已拒绝"][r.status] || `未知（${r.status}）`}
              />
            ),
          },
          { key: "time", label: "提交时间", render: (r) => dateText(r.createdAt) },
          {
            key: "actions",
            label: "操作",
            render: (r) => (
              <div className="actions">
                <Button variant="ghost" onClick={() => setView(r)}>
                  查看证件
                </Button>
                {r.status === 0 && allowed(role, actions.qualification) && (
                  <>
                    <Button
                      onClick={() =>
                        setAction({
                          title: "通过资质审核",
                          path: adminPath(`qualifications/${r.id}/approve`),
                          body: {},
                        })
                      }
                    >
                      通过
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() =>
                        setAction({
                          title: "拒绝资质审核",
                          path: adminPath(`qualifications/${r.id}/reject`),
                          fields: [
                            { key: "reason", label: "拒绝原因", required: true, type: "textarea" },
                          ],
                        })
                      }
                    >
                      拒绝
                    </Button>
                  </>
                )}
              </div>
            ),
          },
        ]}
      />
      {action && <ActionDialog spec={action} onClose={() => setAction(null)} />}
      <Modal title="资质证件" open={!!view} onClose={() => setView(null)}>
        {view && (
          <>
            <p>
              证件编号：{view.certNo || "—"} · {view.rejectReason || "暂无拒绝原因"}
            </p>
            {view.imageUrls?.length ? (
              view.imageUrls.map((url) => <Certificate key={url} url={url} />)
            ) : (
              <p>暂无证件图片</p>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
export default Qualifications;
