// 用户信用与发布内容使用独立分页接口，不遍历全站列表拼装。
import { Link, useSearchParams } from "react-router-dom";
import { dateText, money, text } from "../../lib/utils";
import { Button } from "../ui";
import { ResourceList } from "./ResourceList";

interface Row {
  id: number;
  behaviorKey?: string;
  delta?: number;
  scoreAfter?: number;
  remark?: string | null;
  title?: string;
  status?: number;
  displayPrice?: string;
  createdAt: string;
}
export function UserResources({ id }: { id: number }) {
  const [params, setParams] = useSearchParams();
  const tabs = { "credit-logs": "信用记录", services: "发布服务", requirements: "发布需求" };
  const raw = params.get("tab") || "credit-logs";
  const tab = Object.hasOwn(tabs, raw) ? raw : "credit-logs";
  return (
    <>
      <section className="actions" aria-label="用户扩展资料">
        {Object.entries(tabs).map(([key, label]) => (
          <Button
            key={key}
            variant={tab === key ? "default" : "ghost"}
            aria-pressed={tab === key}
            onClick={() =>
              setParams(
                (p) => {
                  p.set("tab", key);
                  p.set("page", "1");
                  return p;
                },
                { replace: true },
              )
            }
          >
            {label}
          </Button>
        ))}
      </section>
      <ResourceList<Row>
        key={tab}
        kind={`users/${id}/${tab}`}
        title={tabs[tab as keyof typeof tabs]}
        columns={
          tab === "credit-logs"
            ? [
                { key: "behavior", label: "行为", render: (r) => text(r.behaviorKey) },
                { key: "delta", label: "实际增减", render: (r) => text(r.delta) },
                { key: "score", label: "变更后分值", render: (r) => text(r.scoreAfter) },
                { key: "remark", label: "说明", render: (r) => text(r.remark) },
                { key: "time", label: "时间", render: (r) => dateText(r.createdAt) },
              ]
            : [
                {
                  key: "title",
                  label: "标题",
                  render: (r) => <Link to={`/${tab}/${r.id}`}>{r.title}</Link>,
                },
                {
                  key: "status",
                  label: "状态",
                  render: (r) =>
                    (
                      ({ 0: "草稿", 1: "待支付", 2: "已发布", 3: "已关闭" }) as Record<
                        number,
                        string
                      >
                    )[r.status ?? -1] || text(r.status),
                },
                { key: "price", label: "展示价格", render: (r) => money(r.displayPrice) },
                { key: "time", label: "发布时间", render: (r) => dateText(r.createdAt) },
              ]
        }
      />
    </>
  );
}
