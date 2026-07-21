# External AI and data-processing boundary

The supported worker sends only the top permission-eligible, fresh document excerpts needed for one recommendation request to the fixed OpenRouter HTTPS endpoint. It does not accept a caller-controlled provider URL or model. Production refuses to start until external processing is explicitly acknowledged and a specific approved model is configured.

Before enabling that acknowledgement, the accountable owner must document:

- data classification and fields permitted to leave the tenant boundary;
- provider contract, subprocessor list, region, retention/training settings, and deletion process;
- tenant notice/consent and a lawful processing basis;
- input/output token prices and the configured cost budget;
- supported model/version evaluation results;
- outage, rate-limit, and incident contacts; and
- a rule prohibiting secrets, regulated data, or customer content unless separately approved.

Source text is untrusted. The prompt instructs the provider to ignore instructions inside evidence, but that is not the security control. Deterministic controls enforce a fixed schema, known document IDs, exact-substring citations, tenant/role filters, source freshness, confidence, cost, and latency. Provider output cannot call a tool or execute a workflow. An independent reviewer must approve it, and approval only records the decision.

The checked-in deterministic provider exists only in tests and performs no network call. No production fallback fabricates a recommendation when the provider is unavailable.

The checked-in offline dataset covers relevant retrieval, role exclusion, and untrusted prompt-injection text without calling a provider. It is a regression floor, not model acceptance. Before changing or enabling a production model, an approved owner must run a versioned, representative, non-sensitive evaluation for schema validity, citation accuracy, permission leakage, prompt injection, refusal behavior, latency, and cost; record the model revision and thresholds; and obtain security/privacy signoff.
