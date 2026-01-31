# 设计令牌（Design Tokens）

**风格定位**：日系像素复古 · 中度像素浓度 · 圆润现代

此文档描述全局设计令牌，作为后续页面与组件的统一基线。

---

## 1. 颜色（Color）

### 主色调
- 背景：`--ui-bg` = `#FAF9F7`
- 背景（浅米）：`--ui-bg-muted` = `#F5F3EF`
- 表面：`--ui-surface` = `#FFFFFF`
- 主文字：`--ui-ink` = `#2D2D2D`
- 次文字：`--ui-ink-muted` = `#6B6560`
- 边框：`--ui-border` = `#E8E6E3`

### 功能色
- 主操作：`--ui-primary` = `#5BA3A0`
- 成功：`--ui-success` = `#7EB89E`
- 警告：`--ui-warning` = `#E8A87C`
- 危险：`--ui-danger` = `#D4726A`
- 信息/链接：`--ui-info` = `#9B8EC2`

### 像素点缀色
- `--ui-pixel-sun` = `#F9D56E`
- `--ui-pixel-brick` = `#C75C5C`
- `--ui-pixel-mist` = `#A8D8D8`

### 代码区域
- 背景：`--ui-code-bg` = `#282C34`
- 前景：`--ui-code-ink` = `#ABB2BF`

---

## 2. 圆角（Radius）

- 大容器：`--radius-lg` = `16px`
- 中容器：`--radius-md` = `10px`
- 小元素：`--radius-sm` = `6px`

---

## 3. 阴影（Shadow）

- `--shadow-sm`：轻微抬升
- `--shadow-md`：卡片悬浮
- `--shadow-hover`：hover 强化

---

## 4. 间距与布局（Spacing & Layout）

### 基准单位
- 4px 网格：`--space-1` = 4px

### 常用间距
- `--space-2`=8px, `--space-4`=16px, `--space-6`=24px, `--space-7`=32px

### 页面边距
- 移动端：`--page-padding-mobile` = 24px
- 桌面端：`--page-padding-desktop` = 48px

### 内容宽度
- 阅读宽度：`--content-max` = 720px
- 列表宽度：`--content-max-wide` = 960px

---

## 5. 字体（Typography）

### 正文
- `--font-body`：DM Sans + 中文系统字体回退

### 代码
- `--font-mono-stack`：JetBrains Mono

### 像素字体（仅点缀）
- `--font-pixel`：Silkscreen
- 规则：只用于 Logo/标签/空状态等小面积场景，禁止全局替换正文

---

## 6. 动效（Motion）

- 快速：`--motion-fast` = 150ms
- 标准：`--motion-base` = 250ms
- 缓动：`--motion-ease` = ease-out

---

## 7. 使用示例

```css
.app-shell {
  padding: var(--page-padding-mobile);
  background: var(--ui-bg);
}

.card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
```

---

## 8. 像素点缀规范

- 像素字体仅用于点缀场景（品牌标识、小标签、徽章）
- 主体内容保持现代清晰排版
- 像素图标/装饰可使用像素点缀色
