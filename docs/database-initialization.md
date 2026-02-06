# 数据库初始化说明 / Database Initialization Guide

## 数据库是如何初始化的？ / How is the Database Initialized?

Paste 服务使用 SQLite 数据库，支持三种初始化方式：

The Paste service uses SQLite database and supports three initialization methods:

### 方式 1: 自动初始化（推荐）/ Method 1: Automatic Initialization (Recommended)

当您运行 `pnpm db:migrate` 或启动应用时，数据库会自动初始化：

When you run `pnpm db:migrate` or start the application, the database is automatically initialized:

```bash
pnpm db:migrate
```

**发生了什么？ / What happens?**

1. ✅ 检查 `data/` 目录是否存在，不存在则创建
2. ✅ 创建 `data/paste.db` SQLite 数据库文件
3. ✅ 读取 `drizzle/` 目录中的 SQL 迁移文件
4. ✅ 按顺序执行所有迁移，创建表结构
5. ✅ 启用 WAL 模式以提高并发性能

### 方式 2: 应用启动时自动初始化 / Method 2: Auto-Initialize on App Start

数据库在应用首次访问时自动创建（无需手动运行迁移）：

The database is automatically created when the application is first accessed (no need to manually run migrations):

```bash
pnpm dev
# 或 / or
pnpm start
```

**工作原理 / How it works:**

在 `src/lib/db/index.ts` 中，数据库连接逻辑会：

In `src/lib/db/index.ts`, the database connection logic will:

1. 检查 `data/` 目录，不存在则自动创建
2. 创建数据库文件 `data/paste.db`
3. 设置 WAL 模式和超时参数

**注意：** 这种方式只创建数据库文件，但表结构需要通过迁移创建。推荐先运行 `pnpm db:migrate`。

**Note:** This method only creates the database file, but table structures need to be created through migrations. It's recommended to run `pnpm db:migrate` first.

### 方式 3: Docker 容器自动初始化 / Method 3: Docker Container Auto-Initialize

使用 Docker 部署时，容器启动时会自动运行数据库迁移：

When deploying with Docker, database migrations run automatically on container startup:

```bash
docker-compose up -d
```

**流程 / Process:**

1. Docker 容器启动
2. 运行 `scripts/docker-entrypoint.sh`
3. 检查迁移文件是否存在
4. 自动执行 `scripts/migrate.js`
5. 启动 Next.js 服务器

完全自动化，无需手动操作！

Fully automated, no manual intervention needed!

## 数据库结构 / Database Structure

### Tables

#### `pastes` 表 / `pastes` Table

存储所有 paste 内容：

Stores all paste content:

| 字段 / Field | 类型 / Type | 说明 / Description |
|------------|-----------|------------------|
| `id` | TEXT | 主键，唯一标识符 |
| `content` | TEXT | Paste 内容（加密或明文） |
| `language` | TEXT | 语言类型（默认 plaintext） |
| `password_hash` | TEXT | 密码哈希（可选） |
| `expires_at` | INTEGER | 过期时间戳 |
| `burn_count` | INTEGER | 阅后即焚剩余次数 |
| `created_at` | INTEGER | 创建时间戳 |
| `iv` | TEXT | 加密初始化向量 |
| `encrypted` | INTEGER | 是否加密（0/1） |

#### `password_attempts` 表 / `password_attempts` Table

密码验证尝试记录（防暴力破解）：

Password verification attempts (anti-brute-force):

| 字段 / Field | 类型 / Type | 说明 / Description |
|------------|-----------|------------------|
| `id` | TEXT | 主键 |
| `paste_id` | TEXT | 关联的 Paste ID |
| `ip` | TEXT | 访问 IP 地址 |
| `attempts` | INTEGER | 失败尝试次数 |
| `locked_until` | INTEGER | 锁定截止时间 |

#### `__drizzle_migrations` 表 / `__drizzle_migrations` Table

Drizzle ORM 迁移历史记录（由框架自动管理）：

