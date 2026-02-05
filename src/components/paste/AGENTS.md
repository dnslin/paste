# PASTE COMPONENTS

核心业务组件：创建和查看 paste。

## STRUCTURE

```
paste/
├── paste-creator.tsx    # 主创建表单 (client)
├── paste-viewer.tsx     # 主查看器 (client)
├── code-editor.tsx      # 代码输入框
├── code-block.tsx       # 代码展示块
├── language-selector.tsx # 语言下拉选择
├── options-panel.tsx    # 密码/过期/阅后即焚选项
├── password-prompt.tsx  # 密码验证弹窗
├── copy-button.tsx      # 复制按钮
├── success-dialog.tsx   # 创建成功对话框
└── __tests__/           # 组件测试
```

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| 添加创建选项 | `options-panel.tsx` | PasteOptions 类型定义 |
| 修改高亮主题 | `paste-viewer.tsx:79-82` | Shiki codeToHtml 调用 |
| 添加语言支持 | `language-selector.tsx` + `lib/languages.ts` | 需同步两处 |
| 修改动画 | `paste-creator.tsx:16-29` | framer-motion variants |

## CONVENTIONS

- 所有组件都是 `'use client'`（需要交互/状态）
- 动画使用 `prefersReducedMotion()` 检测，提供 `noMotion` 备选
- 状态管理用 `useState`，无全局状态库
- API 调用用原生 `fetch`，无 SWR/React Query

## ANTI-PATTERNS

| 禁止 | 原因 |
|------|------|
| 直接修改 `highlightedHtml` | 必须通过 Shiki 生成 |
| 跳过 `escapeHtml()` | XSS 风险 |
| 移除 `viewRecordedRef` | 会导致重复计数 |
