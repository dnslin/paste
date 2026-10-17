# 部署与运维

[返回 README](../README.md) · [更新](#后续更新) · [备份](#备份) · [回滚](#回滚) · [排查](#常见问题)

本文记录 mpn-hk 的实际部署方式。配置基线核对于 **2026-10-17**；操作前先核对当前容器、镜像和数据卷。除源码打包步骤外，以下命令在服务器的 **Bash** 中以 root 执行。

## 部署结构

```text
访客 HTTPS
    │
    ▼
Caddy :443（宿主机，自动管理证书）
    │ X-Real-IP 由 Caddy 覆盖
    ▼
127.0.0.1:3000 → paste:3000
    │
    ▼
paste_paste_data → /app/data
                  ├── paste.db        SQLite 数据库
                  ├── paste.db-wal    SQLite 日志，运行时可能存在
                  ├── paste.db-shm    SQLite 共享状态，运行时可能存在
                  ├── .secrets        加密密钥与会话签名密钥
                  └── files/          加密文件与上传临时文件
```

| 项目 | 当前配置 |
| --- | --- |
| 主机 | mpn-hk，实际 SSH 地址 `root@20.247.139.175` |
| 公开地址 | <https://paste.447654.xyz> |
| 保留域名 | <https://paste.dnsl.in> |
| 部署目录 / Compose 项目 | `/root/paste` / `paste` |
| Compose 文件 / 容器 | `/root/paste/docker-compose.yaml` / `paste` |
| Caddy 服务 / 配置 | systemd `caddy` / `/etc/caddy/Caddyfile` |
| 持久卷 | `paste_paste_data`，挂载到 `/app/data` |
| 已部署提交 | `972e49ff85b98cc8f8d6ed5d33c406472e346396`，PR #29 |
| 已部署镜像 | `paste:972e49f`，服务器从该提交构建 |
| 本次源码与验证记录 | `/root/paste/releases/972e49f/` |
| 本次升级前备份 | `/root/paste/backups/20261017-972e49f/` |

`/root/paste` 不是 Git 工作副本，源码按提交存放在 `releases/`。不能在该目录执行 `git pull` 更新应用。本次镜像未作为新版本发布到 GHCR，`docker compose pull` 也不会取得这次部署。

## Compose 与 Caddy

### mpn-hk 的 Compose 配置

下面是便于阅读的 YAML 等价示例。线上文件目前使用 JSON 语法，同样是合法的 Compose 配置。

```yaml
services:
  paste:
    image: paste:972e49f
    container_name: paste
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      ADMIN_PASSWORD: ${ADMIN_PASSWORD:?请配置管理员密码}
      TRUST_PROXY: "true"
      NEXT_PUBLIC_BASE_URL: https://paste.447654.xyz
    volumes:
      - paste_data:/app/data
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://127.0.0.1:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s

volumes:
  paste_data:
    external: true
    name: paste_paste_data
```

当前服务器的管理员密码保存在私有 Compose 文件中；示例改用环境变量，未包含真实值。**不要用示例覆盖线上文件**。更新时只改镜像，保留密码、卷名和其他配置。若新建同类部署，应先创建自己的数据卷，并通过私有 `.env` 提供密码。

仓库根目录的 `docker-compose.yaml` 使用 Nginx 入口，适合从源码快速启动。mpn-hk 由宿主机 Caddy 直接代理应用，不启动该 Nginx 服务，也不把应用绑定到 `0.0.0.0:3000`。

### Caddy 站点配置

`/etc/caddy/Caddyfile` 中的 Paste 站点如下，其他项目的站点段保持原样：

```caddyfile
paste.dnsl.in, paste.447654.xyz {
    encode zstd gzip
    request_body {
        max_size 11534336
    }
    reverse_proxy 127.0.0.1:3000 {
        header_up X-Real-IP {remote_host}
    }
}
```

域名 A 记录需指向该服务器，公网 80 / 443 需能到达 Caddy。11 MiB 是整个上传请求体上限，文件本身仍限制为 10 MiB。

Caddy 覆盖 `X-Real-IP`，应用端口只允许本机访问，因此应用启用 `TRUST_PROXY=true`。不要直接沿用访客传来的 IP 头。相关行为见 [Caddy 代理文档](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#headers)。

仅在修改 Caddy 配置后校验并平滑重载：

```bash
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl reload caddy
curl --fail --head https://paste.447654.xyz
```

正常更新 Paste 镜像无需重载 Caddy。不要用 `-k` 忽略证书错误来判断上线成功。

### 首次初始化的权限处理

当前部署镜像 `paste:972e49f` 在空数据卷上首次启动时，root 执行迁移会创建归 root 所有的数据库；应用随后以 `nextjs` 用户运行，写入可能报 `SQLITE_READONLY`。首页健康检查不能发现此问题。线上既有卷原本归 `nextjs` 所有，不受这次冷启动问题影响。

新建空卷后执行一次归属修复并重启，使应用重新打开数据库：

```bash
cd /root/paste
docker exec --user 0 paste chown -R nextjs:nodejs /app/data
docker compose restart paste
docker compose up --detach --no-build --wait --wait-timeout 120 paste
```

在仓库默认 Compose 部署中，从其项目目录执行同样三条 Docker 命令。此处记录当前版本的操作方法，Docker 入口脚本的权限修复尚未包含在本轮文档改动中。

## 后续更新

顺序为：**准备新镜像 → 备份并停写 → 切换镜像 → 等待健康 → 验证业务**。先完成构建，再开始停机备份。

### 1. 在本地打包指定提交

在本地项目目录执行；也可把 `origin/main` 改为已经确认的提交 SHA：

```bash
set -euo pipefail
git fetch origin
PASTE_REV=$(git rev-parse origin/main)
PASTE_RELEASE=${PASTE_REV:0:12}
ssh root@20.247.139.175 "mkdir -p /root/paste/releases/$PASTE_RELEASE"
git archive "$PASTE_REV" | ssh root@20.247.139.175 \
  "tar -xf - -C /root/paste/releases/$PASTE_RELEASE"
printf '服务器构建时填写：PASTE_REV=%s\n' "$PASTE_REV"
```

该方式只打包已提交文件，不带本地 `.env`、数据库或 `node_modules`。

### 2. 在服务器构建镜像

先将 `PASTE_REV` 改成上一步输出的完整提交 SHA。下面的值是本次部署示例，未来更新不要继续使用旧值。

```bash
set -euo pipefail
PASTE_REV=972e49ff85b98cc8f8d6ed5d33c406472e346396
PASTE_RELEASE=${PASTE_REV:0:12}
df -h /
docker build \
  --label "org.opencontainers.image.revision=$PASTE_REV" \
  --label org.opencontainers.image.source=https://github.com/dnslin/paste \
  --tag "paste:$PASTE_RELEASE" \
  "/root/paste/releases/$PASTE_RELEASE"
docker image inspect "paste:$PASTE_RELEASE" \
  --format '{{index .Config.Labels "org.opencontainers.image.revision"}}'
```

构建失败时原服务仍在运行，先修复构建问题。镜像使用锁文件和固定 pnpm 版本；不要在运行容器中临时安装依赖。

### 3. 备份并切换

执行[备份](#备份)章节的第 1–3 步，**保持 Paste 停止，不执行“恢复服务”那一步**。确认归档成功后，再修改 Compose。

当前线上文件为 JSON 格式，下面只更新 `paste.image`：

```bash
cd /root/paste
python3 - "$PASTE_RELEASE" <<'PY'
import json
import pathlib
import sys

path = pathlib.Path('docker-compose.yaml')
config = json.loads(path.read_text())
config['services']['paste']['image'] = f'paste:{sys.argv[1]}'
path.write_text(json.dumps(config, indent=2) + '\n')
PY
docker compose config --quiet
docker compose up --detach --no-build --wait --wait-timeout 120 paste
```

新容器会加载原 `.secrets`、生成管理员密码哈希、应用 Drizzle 迁移，再启动服务。不要删除数据卷或重新生成密钥。迁移失败时先查日志；旧程序未必能读取新结构，不能直接换旧镜像试启动。

如中途关闭终端，重新登录后从已记录的提交与备份路径继续。`docker compose up` 可重复执行；不要重复覆盖升级前备份。

### 4. 上线验证

```bash
cd /root/paste
docker compose ps
docker inspect paste --format 'health={{.State.Health.Status}} image={{.Config.Image}}'
docker logs paste --since 10m
curl --fail --head https://paste.447654.xyz
docker exec paste node -e 'const D=require("better-sqlite3");const db=new D("/app/data/paste.db",{readonly:true});console.log(db.pragma("integrity_check"));console.log(db.pragma("foreign_key_check"));db.close()'
```

应看到容器 `healthy`、HTTPS `200`、SQLite `integrity_check: ok`，且外键检查无记录。健康检查只说明首页可响应；还需完成以下业务检查：

1. 创建并读取一条测试文本，确认分享地址使用 HTTPS 和新域名。
2. 上传一个测试文件，验证密码、下载次数和下载字节；首次或代理改动时另测 10 MiB 文件。
3. 登录后台，查看文件记录并删除测试数据，确认链接失效、占用释放。
4. 涉及卷或密钥变更时，在仍有效的测试分享上重启容器，再次验证文件、密码和剩余次数。

验收时只操作自己创建的测试分享，不领取已有用户的受限内容来测试。将版本、镜像和结果记入该次 `releases/<提交>/` 目录。

## 备份

采用短暂停写的完整卷备份，保证数据库、文件和密钥来自同一时刻。只复制运行中的 `paste.db` 不能代替完整备份。备份范围包括：

- 整个 `paste_paste_data` 卷：数据库及 SQLite 日志、`.secrets`、`files/`。
- 当前 Compose 文件，以及实际存在的 `.env`。
- Caddyfile、旧镜像 ID 和旧镜像离线归档。

### 1. 创建备份目录

```bash
set -euo pipefail
cd /root/paste
umask 077
PASTE_BACKUP="/root/paste/backups/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$PASTE_BACKUP"
printf '本次备份：%s\n' "$PASTE_BACKUP"
cp -p docker-compose.yaml "$PASTE_BACKUP/docker-compose.yaml"
if [ -f .env ]; then cp -p .env "$PASTE_BACKUP/.env"; fi
cp -p /etc/caddy/Caddyfile "$PASTE_BACKUP/Caddyfile"
chmod 600 "$PASTE_BACKUP/docker-compose.yaml" "$PASTE_BACKUP/Caddyfile"
PASTE_IMAGE=$(docker inspect paste --format '{{.Image}}')
printf '%s\n' "$PASTE_IMAGE" > "$PASTE_BACKUP/previous-image.txt"
```

### 2. 导出当前运行版本的镜像

```bash
docker image save "$PASTE_IMAGE" | gzip > "$PASTE_BACKUP/previous-image.tar.gz"
gzip --test "$PASTE_BACKUP/previous-image.tar.gz"
```

按容器实际使用的镜像 ID 导出，避免移动标签指向其他版本。磁盘需同时容纳源码、新镜像和备份；不要在有回滚需要时清理旧镜像。

### 3. 停止应用并归档完整数据卷

```bash
docker compose stop paste
docker run --rm --entrypoint tar \
  --mount type=volume,source=paste_paste_data,target=/data,readonly \
  --mount "type=bind,source=$PASTE_BACKUP,target=/backup" \
  "$PASTE_IMAGE" -czf /backup/data-before-upgrade.tar.gz -C /data .
chmod 600 "$PASTE_BACKUP/data-before-upgrade.tar.gz"
tar -tzf "$PASTE_BACKUP/data-before-upgrade.tar.gz" > /dev/null
```

如归档失败或中断，先处理问题，不能继续升级。仅做日常备份时，可按下一步启动原服务；准备升级时保持停写，回到“备份并切换”。

### 4. 恢复服务并保存异机副本

仅做备份时执行：

```bash
docker compose up --detach --no-build --wait --wait-timeout 120 paste
```

在本地或另一台受控机器上取回该次目录，时间戳换成实际值：

```bash
scp -r root@20.247.139.175:/root/paste/backups/20261017T000000Z ./paste-backup
```

备份包含用户内容、管理员配置和解密密钥，应限制读取权限并存放在受控或加密存储中。同机备份不能覆盖服务器或磁盘丢失。异机复制、定时执行和保留期需在运维环境中单独配置并验证；到期文件在历史备份中仍可能存在。

## 回滚

**恢复会回到备份时刻。** 此后创建或删除的分享、修改的状态和已消耗的次数都会回退。先保存当前数据，再决定恢复点；不要将两份 SQLite 数据库直接混合。

文件分享迁移 `0002_file_sharing` 改变了 `password_attempts` 表结构。回到此前版本时必须恢复匹配的数据库、文件和密钥，不能只切换镜像。通用步骤如下。

### 1. 选择恢复点并准备旧镜像

```bash
set -euo pipefail
cd /root/paste
PASTE_RESTORE=/root/paste/backups/20261017-972e49f
PASTE_OLD_IMAGE=$(cat "$PASTE_RESTORE/previous-image.txt")
tar -tzf "$PASTE_RESTORE/data-before-upgrade.tar.gz" > /dev/null
docker image inspect "$PASTE_OLD_IMAGE" > /dev/null
```

如果旧镜像已从本机移除，先从该次备份恢复镜像，再重复检查：

```bash
gzip -dc "$PASTE_RESTORE/previous-image.tar.gz" | docker image load
```

**2026-10-17 的历史备份未导出离线镜像**，依赖本机保留的旧镜像 `paste:rollback-pre-972e49f`，原引用为 `ghcr.io/dnslin/paste:1.1`。不要删除该镜像。之后按本文创建的备份会包含离线镜像。

### 2. 保存当前状态并停写

另做一份[完整备份](#备份)的第 1–3 步，保持应用停止。新备份路径 `PASTE_BACKUP` 必须与恢复目标 `PASTE_RESTORE` 不同。这样即使回滚后需要重新取回新数据，也有对应的完整副本。

### 3. 恢复数据与 Compose

下面会清空 **`paste_paste_data` 卷内的当前内容**，再恢复所选归档。确认当前状态已备份且应用已停止后执行；先前执行的归档检查必须成功。

```bash
docker run --rm --entrypoint sh \
  --mount type=volume,source=paste_paste_data,target=/data \
  --mount "type=bind,source=$PASTE_RESTORE,target=/backup,readonly" \
  "$PASTE_OLD_IMAGE" -c \
  'set -e; find /data -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +; tar -xzf /backup/data-before-upgrade.tar.gz -C /data'
cp -p "$PASTE_RESTORE/docker-compose.yaml" /root/paste/docker-compose.yaml
if [ -f "$PASTE_RESTORE/.env" ]; then
  cp -p "$PASTE_RESTORE/.env" /root/paste/.env
else
  rm -f /root/paste/.env
fi
```

启动前检查已恢复配置的 `paste.ports`。**本次历史备份仍是 `3000:3000`，必须先改为 `127.0.0.1:3000:3000`**，避免回滚时重新公开应用端口、绕过 Caddy。其他配置保留恢复点的值。

镜像按 ID 导入时可能没有原标签。读取已恢复 Compose 的镜像引用，重新关联到旧镜像 ID，并检查端口边界后启动：

```bash
PASTE_OLD_REF=$(docker compose config --format json | \
  python3 -c 'import json,sys; print(json.load(sys.stdin)["services"]["paste"]["image"])')
docker tag "$PASTE_OLD_IMAGE" "$PASTE_OLD_REF"
docker compose config --quiet
docker compose config --format json | python3 -c \
  'import json,sys; ports=json.load(sys.stdin)["services"]["paste"].get("ports",[]); assert ports and all(p.get("host_ip")=="127.0.0.1" for p in ports), "先将应用端口改为仅绑定 127.0.0.1"'
docker compose up --detach --no-build --wait --wait-timeout 120 paste
```

历史旧版本可能没有健康检查，`--wait` 此时只等待运行状态。必须继续检查日志、HTTPS、管理员登录、原有内容和数据库完整性。恢复后的过期文件仍按其绝对有效期处理，新版启动清理可能立即回收这些文件。

只回滚应用时无需恢复 Caddy。若该次更新也修改过路由，仅把备份中的 **Paste 站点段** 合并回当前 Caddyfile，再校验和重载；不要覆盖其他项目在此期间修改的站点。

## 文件清理

- 启动时扫描崩溃留下的临时文件、无引用文件，并清理已失效记录。
- 此后每五分钟清理过期、次数耗尽、待删除及删除失败的文件。
- 后台“文件”页可手动清理。文件实际移除后才删除记录；失败会保留记录供重试。
- 已识别但删除失败的孤立文件会重试。目录扫描本身失败时，修复权限或磁盘问题后重启服务补扫。

```bash
docker logs paste --since 30m
```

清理日志前缀为 `[file-cleanup]`。后台占用只统计当前文件目录，宿主机历史备份另占空间。

## 常见问题

| 现象 | 检查与处理 |
| --- | --- |
| 新域名 HTTPS 失败 | 检查 DNS、80 / 443、Caddy 配置与 `journalctl -u caddy --since '10 minutes ago'`；不跳过证书验证 |
| Caddy 返回 502 | 检查 `docker compose ps`、容器日志和 `curl --head http://127.0.0.1:3000` |
| 分享链接使用 HTTP 或错误域名 | 检查 `NEXT_PUBLIC_BASE_URL`；修改容器环境后用 `docker compose up` 重建，单纯 `restart` 不会应用配置变化 |
| 多人共享上传限额 | 检查端口是否私有、Caddy 是否覆盖 `X-Real-IP`、应用是否启用 `TRUST_PROXY` |
| 上传失败或 413 / 507 | 检查 10 MiB 文件上限、11 MiB 请求体上限、1 GiB 文件目录上限及宿主机可用空间 |
| 升级后内容无法解密 | 检查是否复用了原数据卷及 `.secrets`；新密钥无法解密旧内容 |
| 文件已失效但占用未释放 | 查看 `[file-cleanup]` 错误、目录权限和后台重试结果，区分在线文件与备份占用 |

Compose 更新和数据卷行为可参考 [Docker Compose up](https://docs.docker.com/reference/cli/docker/compose/up/) 与 [Docker 卷备份文档](https://docs.docker.com/engine/storage/volumes/#back-up-restore-or-migrate-data-volumes)。
