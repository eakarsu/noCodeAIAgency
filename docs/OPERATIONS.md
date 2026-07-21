# Operations runbook

## Release sequence

1. Confirm the current-tree secret scan and dependency audit are clean; confirm the known historical provider credential has been revoked.
2. Build immutable `web` and `worker` images from the same revision.
3. Back up the target database and verify the checksum.
4. For a pre-existing database, complete `MIGRATION_ADOPTION.md`; never guess or automatically baseline it.
5. Run `npm run db:migrate` once with a least-privilege migration identity. Re-run it to prove idempotence and record `npm run db:status`.
6. Start the web process and worker separately. Put the web process behind an HTTPS reverse proxy; do not expose PostgreSQL.
7. Require readiness HTTP 200, then submit a signed non-sensitive source fixture, queue a recommendation, run the worker, verify human approval, and export/verify the audit chain.

The web launcher does not install packages, kill processes, create databases, apply migrations, or seed. The worker never approves or executes its output.

## Worker controls

Use one stable `GOVERNED_WORKER_ID` per worker instance. Jobs are claimed with expiring leases and bounded attempts. Retryable provider failures use backoff; schema, evidence, cost, latency, and confidence failures stop at a deterministic gate. Alert on:

- pending job age above two minutes;
- any `FAILED` job or exhausted retry;
- provider error/timeout rate above the agreed service objective;
- cost or latency within 20% of its configured budget;
- stale or deleted source coverage;
- audit-chain verification failure; or
- readiness failure.

Never log prompts, source content, provider keys, signatures, passwords, session tokens, or raw provider responses. Job/audit records retain hashes, bounded metrics, source IDs, and reviewed evidence.

## Backup and restore

Run `BACKUP_DIR=/secure/path BACKUP_DATABASE_URL=... sh scripts/backup.sh`. The backup/restore URLs must be libpq-compatible and must not include Prisma-only query parameters such as `schema`. Store the custom-format dump and checksum under encrypted, access-controlled retention. Do not place them in the repository.

Rehearse restoration only into an isolated database whose name includes `restore_` or `rehearsal_`:

```sh
RESTORE_ACK=I_ACKNOWLEDGE_DESTRUCTIVE_ISOLATED_RESTORE \
RESTORE_DATABASE_URL=postgresql://.../governed_restore_20260720 \
BACKUP_FILE=/secure/path/governed-ai-....dump \
sh scripts/restore-verify.sh
```

The restore verifies the checksum, migration status, and every tenant audit chain. Record row counts, recovery time, and recovery point. Destroy rehearsal data under the approved retention process.

## Incident response

For suspected credential exposure: disable the affected key at the provider first, audit provider access and billing, rotate the secret-store value, revoke affected sessions using the guarded admin command, preserve redacted evidence, and only then coordinate history remediation. For source compromise: disable its key ID, retain signed receipts, stop the worker if untrusted data may reach the provider, and resync corrected versions or tombstones. For audit-chain failure: make the service unavailable, preserve the database and logs, and do not rewrite events.

## Rollback

Application rollback uses the previous immutable image only when it is compatible with the applied additive schema. Database rollback is restore-forward into an isolated instance followed by controlled cutover; do not edit or delete migration records. Source corrections use newer source timestamps and tombstones. Recommendation decisions are immutable state transitions; create a new request instead of overwriting evidence.
