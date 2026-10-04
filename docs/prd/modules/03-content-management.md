# 模块三：内容管理

> 开发状态更新（2026-10-04）：后端 A/B 已交付。下文“待补”及旧能力描述保留为产品裁决上下文，实施时先读 [当前对接补充](../api-current.md)，以其中逐项更新为准；首期范围与二期边界不自动扩大。

> 状态：v4（按 [review/06-third-round-decisions.md](../review/06-third-round-decisions.md) T06 裁决修订：分类删除语义冻结「**引用存在即拒绝删除**」（引用检查覆盖全部状态，含历史已下架/已关闭记录）、**维持平铺分页构树、不提供树接口**；v3 依据 [review/04-second-round-decisions.md](../review/04-second-round-decisions.md) S01/S02）
> 创建日期：2026-10-04
> 后端接口：`/api/v1/admin/categories`、`/featured-categories`、`/form-templates`、`/banners`、`/service-badges`
> 契约权威：[api-integration.md §4/§5/§10/§13](../api-integration.md)

内容管理是运营的核心工作区，维护前台展示的所有静态/半静态内容。

---

## 1. 分类体系 `/content/categories`

### 1.1 页面结构

左侧分类树 + 右侧详情编辑面板。

```
┌──────────────┬───────────────────────────────┐
│ 🔍 搜索分类    │  分类详情                       │
│              │                               │
│ ▼ 家政服务     │  名称：[___________]           │
│   ▸ 日常保洁   │  图标：[上传占位]               │
│   ▸ 深度保洁   │  父级：[下拉选择]               │
│   ▸ 开荒保洁   │  排序：[___]                   │
│ ▼ 搬家服务     │  是否首页展示：[开关]            │
│   ▸ 居民搬家   │  是否启用：[开关]               │
│   ▸ 公司搬家   │                               │
│              │  [取消]  [保存]                  │
├──────────────┤                               │
│ [+ 新建分类]   │                               │
└──────────────┴───────────────────────────────┘
```

### 1.2 分类树

- **层级上限三级**（后端 `validateCategory` 约束），到第三级后禁止再新增子分类
- 每个节点显示：图标 + 名称 + 子分类数
- 排序**仅用排序号输入**，不做拖拽排序
- 右键或行内按钮：新增子分类 / 编辑 / 删除

### 1.3 分类数据获取（合同要点）

`GET /api/v1/admin/categories` 返回的是**分页平铺列表，不是分类树**。前端构建树的过程：

1. 循环拉取全部页（`page` / `page_size`），直到取满 `total`
2. 在前端按 **`parentId`**（camelCase，后端 `categories.go` 真实序列化；**不是 `parent_id`**）组装三级树
3. **禁止只用第一页数据构树**（会静默丢分类）

> **后端不提供分类树接口（T06 冻结）**：`GET /categories` 维持平铺分页构树方案，**不新增树接口**；总数上限由 OpenAPI 标注。

### 1.4 分类字段

| 字段 | 说明 |
|------|------|
| 名称 | 必填，**最多 32 字**（后端 `validateCategory` 上限） |
| 图标 | 图片上传，建议 64x64（**依赖 biz_type 白名单扩展 `category`，⏳ 任务单 #8；补齐前上传区显示占位说明，不可上传**） |
| 父级分类 | 下拉选择（不选则为一级；仅能选择一/二级作为父级） |
| 排序号 | 数字输入，越小越靠前 |
| 首页展示 | 开关，控制是否出现在首页分类导航 |
| 启用状态 | 开关，停用后前台不展示 |

### 1.5 删除规则

- 后端当前仅检查**是否存在子分类**，有子分类时禁止删除，提示「请先删除子分类」
- **引用存在即拒绝删除（T06 冻结语义）**：Service / Requirement 引用检查由后端任务单 #7 补齐；**引用检查覆盖全部状态**——含历史**已下架 / 已关闭**记录，不因页面隐藏而漏查；被引用的分类**直接拒绝删除**，提示「该分类仍被服务/需求引用，不可删除」
- #7 引用检查落地前，前端**不做「已引用不可删」的承诺**，删除按钮保留**二次确认**，确认文案提示「该分类可能仍被服务/需求引用，删除后不可恢复」（删除结果以后端实际校验为准）

---

## 2. 热门分类 `/content/featured-categories`

### 2.1 数据模型（聚合入口）

热门分类**不是**「每行一个分类」的关联模型，而是**聚合入口**：每个入口有独立名称，可包含**多个三级分类**：

| 字段 | 说明 |
|------|------|
| `name` | 聚合入口名称（如「热门保洁」） |
| `categoryIds` | 包含的三级分类 ID **数组**（多选） |
| `sortOrder` | 排序号 |
| `isActive` | 是否启用（可选） |

