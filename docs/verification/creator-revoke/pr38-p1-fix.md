# PR #38：P1 修复与同步 main 后验证

日期：2026-10-21。分支：`codex/creator-revoke-prototype`。本轮只修复文件创建测试夹具的缺参问题，并同步最新 `main`；不合并、不部署。

## 修复范围

任务分支已从原基线更新到 `main@67db8a5281612d127c8ab80c5c752f1b1466b65f`，保留该基线的后台搜索与原文下载。

`app/api/__tests__/admin-search.test.ts:188` 的 `createFileShare()` 调用补充 `managementTokenHash: 'f'.repeat(64)`，沿用其他文件测试的夹具模式。该摘要只用于隔离测试样本。

本轮运行时代码没有改动。`createFileShare` 的管理摘要仍是必填 `string`；四个真实／测试调用均显式传入。测试断言、校验范围和原有用例均保留。

## 修复前复现

同步 main 后、补字段前实际执行：

```sh
pnpm exec tsc --noEmit --incremental false
```

退出码 2，准确复现：

```text
app/api/__tests__/admin-search.test.ts(188,29): error TS2345
Property 'managementTokenHash' is missing ... but required ...
```

只补齐该调用后，以下检查全部通过。

## 本轮实际验证

环境：Node 24.18.1、pnpm 11.19.0。所有命令使用 `/Users/dnslin/.nvm/versions/node/v24.18.1/bin` 的 PATH。

| 实际执行命令 | 结果 |
| --- | --- |
| `pnpm test` | **42 个文件，383 项全部通过**，覆盖撤销、后台筛选、原文下载及现有功能 |
| `pnpm exec tsc --noEmit --incremental false` | 通过，原 TS2345 不再出现 |
| `pnpm lint` | 通过 |
| `pnpm build` | 通过，生成 20 个静态页面，正式管理页面和 API 正常纳入构建 |
| `git diff --check` | 通过 |

构建在独立临时副本执行。副本由同步后的 Git 源码加上同一份修复后夹具组成，复制已有锁定依赖后，先运行 `node scripts/migrate.mjs` 初始化副本空库，再执行 `pnpm build`。未修改构建配置、依赖或校验选项；临时副本结束后清理。

当前本机预览服务未被中断或替换。没有将旧预览或历史浏览器验收描述为新提交的浏览器验证。

## 独立复审

全新上下文评审先核查测试、函数契约和调用点，再检查主分支同步结果，未发现本轮需修复的 P0/P1/P2。

评审另实际运行：

```sh
pnpm test app/api/__tests__/admin-search.test.ts
git diff --check
```

结果为后台搜索 **16/16 通过**，差异检查通过。评审没有修改任何文件，也没有把主代理的全量、类型、Lint 或构建结果算作独立运行。

复审确认：

- 管理摘要必填契约完整，未用可选参数、类型抑制或删断言掩盖缺参。
- 相对最新 main，后台列表 API、查询筛选实现、`PasteBody`、原文文件名逻辑及其专门测试保持一致。
- 查看器保留原文下载接入，本 PR 只保留必要的统一失效提示。
- 管理权限、撤销与领取竞争、文件清理路径没有因本次夹具修复发生变化，未发现回归。

## 边界

- 本轮未重跑浏览器、Docker 冷启动、Safari、Firefox 或真实手机验收。
- 上轮披露的既有孤立密码失败记录竞态不在本次 P1 修复范围内，仍保留该备注。
- 仓库目前没有 PR 自动检查，版本标签触发的 Release 工作流不作为本地验证的替代证据。
- 未合并 PR、未启用自动合并、未推送版本标签、未发布或部署。
