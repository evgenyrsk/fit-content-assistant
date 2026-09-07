# Production readiness report — 2026-09-07

## Decision

Forme is ready for private, human-gated production use. It is not cleared for automatic scientific approval, unattended external publishing or Timeweb cutover.

## Release gates

| Gate | Result | Evidence |
| --- | --- | --- |
| Automated regression and build | Passed | `npm run check`, including domain/application/adapter/API/UI tests and retrieval/style/release evals |
| Negative publication cases | Passed | unreviewed claim language is blocked; content without human fact-check cannot be scheduled; publication requires a URL |
| Methodology calibration | Open by design | methodology `0.2.0-draft` is not expert-calibrated; automatic claim approval remains hard-disabled |
| Production access/privacy | Passed with limitation | site access is owner-only; secrets are server-side and hidden; prompt data still traverses configured LLM/research providers |
| LLM configuration | Passed | production has server-side provider, models, budget profile and a protected API key; authenticated live probe recorded below |
| Operational monitoring | Passed for MVP | safe health endpoint and UI expose 24h model runs/failures/cost, due source revalidation and SLO target |
| Rate limits | Accepted residual risk | user input/provider requests are bounded, but no shared global request limiter exists; owner-only access limits exposure |
| Backup/restore | Passed at contract level | deterministic logical backup → parse/restore → count/hash equality drill; live managed-platform dump remains a pre-migration gate |
| Rollback | Passed | multiple immutable production versions are available; rollback target is the last known-good version |
| Timeweb portability | Planned, not executed | provider mapping, manifest, secret transfer, staging restore, dual-read, cutover and rollback gates documented |
| External social integrations | Partial | Threads is configured for development mode; Instagram is honestly `not_configured` until server-side credentials exist |

## Production inventory

The production D1 database exposes 34 expected tables across source intake, evidence assessment, claims, content, metrics and audit. Current persisted data contains research/source/model/audit history. At audit time, `claim_versions` and `content_items` were empty, so this release does not claim that a real production content item passed every human gate.

The site is private and owner-only. Production environment revision 12 contains the expected RouterAI and Threads setting names; secret values were not read or logged. Five recent immutable versions were available before this release.

## Reproducible dry run

1. Run `npm run check` from a clean checkout.
2. Run `npm run eval:release` to verify fail-closed negative cases.
3. Run `npm run verify:recovery` and retain the output manifest/hash.
4. In an authenticated production session, open the workspace and verify the LLM and Production Health panels.
5. Trigger the bounded LLM connection probe. Do not approve a source, claim or content item on behalf of a human.
6. Confirm that unreviewed evidence cannot open automatic claim approval and unreviewed content cannot reach scheduled/published status.
7. Inspect provider diagnostics without invoking external publication.

## SLO and maintenance

- Availability objective: 99.5% monthly for the private application.
- First-party API latency objective: under 3 seconds, excluding external LLM and research-provider time.
- Scientific integrity objective: zero unsupported factual publications.
- Daily: source-status revalidation automation and review of actionable failures.
- Weekly: incomplete model runs, cost, due revalidations and token diagnostics.
- Per release: complete automated gate, authenticated smoke test, version pin and rollback check.
- Monthly: restore drill, access review, dependency/security updates and residual-risk review.

Alerts are actionable when incomplete model runs appear, source revalidation is overdue, audit continuity is lost, an integration token approaches expiry, or a publication/evidence gate fails. The safe default is to stop the affected workflow, never to lower the evidence gate.

## Residual risks and prohibitions

- No automatic claim approval before independent expert calibration and measured agreement.
- No external publication without a separate owner decision.
- No Timeweb migration, DNS switch or secret revocation without a separate cutover decision.
- No dual-write between D1 and PostgreSQL; only read-only comparison before cutover.
- No claim based solely on a trend signal, LLM output or unconfirmed source assessment.
- Global rate limiting and centralized alert delivery remain follow-up hardening work.
- A live D1/R2 export and restore into an isolated target is still mandatory before Timeweb cutover.
- Instagram diagnostics remain unavailable while its production credentials are absent.

## Release conclusion

The private product can be used safely within its human gates and now exposes its own operational condition. The release is fail-closed where calibration, review or integration configuration is absent. Portability is specified and testable, but migration is deliberately not started.
