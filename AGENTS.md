# PROJECT KNOWLEDGE BASE

**Generated:** 2025-02-05
**Commit:** d984c77
**Branch:** main

## OVERVIEW

Pastebin 服务：Next.js 16 App Router + React 19 + SQLite/Drizzle ORM。支持 Shiki 代码高亮、AES-256-GCM 加密、密码保护、阅后即焚、过期时间。

## STRUCTURE

```
paste/
├── app/                 # Next.js App Router
│   ├── api/pastes/      # Paste CRUD (含 rate-limit)
│   ├── api/admin/       # Admin API (login/stats/manage)
│   ├── admin/           # Admin dashboard (client layout)
│   └── [id]/            # Dynamic paste viewer
├── src/
│   ├── components/
│   │   ├── paste/       # 核心业务组件 (→ 见子目录 AGENTS.md)
│   │   ├── ui/          # shadcn/ui (禁止修改)
│   │   └── admin/       # Admin 组件 (9 个 client components)
│   └── lib/             # 业务逻辑层 (→ 见子目录 AGENTS.md)
│       ├── db/          # Drizzle ORM + SQLite
│       └── admin/       # JWT 会话管理
├── data/                # SQLite 数据库文件
├── drizzle/             # 数据库迁移
└── tests/               # E2E 测试 (待补充)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| 创建 paste | `src/components/paste/paste-creator.tsx` | Client, framer-motion 动画 |
| 查看 paste | `src/components/paste/paste-viewer.tsx` | Shiki 高亮, burn-after-read |
| Paste API | `app/api/pastes/route.ts` | POST 创建, 10 次/分钟限流 |
| 数据库 schema | `src/lib/db/schema.ts` | pastes + passwordAttempts 表 |
| 加密逻辑 | `src/lib/crypto.ts` | AES-256-GCM, 需 ENCRYPTION_KEY |
| Admin 认证 | `src/lib/admin/session.ts` | JWT via jose, 7 天有效期 |
| 路由保护 | `middleware.ts` | /admin/* 拦截 + 登录重定向 |
| 语言列表 | `src/lib/languages.ts` | Shiki 支持的语言 |
| 全局样式 | `app/globals.css` | Tailwind v4 + CSS 变量 |

## CONVENTIONS

**路径别名**: `@/*` → `./src/*`（唯一映射）

**组件模式**:
- Server Component 默认，需交互时加 `'use client'`
- Named exports only（Next.js 页面/layout 除外）
- 动画必须检测 `prefers-reduced-motion`

**API 响应**: `src/lib/api-response.ts` 的 `success()`/`error()` 封装

**样式**: Tailwind v4 + CSS 变量，深色主题，accent `#f59e0b`

**测试**: Vitest + RTL，文件名 `*.test.ts(x)`，就近放置 `__tests__/`

## ANTI-PATTERNS

| 禁止 | 原因 |
|------|------|
| 修改 `src/components/ui/*` | shadcn/ui 组件，升级覆盖 |
| `as any` / `@ts-ignore` | 严格模式，构建拒绝 |
| Barrel imports (`import * from`) | 影响 tree-shaking |
| 串行 await（可并行时） | 性能问题，用 `Promise.all` |
| 3D/粒子/WebGL | 性能开销过大 |
| 跳过 `escapeHtml()` | XSS 风险 |
| 硬编码密钥 | 必须从环境变量读取 |

## UNIQUE STYLES

- **retro-grid**: 背景网格装饰（仅首页）
- **自定义滚动条**: 8px 深色，6px 小尺寸变体
- **Geist 字体**: Sans + Mono 双变量
- **CSS 变量**: `--bg-base`, `--accent-primary`, `--border-subtle`

## COMMANDS

```bash
pnpm dev          # 开发服务器
pnpm build        # 生产构建 (standalone 输出)
pnpm test         # Vitest 测试
pnpm test:watch   # 监听模式
pnpm lint         # ESLint 检查
```

## ENVIRONMENT

必需环境变量（见 `.env.example`）:
- `ENCRYPTION_KEY`: 64 位 hex（32 字节 AES 密钥）
- `SESSION_SECRET`: Admin JWT 签名密钥
- `ADMIN_PASSWORD_HASH`: bcrypt 哈希（cost=10）

## TECH DEBT

| 项目 | 影响 | 优先级 |
|------|------|--------|
| 无 CI/CD | 手动部署 | MEDIUM |
| SQLite 本地 | 不适合多实例 | HIGH |
| 无 API/E2E 测试 | 覆盖不足 | MEDIUM |
| Admin layout 是 client | Bundle 增大 | LOW |

## TESTING

- **框架**: Vitest 4.0 + RTL 16.3 + jsdom
- **覆盖**: 工具库 (4) + 组件 (2)，共 64 用例
- **Mock**: framer-motion → 静态元素，matchMedia → 固定值
- **缺失**: API 路由、E2E、覆盖率报告