Drizzle ORM migration history (automatically managed by framework):

用于跟踪已执行的迁移，防止重复执行。

Used to track executed migrations to prevent duplicate execution.

## 迁移文件 / Migration Files

位置 / Location: `drizzle/` 目录

当前迁移 / Current Migrations:

1. **`0000_yielding_micromacro.sql`** - 初始表结构
   - 创建 `pastes` 表
   
2. **`0001_charming_phil_sheldon.sql`** - 密码尝试表
   - 创建 `password_attempts` 表

## 数据库配置 / Database Configuration

### 位置 / Location

```
./data/paste.db       # 主数据库文件
./data/paste.db-wal   # Write-Ahead Log（WAL 模式）
./data/paste.db-shm   # Shared Memory 文件
```

### 特性 / Features

- **WAL 模式**: 启用，提高并发读写性能
- **busy_timeout**: 5000ms，防止锁等待错误
- **文件大小**: 通常 < 100MB（取决于 paste 数量）

### 备份建议 / Backup Recommendations

备份时需要同时复制三个文件：

When backing up, copy all three files together:

```bash
cp data/paste.db data/paste.db-wal data/paste.db-shm /backup/
```

或使用 SQLite 的 backup API：

Or use SQLite's backup API:

```bash
sqlite3 data/paste.db ".backup '/backup/paste_backup.db'"
```

## 重置数据库 / Reset Database

如果需要重新初始化数据库：

If you need to reinitialize the database:

```bash
# 删除数据库文件
rm -rf data/

# 重新运行迁移
pnpm db:migrate
```

**警告：** 这将删除所有数据！/ **Warning:** This will delete all data!

## 常见问题 / FAQ

### Q: 数据库文件在哪里？

**A**: 在项目根目录的 `data/paste.db`。这个目录会自动创建。

### Q: 需要手动创建数据库吗？

**A**: 不需要！运行 `pnpm db:migrate` 或启动应用时会自动创建。

### Q: 如何查看数据库内容？

**A**: 使用 Drizzle Studio 可视化工具：

```bash
pnpm db:studio
```

或使用 SQLite 命令行：

```bash
sqlite3 data/paste.db
sqlite> .tables
sqlite> SELECT * FROM pastes LIMIT 5;
```

### Q: 迁移文件在哪里？

**A**: 在 `drizzle/` 目录，这些是 SQL 文件，由 Drizzle Kit 自动生成。

### Q: 如何添加新表或修改表结构？

**A**: 

1. 修改 `src/lib/db/schema.ts`
2. 运行 `pnpm db:generate` 生成迁移文件
3. 运行 `pnpm db:migrate` 应用迁移

### Q: 多个实例可以共享同一个数据库吗？

**A**: SQLite 是文件数据库，不适合多实例部署。如需多实例，请考虑迁移到 PostgreSQL 或 MySQL。

### Q: WAL 模式有什么好处？

**A**: 

- 提高并发性能（读写可以同时进行）
- 减少锁等待
- 更好的崩溃恢复
- 轻微增加磁盘使用（额外的 -wal 和 -shm 文件）

## 技术细节 / Technical Details

### 数据库连接代码 / Database Connection Code

```typescript
// src/lib/db/index.ts
const dbPath = path.join(process.cwd(), 'data', 'paste.db');
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('busy_timeout = 5000');
const db = drizzle(sqlite, { schema });
```

### 迁移执行代码 / Migration Execution Code

```typescript
// scripts/migrate.js
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
migrate(db, { migrationsFolder: './drizzle' });
```

### Drizzle 配置 / Drizzle Configuration

```typescript
// drizzle.config.ts
export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: { url: './data/paste.db' }
});
```

## 相关文档 / Related Documentation

- [部署指南](./deployment.md) - 完整部署流程
- [Drizzle ORM 文档](https://orm.drizzle.team/) - 官方文档
- [SQLite WAL 模式](https://www.sqlite.org/wal.html) - WAL 模式说明
