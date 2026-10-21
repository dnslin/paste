# 后台搜索与筛选：规划与交互原型

日期：2026-10-21。分支：`codex/admin-search-prototype`，基线：`de83988`。方案已获用户确认，正式后台已完成接入、测试与独立评审；未合并或部署。

本地体验：[打开后台搜索与筛选原型](http://127.0.0.1:3335/prototype/admin-search)。这是当前机器的预览地址，不是线上部署。

## 目标与范围

管理员在记录增多时，能按分享 ID、文件名、状态和创建日期组合查找，不必逐页翻找。保留现有“文本 / 代码”“文件”页签和后台设计语言。不增加全文搜索、导出、保存视图、已删除历史或新的统计报表。

原型入口：`/prototype/admin-search`。该入口继续使用固定演示数据。正式功能接入 `/admin` 及现有两个后台列表接口。

## 已确认产品规则

| 条件 | 行为 |
| --- | --- |
| 文本搜索 | 搜索 ID 片段，区分大小写；不搜索正文 |
| 文件搜索 | ID 片段或文件名关键词；ID 区分大小写，文件名不区分英文大小写 |
| 搜索字符 | 去除首尾空格，`%`、`_` 都作为普通字符 |
| 状态 | 文本：全部、可访问、已过期、查看次数用尽；文件另有下载次数用尽、等待清理、清理失败 |
| 创建日期 | 北京时间，起止日期均包含当天；可只填一端；同一天有效，开始晚于结束时显示错误并保留原结果 |
| 条件组合 | 关键词与状态与日期同时满足；文件的关键词匹配 ID 或文件名 |
| 生效时机 | 点击“查询”或按 Enter 应用；编辑中不发请求；新查询回第 1 页 |
| 重置 | 清空当前类型的全部条件并回第 1 页；保留每页条数 |
| 切换页签 | 各自保留草稿、已应用条件、页码和每页条数 |
| 结果 | 最新创建在前，同一时间按 ID 倒序；结果数和分页都基于全部匹配记录 |

用户已确认：ID 按片段匹配并区分大小写。

成功删除的记录已被物理移除。文件过期或次数用尽后还会自动清理，无法通过该功能找回完整历史。状态筛选只查询当前仍保留的记录。文件的清理状态优先于访问状态，不能将等待清理或清理失败列为“可访问”。

## 界面与体验

- 沿用 `docs/ui-design-system.md` 的深色、琥珀色、Geist 字体和已有表格；不重做后台导航。
- 页签下方放置搜索、状态、创建起止日期，以及“查询”“重置”。字段均有可见标签。日期旁注明北京时间。
- 结果区显示“找到 N 条”和当前生效条件，区分输入草稿与实际结果；可清空当前条件。文件空间用量始终是全局值，不随查询变化。
- 手机端字段自然换行，日期各占一行；记录合并展示 ID、状态、创建时间，查看操作保持同屏，长文件名可换行。
- 空结果显示“没有匹配的分享”和“清空筛选”；无数据另显示“暂无分享记录”。加载中保留条件并禁用查询；失败显示“重试”，不丢失草稿与已应用条件。
- 原型工具栏可切换正常、加载中、加载失败、暂无记录，用于核对异常画面。工具栏与产品区域分开，正式实现不包含它。

## 原型阶段的实现依据

`ShareRecords` 已保留两类列表的分页。`/api/admin/pastes` 和 `/api/admin/files` 目前只接受 page/limit。两者均按 createdAt/id 倒序。文件列表已经返回创建时间，但桌面列表未展示；本功能补上创建时间以便核对日期筛选。

文本状态依据 `src/lib/paste.ts`，优先级为过期、次数用尽、可访问。文件状态依据 `src/components/admin/files-table.tsx` 和 `src/lib/admin/file-contract.ts`。现有删除与清理逻辑不改动。

## 正式接入方案（2026-10-21 已确认）

继续使用现有两个列表接口，不合并数据源、不新增表或依赖：

```text
GET /api/admin/pastes?page=1&limit=15&q=AbC&status=active&createdFrom=2026-10-01T00:00:00%2B08:00&createdBefore=2026-10-22T00:00:00%2B08:00
GET /api/admin/files?page=1&limit=15&q=交付&status=delete_failed
```

- `createdFrom` 为开始日零点，`createdBefore` 为结束日次日零点；数据库使用左闭右开范围，避免漏掉最后一秒或毫秒。
- 数据库先筛选，再查询匹配总数与分页数据；同一请求共用同一个当前时刻，沿用鉴权、字段白名单和现有分页边界。
- ID 采用大小写敏感的字面包含匹配；文件名使用大小写不敏感匹配。查询中的通配符须按字面处理。
- 状态条件保持现有优先级。文本接口不能接受文件清理状态；非法参数返回现有结构的明确错误。
- 保留文件全局存储统计；在结果区单独显示匹配数量。删除和清理后保留条件重新查询，越界页沿用现有回到末页行为。
- 第一版延续当前页内状态管理。与现有列表一致，刷新页面重置；不新增 URL 同步、全局状态库或全文索引。

## 分步实施与验收

1. **本轮原型**：固定规则、制作演示数据和查询界面；组件测试验证查询、组合条件、分页、页签保留、清空、无结果和重试；浏览器检查键盘及 320/390/768/1024/1440px。
2. **文本查询闭环**（确认方案后）：扩展文本列表 API 和表格。测试非当前页命中、状态优先级、日期边界、无条件回归和鉴权。涉及文本 API、表格及就近测试。
3. **文件查询闭环**（依赖第 2 步确认通用规则）：扩展文件 API 和表格，验证中文文件名、字面匹配、清理状态、全局存储量和删除后回页。涉及文件 API、表格及就近测试。
4. **集成验收**：全量测试、类型、Lint、构建；隔离数据的真实后台浏览器查询与窄屏验收。实际接口完成前不宣称服务端搜索已经可用。

不预先增加索引或搜索服务。以实际记录规模检查查询耗时；字面包含搜索不能假设普通索引能解决性能问题。

## 原型文件与验证命令

`app/prototype/admin-search/page.tsx`、`src/components/admin-search-prototype/` 为本轮新增代码。复用 Button、Dialog、Pagination 和 Radix Tabs；不修改 `src/components/ui/*`，不新增依赖。

使用已有命名导出、单引号及就近 `__tests__` 约定。例如：

```tsx
<Pagination page={page} totalPages={totalPages} total={results.length}
  pageSize={pageSize} onPageChange={setPage}
  onPageSizeChange={(value) => { setPageSize(value); setPage(1) }} />
```

```sh
pnpm test src/components/admin-search-prototype
pnpm test
pnpm exec tsc --noEmit --incremental false
pnpm lint
pnpm build
git diff --check
```

仅扩展后台列表查询及必要界面，不改变公开分享创建、领取和下载规则，不新增数据库结构或依赖。真实接口验证使用隔离的本地数据，不操作线上服务。

## 原型阶段实际验证记录

环境：Node 24.18.1、pnpm 11.19.0、Ego Lite Chromium。所有工作在独立工作目录进行，原目录中的二维码改动保留。没有增加依赖或修改锁文件。

| 实际执行命令 | 结果 |
| --- | --- |
| `pnpm install --frozen-lockfile --offline` | 复用本地缓存安装锁定依赖，通过 |
| `pnpm test src/components/admin-search-prototype` | 2 文件、最终 13 项通过；覆盖数据筛选和组件交互，独立评审也执行通过 |
| `pnpm test` | 32 文件、258 项通过；现有 Motion 测试有减少动态效果提示，无失败 |
| `pnpm exec tsc --noEmit --incremental false` | 通过 |
| `pnpm lint` | 通过 |
| `node scripts/migrate.mjs` | 只初始化本工作目录的独立空库，供生产构建使用，通过 |
| `pnpm build` | 生产构建通过，包含 `/prototype/admin-search` 静态路由 |
| `git diff --check` | 通过 |
| `HOSTNAME=127.0.0.1 PORT=3335 node .next/standalone/server.js` | 实际启动生产产物，完成浏览器验证 |

浏览器实际验证了 ID 片段及大小写、从第二页查找第一页记录、文件名/状态/同日日期组合、清理状态、独立分页与页签条件保留、无匹配与暂无记录、加载禁用、失败重试和详情关闭回焦点。输入 ID 后按 Enter 可以查询；Tab 从搜索框到状态选择框正常。

日期先通过浏览器输入事件核对组合条件，再使用真实键盘输入起止日期复核：2026-10-21 同日找到 3 条文件；结束日期改成 2026-10-20 后显示范围错误，保留原来的 3 条结果。原型没有 `/api/` 资源请求；减少动态效果时骨架的计算动画为 `none`。

320、390、768、1024、1440px 五种宽度下，页面宽度均等于视口宽度，输入及按钮均未越界。手机长文件名正常换行，状态、日期和查看操作可见。独立评审实际查看了桌面及 320/390px 截图，没有发现需阻断交付的问题。交互与布局证据见 [browser-checks.json](admin-search-prototype/browser-checks.json) 和 [layout-verification.json](admin-search-prototype/layout-verification.json)。

未验证 Safari、Firefox、实体手机以及正式后台接口和数据库筛选。示例数据的筛选成功不代表正式功能已经接入。

截图：[桌面文本](admin-search-prototype/desktop-text.png)、[桌面组合筛选](admin-search-prototype/desktop-filtered.png)、[390px 手机](admin-search-prototype/files-390.png)、[320px 窄屏](admin-search-prototype/files-320.png)、[无匹配结果](admin-search-prototype/empty-results.png)、[失败重试](admin-search-prototype/error-retry.png)。

## 正式实现与验收（2026-10-21）

正式 `/admin` 的文本、文件列表均已连接数据库查询。两个现有列表接口复用 `src/lib/admin/query-filters.ts` 生成参数化查询条件；总数与分页数据共用条件和同一个当前时间。ID 和文件名使用字面包含匹配，未新增索引、数据表、依赖或公开分享规则。

`src/components/admin/record-filters.tsx` 负责两类列表共用的筛选表单、北京时间转换和生效条件。两个列表继续各自管理分页与请求取消。新条件加载时隐藏旧结果；刷新、翻页仍保留原列表与更新提示。错误后保留表单，重试继续使用已提交条件，尚未提交的草稿也保留。

文件列表增加北京时间创建时间。文件占用、可用空间继续使用全局存储数据；原来用列表 total 显示的重复“文件数量”移除，匹配数独立显示为“找到 N 条”。文件表格从 1024px 起展开全部列，768px 继续把元信息与操作放在同屏两列中，避免新增日期列挤出操作。

| 实际执行 | 结果 |
| --- | --- |
| 后端新增 API 测试先运行 | 14 项按预期失败，1 项通过；接入后再补文件删除场景，最终 16 项通过 |
| `pnpm test app/api/__tests__/admin-search.test.ts app/api/__tests__/routes.test.ts app/api/__tests__/admin-files.test.ts` | 独立后端评审执行，3 文件、52 项通过 |
| `pnpm test src/components/admin/__tests__/record-filters.test.tsx src/components/admin/__tests__/pastes-table.test.tsx src/components/admin/__tests__/files-table.test.tsx src/components/admin/__tests__/share-records.test.tsx` | 实现与独立前端评审分别执行，4 文件、24 项通过 |
| `pnpm test` | 34 文件、283 项通过；现有 Motion 减少动态效果提示保留，无失败 |
| `pnpm lint` | 通过 |
| `pnpm exec tsc --noEmit --incremental false` | 通过 |
| `pnpm install --frozen-lockfile --offline`、`node scripts/migrate.mjs`、`pnpm build`（隔离源码副本） | 默认 Turbopack 生产构建通过，使用独立空库，不覆盖原型预览产物 |
| `git diff --check` | 通过 |
| `node /tmp/paste-admin-search-implementation.lF8ZjQ/run-preview.mjs` | 启动实际 standalone 生产产物，绑定本机 3336 端口，使用临时凭据、数据库和文件目录 |
| `node /tmp/paste-admin-search-implementation.lF8ZjQ/seed-live.mjs` | 通过实际创建接口写入 20 条文本、18 个文件；日期边界、字面文件名查询、全局空间与未登录 401 检查通过 |

真实浏览器使用正式管理员登录，验证跨页 ID 片段查找与大小写、同日及反向日期、文件名大小写与特殊字符、分页及页签条件保留、刷新和清理后的条件保留。文本通过真实领取耗尽一次查看，随后可被“查看次数用尽”筛选查到。文件在筛选结果中实际删除后，条件仍保留、结果变为空，文件用量从 998 B 降至 943 B。另通过正式上传补充长文件名记录用于窄屏检查。

为构造可复现的历史日期范围，仅调整了隔离库中 4 条已由创建 API 写入的文本创建时间。浏览器还明确模拟了一次网络失败和一次慢查询，验证重试沿用已提交条件、保留草稿，并在新查询等待期间隐藏旧记录和禁用表单。其他查询、创建、领取、删除和清理均使用真实接口。

文件在 320、390、768、1024、1440px 下均无页面或表格横向溢出，表单和行操作均处于视口内；文本另检查 320、768、1440px。截图等待控件布局稳定后保存。证据：[浏览器记录](../verification/admin-search/browser-checks.json)、[真实接口检查](../verification/admin-search/live-api-checks.json)、[尺寸记录](../verification/admin-search/layout-verification.json)、[文本日期查询](../verification/admin-search/text-date-query.png)、[文件关键词查询](../verification/admin-search/file-keyword-query.png)、[320px 文件列表](../verification/admin-search/files-320.png)。

独立评审完成两条轨道：后端审查查询/状态/日期/鉴权/存储口径；前端审查草稿/请求取消/结果关联/分页及管理动作。两者均通过，无未解决的实质发现。评审各自在临时副本反转日期边界或范围判断，相关测试均按预期失败，恢复后通过。前端评审另外实际查看了四张正式页面截图及尺寸记录，视觉复核通过。评审未修改共享源码，没有把主 Agent 的浏览器操作作为自己的独立交互验收。

未验证 Safari、Firefox、实体手机或线上现存业务数据。原目录的其他任务、生产数据库及线上服务未修改；未合并、未推送或部署。

## PR #36 的 P2 修复与复审（2026-10-21）

针对原型与正式后台重复维护筛选表单的问题，原型直接复用现有 `RecordFilters`、`RecordFilterValues` 和 `EMPTY_RECORD_FILTERS`。`RecordsPanel` 从 68 行缩减至 35 行，只保留演示场景、已应用条件、筛选结果及分页。重复的草稿、日期错误、字段布局、状态选项、条件标签与重置函数已删除；空结果按钮通过原生 form reset 触发共用重置路径。没有增加包装组件或配置项。

演示数据只 type-import 共用值类型，删除不再使用的重复类型、空条件和选项。示例记录、筛选算法、结果表格、正式表单、后台列表及 API 均未改动。条件标签沿用正式组件的位置，显示在结果数量之前；筛选、草稿、错误及分页行为保持。

新增两条交互回归，覆盖未提交关键词/状态/日期随页签保留，以及清空条件同时清除草稿和日期错误、保留每页数量。现有测试断言未削弱；数据测试仅改为使用共用空条件。修改前后定向 3 文件、18 项均通过。

| 本轮实际检查 | 结果 |
| --- | --- |
| `pnpm test` | 34 文件、285 项通过 |
| `pnpm lint` | 通过 |
| `pnpm exec tsc --noEmit --incremental false` | 通过 |
| `pnpm build`（隔离源码副本，Node 24.18.1 / pnpm 11.19.0） | 默认 Turbopack 生产构建通过 |
| `git diff --check` | 通过 |
| 五轴质量 Agent 独立复审 | Approve，原型/表单/后台列表/页签/API 共 7 文件、55 项通过 |
| 严格维护性 Agent 独立复审 | Approve，7 文件、55 项通过，P2 可关闭 |

质量复审还在临时副本把空结果按钮的 reset 改为普通 button，原有清空恢复测试按预期失败，恢复后 7 项原型交互测试通过。两位 Agent 均未修改共享源码，未独立执行本轮全量、构建或浏览器检查。

主 Agent 在新的隔离生产产物中使用 Chromium 核对 Enter 查询、空结果清空、文件名/状态/日期组合、反向日期保留结果、清空草稿及错误、页签保留草稿和页码、重置保留每页数、错误重试及加载禁用。原型仍无 `/api/` 请求。320/390/768/1024/1440px 均无页面横向溢出或控件越界，实际查看了本轮手机截图。未重做正式 API 的真实数据浏览器验收，正式接口未改；Safari、Firefox 和实体手机仍未验证。

本轮仅提交修复、测试及本记录，并更新当前 PR；不合并或部署。

## 参考

借鉴 [GitHub 的搜索与过滤](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/filtering-and-searching-issues-and-pull-requests) 将文本、状态和日期组合查询的习惯；不引入搜索语法学习成本。日期使用清楚的字段标签，参考 [GOV.UK 日期模式](https://design-system.service.gov.uk/patterns/dates/)。具体布局和组件仍以 Paste 现有后台为准。
