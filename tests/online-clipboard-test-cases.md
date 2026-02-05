# Test Cases: Online Clipboard (Paste)

## Overview
- **Feature**: 在线剪切板服务
- **Requirements Source**: docs/online-clipboard-prd.md
- **Test Coverage**: 粘贴创建、查看、选项配置、管理员后台
- **Last Updated**: 2026-02-05

---

## 1. Functional Tests - 粘贴创建 (Story 1)

### TC-F-001: 创建基本文本粘贴
- **Requirement**: Story 1 - 创建粘贴
- **Priority**: High
- **Preconditions**:
  - 用户访问首页
  - 网络连接正常
- **Test Steps**:
  1. 在输入框中粘贴多行文本内容
  2. 保持默认语言选择（自动检测）
  3. 点击"创建"按钮
- **Expected Results**:
  - 创建成功，显示生成的短链接
  - 链接为6-8字符随机ID格式
  - 链接自动复制到剪贴板
- **Postconditions**: 粘贴记录存储在数据库中

### TC-F-002: 手动选择语言类型
- **Requirement**: Story 1 - 支持200+编程语言语法高亮
- **Priority**: High
- **Preconditions**:
  - 用户访问首页
- **Test Steps**:
  1. 在输入框中粘贴 JavaScript 代码
  2. 从语言下拉列表中选择 "JavaScript"
  3. 点击"创建"按钮
  4. 访问生成的链接
- **Expected Results**:
  - 创建成功
  - 查看页面显示正确的 JavaScript 语法高亮
- **Postconditions**: 粘贴记录语言类型为 JavaScript

### TC-F-003: 自动检测语言类型
- **Requirement**: Story 1 - 自动检测语言类型
- **Priority**: Medium
- **Preconditions**:
  - 用户访问首页
- **Test Steps**:
  1. 粘贴明显的 Python 代码（如 `def hello(): print("world")`）
  2. 不手动选择语言
  3. 点击"创建"按钮
  4. 访问生成的链接
- **Expected Results**:
  - 系统自动检测为 Python
  - 显示正确的 Python 语法高亮
- **Postconditions**: 语言类型自动设置

---

## 2. Functional Tests - 粘贴查看 (Story 2)

### TC-F-004: 查看粘贴内容
- **Requirement**: Story 2 - 查看粘贴
- **Priority**: High
- **Preconditions**:
  - 已创建一个粘贴记录
  - 获取到分享链接
- **Test Steps**:
  1. 在浏览器中访问分享链接
- **Expected Results**:
  - 页面正确加载
  - 显示行号
  - 代码高亮正确渲染
  - 提供一键复制按钮
- **Postconditions**: 无状态变化

### TC-F-005: 一键复制功能
- **Requirement**: Story 2 - 提供一键复制按钮
- **Priority**: Medium
- **Preconditions**:
  - 已访问粘贴查看页面
- **Test Steps**:
  1. 点击"复制"按钮
- **Expected Results**:
  - 内容复制到剪贴板
  - 显示复制成功提示
- **Postconditions**: 剪贴板包含粘贴内容

---

## 3. Functional Tests - 粘贴选项 (Story 3)

### TC-F-006: 设置密码保护
- **Requirement**: Story 3 - 可选设置访问密码
- **Priority**: High
- **Preconditions**:
  - 用户访问首页
- **Test Steps**:
  1. 输入文本内容
  2. 启用密码保护选项
  3. 输入密码 "test123"
  4. 点击"创建"按钮
  5. 访问生成的链接
- **Expected Results**:
  - 创建成功
  - 访问链接时显示密码输入框
  - 不输入密码无法查看内容
- **Postconditions**: 粘贴记录带有密码哈希

### TC-F-007: 密码验证成功
- **Requirement**: Story 3 - 密码保护
- **Priority**: High
- **Preconditions**:
  - 已创建密码保护的粘贴
  - 密码为 "test123"
- **Test Steps**:
  1. 访问粘贴链接
  2. 在密码输入框中输入 "test123"
  3. 点击验证按钮
- **Expected Results**:
  - 验证通过
  - 显示粘贴内容
- **Postconditions**: 无

