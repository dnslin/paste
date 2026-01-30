# Product Requirements Document: 在线粘贴板 (PasteBin)

**Version**: 1.0
**Date**: 2026-01-27
**Author**: Sarah (Product Owner)
**Quality Score**: 93/100

---

## Executive Summary

本项目是一个支持管理员和游客双角色的在线粘贴板系统，用于跨设备快速保存和分享文本、代码、Markdown 内容。管理员拥有完整的内容管理能力，游客可以创建临时粘贴并获得管理密钥进行后续操作。

系统强调安全性（正文强加密存储）、灵活性（完整的分享链接能力）和可控性（管理后台实时配置）。V1 版本聚焦核心功能，主题定制等增强功能留待后续版本。

---

## Problem Statement

**Current Situation**:
用户需要在电脑与手机之间快速同步代码片段、敏感信息（token、密码等），现有公共粘贴板服务存在安全性不足、无法控制访问权限、朋友同事偶尔使用时需要分享账号等问题。

**Proposed Solution**:
自建在线粘贴板，支持管理员完整管理能力、游客临时使用（可控开关）、正文强加密存储、灵活的分享链接机制。

**Business Impact**:

- 敏感信息安全存储，避免泄露风险
- 朋友同事可临时使用，无需共享账号
- 完全自主可控，数据不经过第三方

---

## Success Metrics

**Primary KPIs:**

- 粘贴创建到获取分享链接 < 3 步操作
- 页面首次加载 < 2 秒
- 正文加密存储，数据库泄露不可直接读取明文
- 分享链接统一 404 策略，无信息泄露

**Validation**: 功能测试 + 安全审计 + 实际使用反馈

---

## User Personas

### Primary: 管理员 (Admin)

- **Role**: 系统唯一管理员
- **Goals**: 快速保存代码/敏感信息，跨设备访问，管理所有内容
- **Pain Points**: 需要安全存储敏感 token，需要控制游客功能
- **Technical Level**: 高级开发者

### Secondary: 游客 (Guest)

- **Role**: 朋友/同事临时使用者
- **Goals**: 快速创建临时粘贴，获取分享链接
- **Pain Points**: 不想注册账号，只需临时使用
- **Technical Level**: 初级到中级

---

## User Stories & Acceptance Criteria

### Story 1: 管理员登录

**As a** 管理员
**I want to** 使用固定密码登录系统
**So that** 我可以访问完整的管理功能

**Acceptance Criteria:**

- [ ] 输入正确密码后创建会话，跳转首页
- [ ] 密码错误显示通用错误提示，不泄露具体原因
- [ ] 连续 5 次错误后触发 15 分钟锁定
- [ ] Cookie 设置 HttpOnly、Secure、SameSite

### Story 2: 管理员创建粘贴

**As a** 管理员
**I want to** 快速创建文本/代码/Markdown 粘贴
**So that** 我可以保存并跨设备访问

**Acceptance Criteria:**

- [ ] 支持 plain/code/markdown 三种类型
- [ ] code 类型可选语言（SQL/Java/Go/Python/JS/TS 等）
- [ ] 可设置标题、标签、过期时间
- [ ] 正文上限 5MB，超限拒绝并提示
- [ ] 保存后正文加密存储

### Story 3: 管理员上传附件

**As a** 管理员
**I want to** 上传图片和文件作为粘贴附件
**So that** 我可以保存截图和相关文件

**Acceptance Criteria:**

- [ ] 支持剪贴板粘贴图片、拖拽上传
- [ ] 单文件上限 25MB，超限拒绝
- [ ] 文件存储于文件系统，DB 存元数据
- [ ] 下载走受控路由，校验权限

### Story 4: 游客创建粘贴

**As a** 游客
**I want to** 无需登录快速创建临时粘贴
**So that** 我可以临时分享内容给他人

**Acceptance Criteria:**

- [ ] 游客功能可由管理员实时开关
- [ ] 仅支持文本/代码/Markdown，不支持附件
- [ ] 必须设置过期时间（上限可配置）
- [ ] 每 IP 每小时限制 10 次创建
- [ ] 创建成功返回管理密钥，自动复制到剪贴板
- [ ] 管理密钥可用于编辑/删除自己的粘贴

### Story 5: 分享链接

**As a** 管理员或游客
**I want to** 生成灵活的分享链接
**So that** 我可以控制内容的访问方式

**Acceptance Criteria:**

- [ ] 支持公开链接（持有即可访问）
- [ ] 支持密码保护
- [ ] 支持一次性访问（访问后立即失效）
- [ ] 支持过期时间设置
- [ ] 以上选项可组合使用
- [ ] 访问失败统一返回 404
- [ ] 分享页只读，禁止搜索引擎索引

