# UI Design System: Online Clipboard (Paste)

**Version**: 1.0  
**Date**: 2026-02-03

---

## Design Philosophy

**Aesthetic Direction**: **Refined Terminal Elegance**

融合现代编辑器美学与极简主义，创造一个让开发者感到亲切又惊艳的界面。灵感来源于高端代码编辑器（VS Code Dark+、Sublime Monokai）与瑞士平面设计的精准感。

**Core Principles**:

- **功能即美学** - 每个视觉元素都服务于功能
- **克制的戏剧性** - 关键时刻的精心动画，而非处处动效
- **暗色优先** - 对开发者眼睛友好，同时更具现代感
- **代码即主角** - UI退后，让代码内容成为焦点

---

## Share Creation

- 首页主标题为 `Paste`，副标题为“分享文本、代码和文件”。
- 文本和文件的主提交按钮统一为“生成链接”，提交期间显示“正在生成链接…”。
- 两种分享的成功提示和保留的结果卡片统一使用“链接已生成”。
- 有效期统一标为“有效期”，不限制查看或下载次数时统一显示“不限次数”。
- 手机端默认收起“分享设置”，摘要显示有效期、查看或下载次数、密码保护状态；展开和收起不能清空输入。
- 密码无效时保持设置展开，显示具体错误。提交期间禁用设置切换和输入。
- 从 `sm` 断点开始直接展示三列选项，避免桌面用户额外展开。
- 成功卡片展示语言或文件名、服务端到期时间、次数和密码状态，并提供“复制链接”“查看分享”“创建另一条”。
- 到期时间沿用北京时间；永久文本明确显示“永不过期”。摘要不能显示密码正文。
- 关闭成功弹窗后，原链接和规则继续保留；只有“创建另一条”重置表单。
- 文本成功弹窗沿用自动复制；文件分享仍由用户主动复制。

---

## Color System

### Primary Palette (Dark Theme)

```css
:root {
  /* Background Layers */
  --bg-base: #0a0a0b; /* 最深背景 */
  --bg-surface: #121214; /* 卡片/面板背景 */
  --bg-elevated: #1a1a1e; /* 悬浮元素背景 */
  --bg-hover: #252529; /* 悬停状态 */

  /* Text */
  --text-primary: #fafafa; /* 主要文字 */
  --text-secondary: #a1a1aa; /* 次要文字 */
  --text-muted: #71717a; /* 弱化文字 */

  /* Accent - Amber/Gold (区别于常见的紫/蓝) */
  --accent-primary: #f59e0b; /* 主强调色 */
  --accent-hover: #fbbf24; /* 悬停 */
  --accent-muted: #92400e; /* 弱化 */
  --accent-glow: rgba(245, 158, 11, 0.15); /* 发光效果 */

  /* Semantic */
  --success: #22c55e;
  --warning: #eab308;
  --error: #ef4444;
  --info: #3b82f6;

  /* Border */
  --border-subtle: #27272a;
  --border-default: #3f3f46;
  --border-strong: #52525b;
}
```

### Syntax Highlighting Theme

使用 Shiki 的 `vitesse-dark` 或自定义主题，保持与整体配色一致：

```css
/* Code Colors */
--code-keyword: #c792ea; /* 关键字: 柔和紫 */
--code-string: #c3e88d; /* 字符串: 清新绿 */
--code-function: #82aaff; /* 函数: 天蓝 */
--code-comment: #546e7a; /* 注释: 灰蓝 */
--code-number: #f78c6c; /* 数字: 珊瑚橙 */
--code-operator: #89ddff; /* 操作符: 青色 */
```

---

## Typography

### Font Stack

```css
/* Display / Headings - 独特且现代 */
--font-display: "Geist", "SF Pro Display", system-ui;

/* Body / UI - 清晰可读 */
--font-body: "Geist", "SF Pro Text", system-ui;

/* Code / Monospace - 开发者熟悉 */
--font-mono: "Geist Mono", "JetBrains Mono", "Fira Code", monospace;
```

### Type Scale

