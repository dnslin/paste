# db 模块

## 职责
- 定义 SQLite 数据表结构与索引（Drizzle schema）
- 提供数据库连接与查询入口
- 提供迁移执行入口与迁移文件管理

## 接口定义（可选）
- `db`: 通过 `src/db/client.ts` 导出的 Drizzle 实例
- 迁移入口: `pnpm db:migrate`（执行 `src/db/migrate.ts`）

## 行为规范
- 数据表结构的修改必须通过 Drizzle schema 与迁移文件同步更新
- 迁移文件统一存放在 `drizzle/` 目录
- 迁移执行必须可重复（依赖 `__drizzle_migrations` 表）

## 依赖关系
- 依赖: better-sqlite3, drizzle-orm, drizzle-kit
- 上游: 无
- 下游: auth / paste / attachment / share / guest / admin-console
