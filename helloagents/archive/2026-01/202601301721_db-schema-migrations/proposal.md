# 变更提案: db-schema-migrations

## 元信息
```yaml
类型: 新功能
方案类型: implementation
优先级: P1
状态: 草稿
创建: 2026-01-30
```

---

## 1. 需求

### 背景
MVP 需要可靠的数据模型与可重复迁移流程，支撑粘贴、附件、分享、配置、会话与审计日志等核心功能落库。

### 目标
- 建立 SQLite + Drizzle 的核心表结构与关系
- 建立可重复执行的迁移流程（空库/已有库均安全）
- 关键查询具备必要索引

### 约束条件
```yaml
时间约束: 无
性能约束: 关键查询具备索引支撑
兼容性约束: SQLite + Drizzle ORM + better-sqlite3
业务约束: 不实现业务逻辑/API；不做数据清理与统计脚本
```

### 验收标准
- [ ] SQLite + Drizzle schema 完整可用
- [ ] 迁移可在空库与已有库上安全执行
- [ ] 关键查询具备索引支撑

---

## 2. 方案

### 技术方案
采用 Drizzle schema 定义所有核心表，使用 drizzle-kit 生成迁移 SQL，并提供迁移执行入口：
- 数据表: pastes / attachments / shares / settings / sessions / audit_logs
- 约束与索引: 过期字段、唯一约束、外键/级联策略、访问与审计查询索引
- 迁移流程: drizzle-kit 生成 SQL + 运行时 migrator（基于 __drizzle_migrations 表），确保可重复执行

关键安全字段：
- paste 正文以 AES-256-GCM 加密存储（ciphertext/iv/tag 分列）
- share token 仅存 hash（不存明文）
- guest 管理密钥仅存 hash

### 影响范围
```yaml
涉及模块:
  - db/schema: 新增核心表与索引
  - db/migrate: 迁移执行入口
  - config: drizzle.config.ts + scripts
预计变更文件: 10-14
```

### 风险评估
| 风险 | 等级 | 应对 |
|------|------|------|
| better-sqlite3 原生依赖编译失败 | 中 | 明确 Node 版本要求，安装失败时提示重试/重新构建 |
| 字段设计与后续业务不一致 | 中 | 基于 PRD 约束，保留可扩展字段（metadata/tags），后续变更走迁移 |
| 迁移对既有库不安全 | 低 | 使用迁移表控制执行次数，严禁重复执行同一版本 |

---

## 3. 技术设计（可选）

> 本次涉及数据模型变更，需要明确核心字段与关系

### 数据模型（草案）

**pastes**
- id (text, PK)
- owner_type (text: admin/guest)
- owner_key_hash (text, nullable; 仅 guest)
- title (text, nullable)
- content_type (text: plain/code/markdown)
- content_ciphertext (blob)
- content_iv (blob)
- content_tag (blob)
- content_size (integer)
- language (text, nullable)
- tags_json (text, nullable)
- is_pinned (boolean)
- created_at / updated_at (integer)
- expires_at (integer, nullable)
- deleted_at (integer, nullable)

索引：created_at、expires_at、owner_type、is_pinned

**attachments**
- id (text, PK)
- paste_id (text, FK -> pastes.id, onDelete: cascade)
- filename (text)
- mime_type (text)
- size (integer)
- storage_path (text)
- sha256 (text, nullable)
- created_at (integer)
- deleted_at (integer, nullable)

索引：paste_id、created_at

**shares**
- id (text, PK)
- paste_id (text, FK -> pastes.id, onDelete: cascade)
- token_hash (text, unique)
- password_hash (text, nullable)
- one_time (boolean)
- expires_at (integer, nullable)
- created_at (integer)
- last_access_at (integer, nullable)
- revoked_at (integer, nullable)

索引：paste_id、expires_at、one_time、revoked_at

**settings**
- key (text, PK)
- value_json (text)
- updated_at (integer)

**sessions**
- id (text, PK)
- subject (text; 固定 admin)
- created_at (integer)
- expires_at (integer)
- last_seen_at (integer, nullable)
- ip (text, nullable)
- user_agent (text, nullable)

索引：expires_at

**audit_logs**
- id (text, PK)
- event_type (text)
- actor_type (text)
- actor_id (text, nullable)
- ip (text, nullable)
- user_agent (text, nullable)
- target_type (text, nullable)
- target_id (text, nullable)
- metadata_json (text, nullable)
- created_at (integer)

索引：created_at、event_type、target_type

---

## 4. 核心场景

### 场景: 迁移执行
**模块**: db/migrate
**条件**: 进程启动或运维脚本触发
**行为**: 检测 __drizzle_migrations，执行未应用的迁移
**结果**: 空库创建表结构；已有库仅应用新增迁移

---

## 5. 技术决策

### db-schema-migrations#D001: 使用 drizzle-kit 生成迁移
**日期**: 2026-01-30
**状态**: ✅采纳
**背景**: 需要可重复、可审计的迁移流程
**选项分析**:
| 选项 | 优点 | 缺点 |
|------|------|------|
| A: drizzle-kit（推荐） | 与 Drizzle 生态一致，生成可追踪 SQL | 需要额外工具与原生依赖 |
| B: 手写 SQL | 依赖少 | 易与 schema 不一致，维护成本高 |
**决策**: 选择方案A
**理由**: 长期维护成本更低，易于与 schema 同步
**影响**: db/schema、drizzle.config.ts、迁移流程