```css
--text-xs: 0.75rem; /* 12px - 辅助信息 */
--text-sm: 0.875rem; /* 14px - 次要内容 */
--text-base: 1rem; /* 16px - 正文 */
--text-lg: 1.125rem; /* 18px - 强调 */
--text-xl: 1.25rem; /* 20px - 小标题 */
--text-2xl: 1.5rem; /* 24px - 标题 */
--text-3xl: 2rem; /* 32px - 页面标题 */
--text-4xl: 2.5rem; /* 40px - Hero */
```

### Typography Rules

- 行高：正文 1.6，标题 1.2
- 代码块行高：1.7（便于阅读）
- 使用 `font-variant-numeric: tabular-nums` 于数字列
- 标题使用 `text-wrap: balance`

---

## Spacing System

基于 4px 网格：

```css
--space-1: 0.25rem; /* 4px */
--space-2: 0.5rem; /* 8px */
--space-3: 0.75rem; /* 12px */
--space-4: 1rem; /* 16px */
--space-5: 1.25rem; /* 20px */
--space-6: 1.5rem; /* 24px */
--space-8: 2rem; /* 32px */
--space-10: 2.5rem; /* 40px */
--space-12: 3rem; /* 48px */
--space-16: 4rem; /* 64px */
```

---

## Components

### Code Editor Area

```
┌─────────────────────────────────────────────────┐
│  ┌─ Language ─┐  ┌─ Options ─────────────────┐  │
│  │ JavaScript │  │ Password │ Burn │ Expire │  │
│  └────────────┘  └───────────────────────────┘  │
├─────────────────────────────────────────────────┤
│ 1 │ const greeting = "Hello World";            │
│ 2 │                                             │
│ 3 │ function sayHello() {                       │
│ 4 │   console.log(greeting);                    │
│ 5 │ }                                           │
├─────────────────────────────────────────────────┤
│         [ Create Paste ]  ← Accent button       │
└─────────────────────────────────────────────────┘
```

**Specifications**:

- 边框: 1px solid var(--border-subtle)
- 圆角: 12px (外框), 8px (内部元素)
- 行号: var(--text-muted), 右对齐, 固定宽度
- 代码区域: 无边框, 纯色背景
- 焦点状态: 边框变为 var(--accent-primary) + glow

### Buttons

**Primary (CTA)**:

```css
.btn-primary {
  background: var(--accent-primary);
  color: var(--bg-base);
  font-weight: 600;
  padding: var(--space-3) var(--space-6);
  border-radius: 8px;
  transition:
    transform 150ms,
    box-shadow 150ms;
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--accent-glow);
}
```

**Secondary**:

```css
.btn-secondary {
  background: var(--bg-elevated);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}
```

**Ghost**:

```css
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
}
.btn-ghost:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
```

### Cards

```css
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: var(--space-6);
  transition:
    border-color 200ms,
    box-shadow 200ms;
}
.card:hover {
  border-color: var(--border-default);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

### Input Fields

```css
.input {
  background: var(--bg-base);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: var(--space-3) var(--space-4);
  color: var(--text-primary);
  transition:
    border-color 150ms,
    box-shadow 150ms;
}
.input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-glow);
  outline: none;
}
```

---

## Motion & Animation

### Principles

1. **有意义的动效** - 每个动画都传达状态变化
2. **快速响应** - 用户操作的反馈 < 150ms
3. **尊重偏好** - 遵循 `prefers-reduced-motion`
4. **性能优先** - 只动画 transform/opacity

### Timing Functions

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1); /* 快出 - 用于进入 */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1); /* 平滑 - 用于过渡 */
--spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* 弹性 - 用于强调 */
```

### Key Animations

