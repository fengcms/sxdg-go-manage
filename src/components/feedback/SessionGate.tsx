// 恢复完成前不挂载受保护路由，避免刷新时闪登录页或使用陈旧角色。
import { type ReactNode, useEffect, useState } from "react";
import { restoreSession } from "../../api/auth";
import { clearSession } from "../../lib/request/core";
import { Button } from "../ui";
export function SessionGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt 是用户主动重试的触发器。
  useEffect(() => {
    let active = true;
    setError("");
    restoreSession().then(
      () => {
        if (active) setReady(true);
      },
      (e) => {
        if (active) setError(e instanceof Error ? e.message : "恢复登录失败");
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);
  if (ready) return children;
  return (
    <div className="state" role={error ? "alert" : "status"}>
      <h1>{error ? "暂时无法恢复登录" : "正在恢复登录…"}</h1>
      {error && (
        <>
          <p>{error}</p>
          <div className="actions" style={{ justifyContent: "center" }}>
            <Button onClick={() => setAttempt((n) => n + 1)}>重试恢复</Button>
            <Button
              variant="outline"
              onClick={() => {
                clearSession();
                setReady(true);
              }}
            >
              返回登录
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
