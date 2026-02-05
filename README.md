# Paste

现代化 Pastebin 服务，支持代码高亮、加密存储、密码保护、阅后即焚。

## 特性

- **代码高亮** - Shiki 语法高亮，支持 100+ 语言
- **端到端加密** - AES-256-GCM 加密存储
- **密码保护** - 可选密码访问控制
- **阅后即焚** - 查看后自动销毁
- **过期时间** - 支持 1 小时到永久
- **管理后台** - JWT 认证的管理界面

## 技术栈

- **框架**: Next.js 16 (App Router) + React 19
- **数据库**: SQLite + Drizzle ORM
- **样式**: Tailwind CSS v4 + shadcn/ui
- **加密**: Web Crypto API (AES-256-GCM)
- **认证**: jose (JWT)

## 快速开始

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入必需变量

# 初始化数据库
pnpm drizzle-kit push

# 启动开发服务器
pnpm dev
```

## 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `ENCRYPTION_KEY` | 64 位 hex (32 字节 AES 密钥) | `openssl rand -hex 32` |
| `SESSION_SECRET` | Admin JWT 签名密钥 | 任意强密码 |
| `ADMIN_PASSWORD_HASH` | bcrypt 哈希 (cost=10) | `htpasswd -nbBC 10 "" password` |

## 命令

```bash
pnpm dev          # 开发服务器 (http://localhost:3000)
pnpm build        # 生产构建 (standalone 输出)
pnpm start        # 生产服务器
pnpm test         # 运行测试
pnpm lint         # ESLint 检查
```

## 项目结构

```
├── app/                 # Next.js App Router
│   ├── api/             # API 路由
│   ├── admin/           # 管理后台
│   └── [id]/            # Paste 查看页
├── src/
│   ├── components/      # React 组件
│   │   ├── paste/       # 核心业务组件
│   │   ├── admin/       # 管理后台组件
│   │   └── ui/          # shadcn/ui 基础组件
│   └── lib/             # 工具库
│       ├── db/          # 数据库层
│       └── admin/       # 认证工具
└── drizzle/             # 数据库迁移
```

## API

### 创建 Paste

```bash
POST /api/pastes
Content-Type: application/json

{
  "content": "console.log('hello')",
  "language": "javascript",
  "expiresIn": "1d",
  "password": "optional",
  "burnAfterRead": false
}
```

### 获取 Paste

```bash
GET /api/pastes/[id]
# 如有密码保护，需先验证
POST /api/pastes/[id]/verify
```

## 部署

项目配置为 `standalone` 输出模式，适合 Docker 部署：

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY .next/standalone ./
COPY .next/static ./.next/static
COPY public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

## License

MIT
