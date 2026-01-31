# 任务清单: security-headers-404-noindex

目录: `helloagents/plan/202601311858_security-headers-404-noindex/`

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

### 1. 安全头与中间件

- [√] 1.1 在 `src/lib/security-headers.ts` 中定义 CSP 构建与安全头清单
  - 验证: 单元测试可读取并校验头部配置

- [√] 1.2 在 `next.config.ts` 中应用全站安全头
  - 依赖: 1.1

- [√] 1.3 新增 `src/middleware.ts` 为分享路由附加 noindex/noarchive 头部

### 2. 分享路由 404 与 noindex

- [√] 2.1 新增 `src/app/share/layout.tsx`，配置 robots meta

- [√] 2.2 新增 `src/app/share/[token]/page.tsx`，无效 token 直接 404

### 3. 测试覆盖

- [√] 3.1 新增安全头配置测试（包含 CSP dev/prod 差异）

- [√] 3.2 新增分享访问失败 404 测试（无效 token）

- [√] 3.3 新增分享 robots meta 测试

### 4. 知识库同步

- [√] 4.1 更新 `helloagents/modules/share.md` 与 `helloagents/CHANGELOG.md`

---

## 执行备注

> 执行过程中的重要记录

| 任务 | 状态 | 备注 |
|------|------|------|
