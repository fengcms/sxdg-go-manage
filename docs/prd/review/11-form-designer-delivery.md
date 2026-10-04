# 表单设计器首期交付

日期：2026-10-04。依据：需求03a、评审10及用户“开始”授权。五阶段各本地提交，不push，不部署线上。

## 已完成

- 无损模板契约：title、展示及扩展属性保留；Field/TabGroup/Wheel分离；Unicode长度、局部标识和深度边界校验。
- 独立编辑工作区：元信息、结构树、属性面板、选项行、增删及同级排序，内部节点ID不进入DSL；只读角色与离开保护。
- 五类字段预览：chips、tags额度和删除、抽屉确认取消、tab和单/多滚轮；预览值不存模板。
- JSON查看/复制/导入、覆盖确认、风险警告确认保存、失败保留、服务端版本提示及克隆改名。
- 浏览器真实后端验收、桌面/390px视觉检查、工具链与核心行为测试。

入口：动态表单列表点击“新建”或“编辑”；财务/客服只能“查看”，运营/超管可保存。后端title已部署本地，本轮没有修改后端代码或迁移。

## 变更文件

`src/lib/template.ts`和`templateEditor.ts`及测试；`src/pages/FormDesigner.tsx`、Content.tsx；`src/components/template/`；`src/components/form/TemplatePreview.tsx`及测试；路由、导航、index.css；`tests/form-designer.spec.ts`与旧admin验收；PRD实施说明和docs/dev-log。

流水：[2026-10-04-form-designer.md](../../dev-log/2026-10-04-form-designer.md)。截图：[桌面](../../dev-log/form-designer-desktop.png)、[窄屏](../../dev-log/form-designer-mobile.png)。

## 验证

```bash
pnpm dev
# http://127.0.0.1:5173/content/form-templates
pnpm check
pnpm exec playwright test tests/form-designer.spec.ts
```

pnpm check包含typecheck、Biome、Vitest和生产构建，全通过；76项单测。新增浏览器4项及原登录/内容回归4项均通过。新增覆盖：无损导入保存/克隆、预览取消确认、网络失败保留、离开保护、纯控件创建与排序、财务及客服只读。

浏览器使用真实HTTP、PostgreSQL、Redis、JWT；外部微信/短信/IM为本地mock。不用前端假响应替代后端验收。浏览器脚本需忽略文件.e2e-accounts.json内的本地四角色凭据；可先用scripts/prepare-e2e.py创建验收账号。请错开密码登录限流窗口，不紧连执行多轮。

## 首期边界

- 小屏纵向排列，同级上下移动；跨层拖拽未纳入首期。
- 小程序尚不支持深层tab展示，设计器保留历史结构并警告，不能创建该组合，不宣称小程序已补齐。
- select近似滚轮；扩展展示属性保留，未全部提供专用编辑及预览逻辑。
- JSON结构错误定位路径，非全量行号定位；没有模板影响面统计。
- 保存前检查版本并提示覆盖风险；后端未提供乐观锁，仍存在检查后的并发窗口。
- 既有草稿及发布快照保持，修改影响后续新建内容选择；没有独立模板发布动作。
- 测试创建本地独立验收记录并保留，不覆盖原业务对象；后续夹具默认停用以避免影响全局回溯。

前四提交：dda8bbb（无损契约）、7b013b3（工作区）、268124d（预览）、7cd388f（JSON保存与选项）；第五提交包含最终验收与本文。无新增依赖，pnpm-lock.yaml运行期间的无关变动未纳入本轮交付。
