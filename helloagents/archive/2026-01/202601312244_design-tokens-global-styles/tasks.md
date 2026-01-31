# 任务清单: design-tokens-global-styles

目录: `helloagents/plan/202601312244_design-tokens-global-styles/`

---

## 任务状态符号说明

| 符号 | 状态 | 说明 |
|------|------|------|
| `[ ]` | pending | 待执行 |
| `[√]` | completed | 已完成 |
| `[X]` | failed | 执行失败 |
| `[-]` | skipped | 已跳过 |
| `[?]` | uncertain | 待确认 |

---

## 执行状态
```yaml
总任务: 8
已完成: 8
完成率: 100%
```

---

## 任务列表

### 1. 全局设计令牌与样式

- [√] 1.1 在 `src/app/globals.css` 中新增设计令牌（颜色/圆角/阴影/间距/动效/布局）
  - 验证: CSS 变量与 UI 指南一致

- [√] 1.2 在 `src/app/globals.css` 中补齐基础排版与容器规则
  - 依赖: 1.1

### 2. 字体与布局

- [√] 2.1 在 `src/app/layout.tsx` 中配置 DM Sans / JetBrains Mono / Silkscreen 并注入变量
  - 验证: 页面字体生效，像素字体仅供点缀类使用

- [√] 2.2 调整 `src/app/page.tsx` 以使用新的基础布局类
  - 依赖: 2.1

### 3. 文档与测试

- [√] 3.1 新增 `docs/design-tokens.md` 输出设计令牌说明与用法

- [√] 3.2 新增主题相关测试（CSS 变量、主题加载、字体回退）
  - 文件: `tests/app/design-tokens.test.ts`

### 4. 知识库同步

- [√] 4.1 更新 `helloagents/modules/_index.md` 并新增 `helloagents/modules/ui-system.md`

- [√] 4.2 更新 `helloagents/CHANGELOG.md` 并在完成后归档方案包

---

## 执行备注

> 执行过程中的重要记录

| 任务 | 状态 | 备注 |
|------|------|------|
