# crypto 模块

## 职责
- 提供 AES-256-GCM 加解密封装（含 IV/Tag 处理）
- 提供分享 token / 管理密钥的 hash 与验证
- 提供管理员密码 hash/verify（argon2id/bcrypt）
- 统一错误与日志接口

## 接口定义（可选）
- 配置: `createCryptoConfig`, `loadCryptoConfig`
- 加解密: `encryptContent`, `decryptContent`
- token hash: `hashToken`, `verifyToken`
- 密码 hash: `hashPassword`, `verifyPassword`
- 环境变量:
  - `PASTE_ENCRYPTION_KEY`
  - `PASTE_ENCRYPTION_ALGORITHM`
  - `PASTE_ENCRYPTION_IV_BYTES`
  - `PASTE_ENCRYPTION_TAG_BYTES`
  - `PASTE_TOKEN_HASH_SECRET`
  - `PASTE_PASSWORD_HASH_ALGORITHM`
  - `PASTE_BCRYPT_COST`
  - `PASTE_ARGON2_TIME_COST`
  - `PASTE_ARGON2_MEMORY_KB`
  - `PASTE_ARGON2_PARALLELISM`

## 行为规范
- 正文只在服务端进行加解密，数据库不落地明文
- token/管理密钥 hash 使用 HMAC-SHA256，保证确定性与不可逆
- 密码 hash 默认 argon2id，兼容 bcrypt
- 错误通过 `CryptoError` 统一包装，避免泄露敏感信息

## 依赖关系
- 依赖: node:crypto, argon2, bcrypt
- 上游: auth / share / guest
- 下游: 无
