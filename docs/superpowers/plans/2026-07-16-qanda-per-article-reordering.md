# Investment Q&A Per-Article Cleaning and Reordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild all 45 Investment Q&A chapters so duplicate and non-informative units are removed, every question remains attached to its answer, and each article follows a logic-first, chronology-second reading order.

**Architecture:** Keep the pinned 20-source generation pipeline and add three focused layers: durable manual decisions, conservative conversation grouping, and deterministic logic-stage ordering. Extend the audit manifest so every article reports removals and moves, and make generation fail on orphaned Q&A, split conversation groups, unresolved duplicate candidates, restored manual deletions, or numeric/date drift.

**Tech Stack:** Node.js ESM, Node test runner, Markdown, Nuxt Content v3, Nuxt 4.

## Global Constraints

- Keep exactly 45 chapters: 12 investment, 12 business, 15 company and 6 life.
- Keep the pinned 20 source articles as the only content source.
- A question, its background, answer, date, attached list and data move as one unit.
- Adjacent dependent follow-ups move as one conversation group and retain internal order.
- Preserve unique viewpoints, dates, amounts, percentages, valuations and company data.
- Keep distinct variants when dates, numbers, examples or viewpoints differ.
- Retain ability-circle answers such as “不知道”“没研究过”“看不懂”.
- Sort by section, logic stage, date and original source order.
- Preserve the accepted manual cleanup in commits `f45ab92` and `912ce52`.
- Do not split or merge the current 45 articles and do not impose an article length limit.
- Implement directly on `main`; do not commit implementation changes, push or deploy without a new user request.

---

## File Responsibility Map

- `scripts/qanda-cleaning-decisions.mjs`: durable, uniquely matched manual keep/discard/fragment decisions.
- `scripts/qanda-conversation-groups.mjs`: conservative dependent-follow-up grouping and group validation.
- `scripts/qanda-ordering.mjs`: six logic stages, deterministic classification, stable sort keys and move records.
- `scripts/qanda-cleaning-lib.mjs`: source Q&A parsing and fingerprint primitives.
- `scripts/qanda-cleaning-generate-lib.mjs`: section rendering with grouped, ordered units.
- `scripts/generate-qanda-topics.mjs`: orchestration, audit assembly and fail-fast checks.
- `scripts/qanda-cleaning-audit-lib.mjs`: audit schema validation.
- `scripts/audit-qanda-cleaning.mjs`: on-disk output and per-article audit verification.
- `tests/qanda-cleaning.test.mjs`: unit tests for decisions, integrity, grouping and ordering.
- `tests/qanda-audit.test.mjs`: audit schema and fail-fast regression tests.
- `docs/content-audits/investment-qanda-cleaning-map.json`: generated source-to-output and per-article audit manifest.

---

### Task 1: Lock Current Manual Cleanup and Q&A Integrity

**Files:**
- Create: `scripts/qanda-cleaning-decisions.mjs`
- Modify: `scripts/qanda-cleaning-lib.mjs`
- Modify: `scripts/generate-qanda-topics.mjs`
- Test: `tests/qanda-cleaning.test.mjs`

**Interfaces:**
- Produces: `MANUAL_DECISIONS: Array<{ id, sourceSlug, contains, action, reason }>`.
- Produces: `applyManualDecisions(blocks): { kept, discarded, fragmentChanges }`.
- Produces: `validateQuestionAnswerIntegrity(block): string[]`.
- Consumes: stable block IDs and Markdown from `splitQuestionAnswerBlocks()`.

- [ ] **Step 1: Add failing tests for uniquely matched manual decisions**

Add fixtures containing the accepted removals from `f45ab92`: “投资大师的一句话也许就改变了我们的一生”, “这个忠实信徒很有趣哈”, “网友黑色伤：我用了两天”, “家庭保险配置问题”, “段总的蚂蚁熊兵是啥意思”, “开始卖点put了”, the duplicated short/long-account question, the duplicated ten-year-price question and the duplicated long “价值投资到底难在哪里” passage. Assert each decision matches exactly one pinned source block or exact fragment, and that an unmatched or multiply matched decision throws.

```js
assert.throws(
  () => applyManualDecisions([{ id: 'a', sourceSlug: 'source', markdown: '同一句' }, { id: 'b', sourceSlug: 'source', markdown: '同一句' }], [
    { id: 'manual', sourceSlug: 'source', contains: '同一句', action: 'discard', reason: 'manual-cleanup-f45ab92' },
  ]),
  /must match exactly one source block/,
)
```

- [ ] **Step 2: Add failing integrity tests**

