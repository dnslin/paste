# 变更提案: rate-limit-audit

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
为登录失败、分享访问与游客创建提供统一的限流与审计能力，作为安全与运维基线。

### 目标
- 提供可复用的限流服务，支持按 IP 与账号维度配置
- 提供审计日志写入与查询能力
- 提供统一的限流错误响应结构，便于后续路由接入

### 约束条件
```yaml
时间约束: 无
性能约束: 限流判断需低延迟（本期采用内存限流）
兼容性约束: 兼容现有 Node + SQLite + Drizzle 结构
业务约束: 本期不接入具体业务路由与前端
```

### 验收标准
- [ ] 限流可按 IP/账号执行且可配置
- [ ] 审计日志可写入并可查询
- [ ] 超限时返回统一错误结构
- [ ] 单测覆盖限流与审计日志核心逻辑

---

## 2. 方案

### 技术方案
- 引入 `rate-limiter-flexible`，封装 `RateLimiterMemory` 的创建与消费逻辑
- 提供 `buildRateLimitKey` 与 `consumeRateLimit`，输出标准化限流结果
- 提供 `createRateLimitError` 生成统一错误响应结构
- 新增审计日志服务 `audit-log`：
  - `writeAuditLog`：写入 audit_logs 表
  - `listAuditLogs`：按事件/时间/目标筛选并返回解析后的记录

### 影响范围
```yaml
涉及模块:
  - lib: 新增 rate-limit 与 audit-log 服务
  - db: 使用 audit_logs 表（无结构变更）
  - tests: 新增单测
预计变更文件: 6-9
```

### 风险评估
| 风险 | 等级 | 应对 |
|------|------|------|
| 内存限流不跨实例 | 中 | 先满足单机需求，后续可替换为 RedisStore |
| 关键字段为空导致审计不可用 | 低 | eventType/actorType 强制必填 |
| 元数据 JSON 解析失败 | 低 | 读取时容错解析，失败则返回原始字符串 |

---

## 3. 技术设计（可选）

### API设计
#### RateLimitService
- `createRateLimiter(config)`
- `buildRateLimitKey(input)`
- `consumeRateLimit(limiter, key, points?)`
- `createRateLimitError(result, config)`

#### AuditLogService
- `writeAuditLog(input, deps?)`
- `listAuditLogs(filters, deps?)`

### 数据模型
| 字段 | 类型 | 说明 |
|------|------|------|
| eventType | text | 事件类型 |
| actorType | text | 行为人类型 |
| actorId | text | 行为人标识 |
| targetType | text | 目标类型 |
| targetId | text | 目标标识 |
| metadataJson | text | 事件附加信息 |

---

## 4. 核心场景

### 场景: 登录失败
**模块**: auth
**条件**: 管理员密码错误
**行为**: 记录 audit_logs，事件类型 `auth.login_failed`
**结果**: 审计日志可按事件类型查询

### 场景: 分享访问
**模块**: share
**条件**: 分享链接被访问（成功或失败）
**行为**: 记录 audit_logs，事件类型 `share.access`
**结果**: 可按分享目标过滤访问记录

### 场景: 游客创建
**模块**: guest
**条件**: 游客创建粘贴请求通过
**行为**: 记录 audit_logs，事件类型 `guest.create`
**结果**: 可按 IP/时间范围查询

---

## 5. 技术决策

### rate-limit-audit#D001: 选择 rate-limiter-flexible 作为限流基础库
**日期**: 2026-01-31
**状态**: ✅采纳
**背景**: 需要稳定、可扩展的限流能力，并支持未来切换存储层。
**选项分析**:
| 选项 | 优点 | 缺点 |
|------|------|------|
| A: rate-limiter-flexible | API成熟、支持多种存储、社区活跃 | 需引入新依赖 |
| B: 自研内存限流 | 依赖少、实现可控 | 功能薄弱、后续维护成本高 |
**决策**: 选择方案A
**理由**: 能满足现阶段需求并为后续扩展预留空间。
**影响**: lib 模块增加限流封装与测试