### 2.2 列表

| 列 | 说明 |
|----|------|
| 聚合名称 | 入口名称 |
| 包含分类数 | `categoryIds.length` |
| 排序 | 数字展示 |
| 操作 | 删除（二次确认） |

### 2.3 创建

右上角「新建热门入口」按钮，打开弹窗：

| 字段 | 说明 |
|------|------|
| 名称 | 必填 |
| 包含分类 | 三级分类**多选**选择器（数据来自分类树，仅三级可选） |
| 排序号 | 数字 |
| 启用 | 开关（可选，默认启用） |

**请求体**：`{ "name": "热门保洁", "categoryIds": [12, 15, 18], "sortOrder": 1, "isActive": true }`

### 2.4 首期能力边界

- 首期**仅支持创建 / 删除**
- **修改与排序调整依赖后端 PUT 接口**（⏳ 后端任务单 #7，当前无此路由）；补齐前不提供编辑按钮，**禁止用「删除再创建」模拟更新**

---

## 3. 动态表单模板 `/content/form-templates`

### 3.1 背景

不同服务分类需要不同的服务描述表单字段（如家政需要「房屋面积」，维修需要「设备类型」）。
运营为各分类配置动态表单模板，前台发布时按模板渲染字段。

### 3.2 模板列表

| 列 | 说明 |
|----|------|
| 模板名称 | |
| 关联分类 | 分类路径 |
| 版本号 | 编辑后 version+1 |
| 更新时间 | |
| 状态 | 启用 / 已删除 |
| 操作 | 编辑 / 克隆 / 删除 |

### 3.3 模板编辑器（真实 DSL）

采用后端真实 DSL（与小程序共用同一结构与校验规则）。**首期：JSON 编辑器 + 校验 + 预览**；可视化结构化编辑器方案已设计完成，见 [03a-form-designer.md](./03a-form-designer.md)（结构树 + 属性面板 + 实时预览，JSON 降级为专家模式；实施排期待确认）。

**模板结构**：`blocks: [{ blockId, fields: [{ key, label, type, required, options, maxCustom, panel }] }]`

**字段 `type` 合法值（后端 `validateTemplateResource` 真实枚举，仅 5 种）**：

| type | 说明 | 提交值形态 |
|------|------|-----------|
| `single` | 单选（**必含 `options`**） | 字符串（`options[].value` 之一） |
| `multi` | 多选 | 字符串数组（每个 ∈ `options[].value`） |
| `tags` | 标签选择（预设 `options` + `maxCustom` 个自定义上限） | 字符串数组，自定义标签数 ≤ `maxCustom` |
| `drawer` | 抽屉选择（结构由嵌套属性 `panel` 定义） | 由 `panel.mode` 决定，见下 |
| `wheel` | 滚轮选择（结构由嵌套属性 `panel` 定义） | 由 `panel.mode` 决定，见下 |

> ⚠️ **`panel` 不是独立的字段 type**（S02 修正）：它是 `drawer` / `wheel` 字段的**嵌套属性**（`field.panel`），不存在 `type: "panel"` 的字段——按旧文档创建会被 `validateTemplateResource` 直接拒绝。合法 type 仅 `single / multi / tags / drawer / wheel` 五种。
> 旧规划中基于通用表单控件（单行/多行文本、数字、下拉、图片、日期、时间选择器）的字段类型清单**已作废**。字段属性键为 `key`（非 `field`）。

**`panel` 嵌套结构（drawer / wheel 专用，`service/form.go` 真实定义）**：

| 属性 | 说明 |
|------|------|
| `panel.mode` | 面板类型：`chips` / `tab` / `wheel` |
| `panel.multiple` | `chips` 模式是否多选（布尔） |
| `panel.options` | `chips` 模式的选项数组（`[{value, label}]`） |
| `panel.groups` | `tab` 模式的分组面板（`Field[]`，每个 field 再嵌套自己的 `panel`，递归深度 ≤16） |
| `panel.wheels` | `wheel` 模式的独立滚轮（`Field[]`，每个 field 自带 `options`） |

**`panel` 各 mode 对应的提交值形态**：

