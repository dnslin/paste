# Paste 项目深度审查

后续修复与验收结果见 [修复记录](./fixes.md)。以下为修复前的审查基线。

日期：2026-10-02。审查基线：`d113082`，开始时工作区干净。本次审查当前完整版本，不是某个 PR 的差异。没有修改业务代码。

结论：优先修复阅后即焚和访问限制，再修复创建、复制及后台错误反馈。项目规模适中，不需要大规模重构或新增状态管理、动画库。

## 审查范围与方法

- Agent 1 按 [code-review-and-quality](/Users/dnslin/.agents/skills/code-review-and-quality/SKILL.md) 检查正确性、可读性、架构、安全和性能。
- Agent 2 按 [thermo-nuclear-code-quality-review](/Users/dnslin/.agents/skills/thermo-nuclear-code-quality-review/SKILL.md) 独立检查结构、状态模型、类型边界和重复实现。
- 主 agent 按 [vercel-react-best-practices](/Users/dnslin/.agents/skills/vercel-react-best-practices/SKILL.md)、[review-animations](/Users/dnslin/.agents/skills/review-animations/SKILL.md) 和 [find-animation-opportunities](/Users/dnslin/.agents/skills/find-animation-opportunities/SKILL.md) 检查功能、前端性能、UI 和动画，并复核两个 agent 的发现。
- 阅读了全部公共和管理员 API、页面和代理、业务组件、数据库与加密/认证工具、六个测试文件、配置、迁移、Docker 部署及产品文档。检查了相关库的已安装类型和官方文档。
- 浏览器和 HTTP 复现使用 `/private/tmp/paste-review-20261002` 内的源码副本、独立 SQLite 数据库及一次性测试密钥。没有读写项目已有业务数据。

创建链路是 `PasteCreator → POST /api/pastes → 加密与 SQLite`。无密码读取是 `页面查询/解密 → initialContent → 浏览器 POST /view`。密码读取走 `/verify`。后台由 `proxy.ts` 保护页面，敏感 API 另行验证会话。

最大业务文件是 `languages.ts`，352 行；最大组件是 `PastesTable`，196 行。没有超过 1000 行的业务文件。没有发现管理员敏感 API 直接跳过身份验证的路径。

## 必须优先处理的问题

P1 表示核心功能或访问边界失效；P2 表示明确的功能缺陷或重要质量问题。

### 1. [P1] 无密码阅后即焚可绕过计数

位置：[查看页](/Volumes/data/project/paste/app/[id]/page.tsx:56)、[客户端计数](/Volumes/data/project/paste/src/components/paste/paste-viewer.tsx:40)、[verify 提前返回](/Volumes/data/project/paste/app/api/pastes/[id]/verify/route.ts:78)。

页面先下发明文，计数依赖浏览器后续请求。禁用 JavaScript 或阻止 `/view` 就不会扣次数。对无密码 paste 调用 `/verify`，传任意非空密码，也会直接返回内容而不扣次数。

实际复现：创建 `burnAfterRead=1` 的记录，连续三次 `/verify` 均返回 200 和明文，随后查询 `burnCount` 仍为 1。直接获取页面 HTML 两次也都包含明文。

修复方向：把内容领取与次数消费放在同一服务端操作中。受次数限制的正文只在领取成功后返回。可保留元数据 GET，但删除展示后补记次数的协议。增加未执行客户端脚本、无密码 `/verify` 和耗尽后访问的回归测试。

### 2. [P1] 密码版阅后即焚并发超额读取

位置：[旧值写回](/Volumes/data/project/paste/app/api/pastes/[id]/verify/route.ts:147)。

先读取 `burnCount`，再按 ID 写回旧值减一。多个请求读到相同余额时，都可以获得内容。

实际 HTTP 复现：仅剩一次额度，发出 8 个并发正确密码请求，其中 **4 个返回 200 和内容**，其余返回 404。独立内存 SQLite 验证也确认旧值写回会丢失扣减。

