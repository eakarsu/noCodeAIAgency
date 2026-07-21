# Security policy

Do not commit or transmit credentials through this repository. Use a secret manager and tenant-specific source keys. If a credential appears in current code or Git history, treat it as exposed: revoke it at the provider, audit access and billing, rotate every dependent secret, preserve redacted evidence, and coordinate any history rewrite with repository owners and clone holders.

The former launcher contained a provider key. The current tree no longer contains it; provider revocation and authorized history remediation remain launch blockers. Do not add a scanner allowlist for that finding or copy the value into an issue, test, document, or command.

Report vulnerabilities privately to the accountable repository owner with affected revision, impact, and a minimal redacted reproduction. Do not test against production tenants or external providers without written authorization.

Supported security boundaries are: database-refreshed tenant/role authorization, revocable short sessions, same-origin mutations, tenant-bound signed source sync, replay/idempotency controls, source permissions/freshness/deletion, isolated leased jobs, deterministic schema/evidence/budget gates, independent approval, append-only hash-linked audit, strict startup validation, additive migrations, and a production proxy that disables legacy generated routes.
