// 懒加载路由与权限守卫共用菜单权限来源。
import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
} from "react-router-dom";
import { navigationFor } from "../config/navigation";
import { allowed } from "../lib/permission";
import { useAuth } from "../store/auth";

const Dashboard = lazy(() => import("../pages/Dashboard"));
const Users = lazy(() => import("../pages/Users"));
const Qualifications = lazy(() => import("../pages/Qualifications"));
const Login = lazy(() => import("../pages/Login"));
const Layout = lazy(() => import("../layouts/AdminLayout"));
function Guard() {
  const user = useAuth((s) => s.user);
  const location = useLocation();
  if (!user)
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  const item = navigationFor(location.pathname);
  if (item && !allowed(user.adminRole, item.roles)) return <Navigate to="/403" replace />;
  return <Outlet />;
}
function Placeholder() {
  return (
    <section className="card">
      <h1>工作台已就绪</h1>
      <p>业务模块将按开发阶段接入真实后端。</p>
    </section>
  );
}
const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    element: <Guard />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Navigate to="/dashboard/overview" replace /> },
          {
            path: "/403",
            element: (
              <div className="state">
                <h1>403 · 无访问权限</h1>
                <p>请使用具备对应权限的账号。</p>
              </div>
            ),
          },
          { path: "/dashboard/:kind", element: <Dashboard /> },
          { path: "/users/qualifications", element: <Qualifications /> },
          { path: "/users", element: <Users /> },
          { path: "/users/:id", element: <Users /> },
          { path: "*", element: <Placeholder /> },
        ],
      },
    ],
  },
]);
export function Router() {
  return (
    <Suspense fallback={<div className="state">正在载入工作台…</div>}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
