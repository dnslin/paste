#!/bin/sh
set -eu

PASTE_IMAGE=${1:?Usage: sh scripts/verify-docker.sh IMAGE}
PASTE_TEST_NAME="paste-docker-test-$(date +%s)-$$"
PASTE_TEST_VOLUME="$PASTE_TEST_NAME-data"

cleanup() {
    result=$?
    trap - EXIT
    if [ "$result" -ne 0 ]; then
        docker logs "$PASTE_TEST_NAME" || echo "Could not read logs for $PASTE_TEST_NAME; continuing cleanup" >&2
    fi
    if ! docker rm --force "$PASTE_TEST_NAME" > /dev/null; then
        if [ "$result" -eq 0 ]; then result=1; fi
    fi
    if ! docker volume rm "$PASTE_TEST_VOLUME" > /dev/null; then
        if [ "$result" -eq 0 ]; then result=1; fi
    fi
    exit "$result"
}
docker image inspect "$PASTE_IMAGE" > /dev/null
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

docker volume create "$PASTE_TEST_VOLUME" > /dev/null
docker create --name "$PASTE_TEST_NAME" --network none \
    --mount "type=volume,source=$PASTE_TEST_VOLUME,target=/app/data" \
    --env ADMIN_PASSWORD=docker-smoke-admin-password \
    "$PASTE_IMAGE" > /dev/null
docker start "$PASTE_TEST_NAME" > /dev/null

for phase in initial restarted; do
    if [ "$phase" = restarted ]; then
        docker restart "$PASTE_TEST_NAME" > /dev/null
    fi
    attempts=0
    until docker exec "$PASTE_TEST_NAME" node -e \
        'fetch("http://127.0.0.1:3000/",{signal:AbortSignal.timeout(2000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))'; do
        attempts=$((attempts + 1))
        if [ "$attempts" -ge 30 ]; then
            echo "Application did not become ready" >&2
            exit 1
        fi
        sleep 1
    done

    docker exec --interactive "$PASTE_TEST_NAME" node - "$phase" <<'NODE'
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Database = require('better-sqlite3');
const phase = process.argv[2];
const origin = 'http://127.0.0.1:3000';
const content = 'Docker cold-start regression\n文件与文本\n';
const password = 'docker-smoke-share-password';
const statePath = '/tmp/docker-smoke-state.json';

async function json(response, status) {
  const body = await response.json();
  assert.equal(response.status, status, JSON.stringify(body));
  assert.equal(body.success, true);
  return body.data;
}
function post(path, body) {
  return fetch(origin + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
  });
}
async function read(state, remaining) {
  const text = await json(await post(`/api/pastes/${state.textId}/verify`, { password }), 200);
  assert.equal(text.content, content);
  assert.equal(text.remainingViews, remaining);
  const file = await post(`/api/files/${state.fileId}/download`, { password });
  assert.equal(file.status, 200);
  assert.equal(file.headers.get('x-downloads-remaining'), String(remaining));
  assert.deepEqual(Buffer.from(await file.arrayBuffer()), Buffer.from(content));
}

(async () => {
  if (phase === 'restarted') {
    await read(JSON.parse(fs.readFileSync(statePath, 'utf8')), 1);
  }
  const text = await json(await post('/api/pastes', {
    content, password, expiresIn: 1440, burnAfterRead: 3,
  }), 201);
  const form = new FormData();
  form.append('file', new Blob([content]), 'docker-smoke.txt');
  form.append('password', password);
  form.append('expiresIn', '1440');
  form.append('downloadLimit', '3');
  const file = await json(await fetch(origin + '/api/files', {
    method: 'POST', body: form, signal: AbortSignal.timeout(10000),
  }), 201);
  const state = { textId: text.id, fileId: file.id };
  await read(state, 2);
  if (phase === 'initial') fs.writeFileSync(statePath, JSON.stringify(state));
  for (const name of ['paste.db', 'paste.db-wal', 'paste.db-shm']) {
    const path = `/app/data/${name}`;
    if (fs.existsSync(path)) assert.equal(fs.statSync(path).uid, 1001, `${name} owner`);
  }
  const database = new Database('/app/data/paste.db', { readonly: true });
  assert.equal(database.pragma('integrity_check', { simple: true }), 'ok');
  database.close();
  console.log(`${phase}: text/file creation, password, decrypt, counts and database ownership passed`);
})().catch((error) => { console.error(error); process.exit(1); });
NODE
done