### TC-F-008: 设置过期时间 - 1小时
- **Requirement**: Story 3 - 过期时间1小时
- **Priority**: High
- **Preconditions**:
  - 用户访问首页
- **Test Steps**:
  1. 输入文本内容
  2. 选择过期时间为"1小时"
  3. 点击"创建"按钮
- **Expected Results**:
  - 创建成功
  - 粘贴记录的过期时间为创建时间+1小时
- **Postconditions**: 数据库记录包含正确的过期时间戳

### TC-F-009: 设置过期时间 - 1天
- **Requirement**: Story 3 - 过期时间1天
- **Priority**: Medium
- **Preconditions**:
  - 用户访问首页
- **Test Steps**:
  1. 输入文本内容
  2. 选择过期时间为"1天"
  3. 点击"创建"按钮
- **Expected Results**:
  - 创建成功
  - 粘贴记录的过期时间为创建时间+24小时
- **Postconditions**: 数据库记录包含正确的过期时间戳

### TC-F-010: 设置过期时间 - 1周
- **Requirement**: Story 3 - 过期时间1周
- **Priority**: Medium
- **Preconditions**:
  - 用户访问首页
- **Test Steps**:
  1. 输入文本内容
  2. 选择过期时间为"1周"
  3. 点击"创建"按钮
- **Expected Results**:
  - 创建成功
  - 粘贴记录的过期时间为创建时间+7天
- **Postconditions**: 数据库记录包含正确的过期时间戳

### TC-F-011: 设置阅后即焚
- **Requirement**: Story 3 - 阅后即焚
- **Priority**: High
- **Preconditions**:
  - 用户访问首页
- **Test Steps**:
  1. 输入文本内容
  2. 启用阅后即焚选项
  3. 设置查看次数为1次
  4. 点击"创建"按钮
- **Expected Results**:
  - 创建成功
  - 粘贴记录标记为阅后即焚，剩余次数为1
- **Postconditions**: 数据库记录包含burn_after_read标记

### TC-F-012: 阅后即焚触发销毁
- **Requirement**: Story 3 - 阅后即焚查看后销毁
- **Priority**: High
- **Preconditions**:
  - 已创建阅后即焚粘贴（1次）
- **Test Steps**:
  1. 第一次访问粘贴链接
  2. 查看内容
  3. 第二次访问同一链接
- **Expected Results**:
  - 第一次访问：显示内容 + 销毁提示
  - 第二次访问：显示已销毁/不存在提示
- **Postconditions**: 粘贴记录已删除或标记为已销毁

### TC-F-013: 选项组合 - 密码+过期时间
- **Requirement**: Story 3 - 选项组合互不冲突
- **Priority**: Medium
- **Preconditions**:
  - 用户访问首页
- **Test Steps**:
  1. 输入文本内容
  2. 设置密码 "combo123"
  3. 设置过期时间为"1天"
  4. 点击"创建"按钮
  5. 访问链接并输入密码
- **Expected Results**:
  - 创建成功
  - 需要密码才能查看
  - 过期时间正确设置
- **Postconditions**: 两个选项同时生效

---

## 4. Functional Tests - 管理员 (Story 4 & 5)

### TC-F-014: 管理员登录成功
- **Requirement**: Story 4 - 管理员登录
- **Priority**: High
- **Preconditions**:
  - 管理员密码已配置
  - 访问 /admin 页面
- **Test Steps**:
  1. 输入正确的管理员密码
  2. 点击登录按钮
- **Expected Results**:
  - 登录成功
  - 跳转到管理后台主页
  - Session/Cookie 正确设置
- **Postconditions**: 管理员会话已建立

### TC-F-015: 管理员登出
- **Requirement**: Story 4 - 支持登出操作
- **Priority**: Medium
- **Preconditions**:
  - 管理员已登录
- **Test Steps**:
  1. 点击登出按钮
- **Expected Results**:
  - 登出成功
  - 跳转到登录页面
  - Session/Cookie 已清除
- **Postconditions**: 管理员会话已销毁

### TC-F-016: 查看粘贴列表
- **Requirement**: Story 5 - 列表显示
- **Priority**: High
- **Preconditions**:
  - 管理员已登录
  - 数据库中存在粘贴记录
