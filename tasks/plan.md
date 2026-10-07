# Private file sharing implementation

Approved scope: docs/file-sharing-plan.md. One Node process, SQLite and the existing private volume. Admin-only single files; 10 MiB maximum, 1 day default / 7 days maximum, 1–10 claims, 15 minute retry grants. No new deployment, accounts or external storage.

1. Preserve existing text schema/behavior while adding the file discriminator, file metadata and grants. Use isolated tests and a generated additive migration.
2. Implement bounded private encrypted storage and compensate failed publication. Add access/claim/download services with immediate transactions and a retry-safe lifecycle.
3. Add admin-only upload and recipient UI, preserving password gates and explicit download authorization semantics. Configure upload-only proxy limit and unprivileged migrations.
4. Run focused and full tests, lint, TypeScript and build. Exercise a real Chromium browser at desktop/mobile widths. Independently review permission/concurrency/cleanup. Publish only the new feature branch after verification.

Commands: pnpm test; pnpm lint; pnpm exec tsc --noEmit; pnpm build. Container checks require a Docker runtime, which this cloud machine currently lacks. Record all 14 acceptance groups with their actual evidence and limitations before delivery.
