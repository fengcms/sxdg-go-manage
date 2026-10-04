# 管理后台开发计划与排期

> 状态：规划初稿
> 创建日期：2026-10-04
> 技术栈：React 19 + Vite + TS + Tailwind v4 + TanStack Query + RHF/Zod

---

## 1. 开发原则

1. **先骨架后血肉**：先搭建项目基础设施（路由、请求层、权限、布局），再逐个填充业务页面
2. **按角色优先级开发**：super_admin 全功能 → operator 内容运营 → finance 财务 → customer_service 客服
3. **后端接口优先**：开发某个页面前，确认后端接口已实现并可调用；缺失接口列入「需后端补充」清单
4. **每个 Phase 可独立交付**：每个 Phase 结束后 `pnpm build` 通过，可部署预览

---

## 2. Phase 划分

### Phase 0：项目初始化（0.5 天）

**目标**：搭建可运行的项目骨架，通过四门门禁。

**任务**：
- [ ] `pnpm create vite` + React TS 模板，安装技术栈文档 §1 全部依赖
- [ ] 配置 `vite.config.ts`：`@` 别名、`strictPort`、`/api/v1` 与 `/files` 两条代理
- [ ] 配置 Biome + `tsconfig.json`（strict）
- [ ] 建立 `lib/utils.ts` 的 `cn()`
- [ ] 写 `src/index.css`：oklch 令牌 + `@theme inline` + `app-bg` + 三级 elevation
- [ ] 建立 `components/ui/` 原子组件（Button / Input / Textarea / Card / Dialog / Select / Label / Badge / Tabs / Table / Skeleton）
- [ ] 建立 `lib/request/`（core / errors / session / helpers）+ `errorCodes.ts`，含 401 同飞去重
- [ ] 建立 `hooks/useTableQuery.ts` + `hooks/useToast.ts` + `lib/queryClient.ts`
- [ ] 建立 `components/form/FormField.tsx` + 上层字段组件
- [ ] 建立 `components/data/`（DataTable / TablePagination）与 `components/feedback/`（ConfirmDialog / StateShell / FullPageLoading / QueryErrorState）
- [ ] 建立 `layouts/AdminLayout`（三档响应式侧栏）+ `router/`（懒加载 + 守卫）
- [ ] 四门门禁全绿：`pnpm typecheck && pnpm lint && pnpm test && pnpm build`

**交付物**：可运行的空壳后台，登录页 + 空白首页布局。

---

### Phase 1：鉴权与布局（0.5 天）

**目标**：完成登录流程、权限控制、基础布局。

**任务**：
- [ ] 登录页（账号密码登录）
  - `POST /api/v1/auth/login` 提交 account + password（account 支持用户名或手机号）
  - 校验返回的 `isAdmin`，非管理员提示「无后台权限」并清除本地会话
  - 初始账号：admin / Admin.123
- [ ] 会话管理（accessToken 内存存储 + refreshToken 刷新）
- [ ] 启动时 `GET /api/v1/auth/me` 恢复会话
- [ ] `lib/permission.ts` 权限判定函数
- [ ] 路由守卫（未登录跳登录、无权限跳 403）
- [ ] 侧边栏菜单按权限渲染
- [ ] 顶部栏（管理员信息 + 退出登录）
- [ ] 403 / 404 页面

**交付物**：登录 → 进入后台 → 按角色看到不同菜单。

---

### Phase 2：数据看板（1 天）

**目标**：运营/财务/客服登录后能看到平台数据概览。

**任务**：
- [ ] 运营总览页（4 指标卡 + GMV/订单趋势图）
- [ ] 订单统计页（状态分布 + 趋势）
- [ ] 用户统计页（新增/活跃/角色分布）
- [ ] 财务统计页（仅 finance 可见）
- [ ] 时间范围筛选器组件（今日/7天/30天/自定义）
- [ ] 图表组件封装（recharts 折线/柱状/饼图）

**依赖**：后端 `dashboard/*` 4 个接口需可用。

**交付物**：4 个看板页面，数据正常展示。

---

### Phase 3：用户管理（1 天）

**目标**：管理员可查看用户、封禁/解封、审核资质。

**任务**：
- [ ] 用户列表页（筛选 + 表格 + 分页）
- [ ] 用户详情页（摘要 + Tab：基本信息/交易数据/信用记录/资质/发布内容）
- [ ] 封禁/解封操作（二次确认 + 原因）
- [ ] 调整信用分弹窗（仅 super_admin）
- [ ] 资质审核列表页（operator）
- [ ] 资质审核弹窗（证件照片 + 通过/拒绝）

**依赖**：后端 users + qualifications 接口可用。

**交付物**：用户管理全流程。

---

### Phase 4：内容管理（2 天）

**目标**：运营可维护前台所有展示内容。

**任务**：
- [ ] 分类体系页（左侧树 + 右侧编辑面板）
- [ ] 热门分类页（列表 + 添加/移除）
- [ ] 动态表单模板列表页
- [ ] 动态表单模板编辑器（首期 JSON 编辑器，二期可视化）
- [ ] Banner 管理页（列表 + 新建/编辑弹窗）
- [ ] 服务标签页（列表 + 新增/编辑/删除）

