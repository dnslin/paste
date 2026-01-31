# rate-limit 模块

## 职责
- 统一限流配置与 key 生成
- 提供限流消费结果与统一错误响应结构
- 支持按 IP / 账号 / IP+账号 执行限流

## 接口定义（可选）
- `createRateLimiter(config)`
- `buildRateLimitKey(config, identity)`
- `consumeRateLimit(instance, key, points?)`
- `createRateLimitError(decision)`

## 行为规范
- 限流结果统一返回 `RateLimitDecision`
- 超限错误结构固定为 `code=RATE_LIMITED` 与 `status=429`
- keyPrefix 默认 `rl`

## 依赖关系
- rate-limiter-flexible
- 下游: auth / share / guest
