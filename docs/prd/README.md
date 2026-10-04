# 四系点工 · 管理后台规划文档

> 开发状态更新（2026-10-04）：后端 A/B 已交付。下文“待补”及旧能力描述保留为产品裁决上下文，实施时先读 [当前对接补充](api-current.md)，以其中逐项更新为准；首期范围与二期边界不自动扩大。

> 本目录（`docs/prd/`）专门存放「四系点工管理后台」的产品设计文档；技术参考文档《管理后台前端技术栈与UI风格指导.md》位于上级 `docs/` 目录。
> 创建日期：2026-10-04

---

## 文档索引

### 总体规划

| 文档 | 说明 |
|------|------|
| [00-overview.md](./00-overview.md) | 管理后台总体规划：产品定位、用户角色、功能总览、技术栈、首期范围冻结 |
| [01-permission-model.md](./01-permission-model.md) | 权限模型与鉴权方案：4 种角色权限矩阵、前端权限实现、登录流程、单一权限来源表 |
| [02-information-architecture.md](./02-information-architecture.md) | 信息架构与导航设计：侧边栏菜单、路由表、列表/详情页通用模式 |

### 审阅与裁决

| 文档 | 说明 |
|------|------|
| [review/01-pre-development-review.md](./review/01-pre-development-review.md) | 开发前审阅：19 项问题（14 项 P1 / 5 项 P2） |
| [review/02-pre-development-decisions.md](./review/02-pre-development-decisions.md) | 产品裁决与修订依据：决策表 + 首期范围冻结 |

### 功能模块设计

| 文档 | 说明 |
|------|------|
| [modules/01-dashboard.md](./modules/01-dashboard.md) | 数据看板：运营总览、订单统计、用户统计、财务统计 |
| [modules/02-user-management.md](./modules/02-user-management.md) | 用户管理：用户列表/详情、封禁解封、信用分调整、资质审核 |
| [modules/03-content-management.md](./modules/03-content-management.md) | 内容管理：分类体系、热门分类、动态表单模板、Banner、服务标签 |
| [modules/03a-form-designer.md](./modules/03a-form-designer.md) | 动态表单模板设计器方案（结构树 + 属性面板 + 预览，模块三 §3.3 实施级） |
| [modules/04-order-refund.md](./modules/04-order-refund.md) | 订单与退款：订单列表/详情、手动改状态、退款审核、服务/需求管理 |
| [modules/05-customer-service.md](./modules/05-customer-service.md) | 客服管理：客服账号、接待工作台、会话流转 |
| [modules/06-system-config.md](./modules/06-system-config.md) | 系统配置：系统参数、信用分规则、服务费配置 |
| [modules/07-audit-log.md](./modules/07-audit-log.md) | 操作日志：审计日志列表与详情 |

### 技术对接

| 文档 | 说明 |
|------|------|
| [api-integration.md](./api-integration.md) | 前后端接口对接合同 v2（唯一权威） |
| [管理后台前端技术栈与UI风格指导.md](../管理后台前端技术栈与UI风格指导.md) | 参考文档（来自已有项目；与后端合同冲突时以 api-integration.md 为准） |
| [development-plan.md](./development-plan.md) | 开发计划与排期：8 个 Phase、分阶段总排期（含联调与验收）、验收矩阵 |

---

## 快速导航

- 想了解后台做什么 → [00-overview.md](./00-overview.md)
- 想了解谁能做什么 → [01-permission-model.md](./01-permission-model.md)
- 想了解页面结构 → [02-information-architecture.md](./02-information-architecture.md)
- 想了解某个功能模块 → `modules/` 目录
- 想了解审阅结论与产品裁决 → `review/` 目录
- 想开始开发 → [development-plan.md](./development-plan.md)

---

## 后端参考文档

- [api-spec.md](../../../sxdg-be/docs/api-spec.md) — 后端接口清单（权威）
- [enums.md](../../../sxdg-be/docs/enums.md) — 状态枚举（权威）
- [schema.md](../../../sxdg-be/docs/schema.md) — 数据库表结构（权威）
- [architecture.md](../../../sxdg-be/docs/architecture.md) — 后端架构
- [admin-backend-supplement-tasks.md](../../../sxdg-be/docs/review/admin-backend-supplement-tasks.md) — 后端补充任务单（#1~#9，前端依赖项排期依据）
