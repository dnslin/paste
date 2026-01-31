# 变更提案: crypto-utils

## 元信息
```yaml
类型: 新功能
方案类型: implementation
优先级: P1
状态: 草稿
创建: 2026-01-31
```

---

## 1. 需求

### 背景
需要为正文强加密、分享 token 与管理密钥的安全存储提供统一工具封装，保证加解密可稳定往返、hash 不可逆且带盐，并支持通过环境变量注入密钥与算法配置。

### 目标
- 提供 AES-256-GCM 加解密封装（包含 IV/Tag 处理）
- 提供分享 token 与管理密钥的 hash/verify 封装
- 提供管理员密码 hash/verify（argon2id/bcrypt 可配置）
- 提供统一错误类型与日志接口
- 覆盖必要单元/集成/边界测试

### 约束条件
```yaml
时间约束: 无明确
性能约束: 加解密与 hash 在服务端可接受范围
兼容性约束: Node.js 环境，避免在客户端使用
业务约束: 仅提供工具封装，不接入业务路由
```

### 验收标准
- [ ] 加解密可稳定往返且错误可控
- [ ] hash 输出不可逆且有盐
- [ ] 配置项（密钥/算法）可通过环境变量注入
- [ ] Unit tests 覆盖加解密往返与 hash 校验
- [ ] Edge cases 覆盖无效 key/iv 的失败处理

---

## 2. 方案

### 技术方案
在 `src/lib/crypto.ts` 提供统一封装：
- 配置读取：从环境变量解析加密密钥、算法与 hash 策略
- 加解密：AES-256-GCM，输出 `{ciphertext, iv, tag}`
- Token/Key hash：HMAC-SHA256（密钥来自环境变量）+ 常量时间比较
- 密码 hash：支持 argon2id 与 bcrypt（可配置）并自动识别
- 错误与日志：统一 `CryptoError` 与可替换 `CryptoLogger`

### 影响范围
```yaml
涉及模块:
  - crypto: 新增安全工具模块
  - share/guest/auth: 后续集成时调用（本次不接入）
预计变更文件: 4-7
```

### 风险评估
| 风险 | 等级 | 应对 |
|------|------|------|
| 环境变量配置错误导致无法加解密 | 中 | 启动时配置校验 + 明确错误码 |
| 密码 hash 算法选择不一致 | 中 | hash 输出自描述/自动识别 |
| 原生依赖在环境中安装失败 | 低 | 在文档与错误提示中标注依赖要求 |

---

## 3. 技术设计（可选）

### API设计
- `loadCryptoConfig(): CryptoConfig`
- `encryptContent(plaintext: Buffer | string, config?): EncryptionResult`
- `decryptContent(input: EncryptionResult, config?): Buffer`
- `hashToken(value: string, config?): string`
- `verifyToken(value: string, digest: string, config?): boolean`
- `hashPassword(password: string, config?): Promise<string>`
- `verifyPassword(password: string, digest: string, config?): Promise<boolean>`

---

## 4. 核心场景

### 场景: 正文加密存储
**模块**: crypto
**条件**: 服务端保存粘贴内容前
**行为**: encryptContent → 存储 ciphertext/iv/tag
**结果**: 数据库不保存明文

### 场景: 分享 token 校验
**模块**: crypto
**条件**: 校验分享访问 token
**行为**: hashToken → 与存储 hash 常量时间比较
**结果**: 可安全验证 token

### 场景: 管理员密码验证
**模块**: crypto
**条件**: 管理员登录
**行为**: verifyPassword
**结果**: 密码正确/错误可控返回

---

## 5. 技术决策

### crypto-utils#D001: Token/管理密钥 hash 采用 HMAC-SHA256
**日期**: 2026-01-31
**状态**: ✅采纳
**背景**: 需要不可逆且带盐的确定性 hash 以支持索引查询
**选项分析**:
| 选项 | 优点 | 缺点 |
|------|------|------|
| A: HMAC-SHA256（推荐） | 确定性、带密钥、实现简单 | 依赖密钥管理 |
| B: 随机盐 + PBKDF | 安全性高 | 无法确定性查询 |
**决策**: 选择方案A
**理由**: 满足“带盐”与“可查询”的平衡需求
**影响**: share/guest 模块将依赖该 hash 方案

### crypto-utils#D002: 密码 hash 默认 argon2id，支持 bcrypt 兼容
**日期**: 2026-01-31
**状态**: ✅采纳
**背景**: 需要现代安全的密码 hash，且允许兼容已有 bcrypt 方案
**选项分析**:
| 选项 | 优点 | 缺点 |
|------|------|------|
| A: argon2id（推荐） | 抗 GPU/ASIC，安全性高 | 依赖原生库 |
| B: bcrypt | 兼容性好，生态成熟 | 参数升级受限 |
**决策**: 选择方案A，保留方案B
**理由**: 兼顾安全性与兼容性
**影响**: auth 模块密码存储策略
