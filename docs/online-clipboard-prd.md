# Product Requirements Document: Online Clipboard (Paste)

**Version**: 1.0  
**Date**: 2026-02-03  
**Author**: Sarah (Product Owner)  
**Quality Score**: 92/100

---

## Executive Summary

在线剪切板是一个开源的代码/文本分享平台，允许用户快速粘贴内容并生成可分享的短链接。项目注重隐私安全（服务端加密）、用户体验（精美UI、流畅动画）和实用功能（密码保护、阅后即焚、过期时间）。

目标用户为开发者和技术人员，需要快速分享代码片段、日志、配置文件等内容。管理员可通过后台监控和管理所有粘贴记录。

作为开源项目，不涉及任何商业行为，旨在为社区提供一个隐私友好、功能完善的替代方案。

---

## Problem Statement

**Current Situation**: 现有pastebin服务存在以下痛点：
- 界面陈旧，用户体验差
- 隐私保护不足，明文存储
- 功能单一，缺少阅后即焚等高级功能
- 商业化严重，广告干扰

**Proposed Solution**: 构建一个现代化的在线剪切板服务：
- 精美的UI设计和流畅动画
- 服务端AES-256-GCM加密保护数据
- 支持密码保护、阅后即焚、过期时间
- 开源免费，无广告

**Business Impact**: 
- 为开源社区提供高质量工具
- 建立技术品牌影响力
- 积累全栈项目经验

---

## Success Metrics

**Primary KPIs:**
- 项目GitHub Star数（目标：发布后3个月内100+）
- 用户粘贴创建成功率 > 99%
- 页面加载时间 < 2秒
- 代码高亮渲染时间 < 500ms

**Validation**: 通过GitHub Insights和自建统计面板追踪

---

## User Personas

### Primary: Developer Dan
- **Role**: 全栈开发者
- **Goals**: 快速分享代码片段给同事、在技术论坛分享解决方案
- **Pain Points**: 现有工具界面丑、广告多、隐私担忧
- **Technical Level**: Advanced

### Secondary: Admin Alex
- **Role**: 系统管理员
- **Goals**: 监控平台使用情况、管理不当内容、查看统计数据
- **Pain Points**: 需要简洁高效的管理界面
- **Technical Level**: Advanced

---

## User Stories & Acceptance Criteria

### Story 1: 创建粘贴

**As a** 用户  
**I want to** 粘贴代码或文本并获得分享链接  
**So that** 我可以快速分享内容给他人

**Acceptance Criteria:**
- [ ] 支持多行文本输入
- [ ] 自动检测或手动选择语言类型
- [ ] 支持200+编程语言语法高亮
- [ ] 生成6-8字符短随机ID链接
- [ ] 创建成功后自动复制链接到剪贴板

### Story 2: 查看粘贴

**As a** 访问者  
**I want to** 通过链接查看分享的内容  
**So that** 我可以阅读他人分享的代码

**Acceptance Criteria:**
- [ ] 显示行号
- [ ] 提供一键复制按钮
- [ ] 代码高亮正确渲染
- [ ] 密码保护的粘贴需先输入密码
- [ ] 阅后即焚的粘贴在查看后显示销毁提示

### Story 3: 设置粘贴选项

**As a** 用户  
**I want to** 为粘贴设置密码、过期时间、阅后即焚  
**So that** 我可以控制内容的访问权限和生命周期

**Acceptance Criteria:**
- [ ] 可选设置访问密码
- [ ] 可选过期时间：1小时 / 1天 / 1周
- [ ] 可选阅后即焚：设置查看次数（默认1次）
- [ ] 选项组合互不冲突

### Story 4: 管理员登录

**As an** 管理员  
**I want to** 使用密码登录后台  
**So that** 我可以管理平台内容

**Acceptance Criteria:**
- [ ] 单一管理员密码认证
- [ ] 登录状态通过Session/Cookie维持
- [ ] 登录失败有错误提示
- [ ] 支持登出操作

### Story 5: 管理粘贴记录

**As an** 管理员  
**I want to** 查看和管理所有粘贴记录  
**So that** 我可以监控平台使用情况