- **Test Steps**:
  1. 访问粘贴管理页面
- **Expected Results**:
  - 显示粘贴列表
  - 包含：ID、创建时间、语言类型、过期状态
  - 支持分页浏览
- **Postconditions**: 无

### TC-F-017: 管理员查看粘贴内容
- **Requirement**: Story 5 - 支持查看粘贴内容
- **Priority**: Medium
- **Preconditions**:
  - 管理员已登录
  - 存在粘贴记录
- **Test Steps**:
  1. 在列表中点击某条粘贴的查看按钮
- **Expected Results**:
  - 显示粘贴的完整内容
  - 即使是密码保护的粘贴也能查看
- **Postconditions**: 无

### TC-F-018: 管理员删除粘贴
- **Requirement**: Story 5 - 支持删除粘贴
- **Priority**: High
- **Preconditions**:
  - 管理员已登录
  - 存在粘贴记录
- **Test Steps**:
  1. 在列表中点击某条粘贴的删除按钮
  2. 确认删除操作
- **Expected Results**:
  - 粘贴记录被删除
  - 列表刷新，不再显示该记录
  - 访问原链接返回404
- **Postconditions**: 数据库记录已删除

### TC-F-019: 分页浏览
- **Requirement**: Story 5 - 支持分页浏览
- **Priority**: Medium
- **Preconditions**:
  - 管理员已登录
  - 存在超过一页的粘贴记录（如>10条）
- **Test Steps**:
  1. 访问粘贴管理页面
  2. 点击下一页按钮
- **Expected Results**:
  - 显示下一页的粘贴记录
  - 分页控件正确显示当前页码
- **Postconditions**: 无

---

## 5. Edge Case Tests

### TC-E-001: 空内容提交
- **Requirement**: Feature 1 - Edge cases
- **Priority**: High
- **Preconditions**:
  - 用户访问首页
- **Test Steps**:
  1. 不输入任何内容
  2. 点击"创建"按钮
- **Expected Results**:
  - 显示错误提示"内容不能为空"
  - 不创建粘贴记录
- **Postconditions**: 无状态变化

### TC-E-002: 超长内容提交
- **Requirement**: Feature 1 - Edge cases
- **Priority**: Medium
- **Preconditions**:
  - 用户访问首页
- **Test Steps**:
  1. 粘贴超过限制长度的内容（如>1MB）
  2. 点击"创建"按钮
- **Expected Results**:
  - 显示友好错误提示"内容超过最大长度限制"
  - 用户输入不丢失
- **Postconditions**: 无状态变化

### TC-E-003: 访问不存在的链接
- **Requirement**: Feature 2 - Edge cases
- **Priority**: High
- **Preconditions**:
  - 无
- **Test Steps**:
  1. 访问一个不存在的粘贴链接（如 /abc123xyz）
- **Expected Results**:
  - 显示友好的404页面
  - 提示"粘贴不存在或已过期"
- **Postconditions**: 无

### TC-E-004: 访问已过期的粘贴
- **Requirement**: Feature 2 - Edge cases
- **Priority**: High
- **Preconditions**:
  - 存在一个已过期的粘贴记录
- **Test Steps**:
  1. 访问已过期粘贴的链接
- **Expected Results**:
  - 显示友好提示"该粘贴已过期"
  - 不显示内容
- **Postconditions**: 无

### TC-E-005: 访问已销毁的阅后即焚粘贴
- **Requirement**: Feature 2 - Edge cases
- **Priority**: High
- **Preconditions**:
  - 存在一个已被查看销毁的阅后即焚粘贴
- **Test Steps**:
  1. 访问该粘贴链接
- **Expected Results**:
  - 显示友好提示"该粘贴已被销毁"
- **Postconditions**: 无

### TC-E-006: 阅后即焚多次查看设置
- **Requirement**: Story 3 - 设置查看次数
- **Priority**: Medium
- **Preconditions**:
  - 用户访问首页
- **Test Steps**:
  1. 创建阅后即焚粘贴，设置查看次数为3次
  2. 访问链接3次
  3. 第4次访问
- **Expected Results**:
  - 前3次访问正常显示内容
  - 第4次访问显示已销毁提示
