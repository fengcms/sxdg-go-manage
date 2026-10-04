# 动态表单模板设计器方案（模块三增补）

> 状态：v2（用户批准评审调整后，首期已实现，2026-10-04）
> 创建日期：2026-10-04
> 隶属：[03-content-management.md](./03-content-management.md) §3.3 的实施级方案
> 依据事实：后端 [form.go](../../../../sxdg-be/internal/service/form.go)（DSL 与 ValidateForm）、[admin_validate.go:120](../../../../sxdg-be/internal/service/admin_validate.go#L120)（保存校验）；小程序 [BlockRenderer.tsx](../../../../sxdg-wechat-app-h5/miniapp/src/components/DynamicBlock/BlockRenderer.tsx)；管理后台现状 [template.ts](../../../src/lib/template.ts) / Content.tsx（纯 JSON 文本编辑）
> 契约边界：**不修改后端已冻结的 DSL 与两套校验**，方案全部在前端实现层

---

## 1. 问题与目标

现状：表单模板的 `blocks` 在管理后台是一个 JSON 文本字段（Content.tsx），保存前跑 [parseTemplate](../../../src/lib/template.ts) 校验。

维护人员视角的三大痛点：
1. **结构不可视**：5 种字段类型 + panel 递归（chips/tab/wheel，最深 16 层）只能靠脑补 JSON 结构
2. **错误发现晚**：key 重复、选项 value 重复、panel 缺失等错误要保存时才暴露
3. **无用户视角预览**：改完模板无法知道小程序上用户实际看到什么

目标：**零 JSON 心智**的结构化维护界面 + **所见即所得**的预览 + 保留 JSON 逃生通道（存量导入/专家场景）。

## 2. 方案选型

| 候选 | 评估 | 结论 |
|------|------|------|
| A. 自由拖拽画布设计器（form.io/formily 类） | 功能最强，但本项目 DSL 是**冻结的固定结构**（仅 5 种 type + 固定 panel 形态），画布自由度无用武之地；引入重库成本 1~2 周起 | ❌ 过度工程 |
| B. 结构化分块编辑器（结构树 + 属性面板 + 预览） | 与固定 DSL 精确匹配：每种 type 一个专用属性表单，panel 递归编辑天然映射树形结构；错误校验前置到输入时 | ✅ **采纳为主模式** |
| C. 增强 JSON 编辑器（Monaco + 校验） | 成本最低但仍是 JSON 心智，痛点只解决一半 | ⚠️ 降级为辅助：JSON 查看/导入 |

## 3. 界面设计（三栏）

```
┌────────────┬──────────────────────┬────────────────┐
│ 结构树      │ 实时预览（用户视角）    │ 属性面板        │
│ ├ Block 1  │ ┌──────────────────┐ │ key        [f1] │
│ │ ├ 单选:服务 │ │ 服务类型          │ │ label  [服务类型]│
│ │ ├ 抽屉:地址 │ │ ○上门 ○到店       │ │ required  [✓]  │
│ │ │ └ tab分组 │ │ 地址 ▸ 点击选择    │ │ type      [single]│
│ │ └ 标签:技能 │ └──────────────────┘ │ options:       │
│ └ Block 2  │  （可交互：点抽屉会弹出） │ ├ 上门    [删]  │
│ [+Block]   │                      │ └ 到店    [删]  │
└────────────┴──────────────────────┴────────────────┘
```

- **左栏 · 结构树**：block → field → panel 嵌套（chips 选项 / tab 分组 / wheel 滚轮逐级展开）；拖拽排序（block 间、field 间、选项间）；增删节点；当前选中高亮
- **中栏 · 实时预览**：按小程序 [BlockRenderer](../../../../sxdg-wechat-app-h5/miniapp/src/components/DynamicBlock/BlockRenderer.tsx) 的分发逻辑用 React 复刻用户视角——single/multi=chips 单选/多选、tags=可输入标签、drawer=启动器+弹出面板、wheel=滚轮 picker；**可交互体验**（点击弹出抽屉/滚轮），但值不保存
- **右栏 · 属性面板**：按选中节点类型动态渲染（RHF + Zod），见 §4

### 双模式切换

- **设计模式（默认）**：上述三栏
- **JSON 模式**：只读美化展示 + 「复制 JSON」+「从 JSON 导入」（粘贴 → 全量跑 parseTemplate → 错误行级提示 → 覆盖确认弹窗）
- 切回设计模式时**以设计模式数据为准**（JSON 模式不做双向实时编辑，规避双向同步复杂度）；导入成功后进入设计模式

## 4. 五种字段类型的属性面板

| type | 属性面板内容 | 结构约束（UI 前置） |
|------|-------------|-------------------|
| single | 通用属性 + 选项列表 | 必填且无选项 → 黄色警告「可确认保存，可能无法填写或提交」（对齐 parseTemplate 语义：warning 不阻塞保存） |
| multi | 同 single（多选语义自动） | 同上 |
| tags | 选项列表 + `maxCustom` 数字 | maxCustom ≥0 整数 |
| drawer | panel 编辑器：mode 单选（chips/tab）→ chips=扁平选项列表（multiple 开关）；tab=分组列表（每组递归子 panel 编辑器，可再嵌 tab/chips） | 缺 panel → 警告「无法用于发布」；嵌套深度 >16 → 拒绝新增子面板（对齐后端 validatePanel） |
| wheel | panel 编辑器：mode=wheel → 滚轮列表（每轮 = 一组选项；单滚轮=提交单值，多滚轮=提交对象，UI 标注该差异） | 同上 |

**通用属性**：key（保存后不建议改，旁标注「发布快照按 key 校验，改 key 需同步检查服务端」）、label、required。

**即时校验**（输入时，不等保存）：key 重复红字、选项 value 重复红字、label/key 非空、value ≤100 字符、选项 value/label 长度上限。

### 三个自研编辑组件（可复用）

1. `OptionListEditor`：value/label 行编辑、增删、上下移、去重提示——复用于 single/multi/tags 的 options、panel.options
2. `PanelEditor`：递归组件，按 mode 渲染 chips/tab/wheel 三种子形态，深度限 16
3. `FieldCard`：结构树节点卡片（类型图标 + label + required 标记 + 错误/警告角标）

不引入第三方 form builder 库：固定 DSL + 三个组件 ≈ 3~4 天工作量，低于集成/驯服 formily 的成本，且无依赖风险。

## 5. 保存与发布语义

- **保存**：设计模式数据序列化 blocks → `parseTemplate`（errors 阻塞 / warnings 放行但列在确认弹窗）→ 走现有 `PUT /admin/form-templates/:id`，后端 `version` 单调 ++（[admin_validate.go:140](../../../../sxdg-be/internal/service/admin_validate.go#L137)），前端展示新版本号
- **快照说明**：编辑页固定提示「已创建草稿及已发布内容保留原模板快照；修改模板影响后续新建内容，不回填既有快照」（依据 listing_actions.go 发布时拍 FormTemplateSnapshot）
- **克隆**：后端已有 `CloneTemplate`（listing_actions.go:80），列表页加「克隆」动作按钮（弹窗改名后创建）——低成本高价值，纳入本期
- **发布预检**（可选按钮）：保存成功后提示「此模板将影响 N 个进行中/可发布服务的后续发布」——首期仅展示模板自身的 warnings，不做服务影响面统计（需后端聚合，列入二期）

## 6. 实现拆解（React 19 + Tailwind v4 + RHF/Zod）

| 阶段 | 内容 |
|------|------|
| 1 | DSL 状态模型：`TemplateEditorState`（blocks 树 + 选中节点 + 校验结果派生），序列化/反序列化与 parseTemplate 共用 [template.ts](../../../src/lib/template.ts) 的类型 |
| 2 | 三栏骨架 + 结构树（拖拽用 @dnd-kit 或原生 HTML5 DnD，取更轻者） |
| 3 | 属性面板：三组件 + 即时校验 |
| 4 | 预览：React 复刻五形态（drawer 弹层、wheel picker 用原生 select 降级或简易滚轮） |
| 5 | JSON 模式：查看/复制/导入（导入复用 parseTemplate）+ 覆盖确认 |
| 6 | 列表页克隆按钮 + 保存确认弹窗（warnings 摘要） |

约束：所有新组件遵守项目规范（箭头函数、无内联样式、pnpm）。

## 7. 二期增强（不承诺排期）

- 模板版本间 diff（version 对比视图）
- JSON Schema 导出（供小程序端做 TS 类型校验）
- 服务影响面统计（引用该模板的服务列表）

## 8. panel.title（后端与管理后台均已交付）

后端任务#11已实现可选title、64 rune保存校验及中文OpenAPI，无新增表迁移。模板保存原始JSON，不存在“缺少类型定义必然导致持久化丢标题”的结论。

管理后台已补title类型与可视化输入，解析和序列化保留展示及扩展属性。新建空标题省略属性；存量显式空字符串原样保留，与小程序nullish回退有区别。

## 9. 首期实际交付与评审调整

依据：[评审与计划](../review/10-form-designer-review-and-plan.md)、用户实施确认，以及[开发交付](../review/11-form-designer-delivery.md)。前文方案中尚未落实或不准确的范围以下列说明为准：

- 独立模板工作区 `/content/form-templates/new` 与 `/content/form-templates/:id`；列表新建/编辑跳转，查看权限支持财务/客服，写权限仅运营/超管。
- 三栏在桌面展示，小屏纵向排列；首期同级上移/下移排序，不做跨层拖拽。
- TabGroup/Wheel独立类型，不强制子项有type；原始扩展属性无损保存，未提供专用控件的属性可通过JSON导入维护。
- 错误阻止保存，警告确认后可保存；警告不能当作真实发布预检结果。
- 预览支持小程序当前可用的chips/wheel/tab组合，滚轮以select近似交互；深层tab存量保留且警告，不新增此展示能力，不改小程序。
- 面板深度按根panel=0，最大16；key按顶层全局、子组/子轮局部作用域校验。
- JSON语法及结构错误给解析说明或路径，不承诺所有错误行号。
- 并发版本变化提示覆盖风险，后端无乐观锁，不承诺完全阻止并发覆盖。
- 保存失败保留内容，克隆可改名，版本使用服务端返回值。首期不增加模板“发布”动作或影响面统计接口。
