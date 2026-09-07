# Real PubMed retrieval snapshot — 2026-09-07

## Scope

Reproducible snapshot of ten real PubMed candidates for the question: «Помогает ли креатин увеличить силу и мышечную массу у здоровых взрослых?». Labels are owner-authorized editorial adjudications against the stated PICO. They are not an independent clinical-expert calibration and must not be represented as one.

## Result

| Metric | Discovery order | PICO rerank |
| --- | ---: | ---: |
| recall@10 | 1.00 | 1.00 |
| precision@3 | 0.33 | 1.00 |
| relevant full-text share | 1.00 | 1.00 |
| irrelevant candidate share | 0.60 | 0.60 |

The reranker improves early relevance without claiming that the candidate pool itself is clean. The 60% irrelevant share is retained as a discovery-stage maintenance signal: search remains broad, source intake and human review remain blocking.

Run `npm run eval:retrieval` to reproduce the snapshot together with the synthetic regression set.
