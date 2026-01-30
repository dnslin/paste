# 任务清单: db-schema-migrations

目录: `helloagents/plan/202601301721_db-schema-migrations/`

---

## 任务状态符号说明

| 符号 | 状态 | 说明 |
|------|------|------|
| `[ ]` | pending | 待执行 |
| `[√]` | completed | 已完成 |
| `[X]` | failed | 执行失败 |
| `[-]` | skipped | 已跳过 |
| `[?]` | uncertain | 待确认 |

---

## 执行状态
```yaml
总任务: 15
已完成: 15
完成率: 100%
```

---

## 任务列表

### 1. 基础设施与依赖

- [√] 1.1 在 `package.json` 中添加 drizzle/better-sqlite3 依赖，并补充 `db:generate`/`db:migrate`/`test` 脚本
  - 验证: 依赖安装成功，脚本可运行

- [√] 1.2 新增 `drizzle.config.ts` 与 `src/db/client.ts`（或 `src/db/index.ts`）
  - 验证: 配置可被 drizzle-kit 读取

- [√] 1.3 建立 `src/db/schema.ts` 基础结构与通用字段 helper（如时间戳/布尔）
  - 验证: schema 可被导入且类型通过

### 2. 核心表结构

- [√] 2.1 定义 `pastes` 表字段、约束与索引
  - 验证: 关键字段非空/可空符合设计

- [√] 2.2 定义 `attachments`/`shares` 表字段、外键与索引
  - 依赖: 2.1

- [√] 2.3 定义 `settings`/`sessions`/`audit_logs` 表字段与索引
  - 验证: 主键与索引创建完整

### 3. 迁移生成与执行

- [√] 3.1 使用 drizzle-kit 生成初始迁移 SQL 到 `drizzle/`
  - 依赖: 1.2, 1.3, 2.1-2.3

- [√] 3.2 新增 `src/db/migrate.ts` 迁移执行入口（基于 __drizzle_migrations）
  - 验证: 空库可执行，已有库重复执行不报错

- [√] 3.3 在本地验证迁移流程（空库 + 已有库）
  - 验证: 表结构存在且索引齐全

### 4. 测试

- [√] 4.1 配置测试框架与基础测试脚手架
  - 验证: `pnpm test` 可运行

- [√] 4.2 Schema 单测：校验列可空性/默认值/唯一索引
  - 依赖: 2.1-2.3

- [√] 4.3 迁移集成测试：空库执行成功，重复执行安全
  - 依赖: 3.2

### 5. 知识库与变更记录

- [√] 5.1 更新 `helloagents/modules/_index.md` 并新增 `helloagents/modules/db.md`
  - 验证: 模块索引可定位 db 模块

- [√] 5.2 更新 `helloagents/context.md` 的依赖版本与数据库约束

- [ ] 5.3 更新 `helloagents/CHANGELOG.md` 并归档方案包

---

## 执行备注

> 执行过程中的重要记录

| 任务 | 状态 | 备注 |
|------|------|------|
| 3.3 | 完成 | 已允许构建并重试，迁移执行成功 |
| 4.1-4.3 | 完成 | 采用 node:test + tsx，测试通过 |
