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

### 一键设置（推荐）

```bash
# 安装依赖
pnpm install

# 运行设置向导（自动生成 .env 配置）
# 可选择: 1) 自己输入密码 或 2) 自动生成密码
pnpm setup

# 初始化数据库
pnpm db:migrate

# 启动开发服务器
pnpm dev
```

访问 http://localhost:3000 即可使用！

> 💡 **遇到问题？** 查看 [快速部署指南](docs/quick-deployment-guide.md) 了解详细说明

### 手动配置

如果需要手动配置环境变量：

```bash
# 复制环境变量模板
cp .env.example .env

# 生成加密密钥
openssl rand -hex 32

# 生成会话密钥
openssl rand -base64 32

# 生成管理员密码哈希
node -e "require('bcryptjs').hash('your-password', 10).then(console.log)"

# 编辑 .env 填入生成的值
# 然后运行数据库迁移
pnpm db:migrate

# 启动服务
pnpm dev
```

📚 详细部署指南请参考 [deployment.md](docs/deployment.md)

## 环境变量

所有环境变量可通过 `pnpm setup` 自动生成。手动配置参考：

| 变量 | 说明 | 生成命令 |
|------|------|----------|
| `ENCRYPTION_KEY` | 64 位 hex (32 字节 AES 密钥) | `openssl rand -hex 32` |
| `SESSION_SECRET` | Admin JWT 签名密钥 | `openssl rand -base64 32` |
| `ADMIN_PASSWORD_HASH` | bcrypt 哈希 (cost=10) | `node -e "require('bcryptjs').hash('password', 10).then(console.log)"` |
| `DATABASE_URL` | 数据库路径 | `file:./data/paste.db` (默认) |

## 命令

```bash
pnpm setup        # 交互式设置向导（生成 .env 配置）
pnpm db:migrate   # 运行数据库迁移
pnpm db:generate  # 生成新的迁移文件
pnpm db:studio    # 打开 Drizzle Studio 数据库管理界面
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

使用 Docker Compose 一键部署（推荐）：

```bash
# 生成配置
pnpm setup

# 启动服务
docker-compose up -d
```

数据库会在容器启动时自动初始化！

📚 **详细部署指南**:
- [快速部署指南](docs/quick-deployment-guide.md) - 3 分钟快速上手
- [完整部署文档](docs/deployment.md) - 包含 Docker、生产环境等详细说明
- [数据库初始化](docs/database-initialization.md) - 数据库相关详细说明

## License

MIT
