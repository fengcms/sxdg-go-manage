# 信息架构与导航设计

> 开发状态更新（2026-10-04）：后端 A/B 已交付。下文“待补”及旧能力描述保留为产品裁决上下文，实施时先读 [当前对接补充](api-current.md)，以其中逐项更新为准；首期范围与二期边界不自动扩大。

> 状态：已按开发前审阅裁决修订（v2）
> 创建日期：2026-10-04
> 依赖：[01-permission-model.md](./01-permission-model.md)（§6 单一权限来源表，菜单与按钮的唯一派生来源）

---

## 1. 侧边栏导航结构

后台采用左侧固定侧边栏 + 顶部栏的经典后台布局。侧边栏按功能域分组，权限不足的菜单自动隐藏。

```
┌─────────────────────────────────────────────┐
│  四系点工管理后台          [🔔] [👤 管理员 ▾] │  顶部栏
├──────────┬──────────────────────────────────┤
│          │                                  │
│  📊 看板  │                                  │
│  👥 用户  │           内容区                  │
│  📦 内容  │                                  │
│  🛒 交易  │                                  │
│  💬 客服  │                                  │
│  ⚙️ 系统  │                                  │
│          │                                  │
└──────────┴──────────────────────────────────┘
```

### 1.1 完整菜单树

| 一级菜单 | 二级菜单 | 路由 | 可见角色 |
|---------|---------|------|---------|
| 📊 数据看板 | 运营总览 | `/dashboard/overview` | 全部 |
| | 订单统计 | `/dashboard/orders` | 全部 |
| | 用户统计 | `/dashboard/users` | 全部 |
| | 财务统计 | `/dashboard/finance` | finance / super_admin |
| 👥 用户管理 | 用户列表 | `/users` | 全部 |
| | 资质审核 | `/users/qualifications` | operator / super_admin |
| 📦 内容管理 | 分类体系 | `/content/categories` | operator / super_admin |
| | 热门分类 | `/content/featured-categories` | operator / super_admin |
| | 动态表单模板 | `/content/form-templates` | operator / super_admin |
| | Banner 管理 | `/content/banners` | operator / super_admin |
| | 服务标签 | `/content/service-badges` | operator / super_admin |
| 🛒 交易管理 | 订单列表 | `/orders` | 全部 |
| | 退款审核 | `/refunds` | finance / customer_service / super_admin |
| | 服务管理 | `/services` | 全部 |
| | 需求管理 | `/requirements` | 全部 |
| 💬 客服管理 | 客服账号 | `/cs/agents` | super_admin |
| | 接待会话 | `/cs/sessions` | customer_service / super_admin |
| ⚙️ 系统设置 | 系统配置 | `/system/configs` | super_admin |
| | 信用分规则 | `/system/credit-rules` | super_admin |
| | 服务费配置 | `/system/fee-config` | super_admin |
| | 操作日志 | `/system/audit-logs` | super_admin |

> 「全部」指 operator / finance / customer_service / super_admin 均可访问。
> 服务管理 / 需求管理读取对**全部角色**开放（与后端合同一致，裁决 R17）：菜单对全部角色可见，写入操作按钮按权限渲染（仅 operator / super_admin）。

### 1.2 菜单可见性规则

- 菜单渲染前调用 `hasPermission(role, allowedRoles)`，返回 false 则不渲染
- 一级菜单下所有二级菜单都不可见时，一级菜单也不渲染
- 用户直接访问无权限的 URL → 渲染 403 页面

---

## 2. 页面层级与路由表

### 2.1 路由表

```tsx
// router/index.tsx（节选）
const routes = [
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard/overview" replace /> },
      // 看板
      { path: 'dashboard/overview', element: <OverviewDashboard /> },
      { path: 'dashboard/orders', element: <OrdersDashboard /> },
      { path: 'dashboard/users', element: <UsersDashboard /> },
      { path: 'dashboard/finance', element: <FinanceDashboard />, roles: ['finance'] },
      // 用户
      { path: 'users', element: <UserList /> },
      { path: 'users/:id', element: <UserDetail /> },
      { path: 'users/qualifications', element: <QualificationAudit />, roles: ['operator'] },
      // 内容
      { path: 'content/categories', element: <CategoryTree />, roles: ['operator'] },
      { path: 'content/featured-categories', element: <FeaturedCategories />, roles: ['operator'] },
      { path: 'content/form-templates', element: <FormTemplateList />, roles: ['operator'] },
      { path: 'content/form-templates/:id', element: <FormTemplateEditor />, roles: ['operator'] },
      { path: 'content/banners', element: <BannerList />, roles: ['operator'] },
      { path: 'content/service-badges', element: <ServiceBadgeList />, roles: ['operator'] },
      // 交易
      { path: 'orders', element: <OrderList /> },
      { path: 'orders/:id', element: <OrderDetail /> },
      { path: 'refunds', element: <RefundList />, roles: ['finance', 'customer_service'] },
      { path: 'refunds/:id', element: <RefundDetail />, roles: ['finance', 'customer_service'] },
      { path: 'services', element: <ServiceList /> },
      { path: 'services/:id', element: <ServiceDetail /> },
      { path: 'requirements', element: <RequirementList /> },
      { path: 'requirements/:id', element: <RequirementDetail /> },
      // 客服
      { path: 'cs/agents', element: <CsAgentList />, roles: ['super_admin'] },
      { path: 'cs/sessions', element: <CsSessions />, roles: ['customer_service'] },
      // 系统
      { path: 'system/configs', element: <SystemConfigs />, roles: ['super_admin'] },
      { path: 'system/credit-rules', element: <CreditRules />, roles: ['super_admin'] },
      { path: 'system/fee-config', element: <FeeConfig />, roles: ['super_admin'] },
      { path: 'system/audit-logs', element: <AuditLogs />, roles: ['super_admin'] },
      // 兜底
      { path: '403', element: <ForbiddenPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
```