| 面板结构 | 提交值形态与示例 |
|---------|-----------------|
| `drawer` + `mode:"chips"`（`multiple:false`） | 单个字符串：`"hourly"` |
| `drawer` + `mode:"chips"`（`multiple:true`） | 字符串数组：`["hourly", "monthly"]` |
| `drawer` + `mode:"tab"` | 对象，键为 `groups[].key`、值为各组子面板的提交值（递归）：`{ "basic": "std_clean", "deep": "kitchen" }` |
| `wheel` + `mode:"wheel"`（`wheels` 仅 1 个） | 单个字符串（该滚轮 `options[].value`）：`"2026-10-06"` |
| `wheel` + `mode:"wheel"`（`wheels` 多个） | 对象，键为 `wheels[].key`、值为各滚轮选中值：`{ "date": "2026-10-06", "time": "14:00" }` |

**完整可用创建示例（`POST /api/v1/admin/form-templates` 请求体，S02 补充）**——含 templateName、categoryId、blocks，单选/多选字段**必含合法 options**：

```json
{
  "templateName": "家政服务描述模板",
  "categoryId": 12,
  "blocks": [
    {
      "blockId": "basic-info",
      "fields": [
        {
          "key": "area",
          "label": "房屋面积",
          "type": "single",
          "required": true,
          "options": [
            { "value": "lt50", "label": "50㎡ 以下" },
            { "value": "50-80", "label": "50-80㎡" },
            { "value": "80-120", "label": "80-120㎡" },
            { "value": "gt120", "label": "120㎡ 以上" }
          ]
        },
        {
          "key": "extras",
          "label": "附加服务",
          "type": "tags",
          "required": false,
          "maxCustom": 2,
          "options": [
            { "value": "window", "label": "擦窗" },
            { "value": "kitchen", "label": "厨房深度清洁" }
          ]
        }
      ]
    },
    {
      "blockId": "schedule",
      "fields": [
        {
          "key": "billing",
          "label": "计费方式",
          "type": "drawer",
          "required": true,
          "panel": {
            "mode": "chips",
            "multiple": false,
            "options": [
              { "value": "hourly", "label": "按小时" },
              { "value": "monthly", "label": "包月" }
            ]
          }
        },
        {
          "key": "appointment",
          "label": "预约时间",
          "type": "wheel",
          "required": true,
          "panel": {
            "mode": "wheel",
            "wheels": [
              {
                "key": "date",
                "label": "日期",
                "type": "single",
                "options": [
                  { "value": "2026-10-06", "label": "10月6日" },
                  { "value": "2026-10-07", "label": "10月7日" }
                ]
              },
              {
                "key": "time",
                "label": "时段",
                "type": "single",
                "options": [
                  { "value": "09:00", "label": "上午 9 点" },
                  { "value": "14:00", "label": "下午 2 点" }
                ]
              }
            ]
          }
        }
      ]
    }
  ]
}
```

该模板对应的一组合法表单提交值（发布服务时）：

```json
{
  "area": "50-80",
  "extras": ["window", "自定义备注"],
  "billing": "hourly",
  "appointment": { "date": "2026-10-06", "time": "14:00" }
}
```

**⚠️ 两套校验，缺一不可（S02 冻结说明）**：「**模板保存成功 ≠ 发布表单可提交**」——

1. **保存校验**（`validateTemplateResource`）：模板名称 1~64 字、字段 key 非空且全局不重复、`type` ∈ 五种合法枚举。它**不校验 options 是否为空**
2. **表单值校验**（`ValidateForm`，发布服务/需求提交时执行）：必填 single/multi 没有 `options` 时**任何非空提交都过不了**（提交值必须 ∈ options），空值又不满足 required——**该模板保存得进、发布用不了**

因此 JSON 编辑器在保存模板时必须**同时跑两套规则**：保存校验通过后，再以「必填单选/多选必含非空 options、drawer/wheel 必含合法 panel」做表单值校验预检，未通过则在编辑器内明确警告「该模板可保存但无法用于发布表单」。

**校验与预览**：校验规则以后端 `service/form.go` / `validateTemplateResource` 为准，前端实现同一规则做提交前校验；预览按小程序渲染逻辑渲染 blocks。

### 3.4 版本管理

- 编辑保存后 `version` 自动 +1
- 支持克隆现有模板快速创建新模板
- 已发布的 Service / Requirement 保留发布时的模板版本快照（不随模板更新而变化）

---

## 4. Banner 管理 `/content/banners`

### 4.1 列表

| 列 | 说明 |
|----|------|
| 预览图 | 缩略图（展示已有 `imageUrl`） |
| 标题 | |
| 跳转类型 | service / requirement / user / url / 无 |
| 排序 | 数字 |
| 生效时间 | start_at ~ end_at，无则长期 |
| 状态 | 启用 / 停用 |
| 操作 | 编辑 / 删除 |

### 4.2 新建/编辑弹窗

