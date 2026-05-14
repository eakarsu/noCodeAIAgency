# Audit Note - noCodeAIAgency

Source: `_AUDIT/reports/batch_11.md` (lines 56-93).

## Original Audit Recommendations

### Missing AI Counterparts
- AI-driven content recommendation for template discovery.
- Anomaly detection for deployment health.
- Agent-assisted debugging/support for no-code builders.

### Missing Non-AI Features
- Multi-tenant organization/RBAC.
- Audit trail / compliance logging.
- Team collaboration (shared workspaces, approvals).

### Custom Feature Suggestions
1. AI-Powered Template Search & Recommendations.
2. Automated Testing Agent.
3. Deployment Safety Net.
4. White-Label SaaS Marketplace.
5. Multi-modal Agent Builder.
6. Managed API Integrations.

## Categorization

All audit items here are **NEEDS-PRODUCT-DECISION** or **TOO-RISKY** for a mechanical pass:
- Existing repo has 56 API routes, complex generic `/api/ai` endpoint dispatching across types (WORKFLOW, CODE, INTEGRATION, TEMPLATE, OPTIMIZATION, DEBUG, AUTOCOMPLETE) plus `/api/ai/autocomplete`, `/api/ai/execute`, `/api/ai/models`. The audit-suggested gaps overlap heavily with the existing dispatcher (e.g. OPTIMIZATION/DEBUG cover deployment health, debugging assistance, etc.).
- Adding new "anomaly detection" or "template recommendation" surfaces would require schema changes (deployment-health metric model, template embedding store) — not safe to introduce mechanically.
- Multi-tenant RBAC, audit trail, team collaboration are large architectural changes.

No code changes applied. This project is logged as **backlog-only**.

## Backlog (Prioritized)

### High
- Multi-tenant org / RBAC.
- Audit trail / compliance logging (SOC2/HIPAA prep).
- Deployment safety-net (config diff + AI review before go-live).

### Medium
- AI-powered template search (vector embeddings).
- Anomaly detection for deployment health.
- Team collaboration (workspaces + approvals).

### Low / Product Decisions
- White-label marketplace.
- Multi-modal builder nodes.
- Managed connectors (Salesforce/HubSpot/Slack).

## Apply pass 3 (frontend)

LEFT-AS-IS. Single Next.js 15 App Router project — UI and API routes co-located. `src/app/dashboard/ai/page.tsx` already calls `/api/ai/execute` with tabs for every dispatcher type (workflow, code, integration, template, optimization, debug, autocomplete) and `src/app/dashboard/ai-usage/page.tsx` calls `/api/ai-usage`. Same-origin auth uses next-auth session cookies, so the "JWT bearer from localStorage" requirement is not applicable here — that pattern targets two-server React+Express setups. Audit verdict was backlog-only (NEEDS-PRODUCT-DECISION / TOO-RISKY); no new FE pages warranted. No changes made.

## Apply pass 4 (mechanical backlog)

LEFT-AS-IS. No MECHANICAL items eligible: the entire backlog is NEEDS-PRODUCT-DECISION (multi-tenant org / RBAC, audit-trail / SOC2 logging, deployment safety-net workflow, team workspaces / approvals, white-label marketplace, multi-modal builder nodes), TOO-RISKY (template vector search and deployment-health anomaly detection both require new schema / embedding store), or NEEDS-CREDS (managed Salesforce / HubSpot / Slack connectors). The unified `/api/ai/execute` dispatcher already covers the OPTIMIZATION / DEBUG / TEMPLATE / AUTOCOMPLETE surfaces a mechanical pass would otherwise add. No changes made.
