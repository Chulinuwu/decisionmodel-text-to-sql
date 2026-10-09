# Synthetic meter harness

Import with `npm run meter:import`, then build/start normally and open `/#meter`.
The Olist workspace remains available. The meter workspace uses a separate
`metering` schema and a server-owned frozen clock, 2026-10-09 12:00 Asia/Bangkok.
All 15 meters and their readings are synthetic; this is not a live facility.

The meter planner calls Clef Flash for bounded intent, period, resource, location,
limit and continuity choices. Deterministic code compiles parameterized queries
and formats answers from returned rows. Low-confidence or unsupported readings
request clarification. Requests retain the repository's Cloudflare-only routing
with fallbacks disabled; provider identity, model identity and zero output tokens
remain strict.

Supported operations are totals, ranking, period comparison, daily historical
anomalies, reporting staleness, measured contributors to changes and a bounded
multi-query summary. Follow-ups use the previous successful plan via an opaque
server context ID. IDs expire after 30 minutes, are bounded in memory and are
lost on restart. The browser cannot supply plans, SQL, clocks or history.

Cumulative readings are converted into valid intervals before aggregation.
Reset crossings, invalid values, negative deltas and missing intervals are not
invented or counted as zero. Results disclose incomplete coverage. Water and
chemical units remain separate. Chemical and H2SO4 are separate fixture categories.
Daily anomaly detection requires adequate per-meter historical coverage and uses
the documented threshold in each response; it is not a trained fault detector.

Explanations identify recorded contributors and explicitly leave physical causes
unknown. No operational event log or causal diagnosis is fabricated. Summaries
execute bounded queries in one read-only repeatable-read snapshot; query failure
fails the response rather than presenting an incomplete answer as complete.

The API is `GET /api/meter/dataset` and
`POST /api/meter/query {question, contextId?}`. The response carries typed evidence,
SQL parameters, warnings, clock, decision trace and reported usage. English-only
training examples are separate from the bilingual UI acceptance tests.

`npm run meter:test:live -- --output reports/meter-live-v1.json --max-cost 1`
checks frozen English/Thai questions through the actual planner and executor
against an independent oracle over raw readings. Reports checkpoint each request;
resume requires matching source and fixture fingerprints and halts on ambiguous
in-flight calls. This evaluates the whole meter harness, unlike the four-plan
selection baseline for the earlier Text2SQL dataset.