- **Postconditions**: 粘贴已销毁

### TC-E-007: 特殊字符内容
- **Requirement**: Feature 1 - 文本输入
- **Priority**: Medium
- **Preconditions**:
  - 用户访问首页
- **Test Steps**:
  1. 粘贴包含特殊字符的内容（如 `<script>alert('xss')</script>`）
  2. 创建粘贴
  3. 查看粘贴
- **Expected Results**:
  - 创建成功
  - 内容正确显示，特殊字符被正确转义
  - 无XSS执行
- **Postconditions**: 内容安全存储和显示

---

## 6. Error Handling Tests

### TC-ERR-001: 管理员登录失败 - 错误密码
- **Requirement**: Story 4 - 登录失败有错误提示
- **Priority**: High
- **Preconditions**:
  - 访问 /admin 页面
- **Test Steps**:
  1. 输入错误的管理员密码
  2. 点击登录按钮
- **Expected Results**:
  - 显示错误提示"密码错误"
  - 保持在登录页面
  - 不建立会话
- **Postconditions**: 无会话建立

### TC-ERR-002: 密码验证失败
- **Requirement**: Story 3 - 密码保护
- **Priority**: High
- **Preconditions**:
  - 已创建密码保护的粘贴
- **Test Steps**:
  1. 访问粘贴链接
  2. 输入错误的密码
  3. 点击验证按钮
- **Expected Results**:
  - 显示错误提示"密码错误"
  - 不显示粘贴内容
  - 可以重新输入密码
- **Postconditions**: 无

### TC-ERR-003: 未授权访问管理后台
- **Requirement**: Feature 3 - 未授权重定向
- **Priority**: High
- **Preconditions**:
  - 未登录状态
- **Test Steps**:
  1. 直接访问 /admin/dashboard 或其他管理页面
- **Expected Results**:
  - 重定向到登录页面
  - 不显示管理内容
- **Postconditions**: 无

### TC-ERR-004: 会话过期
- **Requirement**: Feature 3 - 会话过期
- **Priority**: Medium
- **Preconditions**:
  - 管理员已登录
  - 会话已过期（模拟或等待）
- **Test Steps**:
  1. 尝试执行管理操作
- **Expected Results**:
  - 重定向到登录页面
  - 显示"会话已过期，请重新登录"
- **Postconditions**: 需要重新登录

### TC-ERR-005: Rate Limiting 触发
- **Requirement**: Technical Constraints - Rate limiting
- **Priority**: High
- **Preconditions**:
  - 无
- **Test Steps**:
  1. 短时间内连续创建大量粘贴（如1分钟内50次）
- **Expected Results**:
  - 前N次成功
  - 超过限制后返回429错误
  - 显示"请求过于频繁，请稍后再试"
- **Postconditions**: 需等待冷却时间

### TC-ERR-006: 密码尝试次数限制
- **Requirement**: Security - 防止暴力破解
- **Priority**: Medium
- **Preconditions**:
  - 已创建密码保护的粘贴
- **Test Steps**:
  1. 连续输入错误密码多次（如5次）
- **Expected Results**:
  - 显示错误提示
  - 超过限制后临时锁定或增加延迟
- **Postconditions**: 需等待解锁

### TC-ERR-007: 网络错误处理
- **Requirement**: Feature 1 - Error handling
- **Priority**: Medium
- **Preconditions**:
  - 用户正在创建粘贴
- **Test Steps**:
  1. 输入内容
  2. 模拟网络断开
  3. 点击创建按钮
- **Expected Results**:
  - 显示网络错误提示
  - 用户输入不丢失
  - 可以重试
- **Postconditions**: 无状态变化

---

## 7. State Transition Tests

### TC-ST-001: 粘贴生命周期 - 正常
- **Requirement**: 粘贴状态管理
- **Priority**: High
- **Preconditions**:
  - 无
- **Test Steps**:
  1. 创建粘贴（无特殊选项）
  2. 查看粘贴
  3. 再次查看粘贴
- **Expected Results**:
  - 状态：不存在 → 已创建 → 可访问（保持）
  - 多次查看不影响状态
- **Postconditions**: 粘贴保持可访问

