# API 文档

[返回 README](../README.md)

以下示例使用 `https://paste.447654.xyz`。JSON 接口统一返回 `success` 和 `data`，失败时返回 `success: false` 与 `error`。文件下载成功时直接返回二进制附件。

```json
{"success": true, "data": {"id": "example"}}
```

```json
{"success": false, "error": {"code": "NOT_FOUND", "message": "内容不存在"}}
```

## 文本与代码

### 创建

```bash
curl --fail-with-body https://paste.447654.xyz/api/pastes \
  -H 'Content-Type: application/json' \
  --data '{"content":"console.log(123)","language":"javascript","expiresIn":1440,"burnAfterRead":3}'
```

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `content` | string | 必填，非空文本，最多 500,000 个字符 |
| `language` | string | 可选，默认 `plaintext`；需为服务支持的语言 |
| `password` | string | 可选；空字符串表示不设密码 |
| `expiresIn` | number / null | 分钟数：`5`、`30`、`60`、`1440`、`10080`、`43200`；省略或 `null` 为永久 |
| `burnAfterRead` | number / null | `1`–`10`；省略或 `null` 为不限次数 |

成功返回 `201`，`data` 包含 `id`、`url` 和 `expiresAt`。

### 查询与领取

| 方法 | 路径 | 行为 |
| --- | --- | --- |
| GET | `/api/pastes/:id` | 查询元数据，不返回正文、不扣次数 |
| POST | `/api/pastes/:id/verify` | 检查密码并领取正文，成功后扣一次查看次数 |
| GET | `/:id` | 打开分享页面 |

```bash
curl --fail-with-body https://paste.447654.xyz/api/pastes/SHARE_ID/verify \
  -H 'Content-Type: application/json' \
  --data '{}'
```

有密码时改为 `{"password":"访问密码"}`。领取成功返回 `content`、`language` 和 `remainingViews`（剩余次数，不限时为 `null`）。密码错误或解密失败不扣次数。过期或次数耗尽后停止公开访问，文本记录仍可在后台管理。

## 文件

### 创建

```bash
curl --fail-with-body https://paste.447654.xyz/api/files \
  -F 'file=@./example.txt' \
  -F 'expiresIn=1440' \
  -F 'downloadLimit=3'
```

使用 `multipart/form-data`，仅接受以下字段，每个字段最多出现一次：

| 字段 | 说明 |
| --- | --- |
| `file` | 必填，一个文件，最大 10 MiB |
| `password` | 可选，访问密码 |
| `expiresIn` | 分钟数：`5`、`30`、`60`、`1440`、`10080`；默认 `1440` |
| `downloadLimit` | `off`、`1`、`3`、`5`、`10`；省略或 `off` 为不限次数 |

成功返回 `201`，`data` 包含 `id`、`url`、`expiresAt` 和 `downloadLimit`。网页默认设置 3 次下载，API 省略 `downloadLimit` 时不限制次数。

允许 UTF-8 文本、PDF、PNG、JPEG、GIF、WebP 和 ZIP。文本扩展名清单以 [`FILE_EXTENSIONS`](../src/lib/file-rules.ts) 为准，零字节文本也可上传。服务端检查扩展名及文件内容特征，不信任浏览器提供的 MIME 类型。

### 查询与下载

| 方法 | 路径 | 行为 |
| --- | --- | --- |
| GET | `/api/files/:id` | 查询状态、有效期和剩余次数，不领取文件 |
| GET | `/f/:id` | 打开接收页，不下载、不扣次数 |
| POST | `/api/files/:id/download` | 验证密码并领取附件，成功后扣一次下载次数 |

密码保护的文件在验证成功前不公开名称和大小。GET / HEAD 页面和元数据不扣次数；下载接口的 GET / HEAD 返回 `405`。

```bash
curl --fail-with-body https://paste.447654.xyz/api/files/SHARE_ID/download \
  -H 'Content-Type: application/json' \
  --data '{}' \
  --output downloaded.txt
```

有密码时请求体改为 `{"password":"访问密码"}`。成功响应包含：

| 响应头 | 内容 |
| --- | --- |
| `Content-Type` | `application/octet-stream` |
| `Content-Disposition` | 附件下载名称，支持 UTF-8 文件名 |
| `Content-Length` | 原文件字节数 |
| `X-File-Name` | URL 编码的原文件名 |
| `X-Downloads-Remaining` | 剩余次数，或 `unlimited` |
| `Cache-Control` | `no-store` |
| `X-Content-Type-Options` | `nosniff` |

