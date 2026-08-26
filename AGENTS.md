# Forme repository instructions

These instructions apply to the entire Forme application repository.

## Product invariants

- Keep Research, Evidence, Knowledge, and Content as separate layers.
- Never present a discovered source as a validated conclusion.
- Claims are the primary unit of scientific knowledge.
- Preserve uncertainty, limitations, conflicting evidence, population, and context.
- Keep traceability from content to claims and from claims to sources.
- Do not increase scientific certainty in the content layer.

## Product language

- The user-facing product is Russian-first.
- Prefer clear, natural language over academic or marketing jargon.
- Avoid guru language, false urgency, fear, and unsupported guarantees.
- Label demonstrations and placeholder scientific results explicitly.
- Never present demonstration trend signals as live Instagram or Threads data.
- Treat Threads as an independent content format with one strong idea, natural voice, and discussion potential; do not reuse Telegram copy verbatim.

## Interface

- Maintain both light and dark themes.
- Use the tokens and principles in `docs/DESIGN_SYSTEM.md`.
- Preserve keyboard, touch, reduced-motion, and responsive behavior.
- Every navigation item must lead to a meaningful working view.
- Keep the knowledge base navigable through topic clusters, search, confidence, status, and freshness filters as it grows.
- Keep spacing on the shared 6/10/14/20/28/40 px scale unless a component requires a documented exception.

## Project records

- Update `docs/ROADMAP.md` when a milestone changes.
- Record architectural changes in `docs/ARCHITECTURE.md`.
- Do not edit `docs/ORIGINAL_BRIEF.md`; it is the immutable source brief.