### Story 6: 管理后台

**As a** 管理员
**I want to** 通过后台管理面板控制系统配置
**So that** 我可以实时调整游客功能和系统参数

**Acceptance Criteria:**

- [ ] 实时开关游客功能（立即生效）
- [ ] 配置游客过期时间上限
- [ ] 配置游客频率限制参数
- [ ] 查看审计日志（登录失败、分享访问记录）
- [ ] 批量清理过期内容和游客粘贴

---

## Functional Requirements

### Core Features

**Feature 1: 双角色系统**

- Description: 支持管理员和游客两种角色，权限边界清晰
- User flow:
  - 管理员：登录 → 完整功能访问
  - 游客：直接访问 → 创建粘贴 → 获得管理密钥
- Edge cases:
  - 游客功能关闭时，显示友好提示
  - 管理密钥丢失后无法恢复（提前警告）
- Error handling:
  - 登录失败：通用错误提示 + 频率限制
  - 游客创建超限：显示剩余配额和重置时间

**Feature 2: 粘贴内容管理**

- Description: 支持 plain/code/markdown 三种类型，正文强加密存储
- User flow:
  - 创建：选择类型 → 输入内容 → 设置元数据 → 保存
  - 查看：plain 等宽显示，code 高亮+复制，markdown 安全渲染
  - 管理：置顶、删除、调整过期时间
- Edge cases:
  - 5MB 内容上限，超限拒绝
  - Markdown XSS 防护（rehype-sanitize）
- Error handling:
  - 保存失败：显示具体原因（大小超限、网络错误等）

**Feature 3: 附件上传（仅管理员）**

- Description: 支持图片和文件上传，单文件 25MB 上限
- User flow:
  - 上传：剪贴板粘贴/拖拽 → 上传 → 显示进度 → 完成
  - 下载：点击附件 → 权限校验 → 下载
- Edge cases:
  - MIME sniffing 防护
  - 文件名净化，防止路径穿越
- Error handling:
  - 超限拒绝并提示
  - 上传失败可重试

**Feature 4: 游客管理密钥机制**

- Description: 游客创建粘贴后获得高熵随机管理密钥
- User flow:
  - 创建成功 → 显示管理密钥 → 自动复制到剪贴板 → 提示保存
  - 使用密钥：访问编辑/删除页面 → 输入密钥 → 验证 → 操作
- Edge cases:
  - 密钥仅展示一次，关闭后无法找回
  - 密钥格式：32 字符随机字符串
- Error handling:
  - 密钥错误：统一 404 响应

**Feature 5: 分享链接（四种能力组合）**

- Description: 支持公开/密码/一次性/过期四种能力，可组合使用
- User flow:
  - 创建分享：选择选项 → 生成 token → 复制链接
  - 访问分享：打开链接 → 输入密码（如需要）→ 查看内容
  - 撤销分享：管理员可撤销任意分享链接
- Edge cases:
  - 一次性访问：第二次访问返回 404
  - 过期后访问：返回 404
  - token 高熵随机，DB 仅存 hash
- Error handling:
  - 所有失败场景统一返回 404

**Feature 6: 管理后台**

- Description: 管理员专属后台，实时配置系统参数
- User flow:
  - 访问后台 → 查看当前配置 → 修改参数 → 保存 → 立即生效
  - 查看审计日志 → 筛选时间/类型 → 导出（可选）
  - 批量清理 → 选择清理类型 → 确认 → 执行
- Edge cases:
  - 配置参数校验（如过期时间不能为负数）
  - 批量清理前二次确认
- Error handling:
  - 配置保存失败：回滚并提示

### Out of Scope (V1 不做)

- 主题定制（深色/浅色切换）
- 正文全文搜索
- 多管理员/团队协作
- 2FA 双因素认证
- 浏览器插件/桌面客户端
- 端到端客户端加密
- 游客邮箱通知管理密钥

---

## Technical Constraints

### Performance

- 首页加载时间 < 2 秒
- API 响应时间 < 500ms（P95）
- 大文本渲染不阻塞 UI（虚拟化/折叠）

### Security

- 正文强加密存储（AES-256-GCM）
- 密码 hash：argon2id 或 bcrypt
- 分享 token：crypto.randomBytes 高熵随机
- 安全头：CSP、X-Content-Type-Options、Referrer-Policy
- 频率限制：登录、分享访问、游客创建
- 审计日志：登录失败、分享访问成功/失败

### Integration

