# 快速部署指南 / Quick Deployment Guide

> 针对部署便利性、密码生成和数据库初始化问题的完整解决方案

## 🎯 三个问题的解决方案

### 问题 1: 部署不方便
**之前**: 需要手动复制 .env，运行多个 openssl 命令，手动生成密码哈希
**现在**: 一个命令搞定 👇

```bash
pnpm setup
```

这个交互式向导会：
- ✅ 自动生成 64 位加密密钥（ENCRYPTION_KEY）
- ✅ 自动生成会话密钥（SESSION_SECRET）
- ✅ 让您选择自己输入密码或自动生成随机密码
- ✅ 基于密码生成管理员密码哈希（ADMIN_PASSWORD_HASH）
- ✅ 自动创建 .env 文件
- ✅ 显示配置摘要

**⏱️ 密码生成时机**: 在 `pnpm setup` 阶段（服务启动**之前**）
- 原因：服务启动时需要读取 .env 中的密码哈希
- 使用：在访问 /admin 登录时使用原始密码验证

### 问题 2: 密码生成繁琐
**之前**: 需要手动运行 `openssl rand -hex 32`、`openssl rand -base64 32` 和 `node -e "require('bcryptjs').hash(...)"`

**现在**: `pnpm setup` 全部搞定！您可以选择：
- 选项 1: 自己输入密码（需要至少 8 个字符）
- 选项 2: 让系统生成随机密码

### 问题 3: 数据库初始化不清楚
**之前**: 需要手动运行 `pnpm drizzle-kit push`，不知道数据库在哪里、如何创建

**现在**: 
```bash
pnpm db:migrate
```

这个命令会：
- ✅ 自动创建 `data/` 目录
- ✅ 创建 `data/paste.db` SQLite 数据库
- ✅ 运行所有迁移文件，初始化表结构
- ✅ 启用 WAL 模式（提高性能）

**更详细的说明**: 请查看 [数据库初始化文档](./database-initialization.md)

## 🚀 完整部署流程（3 分钟搞定）

### 本地开发部署

```bash
# 1. 克隆项目
git clone https://github.com/dnslin/paste.git
cd paste

# 2. 安装依赖
pnpm install

# 3. 运行设置向导（生成 .env）
pnpm setup
# 输入管理员密码，例如: admin123456

# 4. 初始化数据库
pnpm db:migrate

# 5. 启动服务
pnpm dev
```

✅ 完成！访问 http://localhost:3000

### Docker 部署（最简单）

```bash
# 1. 克隆项目
git clone https://github.com/dnslin/paste.git
cd paste

# 2. 生成环境变量
pnpm install
pnpm setup

# 3. 启动 Docker 容器（自动初始化数据库）
docker-compose up -d
```

✅ 完成！访问 http://localhost:3000

**注意**: Docker 容器启动时会自动运行数据库迁移，无需手动初始化！

### 生产环境部署

详细步骤请参考 [完整部署指南](./deployment.md)

## 📚 新增的命令

| 命令 | 说明 |
|-----|------|
| `pnpm setup` | 交互式设置向导，生成 .env 配置 |
| `pnpm db:migrate` | 运行数据库迁移，初始化数据库 |
| `pnpm db:generate` | 生成新的迁移文件（修改 schema 后） |
| `pnpm db:studio` | 打开 Drizzle Studio 数据库管理界面 |

## 🎨 新增的脚本

| 脚本 | 位置 | 说明 |
|-----|-----|------|
| 设置向导 | `scripts/setup.js` | 自动生成环境变量 |
| 数据库迁移 | `scripts/migrate.js` | 运行数据库迁移 |
| Docker 入口点 | `scripts/docker-entrypoint.sh` | Docker 容器启动脚本 |

详细说明请查看 [scripts/README.md](../scripts/README.md)

## 📖 新增的文档

| 文档 | 说明 |
|-----|------|
| [deployment.md](./deployment.md) | 完整的部署指南（本地、Docker、生产环境） |
| [database-initialization.md](./database-initialization.md) | 数据库初始化详细说明 |
| [scripts/README.md](../scripts/README.md) | 脚本使用说明 |

## 🔒 安全说明

- ✅ 所有密钥都是自动生成的，加密强度高
- ✅ 管理员密码使用 bcrypt 哈希（cost=10）
- ✅ 加密密钥是 32 字节（256 位）AES 密钥
- ✅ .env 文件已在 .gitignore 中排除，不会被提交到仓库

## 💡 常见问题

### Q1: 我已经有 .env 文件了，运行 `pnpm setup` 会覆盖吗？

**A**: 会提示您是否覆盖。如果选择 "N"（或直接回车），则不会覆盖。

### Q2: 忘记管理员密码怎么办？

**A**: 重新运行 `pnpm setup`，选择覆盖 .env 文件，输入新密码即可。

### Q3: 数据库文件会被提交到 Git 仓库吗？

**A**: 不会。`data/` 目录和所有 `.db` 文件都已在 .gitignore 中排除。

### Q4: Docker 部署时需要手动初始化数据库吗？

**A**: 不需要。Docker 容器启动时会自动运行数据库迁移。

### Q5: 数据库文件在哪里？

**A**: 在项目根目录的 `data/paste.db`。这个目录会自动创建。

### Q6: 如何查看数据库内容？

**A**: 运行 `pnpm db:studio`，会打开一个可视化的数据库管理界面。

### Q7: 如何备份数据库？

**A**: 复制整个 `data/` 目录即可：
```bash
cp -r data/ backup_$(date +%Y%m%d)/
```

## 🎉 总结

通过这次改进，部署 Paste 服务变得非常简单：