| 字段 | 说明 |
|------|------|
| 标题 | 可选 |
| 副标题 | 可选 |
| 图片 | **依赖 biz_type 白名单扩展 `banner`（⏳ 后端任务单 #8）**；补齐前上传区显示占位说明「图片上传能力待后端支持（任务单 #8）」，不可上传；已保存 Banner 的 imageUrl 正常展示 |
| 跳转类型 | 下拉：无 / 服务详情 / 需求详情 / 用户主页 / 外部链接 |
| 跳转目标 | 根据类型动态显示输入框 |
| 排序号 | 数字 |
| 生效时间 | 日期范围选择（可选，不选则长期展示） |
| 启用 | 开关 |

> Banner 请求体字段以 [api-integration.md §10](../api-integration.md) v2 为准。

---

## 5. 服务标签 `/content/service-badges`

### 5.1 说明

服务标签是 Service 上展示的能力徽标（如「持证上岗」「5 年经验」「响应快」），运营维护可选标签池，服务者发布时从中选择。

### 5.2 列表与编辑

| 列 | 说明 |
|----|------|
| 标签名称 | 编辑可改 |
| 排序 | 数字 |
| 启用 | 开关 |
| 操作 | 删除 |

右上角「新增标签」按钮。

**新增/更新请求体**：`{ "name": "持证上岗", "sortOrder": 1, "isActive": true }`（`isActive` 可选）。

---

## 6. 后端接口契约摘要（对齐 api-integration.md v4）

### 分类

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/categories` | **分页平铺列表**（非树），前端拉全部分页后构树 |
| POST | `/api/v1/admin/categories` | 创建（最多三级，名称 ≤32 字） |
| PUT | `/api/v1/admin/categories/:id` | 更新 |
| DELETE | `/api/v1/admin/categories/:id` | 删除（后端当前仅检查子分类；**T06 冻结：引用存在即拒绝删除**，引用检查覆盖**全部状态**（含历史已下架/已关闭记录），⏳ 任务单 #7 补齐） |

### 热门分类

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/featured-categories` | 聚合入口列表 |
| POST | `/api/v1/admin/featured-categories` | 创建，Body：`{ name, categoryIds: [...], sortOrder, isActive? }`（**categoryIds 是数组**） |
| DELETE | `/api/v1/admin/featured-categories/:id` | 删除 |
| PUT | `/api/v1/admin/featured-categories/:id` | ⏳ 任务单 #7，**当前无此路由**；补齐前首期只做创建/删除 |

### 表单模板

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/form-templates` | 列表 |
| POST | `/api/v1/admin/form-templates` | 新建 |
| GET | `/api/v1/admin/form-templates/:id` | 详情 |
| PUT | `/api/v1/admin/form-templates/:id` | 编辑（version+1） |
| DELETE | `/api/v1/admin/form-templates/:id` | 软删除 |
| POST | `/api/v1/admin/form-templates/:id/clone` | 克隆 |

> 模板结构为真实 blocks DSL（见 §3.3），非法结构直接被后端拒绝。

### Banner

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/banners` | 列表 |
| POST | `/api/v1/admin/banners` | 创建 |
| PUT | `/api/v1/admin/banners/:id` | 更新 |
| DELETE | `/api/v1/admin/banners/:id` | 删除 |

> Banner 图片上传依赖 biz_type 扩展（⏳ 任务单 #8），补齐前图片上传不可用。

### 服务标签

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/service-badges` | 列表 |
| POST | `/api/v1/admin/service-badges` | 新增，Body：`{ name, sortOrder, isActive? }` |
| PUT | `/api/v1/admin/service-badges/:id` | 更新 |
| DELETE | `/api/v1/admin/service-badges/:id` | 删除 |

---

## 7. 通用交互约定

1. **列表即操作**：所有列表页的「新建」「编辑」使用弹窗或抽屉，不跳新页面（除表单模板编辑器）
2. **图片上传**：统一走 `POST /api/v1/upload`，multipart 字段名为 `file`（单文件）/ `files`（批量，同名重复）；**响应使用服务端返回的 `{ fileId, fileUrl }`**，附件一律使用服务端返回的 fileUrl，不手工拼路径
3. **biz_type 白名单**：当前仅允许 `avatar` / `background` / `cover` / `detail` / `checkin` / `review` / `cert`；`banner` / `category` 待后端扩展（⏳ 任务单 #8），补齐前对应上传入口显示占位说明、不可用
4. **开关即时保存**：启用/停用开关点击后立即调用更新接口，成功后 toast 提示，失败回滚开关状态（例外：信用规则模块统一走编辑→二次确认→保存，见模块六）
5. **排序**：统一用数字输入，不做拖拽
6. **删除二次确认**：所有删除操作必须经过 `ConfirmDialog`