### TC-ST-002: 粘贴生命周期 - 过期
- **Requirement**: 过期时间功能
- **Priority**: High
- **Preconditions**:
  - 无
- **Test Steps**:
  1. 创建1小时过期的粘贴
  2. 立即查看（成功）
  3. 等待1小时后查看
- **Expected Results**:
  - 状态：不存在 → 已创建 → 可访问 → 已过期
  - 过期后无法访问
- **Postconditions**: 粘贴状态为已过期

### TC-ST-003: 粘贴生命周期 - 阅后即焚
- **Requirement**: 阅后即焚功能
- **Priority**: High
- **Preconditions**:
  - 无
- **Test Steps**:
  1. 创建阅后即焚粘贴（1次）
  2. 第一次查看
  3. 第二次查看
- **Expected Results**:
  - 状态：不存在 → 已创建 → 已查看 → 已销毁
  - 第一次查看成功，第二次显示已销毁
- **Postconditions**: 粘贴已销毁

### TC-ST-004: 粘贴生命周期 - 管理员删除
- **Requirement**: 管理员删除功能
- **Priority**: Medium
- **Preconditions**:
  - 存在粘贴记录
  - 管理员已登录
- **Test Steps**:
  1. 管理员删除粘贴
  2. 用户尝试访问该粘贴
- **Expected Results**:
  - 状态：可访问 → 已删除
  - 用户访问显示不存在
- **Postconditions**: 粘贴已删除

### TC-ST-005: 管理员会话状态
- **Requirement**: 管理员认证
- **Priority**: Medium
- **Preconditions**:
  - 无
- **Test Steps**:
  1. 访问管理页面（未登录）
  2. 登录
  3. 执行管理操作
  4. 登出
  5. 尝试执行管理操作
- **Expected Results**:
  - 状态：未认证 → 已认证 → 未认证
  - 登出后无法执行管理操作
- **Postconditions**: 会话已销毁

---

## 8. Performance Tests

### TC-P-001: 首屏加载时间
- **Requirement**: Technical Constraints - 首屏加载 < 2秒
- **Priority**: High
- **Preconditions**:
  - 生产环境或模拟生产环境
  - 网络条件正常
- **Test Steps**:
  1. 清除浏览器缓存
  2. 访问首页
  3. 测量页面完全加载时间
- **Expected Results**:
  - 首屏加载时间 < 2秒
- **Postconditions**: 无

### TC-P-002: 代码高亮渲染时间
- **Requirement**: Technical Constraints - 代码高亮渲染 < 500ms
- **Priority**: High
- **Preconditions**:
  - 存在包含代码的粘贴
- **Test Steps**:
  1. 访问代码粘贴页面
  2. 测量从页面加载到代码高亮完成的时间
- **Expected Results**:
  - 代码高亮渲染时间 < 500ms
- **Postconditions**: 无

### TC-P-003: API响应时间
- **Requirement**: Technical Constraints - API响应 < 200ms
- **Priority**: High
- **Preconditions**:
  - 服务器运行正常
- **Test Steps**:
  1. 发送创建粘贴API请求
  2. 测量响应时间
- **Expected Results**:
  - API响应时间 < 200ms
- **Postconditions**: 无

---

## 9. Security Tests

### TC-SEC-001: XSS防护
- **Requirement**: Security - 内容安全
- **Priority**: High
- **Preconditions**:
  - 无
- **Test Steps**:
  1. 创建包含 `<script>alert('xss')</script>` 的粘贴
  2. 查看该粘贴
- **Expected Results**:
  - 脚本不执行
  - 内容被正确转义显示
- **Postconditions**: 无安全漏洞

### TC-SEC-002: 加密存储验证
- **Requirement**: Security - AES-256-GCM加密
- **Priority**: High
- **Preconditions**:
  - 数据库访问权限
- **Test Steps**:
  1. 创建粘贴
  2. 直接查询数据库中的内容字段
- **Expected Results**:
  - 数据库中存储的是加密后的内容
  - 无法直接读取明文
- **Postconditions**: 无

### TC-SEC-003: 密码哈希验证
- **Requirement**: Security - bcrypt哈希
- **Priority**: High
- **Preconditions**:
  - 数据库访问权限
