# 方案归档索引

> 通过此文件快速查找历史方案
> 历史年份: [2024](_index-2024.md) | [2023](_index-2023.md) | ...

## 快速索引（当前年份）

| 时间戳 | 名称 | 类型 | 涉及模块 | 决策 | 结果 |
|--------|------|------|---------|------|------|
| 202601301516 | gh-issue-create | standard | repo/pm/issue | gh-issue-create#D001 | ⏸ 未执行 |
| 202601301721 | db-schema-migrations | implementation | db | db-schema-migrations#D001 | ✅完成 |
| 202601311413 | crypto-utils | implementation | crypto | crypto-utils#D001,crypto-utils#D002 | ✅完成 |
| 202601311858 | security-headers-404-noindex | implementation | app/share | - | ✅完成 |
| 202601312052 | share-access-validation | implementation | share | - | ✅完成 |
| 202601312137 | share-access-race-fix | implementation | share | - | ✅完成 |
| {YYYYMMDDHHMM} | {feature} | {类型} | {模块列表} | {feature}#D001,#D002 | ✅完成 |

## 按月归档

### 2026-01
- [202601301516_gh-issue-create](./2026-01/202601301516_gh-issue-create/) - 清理遗留方案包（未执行）
- [202601301721_db-schema-migrations](./2026-01/202601301721_db-schema-migrations/) - 数据库 schema 与迁移
- [202601311413_crypto-utils](./2026-01/202601311413_crypto-utils/) - 加密/哈希工具封装
- [202601311858_security-headers-404-noindex](./2026-01/202601311858_security-headers-404-noindex/) - 安全头/CSP/统一404/noindex
- [202601312052_share-access-validation](./2026-01/202601312052_share-access-validation/) - 分享访问校验/过期/一次性
- [202601312137_share-access-race-fix](./2026-01/202601312137_share-access-race-fix/) - 一次性分享竞态修复

### YYYY-MM
- [YYYYMMDDHHMM_feature](./YYYY-MM/YYYYMMDDHHMM_feature/) - 一句话功能描述

## 结果状态说明
- ✅ 完成
- ⚠️ 部分完成
- ❌ 失败/中止
- ⏸ 未执行
- 🔄 已回滚