Test a complete question/answer/date block, an answer-only original statement, a question with an empty answer, and a block where a second question begins after an answer. The second question must become a new unit; answer-only original statements remain valid; a marked question without a substantive answer is reported.

```js
assert.deepEqual(validateQuestionAnswerIntegrity({
  markdown: '网友：问题？\n\n**段永平：** 回答。（2025-01-01）',
  hasQuestion: true,
  hasAnswer: true,
}), [])
assert.match(
  validateQuestionAnswerIntegrity({ markdown: '网友：问题？', hasQuestion: true, hasAnswer: false }).join('\n'),
  /question-without-answer/,
)
```

- [ ] **Step 3: Run focused tests and confirm RED**

Run:

```bash
node --test --test-name-pattern='manual decisions|question answer integrity' tests/qanda-cleaning.test.mjs
```

Expected: failure because the decision module and integrity validator do not exist.

- [ ] **Step 4: Implement the decision registry and strict matcher**

Use source slug plus a distinctive exact phrase. `discard` removes a complete parsed unit; `remove-fragment` removes only an exact, separately audited non-Q&A fragment. Record the before and after text. Throw unless every decision matches once.

```js
export function applyManualDecisions(blocks, decisions = MANUAL_DECISIONS) {
  const discarded = []
  const fragmentChanges = []
  let kept = blocks.map((block) => ({ ...block }))
  for (const decision of decisions) {
    const matches = kept.filter((block) => block.sourceSlug === decision.sourceSlug && block.markdown.includes(decision.contains))
    if (matches.length !== 1) throw new Error(`Manual decision ${decision.id} must match exactly one source block; found ${matches.length}`)
    const block = matches[0]
    if (decision.action === 'discard') {
      discarded.push({ block, decision })
      kept = kept.filter((item) => item.id !== block.id)
      continue
    }
    const before = block.markdown
    block.markdown = block.markdown.replace(decision.contains, '').replace(/\n{3,}/g, '\n\n').trim()
    fragmentChanges.push({ blockId: block.id, decisionId: decision.id, before, after: block.markdown, reason: decision.reason })
  }
  return { kept, discarded, fragmentChanges }
}
```

- [ ] **Step 5: Tighten source unit splitting and implement integrity validation**

Split when a new explicit question marker begins after an answer, while keeping background paragraphs before the first answer attached. Do not reject answer-only source statements. Return stable error strings containing the block ID and error type.

- [ ] **Step 6: Apply manual decisions before no-information filtering and deduplication**

In `generate-qanda-topics.mjs`, run `applyManualDecisions()` after editorial normalization. Add discarded units and fragment changes to the existing audit records using reasons `manual-cleanup-f45ab92` or `manual-format-912ce52`.

- [ ] **Step 7: Run focused and full tests**

```bash
node --test --test-name-pattern='manual decisions|question answer integrity' tests/qanda-cleaning.test.mjs
node --test tests/*.test.mjs
```

Expected: all tests pass and the existing 55 tests remain green.

---

### Task 2: Build Conservative Conversation Groups

**Files:**
- Create: `scripts/qanda-conversation-groups.mjs`
- Modify: `scripts/generate-qanda-topics.mjs`
- Test: `tests/qanda-cleaning.test.mjs`

**Interfaces:**
- Consumes: cleaned informative blocks with `id`, `sourceSlug`, `headingPath`, `markdown`, source order and classified target slug.
- Produces: `buildConversationGroups(blocks): Array<{ id, sourceSlug, memberIds, blocks, date, sourceOrder }>`.
- Produces: `validateConversationGroups(groups, placementByBlockId): string[]`.

- [ ] **Step 1: Add failing grouping tests**

Cover four cases: explicit “追问/那为什么/上述问题” continuation, same-date supplemental response, unrelated adjacent questions, and adjacent units assigned to different articles. Only the first two group; unrelated questions stay separate; a grouped cross-target placement is an error.

```js
const groups = buildConversationGroups([
  { id: 'a', sourceSlug: 's', headingPath: ['主题'], markdown: '网友：什么是价值投资？\n\n大道：买股票就是买公司。（2020-01-01）', sourceOrder: 1 },
  { id: 'b', sourceSlug: 's', headingPath: ['主题'], markdown: '网友追问：那为什么很多人做不到？\n\n大道：因为知易行难。（2020-01-01）', sourceOrder: 2 },
])
assert.deepEqual(groups[0].memberIds, ['a', 'b'])
```

- [ ] **Step 2: Run the focused test and confirm RED**

