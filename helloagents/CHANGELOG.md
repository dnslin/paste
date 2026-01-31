# 变更日志

## [Unreleased]

## [0.4.2] - 2026-01-31

### 修复
- **[share]**: 一次性分享并发访问竞态处理
  - 方案: [202601312137_share-access-race-fix](archive/2026-01/202601312137_share-access-race-fix/)

## [0.4.1] - 2026-01-31

### 新增
- **[share]**: 分享访问校验（token hash / 过期 / 撤销 / 一次性）
  - 方案: [202601312052_share-access-validation](archive/2026-01/202601312052_share-access-validation/)

## [0.4.0] - 2026-01-31

### 新增
- **[app]**: 全站安全头与 CSP 基线（CSP/X-Content-Type-Options/Referrer-Policy 等）
  - 方案: [202601311858_security-headers-404-noindex](archive/2026-01/202601311858_security-headers-404-noindex/)
- **[share]**: 分享访问失败统一 404 + noindex/noarchive
  - 方案: [202601311858_security-headers-404-noindex](archive/2026-01/202601311858_security-headers-404-noindex/)

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