密码错误、文件缺失或加密认证失败不扣次数。服务器批准发送后，网络中断仍可能消耗一次。不支持 Range 请求和断点续传。

## 管理接口

通过 `POST /api/admin/login` 提交 JSON `{"password":"管理员密码"}`，成功后使用 `admin_session` Cookie。生产环境 Cookie 要求 HTTPS。

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/admin/stats` | 文本与文件的合计统计 |
| GET | `/api/admin/pastes` | 文本记录列表 |
| GET | `/api/admin/pastes/:id` | 查看文本详情，包含解密正文 |
| DELETE | `/api/admin/pastes/:id` | 删除文本记录 |
| GET | `/api/admin/files?page=1&limit=15` | 文件记录、清理状态与真实磁盘占用 |
| DELETE | `/api/admin/files/:id` | 停止访问并删除文件及元数据 |
| POST | `/api/admin/files/cleanup` | 清理到期、次数耗尽及删除失败的文件 |

两个列表的 `page` 为正整数，`limit` 为 `1`–`100`，默认 `15`。筛选后先计算匹配总数，再分页；越界页回到当前结果的最后一页，空结果使用第 1 页。文件物理删除失败时保留记录供重试，接口返回失败，不会报告已完成删除。

### 后台列表搜索与筛选

`GET /api/admin/pastes` 和 `GET /api/admin/files` 支持以下可选参数，条件之间同时满足：

| 参数 | 规则 |
| --- | --- |
| `q` | 去除首尾空格。文本搜索 ID 片段；文件搜索 ID 片段或文件名关键词。ID 区分大小写，文件名不区分英文大小写；`%`、`_` 均按普通字符匹配。不会搜索文本正文。 |
| `status` | 文本：`active`、`expired`、`destroyed`（查看次数用尽）。文件：`active`、`expired`、`exhausted`（下载次数用尽）、`pending_delete`、`delete_failed`。省略或空值表示全部。 |
| `createdFrom` | 创建时间下界，包含该时刻。使用带时区的 ISO 时间戳，可单独提供。 |
| `createdBefore` | 创建时间上界，不包含该时刻。使用带时区的 ISO 时间戳，可单独提供。 |

后台日期控件按北京时间计算。例如查询 2026-10-21 全天，对应 `createdFrom=2026-10-20T16:00:00.000Z`、`createdBefore=2026-10-21T16:00:00.000Z`。非法状态、无效时间或下界不早于上界返回 `400 VALIDATION_ERROR`，沿用既有错误响应结构。

```text
/api/admin/pastes?page=1&limit=15&q=AbC&status=active
/api/admin/files?page=1&limit=15&q=交付&createdFrom=2026-10-20T16:00:00.000Z&createdBefore=2026-10-21T16:00:00.000Z
```

返回的 `total`、`totalPages` 和 `items` 都基于筛选结果，排序保持创建时间、ID 倒序。文件 `storage` 始终反映全局存储用量，与筛选条件无关。文件清理状态优先于过期或次数状态；成功删除和清理的记录不再出现在列表中。

## 限额与错误

| 操作 | 每来源限额 |
| --- | --- |
| 创建文本 | 10 次 / 分钟 |
| 文件上传 | 3 次 / 分钟 |
| 文件下载 | 10 次 / 分钟 |
| 管理员登录 | 5 次 / 分钟 |
| 访问密码验证 | 文本和文件分别为 10 次 / 分钟 |

密码错误累计 5 次后，该分享与来源组合锁定 15 分钟。密码最多 72 个 UTF-8 字节，不能只包含空白。直接运行且 `TRUST_PROXY=false` 时所有请求共享来源限额；配置可信代理后按代理提供的 IP 区分。

全实例同时最多上传 2 个、下载 4 个。文件目录上限 1 GiB，保留 100 MiB 磁盘空闲余量。整个上传请求体最多 11 MiB，应用读取总时限 120 秒。

常见状态码：`400` 参数、密码或类型错误；`401` 管理员未登录；`404` 不存在或文件已失效；`408` 请求超时；`413` 请求体过大；`429` 限流或繁忙；`500` 服务内部错误；`507` 文件存储空间不足。

清理周期、日志及备份恢复见[部署与运维](deployment.md)。
