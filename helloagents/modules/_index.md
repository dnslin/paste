# 模块索引

> 通过此文件快速定位模块文档

## 模块清单

| 模块 | 职责 | 状态 | 文档 |
|------|------|------|------|
| db | 数据模型、迁移与数据库连接 | 🚧 | [db.md](./db.md) |
| auth | 管理员登录、会话、鉴权 | 📝 | [auth.md](./auth.md) |
| paste | 粘贴创建/编辑/删除/展示/列表 | 📝 | [paste.md](./paste.md) |
| attachment | 附件上传/下载与存储 | 📝 | [attachment.md](./attachment.md) |
| share | 分享链接与访问策略 | 📝 | [share.md](./share.md) |
| guest | 游客创建与管理密钥 | 📝 | [guest.md](./guest.md) |
| admin-console | 管理后台配置/审计/清理 | 📝 | [admin-console.md](./admin-console.md) |
| crypto | 加密/哈希工具封装 | 🚧 | [crypto.md](./crypto.md) |
| rate-limit | 限流配置、key 生成与统一错误响应 | 🚧 | [rate-limit.md](./rate-limit.md) |
| audit-log | 审计日志写入与查询 | 🚧 | [audit-log.md](./audit-log.md) |

## 模块依赖关系

```
auth → paste → share
paste → attachment
admin-console → (auth, guest, share)
guest → paste
```

## 状态说明
- ✅ 稳定
- 🚧 开发中
- 📝 规划中
