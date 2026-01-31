# share 模块

## 职责
- 生成分享链接并控制访问策略（公开/密码/一次性/过期）
- 提供分享访问页面，只读展示内容
- 访问失败场景统一返回 404，避免信息泄露
- 分享页面禁止搜索引擎索引（noindex/noarchive）

## 接口定义（可选）
- 页面路由: `/share/[token]`
- 中间件: `/share/:path*` 设置 `X-Robots-Tag`
- 访问校验: `resolveShareAccess(token)`

## 行为规范
- token 格式非法时直接返回 404
- token hash 需匹配 shares.token_hash（支持 prefixed/raw digest）
- revoked/expired/oneTime 已消费统一返回 404
- 访问成功更新 lastAccessAt；oneTime 访问同时设置 revokedAt
- 分享页只读展示，不输出敏感状态信息

## 依赖关系
- app 路由与 middleware
- db.shares（访问校验与状态更新）
- crypto（token hash 校验）