**之前**: 7 个手动步骤， 容易出错
```bash
1. cp .env.example .env
2. openssl rand -hex 32  # 手动复制到 .env
3. openssl rand -base64 32  # 手动复制到 .env
4. node -e "require('bcryptjs').hash('password', 10).then(console.log)"  # 手动复制
5. 编辑 .env 填入上面的值
6. pnpm drizzle-kit push
7. pnpm dev
```

**现在**: 3 个命令，全自动
```bash
1. pnpm setup      # 自动生成所有配置
2. pnpm db:migrate  # 自动初始化数据库
3. pnpm dev        # 启动服务
```

节省 70% 的部署时间！🚀

## 📞 需要帮助？

- 📖 查看 [完整部署指南](./deployment.md)
- 📖 查看 [数据库初始化文档](./database-initialization.md)
- 🐛 [报告问题](https://github.com/dnslin/paste/issues)
- 💬 [讨论区](https://github.com/dnslin/paste/discussions)

## ⏱️ 密码生成时机说明

很多用户问："密码生成阶段是什么时候？"

### 密码生成发生在部署的第 2 步

```bash
1. pnpm install          # 安装依赖
2. pnpm setup            # 🔐 密码在这里生成/设置！
3. pnpm db:migrate       # 初始化数据库  
4. pnpm dev              # 启动服务
```

### 为什么在 setup 阶段生成密码？

**必须在服务启动前设置密码，原因：**
1. 服务启动时会读取 `.env` 中的 `ADMIN_PASSWORD_HASH`
2. Admin 登录验证需要这个哈希值
3. 如果没有密码哈希，无法使用管理后台

### 密码生成流程

```
运行 pnpm setup 时：

1. 选择密码方式 
   ├─ 选项 1: 自己输入密码（需要确认）
   └─ 选项 2: 自动生成随机密码

2. 获取密码
   ├─ 选项 1: 用户输入 "mypassword123"
   └─ 选项 2: 系统生成 "xR8pL3mN5tQ2vW7k"

3. 生成密码哈希
   使用 bcrypt (cost=10) 生成哈希
   
4. 保存到 .env
   ADMIN_PASSWORD_HASH=$2b$10$...
```

### 密码使用时机

- **生成**: `pnpm setup` 时（T2 阶段）
- **存储**: `.env` 文件中（密码哈希）
- **使用**: 访问 `/admin` 登录时（T5 阶段）
- **验证**: 输入密码 → bcrypt验证 → 与哈希对比

### 常见问题

**Q: 如果忘记密码怎么办？**
```bash
pnpm setup  # 重新运行，选择覆盖 .env
```

**Q: 可以在服务运行后修改密码吗？**
```bash
# 需要重启服务
1. 停止服务 (Ctrl+C)
2. pnpm setup (重新设置密码)
3. pnpm dev (重启服务)
```

**Q: 为什么不在首次访问 /admin 时设置密码？**

安全原因：
- ✅ 部署阶段设置，只有部署者知道密码
- ❌ 首次访问设置，任何人都可能抢先设置
- ✅ 更符合生产环境安全实践

**Q: 密码存在哪里？**
- 原始密码：用户自己保存（或自动生成时显示一次）
- 密码哈希：存储在 `.env` 文件的 `ADMIN_PASSWORD_HASH`
- 注意：`.env` 不会被提交到 git


## ⏱️ 密码生成时机说明

很多用户问："密码生成阶段是什么时候？"

### 密码生成发生在部署的第 2 步

```bash
1. pnpm install          # 安装依赖
2. pnpm setup            # 🔐 密码在这里生成/设置！
3. pnpm db:migrate       # 初始化数据库  
4. pnpm dev              # 启动服务
```

### 为什么在 setup 阶段生成密码？

**必须在服务启动前设置密码，原因：**
1. 服务启动时会读取 `.env` 中的 `ADMIN_PASSWORD_HASH`
2. Admin 登录验证需要这个哈希值
3. 如果没有密码哈希，无法使用管理后台

### 密码生成流程

```
运行 pnpm setup 时：

1. 选择密码方式 
   ├─ 选项 1: 自己输入密码（需要确认）
   └─ 选项 2: 自动生成随机密码

2. 获取密码
   ├─ 选项 1: 用户输入 "mypassword123"
   └─ 选项 2: 系统生成 "xR8pL3mN5tQ2vW7k"

3. 生成密码哈希
   使用 bcrypt (cost=10) 生成哈希
   
4. 保存到 .env
   ADMIN_PASSWORD_HASH=$2b$10$...
```

### 密码使用时机

- **生成**: `pnpm setup` 时（部署第 2 步）
- **存储**: `.env` 文件中（密码哈希）
- **使用**: 访问 `/admin` 登录时
- **验证**: 输入密码 → bcrypt验证 → 与哈希对比

### 常见问题

**Q: 如果忘记密码怎么办？**
```bash
pnpm setup  # 重新运行，选择覆盖 .env
```

**Q: 可以在服务运行后修改密码吗？**
```bash
# 需要重启服务
1. 停止服务 (Ctrl+C)
2. pnpm setup (重新设置密码)
3. pnpm dev (重启服务)
```

**Q: 为什么不在首次访问 /admin 时设置密码？**

安全原因：
- ✅ 部署阶段设置，只有部署者知道密码
- ❌ 首次访问设置，任何人都可能抢先设置
- ✅ 更符合生产环境安全实践

**Q: 密码存在哪里？**
- 原始密码：用户自己保存（或自动生成时显示一次）
- 密码哈希：存储在 `.env` 文件的 `ADMIN_PASSWORD_HASH`
- 注意：`.env` 不会被提交到 git
