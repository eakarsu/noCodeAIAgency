# Governed AI recommendation service

This repository contains a broad generated no-code/AI prototype. Its only supported production journey is now deliberately narrow:

1. a tenant-bound connector submits an HMAC-signed incremental source batch;
2. documents are versioned with source timestamps, permission roles, deletion tombstones, and replay-safe receipts;
3. an authenticated contributor queues an idempotent recommendation job;
4. a separately run worker retrieves only fresh, permission-eligible evidence and calls one fixed AI provider contract;
5. schema, citation, confidence, cost, and latency gates must pass; and
6. an independent reviewer or owner approves or rejects the result. Approval records a decision and **never executes a workflow**.

All other generated pages and API routes return HTTP 410 in production through `src/proxy.ts`. They remain source evidence only and are not supported product behavior.

## Local verification

Use a disposable PostgreSQL database; never point tests or seed commands at shared data.

```sh
npm ci
DATABASE_URL=postgresql://user@127.0.0.1:5432/disposable_test npm run db:migrate
RUN_DB_TESTS=1 DATABASE_URL=postgresql://user@127.0.0.1:5432/disposable_test npm test
npm run typecheck
npm run lint
npm run build
npm audit --audit-level=low
node scripts/scan-secrets.mjs
```

`db:push`, `db:reset`, and `db:studio` fail closed. The local seed requires an explicit discardable-data acknowledgement, a loopback PostgreSQL host, an empty user table, and caller-provided credentials. No demo credential exists.

## Production topology

Apply migrations as an explicit release step, then run the web and worker processes separately:

```sh
npm run db:migrate
NODE_ENV=production npm run start
NODE_ENV=production npm run worker:recommendations
```

Both production processes run strict environment validation. Use `.env.example` only as a key-name reference; its placeholders intentionally fail validation. Health endpoints are `/api/governed/health/live` and `/api/governed/health/ready`.

See:

- `docs/OPERATIONS.md` for deploy, worker, libpq-compatible backup/restore URLs, incident, and rollback procedures;
- `docs/EXTERNAL_PROCESSING.md` for provider, privacy, prompt-injection, and approval boundaries;
- `docs/MIGRATION_ADOPTION.md` before adopting migrations on any database previously managed with `prisma db push`;
- `SECURITY.md` for the credential and vulnerability policy.

## Launch blockers

The former tracked launcher contained a provider credential. It has been removed from the current tree, but the provider/account owner must revoke it, audit access, and authorize coordinated history remediation before launch or redistribution. Production also requires vendor/data-processing approval, tenant source-key provisioning, supported model evaluation, target-platform CI/container evidence, retention policy, monitoring, and a completed migration-adoption rehearsal for any existing database.
