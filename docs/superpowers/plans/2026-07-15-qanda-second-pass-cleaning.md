# Investment Q&A Second-Pass Cleaning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the 59 Investment Q&A chapters so every substantive question-and-answer unit has one canonical home, shorter duplicates and reaction-only replies are removed, and every chapter uses a topic-specific section order instead of inherited source-book headings.

**Architecture:** Keep the pinned 20 source articles and the existing reproducible generator. Improve speaker/date normalization before fingerprinting, review near duplicates globally rather than only inside one target topic, then assign retained blocks to curated section catalogues and sort dated units chronologically inside each section. Record every second-pass removal and target in the existing audit JSON.

**Tech Stack:** Node.js ESM, Nuxt Content Markdown, Node test runner.

## Global Constraints

- Preserve all unique original viewpoints, questions, dates, amounts, percentages and company data.
- Do not rewrite answers or combine sentences to create a new viewpoint.
- Keep exactly 59 chapter files in four volumes with counts 12, 12, 29 and 6.
- Keep full Q&A form and unlimited chapter length.
- A repeated Q&A appears in one canonical chapter only; related chapters use existing site navigation rather than duplicate full text.
- Remove only greetings, reaction-only replies and confirmed duplicate copies.
- Work directly on `main`; do not deploy or push unless the user explicitly asks.

---

### Task 1: Normalize answers and discard reaction-only units

**Files:**
- Modify: `scripts/qanda-cleaning-lib.mjs`
- Modify: `scripts/qanda-cleaning-generate-lib.mjs`
- Modify: `tests/qanda-cleaning.test.mjs`

**Interfaces:**
- Produces: `answerFingerprint(markdown)` that recognizes `**段永平** ：` and equivalent speaker forms.
- Produces: `isNoInformation(block)` that ignores dates when testing acknowledgements and removes standalone likes/reactions while retaining short factual answers such as “需求”“玩家”“Model Y”.

- [ ] Add failing tests for speaker markup normalization, dated reaction-only answers, and short factual answers.
- [ ] Run `node --test tests/qanda-cleaning.test.mjs` and confirm the new assertions fail for the expected reasons.
- [ ] Extend fingerprint and no-information normalization without altering original Markdown.
- [ ] Re-run the focused test and all Node tests.

### Task 2: Deduplicate globally and keep the fuller canonical unit

**Files:**
- Modify: `scripts/qanda-cleaning-lib.mjs`
- Modify: `scripts/generate-qanda-topics.mjs`
- Modify: `tests/qanda-cleaning.test.mjs`

**Interfaces:**
- Produces: global near-duplicate review over all informative source blocks.
- Produces: canonical selection that prefers a complete question, explicit answer, date, deeper heading context and longer substantive text.
- Produces: conflict rules that keep units distinct when both versions contain different dates or numeric data, but allow a dated full version to replace an otherwise identical undated short version.

- [ ] Add failing tests for cross-topic duplicates, dated-full versus undated-short copies, and genuinely distinct numeric updates.
- [ ] Run the focused test and verify RED.
- [ ] Change near-duplicate review from per-topic to global and update canonical scoring.
- [ ] Re-run all Node tests and confirm GREEN.

### Task 3: Replace inherited source headings with curated topic sections

**Files:**
- Modify: `scripts/qanda-cleaning-config.mjs`
- Modify: `scripts/qanda-cleaning-generate-lib.mjs`
- Modify: `tests/qanda-cleaning.test.mjs`

**Interfaces:**
- Produces: `sectionForBlock(topicSlug, block)` returning `{ title, order }`.
- Produces: `extractBlockDate(block)` for chronological ordering inside a section.
- Consumes: the existing `TOPICS`, `classifyBlock` and `buildTopicChapter` pipeline.

- [ ] Add failing tests proving generic inherited headings such as “30个商业案例点评”“案例3：苹果”“补充问答”“时事”“感谢” do not appear in generated chapter headings.
- [ ] Add failing tests for representative routing: valuation to Investment 07, margin risk to Investment 04, Apple management to Apple 02, Moutai governance to Moutai 02, child education to Life 04 and Zone 2 to Life 06.
- [ ] Define ordered section catalogues for the 12 investment chapters, 12 business chapters, Apple, Moutai, BBK, NetEase and six life chapters; use a specific “相关问答” fallback for short company chapters.
- [ ] Sort sections by configured order and units by date, leaving undated source order stable.
- [ ] Re-run all Node tests.

### Task 4: Regenerate, audit and verify the full site

**Files:**
- Regenerate: `content/dao/qanda/wenda-*.md`
- Regenerate: `content/dao/investment-logic/wenda-invest-*.md`
- Regenerate: `content/dao/business-logic/wenda-business-*.md`
- Regenerate: `docs/content-audits/investment-qanda-cleaning-map.json`
- Modify if required: `scripts/audit-qanda-cleaning.mjs`
- Modify if required: `tests/qanda-integration.test.mjs`

**Interfaces:**
- Produces: 59 cleaned chapters, one topic index, 20 legacy guides and 208 old-part redirects.

- [ ] Run `node scripts/generate-qanda-topics.mjs --write`.
- [ ] Confirm the generated catalogue remains 59 chapters with volume counts 12, 12, 29 and 6.
- [ ] Run the cleaning audit and inspect every remaining high-similarity candidate; keep only candidates containing distinct dates, numbers or additional viewpoints.
- [ ] Confirm no generated heading contains the banned inherited titles and no reaction-only standalone answer remains.
- [ ] Run `node --test tests/*.test.mjs`.
- [ ] Run `node scripts/audit-qanda-cleaning.mjs`.
- [ ] Run `npm run typecheck`.
- [ ] Run `SKIP_DEPLOY=1 NODE_OPTIONS=--max-old-space-size=8192 npm run generate`.
- [ ] Run `npm run book`.
- [ ] Run `git diff --check` and review the final content statistics before committing locally.