```bash
node --test --test-name-pattern='conversation groups' tests/qanda-cleaning.test.mjs
```

Expected: module-not-found or missing export failure.

- [ ] **Step 3: Implement conservative grouping**

Group only adjacent blocks from the same source and heading path when the later block begins with an explicit dependency marker or is an explicit supplemental answer sharing the same full date. Do not group merely because two independent questions have the same date.

- [ ] **Step 4: Add placement validation**

For every group with more than one member, require all surviving members to share one target article and one rendered section. Produce `split-conversation-group:<groupId>` errors otherwise.

- [ ] **Step 5: Attach group metadata to blocks and audit records**

Store `conversationGroupId` and `conversationGroupIndex` on each retained block. Add `conversationGroups` to the generated audit with source slug, member IDs, target slug, section and date.

- [ ] **Step 6: Run focused and full tests**

```bash
node --test --test-name-pattern='conversation groups' tests/qanda-cleaning.test.mjs
node --test tests/*.test.mjs
```

Expected: all tests pass.

---

### Task 3: Add Logic-First Stable Ordering

**Files:**
- Create: `scripts/qanda-ordering.mjs`
- Modify: `scripts/qanda-cleaning-generate-lib.mjs`
- Modify: `scripts/generate-qanda-topics.mjs`
- Test: `tests/qanda-cleaning.test.mjs`

**Interfaces:**
- Produces: `LOGIC_STAGES` with numeric ranks `principle=1`, `definition=2`, `boundary=3`, `method=4`, `case=5`, `update=6`.
- Produces: `logicStageForBlock(topicSlug, block, sectionInfo): { stage, rank, rule }`.
- Produces: `orderTopicUnits(topic, blocks): { ordered, moves, placements }`.
- Consumes: `sectionForBlock()`, `extractBlockDate()` and conversation-group metadata.

- [ ] **Step 1: Add failing stage-classification tests**

Use representative content for all six stages. Require explicit source-update headings to win over keyword matches, company subsections to classify concrete company discussion as `case`, “什么是/本质/定义” as `definition`, “风险/误区/不能/能力圈” as `boundary`, and “如何/怎么/什么时候/买卖” as `method`. Plain thesis statements default to `principle`.

```js
assert.equal(logicStageForBlock('wenda-invest-01', {
  headingPath: ['价值投资'],
  markdown: '网友：什么是价值投资？\n\n大道：买股票就是买公司。',
}, { title: '价值投资的定义', order: 2 }).stage, 'definition')
```

- [ ] **Step 2: Add failing stable-order tests**

Assert the order key is section order, logic rank, group date and source order. Undated units preserve relative order. All members of a group remain contiguous and preserve group index.

- [ ] **Step 3: Run focused tests and confirm RED**

```bash
node --test --test-name-pattern='logic stage|logic-first ordering' tests/qanda-cleaning.test.mjs
```

Expected: missing module or export failure.

- [ ] **Step 4: Implement deterministic stage rules**

Use normalized heading path and question text only; do not rewrite content. Apply precedence: explicit reader-update source heading, company subsection/case heading, definition markers, boundary markers, method markers, then principle fallback. Record the matched rule.

- [ ] **Step 5: Implement group-aware stable sorting**

Build one sortable record per conversation group or singleton. Use the earliest explicit group date; use `9999-12-31` only as a comparison sentinel while preserving undated source order against other undated records. Expand groups after sorting without changing member order.

- [ ] **Step 6: Replace date-only sorting in `buildTopicChapter()`**

Pass precomputed placements into rendering. Keep section and company subsection order from `sectionForBlock()`, then render units in logic-first order. Return `moves` and `placements` on the article object for audit assembly.

- [ ] **Step 7: Run focused and full tests**

```bash
node --test --test-name-pattern='logic stage|logic-first ordering|topic builder' tests/qanda-cleaning.test.mjs
node --test tests/*.test.mjs
```

Expected: all tests pass.

---

### Task 4: Extend Per-Article Audit and Fail-Fast Validation

**Files:**
- Modify: `scripts/generate-qanda-topics.mjs`
- Modify: `scripts/qanda-cleaning-audit-lib.mjs`
- Modify: `scripts/audit-qanda-cleaning.mjs`
- Test: `tests/qanda-audit.test.mjs`

**Interfaces:**
- Produces: `audit.articleCleaningStats[]` with `{ slug, sourceUnits, keptUnits, duplicateUnits, discardedUnits, conversationGroups, movedUnits }`.
- Produces: `audit.orderingMoves[]` with block/group ID, old/new article, section, stage and position.
- Consumes: manual-decision, conversation-group and ordering records from Tasks 1–3.

