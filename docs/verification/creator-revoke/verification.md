# 创建者主动撤销：正式实现与本地验收

日期：2026-10-21。分支：`codex/creator-revoke-prototype`。正式实现基于 `main@57f226c`，保留已确认的撤销原型和现有二维码功能。本轮未合并、未部署。

功能提交：`699dc5c`。

## 结果

文本与文件均已接入正式创建和撤销接口。创建结果单独提供私人管理链接；管理页不领取内容、不消耗次数；确认撤销后阻止后续领取。旧分享不补发管理权，首版没有编辑、续期、恢复或找回功能。

文本复用删除及密码失败记录清理事务；文件复用停止访问、删除失败记录和现有清理任务。没有新增撤销墓碑或清理状态机。文件准备读取与撤销竞争时，只有复查确认分享已停止才转换为失效；真实活跃文件错误仍保留诊断。

创建、管理、响应不确定后的重试及权限边界说明见 [API 文档](../../api.md#创建者管理) 和 [功能方案](../../plans/creator-revoke.md)。

## 实际执行的验证

环境：Node 24.18.1、pnpm 11.19.0、Chromium。所有 Node 命令使用 `/Users/dnslin/.nvm/versions/node/v24.18.1/bin` 的 PATH。

| 命令 | 结果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 成功，同步主分支已有二维码依赖；本功能没有新增依赖或修改锁文件 |
| `pnpm exec drizzle-kit generate` | 成功生成 `0003_clear_kingpin.sql` 和快照，只为两表增加可空管理凭证摘要 |
| `pnpm test` | **35 个文件，304 项全部通过** |
| `pnpm exec tsc --noEmit --incremental false` | 通过 |
| `pnpm lint` | 通过 |
| `pnpm build` | 通过，生成正式管理页面和 API；共 18 个静态页面，其余按需运行 |
| `pnpm db:migrate` | 独立工作目录中成功应用迁移 |
| `node scripts/migrate.mjs` | standalone 独立空库初始化成功 |
| `HOSTNAME=127.0.0.1 PORT=3104 node --env-file=…/runtime.env server.js` | 最终 standalone 产物成功启动；环境文件只包含本轮生成的临时密钥 |
| `git diff --check` | 通过 |

定向验证也实际执行：

- 后端：`pnpm test scripts/__tests__/migrate.test.ts app/api/__tests__/share-management.test.ts app/api/__tests__/files.test.ts app/api/__tests__/routes.test.ts app/api/__tests__/admin-files.test.ts`，5 文件、77 项通过。
- 管理页：`pnpm test src/components/share-management/__tests__/share-management.test.tsx`，15 项通过。
- 创建结果：`pnpm test src/components/share-result/__tests__/share-created-content.test.tsx src/components/paste/__tests__/paste-creator.test.tsx src/components/file-share/__tests__/file-creator-result.test.tsx`，24 项通过。
- 公开失效与既有复制：`pnpm test src/components/paste/__tests__/paste-viewer.test.tsx src/components/file-share/__tests__/file-share.test.tsx src/components/paste/__tests__/success-dialog.test.tsx src/components/paste/__tests__/copy-functionality.test.tsx`，46 项通过。

新迁移缺列、管理链接缺失、公开失效文案和文件读取竞争都先有失败测试，再实现对应行为。文件创建的管理摘要为必填参数，测试样本显式提供，不保留隐式无管理权的新建路径。

## 浏览器与本机 HTTP 验收

使用最终生产构建、隔离 SQLite 和文件目录。7 条样本全部通过正式首页创建，其中 4 条文本、3 条文件；文件均经过真实选择和上传。没有使用原型替代正式流程，也没有写线上数据。

详细结果：[browser-checks.json](./browser-checks.json)。

| 检查 | 实际结果 |
| --- | --- |
| 带密码、仅一次机会的文本与文件 | 管理页进入、刷新和重复 GET 后均仍剩一次；管理摘要不要求访问密码，不领取正文或附件 |
| 无效权限 | 两类 GET/DELETE 的缺失凭证、错误凭证、访问密码均为 `404 MANAGEMENT_UNAVAILABLE`；跨类型和跨分享凭证也为 404 |
| 取消确认 | 默认焦点在“继续分享”，Escape 返回撤销按钮；机会仍为 1，分享未结束 |
| 确认撤销 | 当次成功后聚焦“分享已撤销”；原先已打开的接收页使用正确密码也不能再领取，刷新后显示失效 |
| 再次打开管理页 | 统一提示“管理链接无效或分享已失效”，不凭空推断结束原因 |
| 已显示文本 | 撤销后原页面内容仍可阅读；新元数据请求 404，刷新后不可再读取 |
| 已下载文件 | 实际下载 94 字节，中文长文件名正确，与原始文件逐字节一致；撤销后新下载 404，本地副本仍可读 |
| 复制隔离 | 文本自动复制只有公开 URL；管理复制拒绝时有独立错误，重试恢复；关闭成功弹窗后管理链接仍保留 |
| 管理加载失败 | 客户端受控断网后显示加载错误，重新加载成功；无片段凭证时没有管理 API 请求 |
| 删除响应丢失 | 真实 DELETE 已删除记录，客户端受控丢弃响应后不显示成功；重试先 GET，得到 404 后显示统一失效，未重复 DELETE。实际顺序为 `GET → GET → DELETE → GET`，其中第一次 GET 为受控失败 |
| 键盘 | 可完成进入确认、Tab 选择确认、执行撤销及结果聚焦 |
| 结果布局 | 1440/1024/768/320px、640px 高度下无横向溢出；成功弹窗限制在视口内，长文件名和长管理 URL 可换行，底部操作可滚动到达 |
| 管理页布局 | 四种宽度均无横向溢出；320px 长文件名摘要与撤销按钮可读、可操作 |
| 减少动态效果 | 实际偏好为 reduce；确认框缩放为 1、横纵位移为 0，保留项目既有短淡入 |

二维码截图已经用系统二维码识别能力实际解码。两类均只识别到一个公开分享 URL，与对应创建响应一致，不包含管理凭证。结果见 [qr-decoding.json](./qr-decoding.json)。

磁盘清理失败、文本密码校验与撤销并发、文件 IO 成功／失败与撤销并发、旧库迁移以及真实内部错误保留，使用定向 API／迁移测试验证。没有把测试注入的磁盘失败描述成浏览器中的真实磁盘事故。

## 截图

- [文本成功弹窗](./text-created-desktop.png)、[文件成功弹窗](./file-created-desktop.png)。
- [320px 短视口结果上部](./file-result-mobile-short.png)、[滚动后的管理链接与底部操作](./file-result-mobile-bottom.png)。
- [320px 长文件名管理页](./file-management-mobile.png)、[文本确认](./text-confirm-mobile.png)、[文件确认](./file-confirm-mobile.png)。

截图样本单独创建并撤销；截图中的管理凭证均已失效。截图在入场动画结束后拍摄，并已实际查看。

## 独立复审与清理

两个独立复审分别检查后端权限／迁移／删除与创建结果／公开失效界面，未发现仍需修复的实质问题。后端复审另运行 3 文件、27 项测试并通过。

测试有效性实验：暂时反转文本管理摘要的比较条件，管理 API 测试出现 6 失败、10 通过；在 finally 中按原始字节还原后，16 项全部通过，未保留实验改动。

全部 7 条测试分享均通过撤销结束。最后只读核对隔离库：文本 0、文件记录 0、密码失败记录 0、存储文件 0。没有清理其他工作目录或线上资源。

## 未验证与限制

- 未合并、未部署、未运行线上验收或 Docker 冷启动专项。
- 未执行 Safari、Firefox、真实手机及跨设备验收；本轮为本机 Chromium。
- 已开始传输的文件不会承诺被中断，已显示或保存的内容无法收回；本轮验证的是后续请求被阻止。
- 分享记录清理后不保留永久撤销原因；丢失管理链接不能找回。

本地预览：[http://127.0.0.1:3104/](http://127.0.0.1:3104/)。这是本机验收服务，不是线上部署。
