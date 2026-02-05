# PROJECT KNOWLEDGE BASE

**Generated:** 2025-02-05
**Commit:** b990124
**Branch:** main

## OVERVIEW

Pastebin 服务：Next.js 16 App Router + React 19 + SQLite/Drizzle ORM。支持代码高亮、密码保护、阅后即焚、过期时间。

## STRUCTURE

```
paste/
├── app/                 # Next.js App Router (pages + API routes)
│   ├── api/pastes/      # Paste CRUD API
│   ├── api/admin/       # Admin API (login/stats/manage)
│   ├── admin/           # Admin dashboard pages
│   └── [id]/            # Dynamic paste viewer
├── src/
│   ├── components/
│   │   ├── paste/       # Core business components (creator/viewer)
│   │   ├── ui/          # shadcn/ui (DO NOT MODIFY)
│   │   └── admin/       # Admin dashboard components
│   └── lib/             # All utilities and business logic
│       ├── db/          # Drizzle ORM + SQLite schema
│       ├── admin/       # Admin session/auth utils
│       ├── utils.ts     # shadcn cn() utility
│       ├── languages.ts # Shiki supported languages
│       └── *.ts         # crypto, nanoid, rate-limit, api-response
├── data/                # SQLite database file
└── drizzle/             # Database migrations
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| 创建 paste | `src/components/paste/paste-creator.tsx` | Client component, framer-motion |
| 查看 paste | `src/components/paste/paste-viewer.tsx` | Shiki 高亮, burn-after-read |
| Paste API | `app/api/pastes/route.ts` | POST 创建, 含 rate-limit |
| 数据库 schema | `src/lib/db/schema.ts` | pastes + passwordAttempts 表 |
| 加密逻辑 | `src/lib/crypto.ts` | AES-256-GCM, 需 ENCRYPTION_KEY |
| Admin 认证 | `src/lib/admin/session.ts` | JWT via jose, 需 SESSION_SECRET |
| 路由保护 | `middleware.ts` | /admin/* 路由拦截 |
| 语言列表 | `src/lib/languages.ts` | Shiki 支持的语言 |

## CONVENTIONS

**路径别名**: `@/*` 映射到 `./src/*`（单一映射，如 `@/lib/*`、`@/components/*`）

**组件模式**:
- Server Component 默认，需交互时加 `'use client'`
- Named exports only（禁止 default export）
- 动画必须支持 `prefers-reduced-motion`

**API 响应**: 使用 `src/lib/api-response.ts` 的 `success()`/`error()` 封装

**样式**: Tailwind v4 + CSS 变量（见 `app/globals.css`），深色主题，accent 色 `#f59e0b`

## ANTI-PATTERNS (THIS PROJECT)

| 禁止 | 原因 |
|------|------|
| 修改 `src/components/ui/*` | shadcn/ui 组件，升级会覆盖 |
| `as any` / `@ts-ignore` | 严格模式，PR 检查会拒绝 |
| Barrel imports (`import * from`) | 影响 tree-shaking |
| 串行 await（可并行时） | 性能问题 |
| 3D/粒子/WebGL 组件 | 性能开销过大 |

## UNIQUE STYLES

- **retro-grid**: 背景装饰网格（`app/globals.css`）
- **自定义滚动条**: 8px 宽深色滚动条
- **Geist 字体**: Sans + Mono 双字体变量

## COMMANDS

```bash
pnpm dev          # 开发服务器
pnpm build        # 生产构建
pnpm test         # 运行测试 (vitest)
pnpm lint         # ESLint 检查
```

## ENVIRONMENT

必需环境变量（见 `.env.example`）:
- `ENCRYPTION_KEY`: 64 位 hex（32 字节 AES 密钥）
- `SESSION_SECRET`: Admin JWT 签名密钥
- `ADMIN_PASSWORD_HASH`: bcrypt 哈希的管理员密码

## NOTES

- **无 CI/CD**: 手动部署，无 GitHub Actions
- **SQLite 本地**: 不适合多实例，生产考虑迁移 PostgreSQL
- **测试覆盖**: 工具库 + 组件测试，无 API/E2E 测试