- [ ] **Step 1: Add failing audit-schema tests**

Require exactly 45 per-article stats, valid group member IDs, complete move records, zero integrity errors, zero restored manual decisions and zero dangerous numeric changes. Add failure fixtures for a split group, missing article stats, an unresolved near duplicate and a restored manual phrase.

- [ ] **Step 2: Run audit tests and confirm RED**

```bash
node --test tests/qanda-audit.test.mjs
```

Expected: failures for missing new audit fields and validations.

- [ ] **Step 3: Assemble per-article statistics and move records**

Count source units by their final classified target before filtering, then kept, duplicate and discarded units by target. Count a moved unit when its new zero-based position within the rendered section differs from its original stable position.

- [ ] **Step 4: Implement fail-fast validation**

Add validation errors for:

```text
Expected 45 article cleaning stats
Question/answer integrity errors found
Conversation group is split
Manual cleanup content was restored
Ordering move is incomplete
Near duplicate review unresolved
Dangerous numeric changes found
```

- [ ] **Step 5: Verify generated Markdown against audit placement**

In `audit-qanda-cleaning.mjs`, confirm every kept block appears in its recorded article, group members are contiguous, section headings match placements, and no manual decision phrase marked `discard` remains.

- [ ] **Step 6: Run audit and all unit tests**

```bash
node --test tests/qanda-audit.test.mjs
node --test tests/*.test.mjs
```

Expected: all tests pass.

---

### Task 5: Regenerate All 45 Articles and Review Every Article

**Files:**
- Regenerate: `content/dao/qanda/wenda-*.md`
- Regenerate: `content/dao/investment-logic/wenda-invest-*.md`
- Regenerate: `content/dao/business-logic/wenda-business-*.md`
- Regenerate: `content/dao/qanda/wenda-topic-index.md`
- Regenerate: `docs/content-audits/investment-qanda-cleaning-map.json`

**Interfaces:**
- Consumes: the completed deterministic pipeline and audit schema.
- Produces: 45 cleaned articles and one complete audit manifest.

- [ ] **Step 1: Run a dry generation**

```bash
node scripts/generate-qanda-topics.mjs
```

Expected: 45 generated articles, 0 integrity errors, 0 split groups, 0 restored manual decisions, 0 unresolved near duplicates and 0 dangerous numeric changes.

- [ ] **Step 2: Write regenerated content**

```bash
node scripts/generate-qanda-topics.mjs --write
```

Expected: 45 chapters, one topic index, 20 legacy guides, 208 part redirects and 19 company redirects.

- [ ] **Step 3: Produce a 45-row review report**

Read `articleCleaningStats` and `orderingMoves`; print every article slug with before/after counts, duplicate/deletion totals, group count and move count. Require exactly 45 rows and manually inspect the first and last five rendered units of every article.

- [ ] **Step 4: Review high-risk changes**

Inspect every manual decision, discarded non-information unit, near-duplicate removal, grouped conversation and move containing a date, amount, percentage, valuation, company name or English ticker. Confirm the audit reports zero dangerous numeric changes.

- [ ] **Step 5: Run the on-disk cleaning audit**

```bash
node scripts/audit-qanda-cleaning.mjs
```

Expected: 45 active articles, volume counts `12/12/15/6`, 0 errors, 0 editorial residues, 0 cross-article duplicate Q&A and 0 unresolved candidates.

---

### Task 6: Full Repository Verification

**Files:**
- Verify only; modify implementation files only if a command reveals an in-scope defect.

**Interfaces:**
- Consumes: final working tree from Tasks 1–5.
- Produces: verification evidence; no deploy, commit or push.

- [ ] **Step 1: Run all tests**

```bash
node --test tests/*.test.mjs
```

Expected: all tests pass with 0 failures.

- [ ] **Step 2: Run type checking**

```bash
npm run typecheck
```

Expected: exit code 0.

- [ ] **Step 3: Generate the static site without deployment**

```bash
SKIP_DEPLOY=1 NODE_OPTIONS=--max-old-space-size=8192 npm run generate
```

Expected: static generation succeeds and `SKIP_DEPLOY=1` skips the push hook.

- [ ] **Step 4: Generate EPUB and PDF**

```bash
npm run book
```

Expected: both `output/段永平投资问答录.epub` and `output/段永平投资问答录.pdf` are generated.

- [ ] **Step 5: Verify diffs and repository state**

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only implementation, generated content, audit and test files are modified. Leave changes uncommitted and unpushed.
