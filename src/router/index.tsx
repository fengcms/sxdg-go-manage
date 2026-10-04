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
const FormDesigner = lazy(() => import("../pages/FormDesigner"));
const Content = lazy(() => import("../pages/Content"));
const Trade = lazy(() => import("../pages/Trade"));
const Customer = lazy(() => import("../pages/Customer"));
const System = lazy(() => import("../pages/System"));
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
      <h1>404 · 页面不存在</h1>
      <p>请从左侧导航选择功能页面。</p>
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
          { path: "/content/form-templates/:id", element: <FormDesigner /> },
          { path: "/content/:kind", element: <Content /> },
          ...["orders", "refunds", "services", "requirements"].flatMap((kind) => [
            { path: `/${kind}`, element: <Trade /> },
            { path: `/${kind}/:id`, element: <Trade /> },
          ]),
          { path: "/cs/agents", element: <Customer /> },
          { path: "/cs/sessions", element: <Customer /> },
          { path: "/system/:kind", element: <System /> },
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
