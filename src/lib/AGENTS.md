# CORE LIBRARY

业务逻辑层：加密、ID 生成、限流、数据库、认证。

## STRUCTURE

```
lib/
├── crypto.ts        # AES-256-GCM 加密/解密
├── nanoid.ts        # 短 ID 生成 (8 字符)
├── rate-limit.ts    # 内存限流器
├── api-response.ts  # API 响应封装
├── db/
│   ├── index.ts     # Drizzle ORM 实例
│   └── schema.ts    # 表定义 (pastes, passwordAttempts)
├── admin/
│   ├── session.ts   # JWT 会话管理
│   └── utils.ts     # Admin 工具函数
└── __tests__/       # 单元测试
```

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| 修改加密算法 | `crypto.ts` | 需同步更新 IV_LENGTH |
| 调整 ID 长度 | `nanoid.ts` | 默认 8 字符 |
| 修改限流规则 | `rate-limit.ts` | 默认 10 次/分钟 |
| 添加数据库字段 | `db/schema.ts` | 需运行 drizzle-kit |
| 修改会话时长 | `admin/session.ts:5` | SESSION_DURATION |

## CONVENTIONS

- 所有函数使用 named export
- 环境变量在函数内部读取（非模块顶层）
- 错误使用 `ApiError` 类或 `error()` 函数
- 数据库操作返回原始结果，不做额外封装

## ANTI-PATTERNS

| 禁止 | 原因 |
|------|------|
| 硬编码密钥 | 必须从环境变量读取 |
| 导出 `db` 实例以外的连接 | 单例模式 |
| 在 `crypto.ts` 中 catch 错误 | 让调用方处理 |
