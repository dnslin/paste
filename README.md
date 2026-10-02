# Paste

现代化 Pastebin 服务，支持代码高亮、加密存储、密码保护、阅后即焚。

## 特性

- **代码高亮** - Shiki 语法高亮，支持 100+ 语言
- **服务端加密存储** - AES-256-GCM；服务器持有密钥，管理员可查看内容
- **密码保护** - 可选密码访问控制
- **限制查看次数** - 次数用完后停止公开访问，记录仍保留在后台
- **过期时间** - 支持 5 分钟到永久；过期后停止公开访问
- **管理后台** - JWT 认证的管理界面

## 技术栈

- **框架**: Next.js 16 (App Router) + React 19
- **数据库**: SQLite + Drizzle ORM
- **样式**: Tailwind CSS v4 + shadcn/ui
- **加密**: Node.js crypto (AES-256-GCM)
- **认证**: jose (JWT)

## 快速开始

```bash
# 安装依赖
pnpm install --frozen-lockfile

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入必需变量

# 初始化数据库
pnpm db:migrate

# 启动开发服务器
pnpm dev
```

## 环境变量

### Docker 部署 (推荐)

| 变量 | 说明 | 必需 |
|------|------|------|
| `ADMIN_PASSWORD` | 管理员密码（非纯空白，最多 72 个 UTF-8 字节） | ✅ |

其他密钥 (`ENCRYPTION_KEY`, `SESSION_SECRET`) 首次启动时自动生成并持久化。

### 本地开发

| 变量 | 说明 | 示例 |
|------|------|------|
| `ENCRYPTION_KEY` | 64 位 hex (32 字节 AES 密钥) | `openssl rand -hex 32` |
| `SESSION_SECRET` | Admin JWT 签名密钥 | `openssl rand -base64 32` |
| `ADMIN_PASSWORD_HASH` | bcrypt 哈希 (cost=10) | `node -e "require('bcryptjs').hash('pwd', 10).then(console.log)"` |

## 命令

```bash
pnpm dev          # 开发服务器 (http://localhost:3000)
pnpm build        # 生产构建 (standalone 输出)
pnpm start        # 生产服务器
pnpm test         # 运行测试
pnpm lint         # ESLint 检查
pnpm db:migrate   # 应用 Drizzle 生成的数据库迁移
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
  "expiresIn": 1440,
  "password": "optional",
  "burnAfterRead": null
}
```

### 获取 Paste

```bash
GET /api/pastes/[id]
# GET 只返回状态和元数据；受查看次数限制的页面不会预先下发正文
POST /api/pastes/[id]/verify
Content-Type: application/json

{}
# 密码保护时使用 {"password": "..."}，领取成功才扣减查看次数
```

## 部署

### Docker Compose (推荐)

```bash
# 1. 创建 .env 文件
echo "ADMIN_PASSWORD=your-secure-password" > .env

# 2. 启动服务
docker compose up -d
```

首次启动时自动完成：
- 生成加密密钥 (持久化到 volume)
- 初始化数据库
- 计算密码哈希

应用端口只在 Compose 内部网络开放。公开入口由 Nginx 覆盖客户端传入的 IP/协议头，应用才启用 `TRUST_PROXY=true`。[Nginx 官方代理说明](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

直接运行 `pnpm dev` / `pnpm start` 时，请保持 `TRUST_PROXY=false`。此时忽略所有客户端 IP 头并共享限额：创建 10 次/分钟、管理员登录 5 次/分钟。要按访客 IP 分别限制，需采用上述代理入口。外部 TLS 代理部署请设置 `NEXT_PUBLIC_BASE_URL=https://你的域名`，并按实际入口配置 Nginx，而不是继续信任任意转发链。

创建/验证密码统一限制为 72 个 UTF-8 字节，防止 bcrypt 截断长密码。纯空白密码无效，空字符串表示不设密码。旧版 SHA-256 密码记录不再兼容，需要重新创建分享；已有记录不会被批量删除。

镜像使用固定 pnpm 11.19.0 和 `pnpm-lock.yaml` 安装构建与运行依赖，运行阶段不重新解析版本。[pnpm 官方 Docker 指南](https://pnpm.io/docker)

## License

MIT
