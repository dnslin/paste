# audit-log 模块

## 职责
- 统一审计日志写入与查询
- 支持按事件、主体、目标与时间范围筛选
- 解析 metadata JSON（失败则保留原始字符串）

## 接口定义（可选）
- `writeAuditLog(input, deps?)`
- `listAuditLogs(filters?, deps?)`

## 行为规范
- `eventType` 与 `actorType` 为必填字段
- 查询默认按 `createdAt` 倒序
- metadata JSON 解析失败时保留 `metadataRaw`

## 依赖关系
- db.audit_logs
- drizzle-orm