**依赖**：后端 categories / form-templates / banners / service-badges 接口可用。

**交付物**：内容管理全部页面。

---

### Phase 5：交易管理（1.5 天）

**目标**：可监控订单、审核退款、管理服务/需求。

**任务**：
- [ ] 订单列表页（多筛选 + 状态徽标）
- [ ] 订单详情页（摘要 + Tab：基本信息/履约记录/状态时间轴/退款/评价）
- [ ] 手动修改订单状态（customer_service，二次确认）
- [ ] 退款列表页（finance / customer_service）
- [ ] 退款详情页（时间线 + 审核操作）
- [ ] 服务管理页（列表 + 详情 + 上下架/删除）
- [ ] 需求管理页（列表 + 详情 + 上下架/删除）

**依赖**：后端 orders / refunds / services / requirements 接口可用。

**交付物**：交易管理全流程。

---

### Phase 6：客服管理（1 天）

**目标**：客服可接待用户咨询。

**任务**：
- [ ] 客服账号管理页（super_admin）
- [ ] 客服工作台（会话列表 + 聊天窗口）
- [ ] 在线状态切换
- [ ] 会话流转
- [ ] 消息发送（文本 + 订单卡片）

**依赖**：后端 cs 接口 + 消息推送方案确认。

**风险**：实时消息推送方案未确认，可能影响工期。

**交付物**：客服接待全流程。

---

### Phase 7：系统设置（0.5 天）

**目标**：super_admin 可调整系统参数与信用分规则。

**任务**：
- [ ] 系统配置页（列表 + 内联编辑 + 二次确认）
- [ ] 信用分规则页（列表 + 分值编辑 + 启用开关）
- [ ] 操作日志页（列表 + 详情抽屉 + JSON diff 展示）

**依赖**：后端 system-configs / credit-rules / audit-logs 接口可用。

**交付物**：系统设置全部页面。

---

## 3. 总工期估算

| Phase | 内容 | 工期 |
|-------|------|------|
| 0 | 项目初始化 | 0.5 天 |
| 1 | 鉴权与布局 | 0.5 天 |
| 2 | 数据看板 | 1 天 |
| 3 | 用户管理 | 1 天 |
| 4 | 内容管理 | 2 天 |
| 5 | 交易管理 | 1.5 天 |
| 6 | 客服管理 | 1 天 |
| 7 | 系统设置 | 0.5 天 |
| **合计** | | **8 天** |

> 估算为单人全职开发，不含联调与测试时间。实际工期视后端接口就绪情况与需求变更调整。

---

## 4. 前置依赖与风险

### 4.1 后端接口依赖

开发前需确认以下后端接口已实现并可调用（建议先跑一次 `scripts/smoke_curl.py` 验证）：

| 模块 | 接口数 | 状态确认 |
|------|--------|---------|
| 鉴权 | 5 | 需确认 |
| 数据看板 | 4 | 需确认 |
| 用户管理 | 7 | 需确认 |
| 分类 | 7 | 需确认 |
| 表单模板 | 6 | 需确认 |
| 服务/需求 | 8 | 需确认 |
| 订单 | 3 | 需确认 |
| 退款 | 4 | 需确认 |
| 客服 | 4 | 需确认 |
| Banner/标签 | 8 | 需确认 |
| 信用规则 | 2 | 需确认 |
| 系统配置 | 2 | 需确认 |
| 操作日志 | 1 | 需确认 |

### 4.2 需后端补充的接口

| 接口 | 用途 | 优先级 |
|------|------|--------|
| 首页频道 home_channels CRUD | 内容管理-频道 | 低（二期） |
| 评价标签 review_tag_options CRUD | 内容管理-评价标签 | 低（二期） |

> 管理员用户名密码登录 + 服务费配置接口已指派给后端开发 AI，见 `sxdg-be/docs/review/admin-login-and-fee-config.md`。

### 4.3 风险项

| 风险 | 影响 | 应对 |
|------|------|------|
| 后端接口未全部就绪 | 阻塞前端开发 | 前端用 mock 数据先行开发，接口就绪后替换 |
| 实时消息推送方案未确认 | 客服模块可能延期 | 客服模块放最后，优先开发其他模块 |
| 动态表单模板可视化编辑器 | 开发量大 | 首期用 JSON 编辑器，二期再做可视化 |
| 管理员账号创建方式未确认 | 登录流程可能调整 | 暂定数据库预置 super_admin，后续按需补充 |

---

## 5. 质量门禁（每个 Phase 提交前）

```bash
pnpm typecheck   # tsc -b --noEmit，0 error
pnpm lint        # biome check .
pnpm test        # vitest run
pnpm build       # tsc -b && vite build
```

**自查清单**：
- [ ] 所有表单字段走 `FormField` 统一外壳
- [ ] 无硬编码色值，全部用语义令牌
- [ ] 阴影使用 `shadow-e1/e2/e3`，无 `shadow-md`
- [ ] 列表页空/错/加载三态齐全
- [ ] 破坏性操作经过 `ConfirmDialog`
- [ ] 权限控制：菜单 + 按钮级隐藏
- [ ] 分页状态写入 URL，刷新可还原