**Page Load - 交错淡入**:

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-in {
  animation: fadeInUp 500ms var(--ease-out) forwards;
}
.animate-in-delay-1 {
  animation-delay: 100ms;
}
.animate-in-delay-2 {
  animation-delay: 200ms;
}
.animate-in-delay-3 {
  animation-delay: 300ms;
}
```

**复制成功反馈**:

```css
@keyframes copySuccess {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
```

**Toast 通知**:

```css
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Layout Patterns

### Main Page Layout

```
┌────────────────────────────────────────────────────────┐
│ HEADER: Logo                          [Admin] [Theme] │
├────────────────────────────────────────────────────────┤
│                                                        │
│                   HERO AREA                            │
│            "Share code, instantly."                    │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│                  CODE EDITOR                           │
│                  (main focus)                          │
│                                                        │
├────────────────────────────────────────────────────────┤
│ FOOTER: Open Source • GitHub • Version               │
└────────────────────────────────────────────────────────┘
```

**Specifications**:

- 最大宽度: 900px (代码区域最佳阅读宽度)
- 水平居中, 两侧 padding: var(--space-6)
- 垂直布局, 自然流动

### Admin Dashboard Layout

```
┌──────┬─────────────────────────────────────────────────┐
│ SIDE │  HEADER: Admin Dashboard            [Logout]   │
│ BAR  ├─────────────────────────────────────────────────┤
│      │                                                 │
│ □ All│  STATS CARDS                                    │
│ □ Act│  ┌────┐ ┌────┐ ┌────┐                          │
│ □ Exp│  │Total│ │Today│ │Active                       │
│      │  └────┘ └────┘ └────┘                          │
│      │                                                 │
│      │  PASTE LIST                                     │
│      │  ┌──────────────────────────────────────────┐  │
│      │  │ ID   │ Lang │ Created │ Status │ Actions│  │
│      │  ├──────────────────────────────────────────┤  │
│      │  │ a1b2 │ JS   │ 2min    │ Active │ 🗑️ 👁️ │  │
│      │  └──────────────────────────────────────────┘  │
└──────┴─────────────────────────────────────────────────┘
```

---

## Icons

使用 **Lucide React** 图标库：

| 场景     | 图标                     |
| -------- | ------------------------ |
| 复制     | `Copy`, `Check` (成功后) |
| 删除     | `Trash2`                 |
| 查看     | `Eye`                    |
| 密码     | `Lock`                   |
| 阅后即焚 | `Flame`                  |
| 过期     | `Clock`                  |
| 设置     | `Settings`               |
| 管理员   | `Shield`                 |
| 语言选择 | `Code2`                  |
| 链接     | `Link`                   |

**Icon Button 规范**:

- 必须有 `aria-label`
- 尺寸: 20x20 (small), 24x24 (default)
- 颜色: var(--text-secondary), hover 时 var(--text-primary)

---

## Responsive Breakpoints

```css
--breakpoint-sm: 640px; /* 手机横屏 */
--breakpoint-md: 768px; /* 平板 */
--breakpoint-lg: 1024px; /* 小桌面 */
--breakpoint-xl: 1280px; /* 大桌面 */
```

**Mobile Adaptations**:

- 代码编辑器全宽
- 选项卡垂直排列
- 减少 padding
- 简化动画

---

## Accessibility Checklist

- [ ] 所有交互元素可键盘访问
- [ ] Focus 状态清晰可见 (`focus-visible:ring-2`)
- [ ] 颜色对比度 >= 4.5:1 (正文), >= 3:1 (大文本)
- [ ] 图标按钮有 `aria-label`
- [ ] 表单控件有关联 `<label>`
- [ ] 尊重 `prefers-reduced-motion`
- [ ] 尊重 `prefers-color-scheme` (Phase 2 支持亮色主题)

---

## File Structure

```
src/
├── app/
│   ├── globals.css          # CSS 变量 + 基础样式
│   ├── page.tsx             # 主页 (粘贴创建)
│   ├── [id]/page.tsx        # 粘贴查看页
│   └── admin/
│       ├── page.tsx         # 管理员登录
│       └── dashboard/page.tsx
├── components/
│   ├── ui/                  # shadcn/ui 组件
│   ├── code-editor.tsx      # 代码输入组件
│   ├── code-viewer.tsx      # 代码显示组件
│   ├── paste-options.tsx    # 选项配置组件
│   └── copy-button.tsx      # 复制按钮组件
└── lib/
    ├── shiki.ts             # Shiki 配置
    └── utils.ts             # 工具函数
```

---

## Third-Party Animation Components

基于对 Magic UI、React Bits、UI Layouts、Aceternity UI 四个库的调研，以下是推荐组件：

https://magicui.design/docs/components
https://reactbits.dev/get-started/index
https://www.ui-layouts.com/components
https://ui.aceternity.com/components

### 核心安装

```bash
# Magic UI 组件 (推荐)
pnpm dlx shadcn@latest add "https://magicui.design/r/terminal"
pnpm dlx shadcn@latest add "https://magicui.design/r/retro-grid"
pnpm dlx shadcn@latest add "https://magicui.design/r/dot-pattern"
pnpm dlx shadcn@latest add "https://magicui.design/r/shimmer-button"
pnpm dlx shadcn@latest add "https://magicui.design/r/blur-fade"
pnpm dlx shadcn@latest add "https://magicui.design/r/border-beam"
pnpm dlx shadcn@latest add "https://magicui.design/r/typing-animation"

# 依赖
pnpm add @number-flow/react
```

### 按功能推荐

| 功能         | 组件             | 来源       | 用途                       |
| ------------ | ---------------- | ---------- | -------------------------- |
| **代码展示** | Terminal         | Magic UI   | 终端风格代码展示，打字动画 |
| **页面背景** | Retro Grid       | Magic UI   | 复古网格背景，终端美学     |
| **页面背景** | Dot Pattern      | Magic UI   | 点阵背景，可渐变遮罩       |
| **主按钮**   | Shimmer Button   | Magic UI   | 光泽流动效果 CTA           |
| **复制反馈** | ClickSpark       | React Bits | 点击火花粒子效果           |
| **复制反馈** | Confetti         | Magic UI   | 成功庆祝动画               |
| **页面动画** | Blur Fade        | Magic UI   | 模糊淡入，页面加载         |
| **边框高亮** | Border Beam      | Magic UI   | 代码块边框光束             |
| **文字动画** | Typing Animation | Magic UI   | 打字机效果                 |
| **标签切换** | Tabs             | UI Layouts | Vercel风格动画标签         |
| **数字动画** | Motion Number    | UI Layouts | 统计数字动画               |
| **卡片效果** | SpotlightCard    | React Bits | 聚光灯悬停卡片             |
| **密码输入** | Password Input   | UI Layouts | 显示/隐藏 + 强度验证       |

### 组件使用场景

#### 主页 (Hero + Editor)

```
┌─────────────────────────────────────────┐
│  [Retro Grid / Dot Pattern 背景]        │
│                                         │
│     [Typing Animation]                  │
│     "Share code, instantly."            │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ [Border Beam 边框高亮]          │    │
│  │                                 │    │
│  │   代码编辑区 (Shiki 高亮)       │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│     [Shimmer Button] Create Paste       │
│                                         │
└─────────────────────────────────────────┘
```

#### 复制按钮交互

```tsx
// 推荐组合：ClickSpark + 状态切换
<ClickSpark>
  <Button onClick={handleCopy}>
    {copied ? <Check /> : <Copy />}
    {copied ? "Copied!" : "Copy"}
  </Button>
</ClickSpark>
```

#### 粘贴成功页面

```tsx
// Confetti 庆祝 + Blur Fade 页面过渡
<BlurFade>
  <SuccessCard>
    <Confetti /> {/* 触发一次 */}
    <p>Your paste is ready!</p>
    <CopyLinkButton />
  </SuccessCard>
</BlurFade>
```

### 性能分级

| 级别    | 组件                                                            | 说明                   |
| ------- | --------------------------------------------------------------- | ---------------------- |
| ✅ 轻量 | Retro Grid, Dot Pattern, Blur Fade, Shimmer Button, Border Beam | 可全局使用             |
| ⚠️ 中等 | ClickSpark, Confetti, Typing Animation                          | 按需加载，限制使用频率 |
| ❌ 避免 | 3D组件, 粒子系统, WebGL背景, Aurora                             | 性能开销大             |

### 安装优先级

**Phase 1 (MVP)**:

1. `retro-grid` - 背景
2. `shimmer-button` - 主按钮
3. `blur-fade` - 页面动画
4. `border-beam` - 代码块高亮

**Phase 2 (增强)**:

1. `typing-animation` - Hero 文字
2. `confetti` - 成功反馈
3. `terminal` - 高级代码展示
4. React Bits `ClickSpark` - 复制反馈

---

_This design system ensures visual consistency while delivering a distinctive, developer-focused aesthetic._

