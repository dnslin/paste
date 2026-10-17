# Paste

现代化 Pastebin 服务，支持代码高亮、加密存储、密码保护、阅后即焚。

## 特性

- **代码高亮** - Shiki 语法高亮，支持 100+ 语言
- **服务端加密存储** - AES-256-GCM；服务器持有密钥，管理员可查看内容
- **密码保护** - 可选密码访问控制
- **限制查看次数** - 次数用完后停止公开访问，记录仍保留在后台
- **过期时间** - 支持 5 分钟到永久；过期后停止公开访问
- **管理后台** - JWT 认证的管理界面
- **文件分享** - 单文件最大 10 MiB，支持文本、PDF、PNG/JPEG/GIF/WebP 和 ZIP；加密存储、密码和下载次数限制

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

### 文件分享

首页切换到“文件”，选择或拖入文件后创建分享。文件默认一天到期，最长七天，支持可选密码和 1、3、5、10 次下载限制。文本文件需为 UTF-8 编码；ZIP 仅作为附件下载，不解压。零字节文本文件也可分享。

```text
POST /api/files                         multipart/form-data
  file, password?, expiresIn?, downloadLimit?（off / 1 / 3 / 5 / 10）
GET  /api/files/:id                      仅元数据，不领取文件
POST /api/files/:id/download             JSON {"password":"..."} 或 {}
GET  /f/:id                             文件接收页
GET  /api/admin/files?page=1&limit=15     管理员文件记录与真实占用
DELETE /api/admin/files/:id              停止访问并清理文件
POST /api/admin/files/cleanup            管理员手动清理失效文件
```

只有显式 POST 下载会扣减次数，密码错误、文件缺失或完整性校验失败不计次。服务器批准发送后，网络中断也可能消耗一次。不支持 Range 或断点续传。密码保护的文件在成功验证前不公开名称和大小。

文件使用 AES-256-GCM 保存到 `data/files`，服务器持有密钥，属于服务端加密。文件名不作为磁盘路径。所有文件强制以附件发送，不在线预览或执行。文件类型检查不是病毒扫描，服务不承诺文件无恶意内容。[OWASP 文件上传指南](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)

文件上传独立限制为每来源 3 次/分钟，下载为 10 次/分钟。全实例同时最多上传 2 个、下载 4 个，文件目录上限 1 GiB，保留 100 MiB 磁盘空闲余量。总请求体最多 11 MiB，读取总时限 120 秒；这些限制同时在应用内检查，伪造或省略 Content-Length 不能绕过。当前实现适用于单 Node 实例及本地持久化卷。

启动时补跑清理，此后每五分钟清理到期、次数耗尽和删除失败的文件。停止访问立即生效，磁盘回收可能因停机或 IO 错误延迟。后台可查看状态并重试；只有文件已移除或原本不存在时才移除记录。启动还会扫描崩溃遗留的临时和孤立文件；已识别但删除失败的孤立文件会重试，目录扫描本身失败需修复原因后重启补跑。清理日志前缀为 `[file-cleanup]`。

升级前备份整个 `data` 卷，升级启动先应用迁移。备份和恢复时需同时保留数据库、`files` 目录及加密密钥（Docker 中为 `.secrets`），否则文件无法解密。在线过期不会删除既有备份；备份保留期由运维设置，普通删除不承诺擦除 SSD 或快照中的副本。

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
