# Synthetic meter decision dataset

Run from this repository after importing the approved synthetic fixture:

```sh
node --env-file-if-exists=.env --import tsx scripts/import-meter-fixture.ts
node --env-file-if-exists=.env --import tsx scripts/meter-dataset.ts
node --env-file-if-exists=.env --import tsx --test tests/meter-dataset.test.ts
```

The builder writes `data/meter-v1/release` relative to the repository, overridable with `METER_RELEASE_PATH`, and does not publish or invoke any model. It requires the configured PostgreSQL analyst connection. An exclusive lock prevents concurrent builds. Completed batches of 100 examples are atomically checkpointed under a fingerprint of source files and the database fixture manifest. A failed build resumes those verified batches. A source change creates a new checkpoint namespace. If a process is killed, inspect the PID in the lock and remove the lock only after confirming that process is no longer running.

## Contract

Publish as a separate Hugging Face `meter` configuration, keeping the existing SQL candidate-selection configuration separate. These meter rows supervise the actual harness's slot choices, including numeric slots only when the runtime requests them. They are not interchangeable with one-of-four SQL rows.

Model input is exactly `state` plus `questions`. `decisions` is the one-hot gold distribution for each slot. JSON-shaped fields are JSON-encoded strings. `expected_plan`, `expected_status`, `expected_evidence_sha256`, and `sql_queries` are evaluation metadata and must not be provided as input. The frozen state includes `asOf`, timezone, user question, and a previous validated plan for follow-ups. Previous plans come from synthetic scenarios, not from model predictions. Evaluation of long conversational chains remains separate.

Every question and instruction is English. Supported categories include totals, ranking, comparison, daily anomalies, stale reporting, evidence-based explanations, summary, and follow-up questions. Context cases cover retaining an operation, changing it, and starting a fresh request despite prior context. Clarification cases include unknown resources/buildings/floors, unsupported periods, historical stale checks, forecasts, and missing conversation context. Ranking and explanation scenarios specify one resource to avoid comparing incompatible units. Anomaly cases use today or yesterday, reflecting the current harness boundary.

Gold labels are authored by deterministic scenario rules without live LLM generation. All labels are checked against current criteria and passed through the actual planner with a one-hot mock response. Accepted plans must exactly match intended typed plans. Every accepted plan is executed against the frozen fixture. Usage SQL results are additionally checked against an independent JavaScript implementation over raw cumulative readings, including reset, gap, invalid-quality, and null handling. Other outputs retain execution evidence hashes. These checks do not constitute human review or proof that every phrasing matches every user's intent.

## Splits and limitations

Semantic groups use intent, relative-period semantics, and the shape of resource/building/floor filters. Literal resource/location values remain in the same group. Fresh requests and follow-ups that resolve to the same semantic plan group remain together. Groups are deterministically assigned within each major category; every split includes each supported intent and clarification cases. There are no duplicate states. This is structural holdout within one synthetic database, not an unseen database or independently authored language benchmark. Template-generated examples are correlated and should not be described as independent real-world requests.

Comparison means matched elapsed periods according to the runtime clock. Explanation describes observed contributions and does not supply causal labels. A template that asks why consumption increased does not assert that it actually increased; the evidence may show no increase. Empty stale results mean no matching stale meters, not zero usage or evidence that missing readings are normal. Runtime uncertainty rejection must also be tested with non-one-hot predictions.

The fixture and generated scenarios are newly authored synthetic data dedicated under CC0-1.0. They contain no UCI source rows and must not inherit the UCI-derived configuration's license by accident. Include `meter/LICENSE` and state the configuration-specific license in the combined dataset card. The exact counts, source fingerprints, fixture identity, artifact checksums, and draft/human-review status are recorded in `meter_validation_report.json`.
