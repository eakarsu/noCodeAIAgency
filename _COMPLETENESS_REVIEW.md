# Completeness Review: noCodeAIAgency

**Review date:** 2026-07-18

## Assessment basis

Static inspection of project-owned source and configuration only; no dependency installation, build, database migration, external-service call, or runtime launch was performed. The scan considered 199 project files (176 source files), 1 manifest(s), 0 test-like file(s), and 0 CI workflow(s), excluding dependency/generated directories.

## Classification

**Functional but incomplete**

This is a substantive but unfinished AI/agent platform application, not just an empty scaffold. Inspection found 176 source files across `src/`, `prisma/` using Next.js, React, Express, Prisma; however, the checked-in workflow and delivery controls do not yet demonstrate a complete, production-operable product.

## Why it is not complete

- Generated gap/visualization routes describe missing capabilities or simulate recommendations; they do not implement the underlying domain operation.
- Generic LLM calls are used as product behavior without enough typed tools, grounded evidence, deterministic rules, or output evaluation.
- Mock, demo, sample, fixture, or placeholder behavior remains in executable/product paths.
- No recognizable project-owned automated tests were found for the main workflow.
- No checked-in CI workflow proves builds, tests, migrations, and security checks on every change.

## Needed features

1. Replace generic prompt wrappers with typed domain tools, grounded retrieval, provenance, and schema-validated outputs.
2. Add tenant-scoped connectors, permission-aware indexing, incremental sync, deletion propagation, and source freshness indicators.
3. Implement evaluation datasets, quality/safety gates, cost and latency budgets, tracing, and human approval checkpoints.
4. Run tools in isolated jobs with timeouts, retries, idempotency, rate limits, and auditable input/output records.
5. Add risk-based unit, integration, and end-to-end tests in CI, including migration and failure-path coverage.

## Risks or launch blockers

- Automation contains destructive process, filesystem, or database operations; do not run it on a shared machine without review.
- Startup appears coupled to seed/migration behavior, risking data mutation or non-repeatable launches.
- AI-provider availability, cost, privacy, prompt injection, and unvalidated output are launch risks until bounded and evaluated.
- Regression risk is high because no recognizable project-owned automated tests cover the main path.

## Evidence inspected

- `README.md`
- `src/components/GapFeaturePage.tsx:7`
- `src/components/GapFeaturePage.tsx:5`
- `src/app/layout.tsx`
- `package.json`
- `start.sh`

## Recommended next action

Choose one real AI/agent platform journey, define acceptance criteria and external contracts, then close its persistence, permission, integration, failure, and test gaps before expanding features.

## Implementation completed — 2026-07-20

### Supported product boundary

The broad generated prototype is not represented as production-ready. The supported journey is one governed recommendation service: a tenant-bound connector submits a signed incremental batch; permission-aware retrieval selects fresh evidence; a contributor queues an idempotent isolated job; a separately operated worker calls one fixed provider contract; schema, citation, confidence, cost, and latency gates are enforced; and a reviewer or owner records an approval or rejection. Approval never executes a legacy workflow. All generated legacy pages and APIs return 410 in production through `src/proxy.ts`.

### Changes implemented

- Added tenant-bound HMAC connector keys, timestamp/replay protection, incremental cursors, source versions, permission roles, freshness, and deletion tombstones.
- Added durable idempotent jobs, database-backed rate windows and leases, timeouts, bounded retries, provider cost/latency budgets, schema validation, exact-source citation checks, confidence gates, and explicit failure codes.
- Added independent reviewer/owner decisions, tenant isolation, role enforcement, session-version revocation, disabled-user checks, append-only chained audit events, immutable sync receipts, and audit export.
- Added a governed UI/API surface, live/readiness probes, offline evaluation dataset, deterministic provider integration tests, production container/CI definitions, migration-adoption guidance, external-processing and operational runbooks, backup/restore/rollback procedures, and security policy.
- Removed demo credentials and reduced seeding to a guarded, loopback-only, empty-database bootstrap with caller-provided credentials. Destructive Prisma lifecycle commands fail closed.
- Replaced destructive startup with a production-only, non-mutating launcher and corrected it to run the Next.js standalone artifact. The build now packages static/public assets into the standalone output.
- Updated dependencies and hardened provider, email, Stripe, replay, workflow, billing, and shared-component routes to fail closed rather than simulate success.

### Verification evidence

- TypeScript passed; strict governed-surface lint passed; unit/security tests passed 4/4; three offline evaluation cases passed; the production Next.js 16.2.10 build completed across 54 routes; `npm audit --audit-level=low` reported zero vulnerabilities; current-tree secret scan and `git diff --check` passed.
- The checked-in baseline migration deployed successfully to two disposable PostgreSQL 14 databases. The database integration test passed the full tenant isolation, sync/replay, permissions, quality-gate, retry, approval, tombstone, and immutable-audit scenario.
- Guarded seed created one disposable tenant owner without a demo credential.
- Corrected `start.sh` passed strict production configuration and launched the standalone service at `127.0.0.1:3094` without the earlier `next start` warning. Readiness and `/login` returned 200.
- Real NextAuth credential checks: valid login 200 with a production session, invalid password 401, session lookup 200 for `operator@example.com`, governed sources 200, missing session 401, tampered session 401, governed page 200, and a legacy API 410.

### Remaining external launch controls

The current tree contains no provider credential, but gitleaks confirms one provider-like token remains in historical commit `070c3500fa2a08da400ffbece18e871cddeba9da` (`start.sh`). The provider/account owner must revoke it, audit use, and authorize coordinated history remediation before launch or redistribution. Vendor/data-processing approval, production tenant keys, model approval, retention policy, deployment monitoring, and existing-database migration rehearsal also remain deployment-owner controls, not capabilities that can be truthfully synthesized in source.

### Browser verification boundary

`BLOCKED_BROWSER`: the required in-app browser control has no available browser tab or session. No substitute browser automation was used and no visual-click pass is claimed. The production page and complete credential/session contract were verified against the real running service as recorded above.

### Runtime campaign acceptance (2026-07-20)

The launcher now retains its strict prebuilt production path while allowing isolated non-production validation on an explicitly assigned, free, loopback-only port. The destructive disposable seed is no longer discoverable as a generic runtime seed; the existing one-time owner bootstrap is exposed as `create-admin`, accepts the validator's explicit acknowledgement/tenant fields, hashes with bcrypt-12, and still refuses any non-empty identity store. On PostgreSQL/API/UI ports 55676/6156/6157, owner provisioning, Next.js startup, NextAuth credential login, database-revalidated revocable session retrieval, and an authenticated API request all passed (`API_VERIFIED`, `startup_login_session_api`). TypeScript, four portable security/unit tests (one database-only test skipped in this focused pass), strict governed-surface lint, the complete 54-route standalone production build with packaged assets, launcher/manifest syntax, and `git diff --check` passed.
