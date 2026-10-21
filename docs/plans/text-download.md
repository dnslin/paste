# 下载文本原文：功能规划与交互原型

日期：2026-10-21。基线：`de839887688c392ecf75e0f63e33684fdee90afa`（main）。分支：`codex/text-download-prototype`。状态：规划与原型完成，正式接入待评审。

本地预览：[下载文本原文原型](http://127.0.0.1:3333/prototype/text-download)。工作目录：`/Users/dnslin/.codex/worktrees/text-download-prototype/paste`。

## 目标与交付

接收者读到文本后，可以直接把正文保存为本地文件，便于使用 JSON、SQL 和配置内容。本轮交付功能规则、实现任务及可操作原型；不接入正式查看页，不改创建流程、API、数据库或线上服务。原型入口 `/prototype/text-download`，只使用演示数据，领取、密码及次数变化均为本地模拟，下载会生成真实演示文件。

## 产品规则

1. “下载原文”只在正文已经可见时出现，与复制、长行换行放在同一个工具栏。未领取、密码错误、领取失败、已过期、次数用尽且未获得正文时，都不能下载。
2. 复用当前正文来源：受密码或次数限制的内容先经过既有 `POST /api/pastes/:id/verify`；无密码且不限次数的内容沿用页面直接提供的正文。下载不重新获取正文，不调用领取接口，不消耗额外次数，不重复询问密码。
3. 下载次数不限，限制对象仍是正文领取次数。最后一次领取返回 `remainingViews = 0` 后，当前页面仍可阅读、复制和下载。提示改为“这是最后一次查看，当前页面仍可阅读、复制和下载。”
4. 页面已持有正文后，即使分享随后过期、被删除或被其他接收者耗尽次数，也不清空当前正文；允许保存已经得到的内容，和现有复制行为一致。刷新、重新打开或新标签页仍通过原有服务端判断。不得把正文放入 localStorage、sessionStorage 或新缓存来恢复已失效内容。
5. 文件内容是原始 `content` 字符串，UTF-8、无额外 BOM。不 trim、不格式化 JSON、不执行 SQL、不改换行、不添加行号、标题或高亮 HTML。页面“长行换行”只改变显示。
6. 使用固定文件名 `paste-<分享ID>.<后缀>`。分享本身没有原文件名，不能承诺还原上传文件名。根据已选语言的规范 ID 使用小型明确映射：JSON → `.json`、JSON with Comments → `.jsonc`、SQL → `.sql`、YAML → `.yaml`、TOML → `.toml`、INI → `.ini`、Nginx → `.conf`，其余语言保存为 `.txt`。不扫描正文猜测格式，不把 Shiki 语言别名直接当成文件扩展名。
7. 一次点击直接交给浏览器下载。固定 `text/plain;charset=utf-8`，内容格式由后缀表达。提示只能说“已发起下载”，不能声称文件已成功写入磁盘。浏览器下载目录、另存为设置和取消操作由浏览器处理。
8. 本地文件准备失败时，保留正文、显示可理解的错误，并允许再次下载。不能通过重新领取修复保存失败，也不能因此再扣次数。无需新增后台下载统计或配额。

## 现状依据与方案

- `app/[id]/page.tsx`：只有有效、无密码、不限次数的文本才在 GET 中提供正文；其余情况只传元数据。
- `paste-access-form.tsx`：显式 POST 成功后把 `{ content, language, remainingViews }` 交给查看器；404 切换为不可用，密码或网络错误可重试。
- `src/lib/paste.ts`：领取与次数扣减在同一事务内完成，最后一次仍返回正文。
- `paste-viewer.tsx`：正文保存在组件状态中，最后一次也允许复制。下载应接在这个状态后面，不根据剩余次数另设门槛。
- Shiki 当前类型仅有语言 ID、名称和别名，没有文件后缀字段。使用上述有限映射，避免新增依赖或手写完整语言数据库。
- 成熟产品 [PrivateBin 的 downloadText](https://github.com/PrivateBin/PrivateBin/blob/master/js/privatebin.js) 从已显示的文本本地导出。这里采用相同的读取后导出模式，具体权限仍由 Paste 原有领取流程负责。
- 浏览器原生 [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob/Blob) 默认保持换行并使用 UTF-8；[download 链接](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a#download) 可以为 Blob 指定建议文件名。当前项目文件下载也已经使用 Blob URL 和临时链接，无需新依赖。

## 界面约定

沿用 `docs/ui-design-system.md` 和现有查看页：深色背景、Geist 字体、琥珀色操作强调、最大 700px 的正文区域。保留返回首页、语言、长行换行及复制。下载使用带文字的次级按钮，正文仍是视觉主体；工具栏下显示建议文件名及“UTF-8 · 保留原始格式”。不引入导出格式菜单、编辑文件名弹窗、压缩包、二维码或其他新能力。

手机宽度不足时，语言和文件名在上，换行、复制和下载移到下一行；按钮可键盘访问，下载反馈可被辅助技术读到。长行仅在代码区内滚动，不撑宽页面。没有新增装饰或动效。

## 原型与正式产品的边界

原型控制栏位于产品画面上方，明确标注“本地原型 · 仅演示数据”。可切换 JSON、SQL、YAML 配置、Nginx 配置和纯文本。演示状态覆盖已领取、需要密码、尚未领取、最后一次、不限次数、已过期和次数用尽。受保护场景的演示密码为 `paste-demo`。

在“最后一次”场景，先领取，后下载，剩余次数保持 0；再点控制栏“模拟重新打开链接”进入次数用尽状态。它模拟服务端重新判断，不代表原型已调用真实领取接口。页面默认展示已领取 JSON，便于直接评审下载位置和保存内容。

## 正式接入任务（本轮不执行）

| 顺序 | 任务与文件范围 | 验收与验证 | 依赖 |
| --- | --- | --- | --- |
| 1 | 在 `src/lib/` 增加有限语言后缀规则及就近测试 | 规范语言 ID 输出确定文件名，其他语言为 `.txt`，覆盖现有 normalizeLanguage 别名结果 | 方案确认 |
| 2 | 在 `src/components/paste/` 增加原文下载按钮及行为测试，使用浏览器 Blob URL | 从传入字符串保存，正确清理 URL；准备失败可重试；下载不会 fetch 或扣次数 | 1 |
| 3 | 接入 `paste-viewer.tsx`，更新最后一次提示及查看器测试 | 只在正文存在时可下载；包括无限制初始正文和最后一次；复制、换行继续可用 | 2 |
| 4 | 隔离环境使用真实创建/领取 API 验收 | 密码错误不领取；正确密码只扣一次；连续下载不请求 verify；最后一次可保存，重开失败；文件 UTF-8 字节与返回 content 对应 | 3 |

前两项可在明确 props 契约后分工；查看器接入及真实领取验证按顺序完成。正式方案只需前端改动，无新增 API、表字段、依赖或迁移。

## 验证计划

项目现有 React 19 / Next.js 16、Vitest + RTL；原型命名导出、就近 `__tests__`，不修改 `src/components/ui/*`。原型独立目录 `src/components/text-download-prototype/`；路由在 `app/prototype/text-download/page.tsx`。规划及截图在本目录。使用 Node 24.18.1 / pnpm 11：

```sh
pnpm test src/components/text-download-prototype/__tests__/prototype.test.tsx
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm build --webpack
git diff --check
```

检查下载文件名、UTF-8 内容、缩进/空行/中文/特殊字符/末尾换行、切换换行后内容不变、密码错误及未领取时无下载、最后一次与重开、重复下载不再计次、本地失败可重试、Blob URL 清理、fetch 零调用。浏览器下载实际文件后核对字节，检查 1440/768/390/320px、键盘和页面横向溢出。

不得将原型模拟密码和次数称为正式权限验收。真实 API、Safari/Firefox、实体手机及线上验收留待正式接入后完成。

## 本轮验证记录

所有检查使用 Node 24.18.1。新工作目录复用现有依赖，不复制业务数据库或密钥。原型独立于正式页面，未新增依赖。

| 实际执行命令 | 结果 |
| --- | --- |
| `node node_modules/vitest/vitest.mjs run src/components/text-download-prototype/__tests__/prototype.test.tsx --maxWorkers=2` | 10/10 通过；独立复审也运行同组测试通过 |
| `node node_modules/vitest/vitest.mjs run --maxWorkers=2` | 31 个文件、255 项全部通过 |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | 通过 |
| `node node_modules/eslint/bin/eslint.js` | 通过 |
| `node node_modules/next/dist/bin/next build --webpack` | 通过，包含 `/prototype/text-download` 静态页面 |
| `git diff --check` | 通过 |
| `node scripts/migrate.mjs`（使用原脚本绝对路径，从 `.next/standalone` 目录运行） | 仅初始化隔离预览数据库；未使用项目原有数据 |
| `PORT=3333 HOSTNAME=127.0.0.1 node server.js`（在 `.next/standalone`） | 生产产物启动，原型可打开 |

首次 `pnpm test <原型测试路径>` 被包管理器的依赖自动检查拦住，未执行测试；未强制重装，改用本地 Node 直接运行上述工具。第一轮 RED 检查因原型模块尚未创建而失败，随后实现通过。初次类型检查发现测试 mock 中的 `this` 缺少类型，补充后通过。全量测试首次以默认并发运行时，现有后台 `share-records` 用例超过原有 5 秒限制；降低 worker 数为 2 后，全量通过，没有修改超时、断言或现有测试。

额外临时反转密码判断，定向密码测试按预期失败；恢复原代码后，10 项原型测试全部通过。临时修改未保留在提交中。

浏览器使用构建后的 standalone 产物，直接下载 JSON、SQL、YAML、Nginx 和纯文本五个实际文件。建议文件名分别为 `.json/.sql/.yaml/.conf/.txt`；与各自演示原文的 UTF-8 字节逐一完全一致，长度分别为 222/173/171/191/195 字节，无新增 BOM。纯文本保留 CRLF、缩进、空行、中文、`<>&` 和末尾换行；切换长行显示后下载不改变内容。

交互核对了密码错误不显示下载、正确密码领取后只扣一次、复制反馈、Tab 聚焦下载及 Enter 发起下载、最后一次连续下载两次后仍可读、模拟重新打开后显示次数用尽、已过期无下载入口、不限次数内容重开后仍可下载。本次页面资源记录中没有 `/api/` 请求。最后一次的两份实际下载文件还用 `cmp` 比对，均与原 YAML 相同。

1440×900、768×900、390×844 和 320×700 四种宽度的页面 `scrollWidth` 均等于视口宽度。两种手机宽度的原型选择器、复制和下载按钮均可见，按钮高 44px；长行未换行时只在代码区内滚动。最后一次的键盘下载检查及截图实际为桌面尺寸（1920×884），不将它记为手机专项检查。具体测量及文件结果见 [browser-checks.json](text-download-prototype/browser-checks.json)。

独立 Agent 实际查看桌面、320px 窄屏、密码错误和最后一次四张截图并复核源代码，未发现需要修改的实质问题；它未独立重复浏览器操作。截图及本轮原型证据不代表正式服务权限或次数验收。

| 场景 | 截图 |
| --- | --- |
| 已领取 JSON · 桌面 | [查看](text-download-prototype/desktop.png) |
| YAML · 390px 手机 | [查看](text-download-prototype/mobile.png) |
| YAML · 320px 窄屏 | [查看](text-download-prototype/mobile-320.png) |
| 密码错误 · 390px 手机 | [查看](text-download-prototype/protected-mobile.png) |
| 最后一次已领取 · 桌面 | [查看](text-download-prototype/last-view-desktop.png) |

未验证：正式接口接入与真实计次、领取后再到期/删除的实际时序、JSONC/TOML/INI/任意未知语言的正式后缀规则、Safari/Firefox、实体手机及跨应用粘贴。浏览器能发起下载并保存测试文件，不代表网站能感知用户实际保存或取消。未推送、合并或部署。
