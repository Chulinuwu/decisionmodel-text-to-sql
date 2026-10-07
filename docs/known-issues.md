# Known issues and open design questions

Recorded 2026-10-07. Evidence comes from the live reports under `test-results/` (ignored by git) and the realistic question bank in `scripts/realistic-questions.json`.

## Scope limits (by design)

- Clef Flash only chooses among options the code supplies (Decisions API question types: choice, noul, score). It cannot write SQL, reason over intermediate results, or chain follow-up queries. The system therefore answers a fixed set of analysis types per question and cannot investigate causes ("why did sales drop"). Which questions are answerable depends on the use case and on which catalog entries and analysis templates exist.
- The semantic catalog (measures, dimensions, comparable column pairs) is curated for the Olist dataset. Part of it is derived from the schema, but a new database needs new catalog entries.
- Data before 2017-01 and after 2018-08 is sparse; "latest month" means the latest complete month, not the last timestamp.

## Accuracy problems observed

1. **Correct reading never reaches the ranker.** The first decision call scores options independently; options below the beam floor are dropped before ranking. Examples: "มีคำสั่งซื้อทั้งหมดกี่รายการ" (count orders scored 0.08, never offered) and "ค่าส่งเฉลี่ยต่อออเดอร์" (read as "list orders"). Only 6 candidates are ranked although a choice question accepts up to 255 options.
2. **Order vs order-item grain confusion.** Clef confidently mixes parent and child grain: an item freight filter was read as whole-order freight (slot 0.69, rank 0.70), and the Thai counter word "รายการ" was read as order items. Three occurrences across two runs.
3. **Listwise ranking splits probability across near-duplicates.** Similar candidates share the choice probability, so no candidate crosses the acceptance threshold and the UI asks the user to choose more often than necessary. Choose cards can also show readings that differ only by sort order or limit.
4. **Independent marginals.** Measure, operation and grouping are scored separately and multiplied in the beam although they are correlated; only the ranker sees them jointly.
5. **Value linking can invent a filter.** Linking categorical values by model judgment (needed for Thai synonyms such as "ยกเลิก" -> canceled) once produced state = SP for "which state has the most customers". Round 3 keeps the unlinked alternative in the beam when there is no lexical evidence; still to be measured.
6. **Eval sets are small** (20 built-in, 17 + 11 held out). A difference of one or two questions is within noise, so no design variant can be called optimal yet.

7. **Period comparisons are often refused.** In the round-3 analysis held-out set, "ยอดขายเดือนล่าสุดเทียบกับเดือนก่อนหน้า", "ยอดขายปี 2018 เทียบกับปี 2017" and "รัฐไหนค่าส่งเฉลี่ยต่อสินค้าสูงผิดปกติ" produced no valid candidate ("ระบบสร้างแผนที่ตรวจสอบผ่านไม่ได้"). Not yet investigated; likely candidate building or validation for period_change and for anomaly units reached through joins.

## Engineering notes

- Offers (interpretations a user can click) live in memory for 30 minutes and are lost on server restart.
- The importer password is fixed when the Postgres volume is first created; changing `DB_IMPORTER_PASSWORD` later does not change an existing volume.

## Proposed next experiments (in order)

1. Grow the eval set to about 100 questions with gold SQL, drawn from realistic usage, with a held-out split that is never used for tuning.
2. Rank 20 to 40 candidates instead of 6 in the same call and measure recall of the correct reading before ranking.
3. Compare listwise choice ranking with pointwise per-candidate scoring (score or noul) for calibration and choose rate.
4. Treat order vs order-item grain as a known weak axis: always generate the sibling-grain candidate and ask the user when the top candidates differ only on that axis.
5. Adopt only changes that improve the larger held-out set.
6. If the Clef-only constraint is relaxed, evaluate an LLM planner with Clef as the bounded chooser for cause-investigation questions.
