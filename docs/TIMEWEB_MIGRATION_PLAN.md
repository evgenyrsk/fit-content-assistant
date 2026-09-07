# Timeweb migration plan

## Scope and guardrail

Timeweb is a tested portability target, not an authorized migration. This plan does not change the active Sites production environment. Cutover, DNS changes and secret transfer require a separate owner decision. External content publication remains outside the migration.

## Target mapping

| Current boundary | Portable contract | Timeweb target | Validation |
| --- | --- | --- | --- |
| Sites Worker / vinext | HTTP routes and application use-cases | App Platform container | API contract tests and production dry run |
| D1 | repository and reader ports | Managed PostgreSQL | row counts, primary/foreign keys, canonical row hashes |
| R2 source files | `SourceFileStore` | S3-compatible Object Storage | object counts, byte sizes and SHA-256 hashes |
| Sites secrets | named server-side environment | App Platform secrets | presence-only probe; values never exported to logs |
| D1 lexical indexes | evidence/claim namespaces | PostgreSQL FTS, later separate pgvector indexes | retrieval eval and namespace isolation gate |

Raw evidence chunks and approved claim versions must remain in separate tables and search namespaces. Candidate sources, evidence, claims and content cannot be merged during export or import.

## Export manifest

Every migration bundle contains:

- schema version and UTC creation time;
- one canonical JSONL export per D1 table, ordered by primary key;
- an object manifest with key, byte size, content type and SHA-256;
- table row counts and per-table canonical SHA-256;
- an audit record identifying the export job, without secret values;
- a signed operator checklist recording source and destination revisions.

The bundle is encrypted at rest and transferred over TLS. Imported PDFs and source documents retain rights/provenance metadata. Authentication tokens, prompts containing user data and environment secrets are excluded from the data bundle.

## Secret migration

Only names are inventoried: `ROUTERAI_API_KEY`, RouterAI route configuration, Threads credentials and any future Instagram credentials. Values are copied directly between protected secret stores, never committed, printed or placed in the backup bundle. A presence-only status probe and one bounded provider call validate each integration. Old values are revoked only after rollback expiry.

## Rehearsal and cutover

1. Freeze schema changes and record current application, schema and methodology versions.
2. Produce D1/R2 export and manifest; validate the bundle before transfer.
3. Restore into isolated PostgreSQL/S3 staging. Reject duplicate, missing or hash-mismatched records.
4. Run migrations, full automated checks, retrieval/style/release evals and a non-publishing human-gated dry run.
5. Enable read-only dual-read comparison. Dual-write is prohibited.
6. Compare sampled records, row/object counts, hashes, retrieval order and audit continuity.
7. Take a final delta export during a short write freeze, restore and repeat validation.
8. Switch application traffic, observe SLO/error/cost panels and preserve the previous Sites version.
9. End the freeze only after integrity and rollback gates pass.

## Rollback

Rollback is triggered by any integrity mismatch, broken evidence link, authentication regression, SLO breach, missing audit event or provider routing failure. Traffic returns to the pinned Sites version; the Timeweb target becomes read-only; post-cutover writes are exported and reconciled before another attempt. No destructive cleanup happens during the rollback window.

## Acceptance gates

- 100% equality of table counts and canonical hashes;
- 100% equality of object counts and SHA-256 hashes;
- zero broken claim-to-evidence and content-to-claim links;
- evidence and approved-claim retrieval namespaces remain isolated;
- all automated checks and negative publication gates pass;
- authenticated LLM status and bounded live probe pass without revealing secrets;
- backup can be restored into an empty staging target twice with identical manifests;
- rollback to the previous production version is demonstrated before DNS cutover.

The repository's `npm run verify:recovery` is a deterministic, non-destructive contract drill for the manifest and restore comparison. A live D1/R2 export into Timeweb staging remains a pre-cutover gate because the current managed connector does not expose a full portable database dump.
