# 后台搜索与筛选：规划与交互原型

日期：2026-10-21。分支：`codex/admin-search-prototype`，基线：`de83988`。状态：方案和原型已完成，等待整体评审；正式接口、数据库和线上服务不变。

本地体验：[打开后台搜索与筛选原型](http://127.0.0.1:3335/prototype/admin-search)。这是当前机器的预览地址，不是线上部署。

## 目标与范围

管理员在记录增多时，能按分享 ID、文件名、状态和创建日期组合查找，不必逐页翻找。保留现有“文本 / 代码”“文件”页签和后台设计语言。不增加全文搜索、导出、保存视图、已删除历史或新的统计报表。

原型入口：`/prototype/admin-search`。仅使用固定演示数据，不读取真实分享或调用后台 API。刷新后重置。正式功能仍需用户确认方案后实施。

## 拟议产品规则

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

## 当前实现依据

`ShareRecords` 已保留两类列表的分页。`/api/admin/pastes` 和 `/api/admin/files` 目前只接受 page/limit。两者均按 createdAt/id 倒序。文件列表已经返回创建时间，但桌面列表未展示；本功能补上创建时间以便核对日期筛选。

文本状态依据 `src/lib/paste.ts`，优先级为过期、次数用尽、可访问。文件状态依据 `src/components/admin/files-table.tsx` 和 `src/lib/admin/file-contract.ts`。现有删除与清理逻辑不改动。

## 正式接入方案（尚未实施）

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

始终保持正式业务接口和数据不变。正式实施前确认完整方案和日期口径；新增数据库结构或依赖须重新讨论。

## 实际验证记录

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

## 参考

借鉴 [GitHub 的搜索与过滤](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/filtering-and-searching-issues-and-pull-requests) 将文本、状态和日期组合查询的习惯；不引入搜索语法学习成本。日期使用清楚的字段标签，参考 [GOV.UK 日期模式](https://design-system.service.gov.uk/patterns/dates/)。具体布局和组件仍以 Paste 现有后台为准。