**Acceptance Criteria:**
- [ ] 列表显示：ID、创建时间、语言类型、过期状态
- [ ] 支持查看粘贴内容
- [ ] 支持删除粘贴
- [ ] 支持分页浏览

---

## Functional Requirements

### Core Features

**Feature 1: 粘贴创建器**
- Description: 主页提供文本输入区域和选项配置
- User flow: 
  1. 用户粘贴内容到输入框
  2. 选择语言（可选，支持自动检测）
  3. 配置选项（密码/过期/阅后即焚）
  4. 点击创建
  5. 显示生成的链接并自动复制
- Edge cases: 空内容提交、超长内容
- Error handling: 显示友好错误提示，不丢失用户输入

**Feature 2: 粘贴查看器**
- Description: 通过短链接访问粘贴内容
- User flow:
  1. 访问链接
  2. 如有密码，显示密码输入框
  3. 验证通过后显示内容
  4. 如为阅后即焚，显示销毁倒计时/提示
- Edge cases: 链接不存在、已过期、已销毁
- Error handling: 404页面显示友好提示

**Feature 3: 管理员后台**
- Description: 受保护的管理界面
- User flow:
  1. 访问 /admin
  2. 输入管理员密码
  3. 查看粘贴列表
  4. 执行管理操作
- Edge cases: 密码错误、会话过期
- Error handling: 未授权重定向到登录页

### Out of Scope (Phase 2)
- 文件上传功能
- 地区统计与可视化
- 用户注册系统
- API接口
- 多管理员支持

---

## Technical Constraints

### Performance
- 首屏加载 < 2秒
- 代码高亮渲染 < 500ms
- API响应 < 200ms

### Security
- 服务端AES-256-GCM加密存储内容
- HTTPS传输加密
- 密码保护的粘贴使用bcrypt哈希
- 限制危险文件扩展名（Phase 2文件上传时）
- CSRF保护
- Rate limiting防止滥用

### Technology Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: SQLite (better-sqlite3 或 Drizzle ORM)
- **Syntax Highlighting**: Shiki
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Icons**: Lucide React

### Compatibility
- 现代浏览器（Chrome, Firefox, Safari, Edge最新两个版本）
- 响应式设计支持移动端

---

## MVP Scope & Phasing

### Phase 1: MVP (Required for Initial Launch)
- [x] 文本/代码粘贴创建
- [x] 短随机ID链接生成
- [x] 200+语言语法高亮（Shiki）
- [x] 行号显示
- [x] 一键复制
- [x] 密码保护
- [x] 阅后即焚（可设置次数）
- [x] 过期时间（1小时/1天/1周）
- [x] 管理员后台（密码登录）
- [x] 粘贴记录管理（查看/删除）
- [x] 精美UI + 动画

**MVP Definition**: 用户可以创建带选项的粘贴并分享，管理员可以管理内容。

### Phase 2: Enhancements (Post-Launch)
- 文件上传（带类型和大小限制）
- 地区统计（IP定位 + ECharts地图）
- 访问量统计
- 热门粘贴排行

### Future Considerations
- 用户注册系统
- RESTful API
- CLI工具
- 浏览器扩展
- 自定义域名

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| SQLite并发性能 | Medium | Medium | 使用WAL模式，必要时迁移PostgreSQL |
| 内容滥用 | Medium | High | 管理员审核 + Rate limiting |
| 加密密钥泄露 | Low | High | 环境变量存储，定期轮换 |
| Shiki Bundle过大 | Low | Medium | 动态导入，按需加载语言 |

---

## Dependencies & Blockers

**Dependencies:**
- Shiki库稳定性（当前v1.x，活跃维护）
- SQLite驱动（better-sqlite3 Node.js兼容性）

**Known Blockers:**
- None identified

---

## Appendix

### Glossary
- **Paste**: 用户创建的一条文本/代码记录
- **Burn after reading**: 阅后即焚，查看后自动销毁
- **Short ID**: 6-8字符的随机唯一标识符

### Technical References
- Shiki文档: https://shiki.style/
- shadcn/ui: https://ui.shadcn.com/
- Next.js App Router: https://nextjs.org/docs/app

---

*This PRD was created through interactive requirements gathering with quality scoring to ensure comprehensive coverage of business, functional, UX, and technical dimensions.*