修复方向：使用数据库当前值做条件扣减，并且仅在领取额度成功时返回正文。将检查、消费与相关更新放在短事务中。与上一项共用业务操作，删除两套计数实现。

### 3. [P1] 客户端伪造 IP 可以绕过访问限制

位置：[创建 IP 获取](/Volumes/data/project/paste/app/api/pastes/route.ts:12)、[密码 IP 获取](/Volumes/data/project/paste/app/api/pastes/[id]/verify/route.ts:9)、[直接开放端口](/Volumes/data/project/paste/docker-compose.yaml:8)。

接口直接信任 `X-Forwarded-For`。当前 Compose 没有配置覆盖该头的受信代理。已安装的 Next.js 也会保留客户端传来的转发头。

实际复现：同一个伪造头值创建 60 次成功，第 61 次为 429；只替换该头值，下一次立刻为 201。密码锁定使用同样的 IP 获取函数，因此也受这个边界问题影响；密码锁定绕过未单独做批量请求测试。

修复方向：明确部署入口的可信来源，让受信入口覆盖客户端提供的转发头。直接暴露服务时，不应将这些头直接用作访问限制身份。这里需要修复一个真实入口边界，不需要新增通用安全框架。

## 功能与 UI 缺陷

| 优先级 | 问题与证据 | 修复方向 |
| --- | --- | --- |
| P2 | [创建 URL](/Volumes/data/project/paste/app/api/pastes/route.ts:118) 默认强制 HTTPS。本地 HTTP 服务实际返回了 `https://127.0.0.1:3100/...`，不能按返回的链接打开。 | 使用正确的公开来源；代理部署明确协议与域名。 |
| P2 | [成功弹窗](/Volumes/data/project/paste/src/components/paste/success-dialog.tsx:34) 用 `prevOpen` 检测打开，但创建后首次挂载时已经 `open=true`。真实浏览器创建流程中，监测到复制调用次数为 **0**。[现有测试](/Volumes/data/project/paste/src/components/paste/__tests__/copy-functionality.test.tsx:53) 只测试人为的 false→true 更新。 | 删除上一轮 open 状态；在创建成功事件或打开后的 effect 中复制，处理权限拒绝。测试从创建器提交开始。 |
| P2 | [创建器](/Volumes/data/project/paste/src/components/paste/paste-creator.tsx:59) 只处理成功响应，400/429/500 不显示服务器错误，网络异常没有 catch。实测 500001 字符仍能点击提交，输入保留，但失败后没有新的错误提示。编辑器本来已有超长警告，问题在于提交规则和服务器反馈没有接上。 | 统一长度规则并禁用超长提交；保留输入，展示错误原因和重试。 |
| P2 | [创建密码](/Volumes/data/project/paste/app/api/pastes/route.ts:82) 无长度上限，[解锁](/Volumes/data/project/paste/app/api/pastes/[id]/verify/route.ts:47) 拒绝超过 1000 字符。实测 1001 字符密码创建为 201、解锁为 400。纯空白密码也能通过 API 创建，表单却拒绝提交。 | 共用创建、验证和表单密码规则。 |
| P2 | [分页调用](/Volumes/data/project/paste/src/components/admin/pastes-table.tsx:175) 没有传总数、页大小和页大小回调。实测列表有 15 行，却显示 `Showing 0-0 of 0`，选择器显示 10，修改选择无效。删除末页最后一项还会进入隐藏分页的空列表分支。 | 固定分页就删掉无效选择器；保留选择器则使契约必填，并将页大小传给 API。删除后收回有效页码。 |
| P2 | [详情弹窗](/Volumes/data/project/paste/src/components/admin/paste-detail-modal.tsx:35) 用 `fetchedId` 推导加载，失败响应不会结束加载。实测删除一条仍留在列表中的记录，再打开详情，404 已返回但弹窗只有标题和持续旋转的图标。 | 删除单项 ID 缓存；明确 loading/success/error，每次打开读取当前记录，并提供重试。 |
| P2 | [语言表](/Volumes/data/project/paste/src/lib/languages.ts:115) 344 个选项中有 **181 个不被已安装 Shiki 3.22.0 支持**，包括 `docker-compose`、`kubernetes`、`helm`。实际调用 `modelica` 得到不支持语言错误，组件静默退回纯文本。 | 依据 Shiki 实际语法维护 ID；将配置类型的展示名映射到 YAML 等正确语法。补充目录与库能力对照测试。 |

