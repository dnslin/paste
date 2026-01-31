# ui-system

## 职责
- 提供全局设计令牌（颜色、圆角、阴影、间距、动效）
- 统一基础排版基线与布局容器规范
- 约束像素字体仅用于点缀场景

## 接口定义（可选）
- 设计令牌变量：`src/app/globals.css`
- 字体变量注入：`src/app/layout.tsx`

## 行为规范
- 全局主题仅提供浅色方案（V1）
- 页面使用 `.app-shell` 作为外层容器
- 像素字体仅用于 `.font-pixel` 或特定点缀类

## 依赖关系
- `src/app/globals.css`
- `src/app/layout.tsx`
- `docs/design-tokens.md`
