# 变更日志

## [Unreleased]

## [0.3.0] - 2026-01-31

### 新增
- **[crypto]**: 加密与哈希工具封装（AES-256-GCM、token hash、密码 hash）
  - 方案: [202601311413_crypto-utils](archive/2026-01/202601311413_crypto-utils/)
  - 决策: crypto-utils#D001(HMAC-SHA256), crypto-utils#D002(argon2id+兼容bcrypt)

## [0.2.0] - 2026-01-30

### 新增
- **[db]**: SQLite + Drizzle 核心表结构与迁移流程落地
  - 方案: [202601301721_db-schema-migrations](archive/2026-01/202601301721_db-schema-migrations/)
  - 决策: db-schema-migrations#D001(使用drizzle-kit生成迁移)

## [X.Y.Z] - YYYY-MM-DD

### 新增
- **[{模块名}]**: {变更描述}
  - 方案: [{YYYYMMDDHHMM}_{feature}](archive/{YYYY-MM}/{YYYYMMDDHHMM}_{feature}/)
  - 决策: {feature}#D001({决策摘要})

### 修复
- **[{模块名}]**: {修复描述}
  - 方案: [{YYYYMMDDHHMM}_{fix}](archive/{YYYY-MM}/{YYYYMMDDHHMM}_{fix}/)

### 微调
- **[{模块名}]**: {微调描述}
  - 类型: 微调（无方案包）
  - 文件: {文件路径}:{行号范围}

### 回滚
- **[{模块名}]**: 回滚至 {版本/提交}
  - 原因: {回滚原因}
  - 方案: [{原方案包}](archive/{YYYY-MM}/{原方案包}/)