其他确认问题：

- **[P2] 密码哈希偏离明确要求。**[创建](/Volumes/data/project/paste/app/api/pastes/route.ts:89)与[验证](/Volumes/data/project/paste/app/api/pastes/[id]/verify/route.ts:104)使用无盐 SHA-256。PRD 和测试用例明确要求 bcrypt。数据库泄露时，这些哈希容易被批量猜测，也暴露相同密码关系。复用现有 `bcryptjs`，不需新增依赖。
- **[P2] 管理员登录缺少失败限流。**[登录接口](/Volumes/data/project/paste/app/api/admin/login/route.ts:31)对公开请求执行 bcrypt，但没有失败次数限制。存在持续猜测和 CPU 消耗的具体入口。先修复可信 IP 边界，再复用现有限流能力。
- **[P2] “自动删除/销毁”与实际保留行为不一致。**[选项文案](/Volumes/data/project/paste/src/components/paste/options-panel.tsx:94)承诺自动删除，实际只拒绝公开读取，密文、IV、密码哈希继续保存。[管理员详情](/Volumes/data/project/paste/app/api/admin/pastes/[id]/route.ts:33)仍可解密。需确定产品要表达停止访问，还是清除内容；实施删除会改变数据保留行为。本次没有执行删除。
- **[P2] 错误被改写为正常业务结果。**[查看页](/Volumes/data/project/paste/app/[id]/page.tsx:27)将数据库/解密失败显示为不存在；[管理员详情](/Volumes/data/project/paste/app/api/admin/pastes/[id]/route.ts:37)将解密失败字符串当作成功正文。应保留日志上下文并呈现服务故障，避免把运维问题伪装成已删除记录。
- **[P2] Docker 不使用被测试的锁定依赖。**[构建阶段](/Volumes/data/project/paste/Dockerfile:12)只复制 package.json 后运行 npm install，[运行阶段](/Volumes/data/project/paste/Dockerfile:53)又重新安装依赖。部署版本可能与本次锁文件验证不同。应使用唯一锁文件，并复用同次构建的运行依赖。

## 结构简化建议

1. **收敛 paste 状态和内容领取规则。**现有 [getPasteStatus](/Volumes/data/project/paste/src/lib/admin/utils.ts:3) 属于 paste 业务，却放在 admin 下。页面、公开 API、verify、view 又各自判断状态。将规则放到 paste 业务层，让入口只负责请求解析和响应。页面可接收明确的查看结果，减少 `initialStatus + hasPassword + optional content` 组合。
2. **删除无法表达失败的状态设计。**复制的 `prevOpen`、详情的 `fetchedId`、分页的空默认回调都隐藏了真实行为。直接用事件和明确请求结果，比引入通用数据管理层更简单。
3. **迁移只保留一个来源。**[手写 migrate.js](/Volumes/data/project/paste/scripts/migrate.js:22) 与 Drizzle schema/生成迁移重复维护表。表存在时只打印最新，并未应用迁移历史。当前表定义基本一致，未发现已发生的 schema 不一致事故。使用已有 Drizzle migrator，删除手写表定义即可。
4. **高亮共用实际入口。**编辑器和查看器各自维护导入、主题和错误输出。[编辑器](/Volumes/data/project/paste/src/components/paste/code-editor.tsx:53)只取消定时器，未防止已经开始的异步高亮覆盖新结果。fallback 未转义 `&`，会改变 `&lt;...&gt;` 一类原文的展示。提取纯高亮函数，复用统一转义，并只提交最新请求结果。异步覆盖风险本次未做延迟注入复现。
5. **孤立实现作为清理候选。**`CodeBlock` 没有运行时引用，行号只存在于这个未接入组件；`getSessionToken` 无调用；`ApiError` 只有自身测试使用。若需要行号，应将实际查看器接入；若不需要，应删掉孤立实现。不要为了保留这些代码而新增调用层。

