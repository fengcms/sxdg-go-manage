// 登录页错误保留输入，不泄露账号存在性。

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { login } from "../api/auth";
import { FormField } from "../components/form/FormField";
import { Button, Input } from "../components/ui";
import { useAuth } from "../store/auth";

const schema = z.object({
  account: z.string().trim().min(1, "请输入账号"),
  password: z.string().min(1, "请输入密码"),
});
export default function Login() {
  const user = useAuth((s) => s.user);
  const nav = useNavigate();
  const location = useLocation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  if (user) return <Navigate to="/dashboard/overview" replace />;
  return (
    <div className="login-screen app-bg">
      <section className="login-brand">
        <span className="eyebrow">四系点工 · 运营工作台</span>
        <h1>
          让每一份服务，
          <br />
          都有可靠的连接。
        </h1>
        <p>内容运营 · 交易监管 · 平台治理</p>
        <div className="brand-mark">
          四<span>系</span>
        </div>
      </section>
      <section className="login-panel">
        <div className="badge">管理后台</div>
        <h2>欢迎回来</h2>
        <p className="hint">使用管理员账号登录，继续今天的工作。</p>
        <form
          onSubmit={handleSubmit(async (values) => {
            try {
              await login(values.account, values.password);
              const from = location.state?.from;
              nav(
                typeof from === "string" && from.startsWith("/") && !from.startsWith("//")
                  ? from
                  : "/dashboard/overview",
                { replace: true },
              );
            } catch (e) {
              setError("root", { message: e instanceof Error ? e.message : "登录失败" });
            }
          })}
        >
          <FormField label="账号" id="account" error={errors.account?.message}>
            <Input id="account" autoComplete="username" {...register("account")} />
          </FormField>
          <FormField label="密码" id="password" error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
          </FormField>
          {errors.root && (
            <p className="error" role="alert">
              {errors.root.message}
            </p>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "正在登录…" : "登录工作台"}
          </Button>
        </form>
        <p className="hint">为保护管理数据，刷新页面后需要重新登录。</p>
      </section>
    </div>
  );
}
