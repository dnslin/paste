# PASTE COMPONENTS

核心业务组件：创建和查看 paste。

## STRUCTURE

```
paste/
├── paste-creator.tsx    # 主创建表单 (client, framer-motion)
├── paste-viewer.tsx     # 主查看器 (client, Shiki 高亮)
├── code-editor.tsx      # 代码输入框 (client)
├── code-display.tsx     # 代码高亮、行号与换行 (client)
├── language-selector.tsx # 语言下拉选择 (client)
├── options-panel.tsx    # 密码/过期/阅后即焚选项 (client)
├── paste-access-form.tsx # 显式领取正文与密码验证 (client)
├── use-clipboard.ts     # 复制结果与定时器管理
├── copy-button.tsx      # 复制按钮 (client)
├── success-dialog.tsx   # 创建成功对话框 (client)
└── __tests__/           # 组件测试 (11+7 用例)
```

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| 添加创建选项 | `options-panel.tsx` | PasteOptions 类型定义 |
| 修改高亮主题 | `@/lib/highlight.ts` | 统一 Shiki 高亮入口 |
| 添加语言支持 | `language-selector.tsx` + `@/lib/languages.ts` | 需同步两处 |
| 修改动画 | `success-dialog.tsx` + `app/globals.css` | 业务动效与减少动态效果 |
| 阅后即焚逻辑 | `paste-access-form.tsx` + `@/lib/paste.ts` | 显式 POST 领取；服务端原子消费 |

## CONVENTIONS

- 所有业务交互组件 `'use client'`
- 动画遵守 `prefers-reduced-motion`，复用 `useReducedMotion` 或 `motion-reduce`
- 状态管理用 `useState`，无全局状态库
- API 调用用原生 `fetch`，无 SWR/React Query
- 类型与组件同文件导出（如 `PasteOptions`）

## ANTI-PATTERNS

| 禁止 | 原因 |
|------|------|
| 直接修改 `highlightedHtml` | 必须通过 Shiki 生成 |
| 跳过 `escapeHtml()` | XSS 风险 |
| 在页面 GET 预下发受次数限制正文 | 绕过服务端额度消费 |
| 展示后再由客户端补记次数 | 正文领取与次数扣减必须在同一次服务端事务内 |