- **Test Steps**:
  1. 创建密码保护的粘贴
  2. 查询数据库中的密码字段
- **Expected Results**:
  - 密码以bcrypt哈希形式存储
  - 不是明文
- **Postconditions**: 无

### TC-SEC-004: HTTPS传输
- **Requirement**: Security - HTTPS传输加密
- **Priority**: High
- **Preconditions**:
  - 生产环境
- **Test Steps**:
  1. 尝试通过HTTP访问
- **Expected Results**:
  - 自动重定向到HTTPS
  - 或拒绝HTTP连接
- **Postconditions**: 无

---

## 10. Compatibility Tests

### TC-C-001: Chrome浏览器兼容性
- **Requirement**: Compatibility - 现代浏览器
- **Priority**: High
- **Preconditions**:
  - Chrome最新两个版本
- **Test Steps**:
  1. 在Chrome中执行完整用户流程
- **Expected Results**:
  - 所有功能正常工作
  - UI正确渲染
- **Postconditions**: 无

### TC-C-002: Firefox浏览器兼容性
- **Requirement**: Compatibility - 现代浏览器
- **Priority**: High
- **Preconditions**:
  - Firefox最新两个版本
- **Test Steps**:
  1. 在Firefox中执行完整用户流程
- **Expected Results**:
  - 所有功能正常工作
  - UI正确渲染
- **Postconditions**: 无

### TC-C-003: Safari浏览器兼容性
- **Requirement**: Compatibility - 现代浏览器
- **Priority**: Medium
- **Preconditions**:
  - Safari最新两个版本
- **Test Steps**:
  1. 在Safari中执行完整用户流程
- **Expected Results**:
  - 所有功能正常工作
  - UI正确渲染
- **Postconditions**: 无

### TC-C-004: 移动端响应式
- **Requirement**: Compatibility - 响应式设计
- **Priority**: High
- **Preconditions**:
  - 移动设备或模拟器
- **Test Steps**:
  1. 在移动设备上访问首页
  2. 创建粘贴
  3. 查看粘贴
- **Expected Results**:
  - UI正确适配移动端
  - 所有功能可用
  - 触摸操作正常
- **Postconditions**: 无

---

## Test Coverage Matrix

| Requirement ID | Description | Test Cases | Coverage Status |
|---------------|-------------|------------|-----------------|
| Story 1 | 创建粘贴 | TC-F-001, TC-F-002, TC-F-003, TC-E-001, TC-E-002 | ✓ Complete |
| Story 2 | 查看粘贴 | TC-F-004, TC-F-005, TC-E-003, TC-E-004, TC-E-005 | ✓ Complete |
| Story 3 | 粘贴选项 | TC-F-006~TC-F-013, TC-E-006, TC-ERR-002, TC-ERR-006 | ✓ Complete |
| Story 4 | 管理员登录 | TC-F-014, TC-F-015, TC-ERR-001, TC-ERR-003, TC-ERR-004 | ✓ Complete |
| Story 5 | 管理粘贴 | TC-F-016~TC-F-019, TC-ST-004 | ✓ Complete |
| Performance | 性能要求 | TC-P-001, TC-P-002, TC-P-003 | ✓ Complete |
| Security | 安全要求 | TC-SEC-001~TC-SEC-004, TC-ERR-005 | ✓ Complete |
| Compatibility | 兼容性 | TC-C-001~TC-C-004 | ✓ Complete |
| State Mgmt | 状态转换 | TC-ST-001~TC-ST-005 | ✓ Complete |

---

## Notes

1. **测试环境**: 建议在staging环境执行完整测试，生产环境仅执行冒烟测试
2. **自动化优先级**: TC-F-001~TC-F-005, TC-E-001~TC-E-005 建议优先自动化
3. **性能测试工具**: 建议使用Lighthouse进行性能测试
4. **安全测试**: TC-SEC-001~TC-SEC-004 建议由安全专家复核
5. **阅后即焚测试**: 需要注意测试数据的一次性，建议每次测试前重新创建

---

*Generated from PRD: docs/online-clipboard-prd.md*
*Total Test Cases: 45*