### 2.2 路由守卫

- 未登录 → 跳 `/login`
- 已登录但 `isAdmin=false` → 提示无后台权限，清除会话跳登录
- 路由声明 `roles` 但当前角色不匹配 → 跳 `/403`
- 登录后默认跳转 `/dashboard/overview`

---

## 3. 顶部栏设计

| 区域 | 内容 |
|------|------|
| 左侧 | 折叠按钮 + 页面标题（根据路由自动更新） |
| 右侧 | 通知铃铛（预留，首期可隐藏） + 管理员头像下拉（个人信息 / 退出登录） |

---

## 4. 列表页通用模式

后台 80% 的页面是列表页，统一遵循以下模式（详见技术栈文档 §9.1）：

```
┌──────────────────────────────────────────────┐
│ 页面标题 + 描述                    [新建 按钮] │  PageHeader
├──────────────────────────────────────────────┤
│ [搜索框] [筛选下拉] [筛选下拉]  [清除筛选]     │  筛选栏（fieldset）
├──────────────────────────────────────────────┤
│                                              │
│            DataTable（分页表格）              │
│                                              │
├──────────────────────────────────────────────┤
│              TablePagination                 │  分页
└──────────────────────────────────────────────┘
```

**统一约定**：
- 分页参数写入 URL `searchParams`，刷新可还原
- 关键词搜索防抖 300ms
- 表格列支持：文本、状态徽标、日期、操作按钮组
- 操作按钮组：查看 / 编辑 / 删除（根据权限渲染）

**筛选与分页真实性约束（裁决 R06，冻结）**：
- 筛选能力以 [api-integration.md](./api-integration.md) v2 冻结的接口参数为准，**后端不支持的筛选一律不渲染控件**（不做前端当前页过滤伪装全量搜索）
- 分页请求参数固定 `page` / `page_size`；分页响应固定 `{ items, total, page, pageSize }`，不做其他形状的全局转换（UI 偏好其他形状时仅在 API adapter 层显式转换）

---

## 5. 详情页通用模式

详情页采用「顶部摘要 + Tab 分区」结构：

```
┌──────────────────────────────────────────────┐
│ [← 返回]  标题（如：订单 #12345）   [操作按钮] │
├──────────────────────────────────────────────┤
│  摘要卡片：关键字段一览（金额、状态、时间）    │
├──────────────────────────────────────────────┤
│ [基本信息] [资质]                             │  Tabs（示例：用户详情首期）
├──────────────────────────────────────────────┤
│                                              │
│              当前 Tab 内容                    │
│                                              │
└──────────────────────────────────────────────┘
```

> Tab 以各模块文档冻结的首期范围为准：用户详情首期仅「基本信息 + 资质」，订单详情首期仅「基本信息」；履约 / 时间轴 / 交易 / 信用 / 发布内容等 Tab 移到二期（裁决 R06），无数据支撑的 Tab 一律不渲染。金额展示取记录自身的费率快照字段，不按当前配置现场重算。

---

## 6. 空/错/加载三态

所有列表页与详情页必须覆盖：

| 状态 | 组件 | 说明 |
|------|------|------|
| 加载中 | `FullPageLoading` 或骨架屏 | 首屏数据拉取时 |
| 错误 | `QueryErrorState`（带重试） | 接口报错 |
| 空数据 | 空状态插画 + 文案 + 引导按钮 | 列表无数据 |

---

## 7. 设计令牌引用

视觉系统严格遵循 [管理后台前端技术栈与UI风格指导.md](../管理后台前端技术栈与UI风格指导.md) §5：
- 色彩：oklch 语义令牌，明暗双套，禁止硬编码色值
- 阴影：`shadow-e1 / e2 / e3` 三级语义
- 圆角：`rounded-lg`（控件）/ `rounded-xl`（卡片）
- 字体：系统字体栈，正文 ≥ 16px