- 无外部依赖（自建环境）
- SQLite 单文件数据库（WAL 模式）
- 文件系统存储附件

### Technology Stack

- Next.js 16 (App Router) + TypeScript
- SQLite + better-sqlite3 + Drizzle ORM
- CodeMirror 6（编辑器）+ shiki（高亮）
- Markdown：remark + rehype + rehype-sanitize
- 会话：SQLite sessions 表 + HttpOnly Cookie
- 频率限制：rate-limiter-flexible
- 校验：zod

### Compatibility

- 桌面优先，移动端基本可用
- 现代浏览器（Chrome/Firefox/Safari/Edge 最新两个版本）
- 响应式布局，核心操作不依赖 hover

---

## MVP Scope & Phasing

### Phase 1: MVP (V1 - 必须交付)

**管理员功能：**

- 固定密码登录
- 创建/查看/编辑/删除粘贴（plain/code/markdown）
- 上传/下载附件（≤25MB）
- 列表管理：置顶、标签过滤、标题搜索
- 生成分享链接（公开/密码/一次性/过期）
- 管理后台：游客开关、系统配置、审计日志、批量清理

**游客功能：**

- 无需登录创建粘贴（仅文本/代码/Markdown）
- 获得管理密钥，可编辑/删除自己的粘贴
- 生成分享链接（完整能力）
- 限制：必须过期、无附件、频率限制（每 IP 每小时 10 次）

**安全底线：**

- 正文加密存储
- Markdown sanitize
- 频率限制
- 安全头
- 统一 404 策略

**MVP Definition**: 管理员和游客都能快速创建粘贴并分享，管理员能完整管理所有内容，系统安全可控。

### Phase 2: Enhancements (V2 - 后续版本)

- 主题定制（深色/浅色切换）
- 游客邮箱通知管理密钥（可选）
- 更丰富的审计日志筛选和导出
- 粘贴版本历史
- API 接口（供第三方调用）

### Future Considerations

- 多管理员支持
- 2FA 双因素认证
- 浏览器插件
- 正文全文搜索（需要权衡加密 vs 搜索）

---

## Risk Assessment

| Risk                      | Probability | Impact | Mitigation Strategy                                         |
| ------------------------- | ----------- | ------ | ----------------------------------------------------------- |
| 游客滥用（大量垃圾粘贴）  | Medium      | Medium | 频率限制（每 IP 每小时 10 次）+ 强制过期 + 管理员可批量清理 |
| 管理密钥泄露              | Low         | High   | 密钥高熵随机（32 字符）+ 仅展示一次 + 提示用户妥善保存      |
| 数据库泄露导致明文泄露    | Low         | High   | 正文强加密存储（AES-256-GCM）+ 分享 token 仅存 hash         |
| 分享链接被枚举            | Low         | Medium | token 高熵随机 + 统一 404 策略 + 频率限制                   |
| 附件存储空间耗尽          | Medium      | Medium | 游客不能上传附件 + 管理员可批量清理 + 监控磁盘空间          |
| XSS 攻击（Markdown 渲染） | Medium      | High   | rehype-sanitize 白名单策略 + CSP 安全头                     |

---

## Dependencies & Blockers

**Dependencies:**

- Next.js 16 框架（已安装）
- SQLite 数据库（需初始化 schema）
- 加密库（Node.js crypto 内置）
- 前端组件库（需选型，建议 shadcn/ui）

**Known Blockers:**

- 无

---

## Appendix

### Glossary

- **管理员 (Admin)**: 系统唯一管理员，拥有完整权限
- **游客 (Guest)**: 无需登录的临时用户，权限受限
- **管理密钥 (Management Key)**: 游客创建粘贴后获得的 32 字符随机字符串，用于编辑/删除
- **分享链接 (Share Link)**: 指向特定粘贴的公开/受保护链接
- **强加密 (Strong Encryption)**: 正文使用 AES-256-GCM 加密存储，数据库泄露不可读取明文

### Key Parameters

- 管理员粘贴正文上限：5MB
- 管理员附件上限：25MB/单文件
- 游客粘贴正文上限：5MB（与管理员一致）
- 游客附件：不支持
- 游客过期时间：必须设置，上限可配置（建议默认 7 天）
- 游客频率限制：每 IP 每小时 10 次创建
- 管理密钥长度：32 字符
- 分享 token 长度：32 字节（hex 编码后 64 字符）

### References

- 原始需求文档：docs/requirements.md
- 技术栈文档：docs/tech-stack.md
- Next.js 文档：https://nextjs.org/docs
- Drizzle ORM 文档：https://orm.drizzle.team

---