## Vercel React 性能检查

| 项目 | 判断 | 建议 |
| --- | --- | --- |
| Shiki 动态加载 | 现有 `import('shiki')` 是正确方向，语法和主题会按需加载。官方也指出 Next.js 能处理这些动态导入。 | 不要机械替换成只支持 Web 语言的包。先修正语言目录；普通只读展示可考虑服务端高亮，密码解锁及编辑预览仍需按交互路径设计。[Shiki Next.js 文档](https://shiki.style/packages/next) |
| 延后加载低频弹窗 | 成功弹窗静态导入，虽然 JSX 条件挂载，仍进入首页依赖图。 | 可以使用现有 `next/dynamic`，在创建成功前无需下载弹窗逻辑。属于可选优化，需要以构建对比确认收益。[Next.js Lazy Loading](https://nextjs.org/docs/app/guides/lazy-loading) |
| 后台首屏请求 | 统计和列表分别在 effect 中请求，依赖客户端开始执行；两者已独立触发，没有串行瀑布。 | 可把首屏查询移入受认证的服务器页面，表格保留后续分页交互。当前应用很小，不必为此引入 SWR。[Next.js 数据获取](https://nextjs.org/docs/app/getting-started/fetching-data) |
| 同步 SQLite 查询 | 当前驱动在同一进程同步执行。 | 不把 SQL 查询改写成 Promise.all 当作性能修复。需要减少扫描时，应评估合并统计查询。 |
| 客户端边界 | 首页是 Server Component；后台 client layout 的 children 仍可由服务端渲染。 | 不应声称整个后台因此都变为 client。可以只抽出交互导航，但不是当前首要工作。 |

本地生产首页本轮记录到 11 个脚本资源，`encodedBodySize` 合计约 218 KiB，未进入 Preview。构建产物全部 JavaScript chunks 共约 12.57 MiB，其中包含动态语法等文件；这不是首页下载量。没有测量真实设备 LCP、INP 或网络受限下的表现，也没有对优化收益做百分比推测。

Shiki 的 shorthand 已自行缓存高亮器，不建议再维护一套同功能实例缓存。[Shiki 使用说明](https://shiki.style/guide/install)

## UI 检查

保留现有暗色、琥珀强调色和代码编辑器布局。1280px 桌面和 390px 手机查看都可用；390px 页面宽度也是 390px，没有横向溢出。手机选项纵排合理，提交按钮需要向下滚动才可见，不构成阻断。

建议按这个顺序改善：

1. **反馈完整。**创建、复制、详情和会话失效都应有可理解的结果。复制被浏览器拒绝时仍展示链接，并允许手动选择或重试，不能显示假成功。
2. **语言统一。**标题、按钮、编辑标签和后台是英文，选项是中文。选择一种主语言。成功链接应可直接打开；访问结束提示提供返回首页入口。
3. **编辑器可操作。**textarea 没有稳定的关联 label；Language 文字也没有关联 combobox。Edit/Preview 缺少 tab 语义。当前 Tab 始终被截获用于缩进，应提供并说明退出编辑器的键盘方式。登录密码输入也应有明确标签。
4. **阅读能力落实。**PRD 要求的行号未在实际查看器显示；可复用已有行号设计。对长行提供换行选择，可减少手机上的横向操作。
5. **提升弱文本可读性。**计数和 placeholder 使用 `--text-tertiary: #52525b`，在暗背景上视觉上偏弱。可提升到现有次级文本色，并在实施时实测对比度。当前报告没有把视觉判断写成已测得的合规数值。
6. **后台数值含义准确。**昨日为 0、今日新增时，卡片仍显示 `+0%`。这种基数无法计算百分比，宜显示“新增”或不显示比例。统计的今日起点使用服务器本地时间，趋势 SQL 使用 UTC，部署时也应统一统计日边界。

阅后内容可采用先显示提示、用户点击查看再领取的交互，避免预取或链接预览意外消耗次数。它依赖前述服务端领取规则修复，不应只增加一个前端确认框。

README 的“端到端加密”也需要校正。本项目由服务端持有密钥，并可由后台解密，属于服务端加密存储。成熟产品 PrivateBin 则在浏览器中加密与解密；两者的隐私承诺不同，当前最小改进是使用准确文案。[PrivateBin 官方说明](https://privatebin.info/)

截图：[桌面首页](/Volumes/data/project/paste/docs/reviews/2026-10-02/desktop.png)、[手机首页](/Volumes/data/project/paste/docs/reviews/2026-10-02/mobile.png)、[生产后台](/Volumes/data/project/paste/docs/reviews/2026-10-02/admin.png)。截图中的记录和统计均为临时测试数据。

## 动画审查

### 发现表

| Before | After | Why |
| --- | --- | --- |
| [首页](/Volumes/data/project/paste/src/components/paste/paste-creator.tsx:18) 每项 400ms、交错 100ms，最后按钮约 700ms 才结束入场 | 高频工具页直接显示表单；若保留，只做一次 150ms 的 opacity 过渡 | 重复入场没有帮助编辑和提交，先减少等待感。 |
| [成功图标](/Volumes/data/project/paste/src/components/paste/success-dialog.tsx:66) 从 `scale: 0` 弹出 | 删除图标弹跳，或 `scale(0.95)` + opacity 0 → 1，180ms，`cubic-bezier(0.23, 1, 0.32, 1)` | 当前是装饰性“凭空出现”，成功弹窗本身已有进入动画。 |
| [密码提示](/Volumes/data/project/paste/src/components/paste/password-prompt.tsx:58)和[登录错误](/Volumes/data/project/paste/src/components/admin/login-form.tsx:79)没有减少动态效果处理 | 使用已有 `useReducedMotion` 或 `MotionConfig reducedMotion="user"`；保留 150ms 淡入，去掉位移 | 直接读取 matchMedia 的其他组件不能覆盖这两个入口。[Motion 官方说明](https://motion.dev/docs/react-accessibility) |
| [下拉调用](/Volumes/data/project/paste/src/components/paste/language-selector.tsx:53)在减少动态效果开启时仍运行 `enter` 150ms | 在业务调用处添加减少动态效果覆盖；必要时在全局样式只限制位移/缩放 | 浏览器实测 `reducedMotion=true` 仍有该动画。保持 `src/components/ui/*` 不变。 |
| [Logo](/Volumes/data/project/paste/src/components/logo.tsx:46)和[导航](/Volumes/data/project/paste/app/admin/layout.tsx:27)hover 缩放没有指针类型限制 | 删除导航缩放，或只在 `(hover: hover) and (pointer: fine)` 下启用 | 导航强调无需缩放；触摸用户不应获得粘滞 hover 动作。 |
| [统计图](/Volumes/data/project/paste/src/components/admin/stats-cards.tsx:62)和[趋势图](/Volumes/data/project/paste/src/components/admin/trend-chart.tsx:97)保留库默认绘制动画 | 对数据阅读场景使用 `isAnimationActive={false}` | 已安装类型显示 Area 默认 1500ms，Bar 默认 400ms。统计阅读无需等待图形展开。没有测得掉帧，不把风险写成性能事故。 |

### 动画判定

- **体验与可删复杂度：**首页交错入场和成功图标弹跳优先删除或缩短。
- **可访问性：**减少动态效果覆盖不完整。复用已经安装的 Framer Motion 能力，不要新增动画库。
- **性能：**优先 transform/opacity；不建议给阅读区、表格和数据图增加装饰动画。实际流畅度仍需要设备测试。

**Block（针对当前动画质量）：**存在 `scale(0)` 和未覆盖的减少动态效果入口。修正这些问题后再评估通过；该判定不表示本次修改过代码。

### 新动画机会

| # | Location | Today | Purpose | Frequency | Suggested motion |
| --- | --- | --- | --- | --- | --- |
| 1 | [创建反馈](/Volumes/data/project/paste/src/components/paste/paste-creator.tsx:59) | 失败响应没有消息 | Feedback：让用户确认提交结果 | 偶发 | 先实现错误消息，再可选加 opacity 0→1、translateY(-4px)→0，150ms，`cubic-bezier(0.23, 1, 0.32, 1)`；减少动态效果时只保留淡入。 |

明确拒绝的候选：

- Edit/Preview 和编辑器快捷操作：高频，键盘响应应该直接发生。
- 高亮代码、行号、正文：用户需要阅读，逐字和滚动入场会干扰任务。
- 后台图表和统计数字：信息阅读优先，不新增滚动数字或图形绘制。
- 网格背景、按钮粒子、光束边框：没有反馈或状态用途，项目也禁止粒子/WebGL。

这个界面需要更少且更一致的动效。新增机会只有错误反馈的轻淡入，而且消息本身比动画重要。如需形成实施计划，可使用 `improve-animations plan 创建错误消息的淡入反馈`。

## 验证结果

| 实际执行命令或操作 | 结果 |
| --- | --- |
| `node node_modules/vitest/vitest.mjs run` | 6 个文件、52 个测试通过；弹窗缺少 Description 的警告仍存在。 |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | 通过。 |
| `node node_modules/eslint/bin/eslint.js` | 失败：`scripts/migrate.js` 的 3 个 require 导入违反 `no-require-imports`。没有修改规则或跳过文件。 |
| `pnpm --config.verify-deps-before-run=false build`，临时副本、Node 24.19.0 | 默认 Turbopack 生产构建通过，类型检查及静态页面生成通过。 |
| 临时副本 `node scripts/migrate.js` | SQLite 表初始化成功。 |
| 独立 HTTP 请求脚本 | 确认无密码计数绕过、并发超额读取、错误 HTTPS 链接、超长密码无法解锁、伪造 IP 绕过创建限流。 |
| 浏览器创建、后台和手机流程 | 确认首次复制调用为 0、分页显示错误、404 后持续加载、390px 无横向溢出、减少动态效果覆盖不完整。 |
| 安装版本的 Shiki 能力对照 | 344 个选项，181 个不受支持。 |

环境说明：当前 pnpm 11 安装流程未自动执行原生模块构建，系统 Node 26 也没有适配的 SQLite 预编译模块。使用已安装的 Node 24 构建依赖后完成运行验证。最初隔离目录的 node_modules 软链接导致 Turbopack 拒绝构建，复制真实依赖目录后默认构建通过。依赖安装临时改动的 pnpm-workspace.yaml 已恢复。

现有测试没有 API、数据库生命周期、管理员组件或自动浏览器测试。`tests/online-clipboard-test-cases.md` 是测试用例文档，不是可执行 E2E 测试；AGENTS.md 所述 64 个测试已与当前实际 52 个不同。

未验证：Docker 镜像实际构建/启动、生产反向代理配置、Firefox/Safari、真实手机手势与帧率、线上性能指标、依赖漏洞全量扫描。生产页面冒烟使用 Next 启动器；没有完成 standalone 打包部署验收。

## 建议实施顺序

1. 统一服务端内容领取与次数消费，并覆盖并发和绕过路径。
2. 修复可信 IP 边界；统一密码规则，复用 bcrypt 和登录限流。
3. 修复分享 URL、自动复制、创建失败、详情失败和分页。
4. 校正语言目录、删除/加密承诺、迁移与 Docker 依赖来源。
5. 补齐标签、行号、文案与减少动态效果；再用产物对比决定是否进一步拆分加载。

这些应拆成独立的小改动。每项先补真实用户流程或 API 回归测试，再实现修复。当前审查建议 **Request changes**，不建议仅凭测试和构建通过就认定核心功能可靠。
