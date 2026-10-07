# File sharing verification

Date: 2026-10-07. Base: `7350235794ec6e4a664aa35812ab5f83a5aff695`. Environment: disposable dot cloud checkout, Node 24.19.0 / pnpm 11.19.0. No production files, account data or database were used.

## Automated results

- `pnpm test`: **215 tests passed in 27 files**; full original text/admin tests included, no tests skipped
- `pnpm lint`: passed
- `pnpm exec tsc --noEmit`: passed
- `pnpm build`: passed using this cloud machine's system certificate store (`NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1`); plain build initially failed to fetch Google Fonts due to TLS trust. Certificate verification was not disabled
- `node scripts/file-sharing-smoke.mjs`: standalone app served real HTTP from a disposable copy; authenticated upload, password gate, same-key parallel claims, binary download, Range/HEAD, 10 MiB boundary, process restart, startup orphans, revocation and old text creation/claim passed
- Independent focused review found and fixed upload deadline propagation and final-download-write slot release; new tests use Next's actual `pipeToNodeResponse` with a backpressured response

During the disposable standalone smoke the sampled server RSS peaked at **153 MiB** (25 ms sampling). This is a small single-machine smoke measurement, not a concurrency/load-test ceiling or a Docker memory recommendation.

## Fourteen acceptance groups

| # | Risk | Evidence | Remaining limitation |
|---|---|---|---|
| 1 | Legacy migration/text | Additive `ALTER TABLE`, migration idempotency and old-schema tests; original 31 route regressions and real HTTP text smoke | Production backup/restore not run |
| 2 | Upload auth/CSRF | Route tests prove unauthenticated/cross-origin requests do not read body; real HTTP 401/403 | HTTPS ingress must be configured by deployer |
| 3 | Actual byte bounds | Parser tests for chunked/missing/forged lengths, 10 MiB exact/+1, request cap, multiple files/fields/truncation; real HTTP 10 MiB exact/+1 | Nginx real-container request path not run |
| 4 | Hostile filenames/types | Traversal/control/bidi sanitization and attachment header tests; binary HTML download forced to octet-stream + nosniff | No virus scanning is offered |
| 5 | Protected metadata/locks | Public page and API tests; wrong-password no-charge, lock recheck, legacy lock tests | Real browser RSC/prefetch inspection not run |
| 6 | Last distinct claim | Eight competing keys with one remaining; injected grant-insert failure rolls back decrement | Single process/SQLite deployment only |
| 7 | Idempotency | Same-key parallel calls, response-loss/refresh component tests, cross-share/expiry rejection; real HTTP concurrent same-key requests | Cross-browser/device behavior intentionally does not share sessionStorage |
| 8 | Exhaustion/expiry/revoke | Live grant works at zero remaining; exact expiry, revocation and failed-unlink tombstone tests; real HTTP restart/retry/revoke | Existing response may finish after its final access check |
| 9 | HEAD/Range/path | HEAD 405, Range full 200, bearer checks, strict random storage-key validation; real HTTP checks | No resumable downloads |
| 10 | Authentication before plaintext | Ciphertext/nonce/tag/wrong-share tampering and missing/corrupt file tests; claim read failure never charges | Full-volume compromise includes the server-held key |
| 11 | Publish/recovery failures | Injected ENOSPC write/rename failures, collision preservation, DB publication compensation, temp/orphan recovery; real restart cleans crash-like leftovers | Abrupt power-loss/filesystem durability and real full-disk container not run |
| 12 | Cleanup races | Claim-vs-revoke, live-grant retention, unlink retry, text preservation; final authorization barrier and buffered completion semantics | Real Nginx/client transport timeout remains to verify |
| 13 | Resource bounds/restart | Two-slot limiter, quota reservation/free-disk tests, slow upload timeout, actual Next backpressure/abort tests; real process restart and measured RSS | Docker unavailable; container UID/WAL/volume behavior and deployment-scale load test not run |
| 14 | Desktop/mobile UI | Component tests for upload progress/cancel, password gate, refresh/retry, explicit expiry renewal and no saved-success claim | Browser launch blocked by required socket permission; cloud browser localhost returns `ERR_BLOCKED_BY_CLIENT`; no browser screenshots or mobile-device save verification |

## Download timeout detail

The application bounds full-payload lifetime to 120 seconds and does not release its slot merely when the last chunk is queued. Chunks passed to the transport are independent buffers of at most 64 KiB. When a final Node socket write is stalled, Next can delay propagating stream abort to the socket until that write drains; the full payload is released at deadline, but this small transport chunk may remain. Nginx has `send_timeout 120s`, which is an inactivity timeout rather than a total connection lifetime. Verify real slow-client/connection behavior and memory under the intended ingress before rollout.

## Rollout checks still required

1. Use an isolated real Docker container/volume. Confirm the app UID can create SQLite, WAL and file directories on first boot; confirm key/database/file/grant retention after restart. Confirm Nginx 10 MiB upload and other-route 4 MiB limit
2. Exercise desktop and mobile browsers through HTTPS: upload/drop/replace/cancel, password gate, duplicate clicks, refresh after lost claim response, expired-key renewal, real save/retry and revocation
3. Load-test the intended container memory limit and slow clients. The 10 MiB limit does not imply a 20 MiB process memory ceiling
4. Review/update the pre-existing dependency advisories in `file-sharing-dependency-audit.md` separately. Audit matches are not all confirmed reachable vulnerabilities

No merge or deployment was performed.
