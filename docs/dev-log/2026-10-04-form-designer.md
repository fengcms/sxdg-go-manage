# 表单设计器开发流水

## 阶段1
- 按用户批准评审实施；后端title已交付，不追加后端接口。
- Zod改looseObject保留原展示与扩展属性，分开TabGroup/Wheel/Field，不再强制小程序子项type。
- Unicode长度用码点计数，key按作用域去重，根panel深度从0起。
- warnings保持可保存风险；深层tab只保留和警告，不假装小程序已支持。
