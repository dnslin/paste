# 部署指南 / Deployment Guide

本指南详细说明如何部署 Paste 服务，包括本地开发、Docker 部署和生产环境部署。

This guide provides detailed instructions on deploying the Paste service, including local development, Docker deployment, and production environment deployment.

## 目录 / Table of Contents

- [快速开始](#快速开始--quick-start)
- [环境变量配置](#环境变量配置--environment-variables)
- [数据库初始化](#数据库初始化--database-initialization)
- [本地开发部署](#本地开发部署--local-development)
- [Docker 部署](#docker-部署--docker-deployment)
- [生产环境部署](#生产环境部署--production-deployment)
- [常见问题](#常见问题--faq)

## 快速开始 / Quick Start

### 一键设置 / One-Command Setup

使用我们提供的交互式设置脚本，自动生成所有必需的配置：

Use our interactive setup script to automatically generate all required configurations:

```bash
# 1. 克隆仓库 / Clone the repository
git clone https://github.com/dnslin/paste.git
cd paste

# 2. 安装依赖 / Install dependencies
pnpm install

# 3. 运行设置脚本（自动生成 .env 文件）
#    Run setup script (automatically generates .env file)
pnpm setup

# 4. 初始化数据库 / Initialize database
pnpm db:migrate

# 5. 启动服务 / Start the service
pnpm dev
```

就这么简单！现在访问 http://localhost:3000 即可使用。

That's it! Now visit http://localhost:3000 to use the service.

## 环境变量配置 / Environment Variables

### 自动配置（推荐）/ Automatic Configuration (Recommended)

运行 `pnpm setup` 会启动交互式向导，自动生成以下环境变量：

Running `pnpm setup` starts an interactive wizard that automatically generates the following environment variables:

- ✅ `ENCRYPTION_KEY` - 自动生成 64 位十六进制密钥
- ✅ `SESSION_SECRET` - 自动生成会话密钥
- ✅ `ADMIN_PASSWORD_HASH` - 基于您选择的密码（自己输入或自动生成）生成 bcrypt 哈希
- ✅ `DATABASE_URL` - 自动设置为 `file:./data/paste.db`

**密码设置选项 / Password Setup Options:**
1. **自己输入密码 / Enter your own password** - 您可以设置自己记得的密码
2. **自动生成密码 / Auto-generate password** - 系统生成随机强密码

> ⏱️ **密码生成时机**: 在 `pnpm setup` 阶段（部署第 2 步，服务启动**之前**）
> - 原因：服务启动时需要读取 .env 中的密码哈希
> - 使用：访问 /admin 登录时使用原始密码验证
> - 详细说明：参见 [快速部署指南 - 密码生成时机](./quick-deployment-guide.md#密码生成时机说明)

### 手动配置 / Manual Configuration

如果您需要手动配置，可以复制示例文件并编辑：

If you need to configure manually, copy the example file and edit it:

```bash
cp .env.example .env
```

然后生成所需的值：

Then generate the required values:

#### 生成加密密钥 / Generate Encryption Key

```bash
# 使用 OpenSSL
openssl rand -hex 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 生成会话密钥 / Generate Session Secret

```bash
# 使用 OpenSSL
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### 生成管理员密码哈希 / Generate Admin Password Hash

```bash
# 方法 1: 使用 bcryptjs (推荐)
node -e "require('bcryptjs').hash('your-password', 10).then(console.log)"

# 方法 2: 使用 htpasswd
htpasswd -nbBC 10 "" your-password | cut -d: -f2
```

## 数据库初始化 / Database Initialization

### 自动迁移（推荐）/ Automatic Migration (Recommended)

```bash
pnpm db:migrate
```

这个命令会：
1. 自动创建 `data/` 目录
2. 创建 SQLite 数据库文件
3. 运行所有迁移脚本
4. 初始化表结构

This command will:
1. Automatically create the `data/` directory
2. Create the SQLite database file
3. Run all migration scripts
4. Initialize table structures

### 数据库文件说明 / Database File Information

- **位置 / Location**: `./data/paste.db`
- **类型 / Type**: SQLite 3
- **WAL 模式 / WAL Mode**: 启用（提高并发性能）
- **表结构 / Tables**:
  - `pastes` - 存储 paste 内容
  - `password_attempts` - 密码尝试记录（防暴力破解）

### 数据库管理工具 / Database Management

```bash
# 启动 Drizzle Studio（可视化数据库管理）
pnpm db:studio

# 生成新的迁移文件（修改 schema 后）
pnpm db:generate
```

## 本地开发部署 / Local Development

### 开发模式 / Development Mode

```bash
# 启动开发服务器（热重载）
pnpm dev
```

访问 / Visit:
- 主页 / Homepage: http://localhost:3000
- 管理后台 / Admin Dashboard: http://localhost:3000/admin

### 生产模式测试 / Production Mode Testing

```bash
# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

## Docker 部署 / Docker Deployment

### 方式 1: Docker Compose（推荐）/ Method 1: Docker Compose (Recommended)

最简单的部署方式，一条命令完成所有配置：

The simplest deployment method, configure everything with one command:

```bash
# 1. 运行设置脚本生成 .env
pnpm setup

# 2. 启动服务
docker-compose up -d
```

配置说明 / Configuration notes:
- 数据持久化到 Docker volume `paste_data`
- 自动健康检查
- 容器自动重启
- 端口映射: 3000:3000

### 方式 2: 纯 Docker / Method 2: Pure Docker

```bash
# 1. 构建镜像
docker build -t paste:latest .

# 2. 运行容器
docker run -d \
  --name paste \
  -p 3000:3000 \
  -v paste_data:/app/data \
  -e ENCRYPTION_KEY="your-encryption-key" \
  -e SESSION_SECRET="your-session-secret" \
  -e ADMIN_PASSWORD_HASH="your-password-hash" \
  paste:latest
```

### Docker 镜像特点 / Docker Image Features

- ✅ 多阶段构建，优化镜像大小
- ✅ 使用 Alpine Linux（约 150MB）
- ✅ standalone 输出模式
- ✅ 自动数据库初始化
- ✅ WAL 模式启用
- ✅ 健康检查内置

## 生产环境部署 / Production Deployment

### 系统要求 / System Requirements

- Node.js 20+ 或 Docker
- 至少 512MB RAM
- 至少 1GB 磁盘空间（用于数据库和日志）

### 推荐配置 / Recommended Configuration

#### 反向代理（Nginx）/ Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name paste.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### SSL/TLS 配置 / SSL/TLS Configuration

使用 Let's Encrypt 自动获取证书：

Use Let's Encrypt to automatically obtain certificates:

```bash
certbot --nginx -d paste.example.com
```

### 数据备份 / Data Backup

#### 备份脚本 / Backup Script

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup/paste"
DB_PATH="./data/paste.db"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp $DB_PATH $BACKUP_DIR/paste_$DATE.db
cp $DB_PATH-wal $BACKUP_DIR/paste_$DATE.db-wal 2>/dev/null || true
cp $DB_PATH-shm $BACKUP_DIR/paste_$DATE.db-shm 2>/dev/null || true

# 保留最近 30 天的备份
find $BACKUP_DIR -name "paste_*.db" -mtime +30 -delete

echo "✅ 备份完成: paste_$DATE.db"
```

#### 定时备份 / Scheduled Backup

```bash
# 添加到 crontab（每天凌晨 2 点备份）
0 2 * * * /path/to/backup.sh
```

### 监控和日志 / Monitoring and Logs

#### Docker 日志 / Docker Logs

```bash
# 查看实时日志
docker-compose logs -f paste

# 查看最近 100 行
docker-compose logs --tail=100 paste
```

#### 系统监控 / System Monitoring

推荐使用以下工具监控服务：

Recommended tools for monitoring:

- **Uptime Kuma** - 服务可用性监控
- **Grafana + Prometheus** - 性能指标监控
- **Portainer** - Docker 容器管理

### 性能优化 / Performance Optimization

#### 数据库优化 / Database Optimization

```javascript
// 已在 src/lib/db/index.ts 中配置
sqlite.pragma('journal_mode = WAL');  // WAL 模式
sqlite.pragma('busy_timeout = 5000');  // 防止锁等待
```

#### Next.js 优化 / Next.js Optimization

```javascript
// next.config.ts 已配置
output: 'standalone'  // 优化部署大小
```

## 常见问题 / FAQ

### Q1: 数据库迁移失败怎么办？

**A**: 检查以下几点：
1. 确保 `drizzle/` 目录存在且包含迁移文件
2. 确保 `data/` 目录有写入权限
3. 尝试删除数据库文件重新初始化：`rm -rf data/ && pnpm db:migrate`

### Q2: 忘记管理员密码怎么办？

**A**: 重新运行设置脚本生成新密码：
```bash
pnpm setup
```
选择覆盖现有 .env 文件，输入新密码即可。

### Q3: Docker 容器无法访问数据库？

**A**: 确保：
1. Volume 正确挂载：`docker volume inspect paste_data`
2. 容器内 `/app/data` 目录存在
3. 环境变量正确传递到容器

### Q4: 如何迁移数据到新服务器？

**A**: 步骤：
1. 在旧服务器执行备份：`cp -r data/ data_backup/`
2. 将 `data_backup/` 复制到新服务器
3. 在新服务器重命名：`mv data_backup/ data/`
4. 启动服务即可

### Q5: 支持多实例部署吗？

**A**: 当前使用 SQLite，仅支持单实例。多实例部署需要：
1. 迁移到 PostgreSQL/MySQL
2. 使用共享存储（NFS/S3）存储数据库
3. 配置负载均衡器

### Q6: 如何升级到新版本？

**A**: 
```bash
# Docker 方式
docker-compose pull
docker-compose up -d

# 源码方式
git pull
pnpm install
pnpm db:migrate  # 运行新迁移
pnpm build
pm2 restart paste  # 或重启服务
```

### Q7: 数据库文件会自动创建吗？

**A**: 是的！当您：
1. 运行 `pnpm db:migrate` 时
2. 启动服务时（会自动创建目录和数据库）

数据库会自动创建并初始化。不需要手动创建。

## 安全建议 / Security Recommendations

1. ✅ **使用强密码** - 管理员密码至少 12 位，包含大小写字母、数字和特殊字符
2. ✅ **启用 HTTPS** - 生产环境必须使用 SSL/TLS
3. ✅ **定期备份** - 设置自动备份任务
4. ✅ **限制访问** - 使用防火墙限制管理后台访问
5. ✅ **更新依赖** - 定期运行 `pnpm update` 更新依赖
6. ✅ **监控日志** - 定期检查异常访问和错误

## 技术支持 / Support

- 📖 完整文档：[README.md](../README.md)
- 🐛 问题反馈：[GitHub Issues](https://github.com/dnslin/paste/issues)
- 💬 讨论区：[GitHub Discussions](https://github.com/dnslin/paste/discussions)

## 更新日志 / Changelog

### v0.1.0 (当前版本)
- ✅ 交互式设置脚本
- ✅ 自动数据库迁移
- ✅ Docker 一键部署
- ✅ 完整的部署文档
