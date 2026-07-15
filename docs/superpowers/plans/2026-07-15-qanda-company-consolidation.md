# Q&A Company Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the Investment Q&A catalogue from 59 to 45 finished chapters by consolidating 19 short company pages into five industry chapters and merging weak or generic sections into accurate, content-dense sections.

**Architecture:** Keep the pinned 20 source articles and the reproducible generator. Replace 19 company topics with five industry topics, route each retained source block to an industry article plus a company subsection, render company names as level-three headings, and generate direct redirects for removed company slugs and historical part URLs. Keep section merging explicit in the topic catalogue so regeneration remains deterministic.

**Tech Stack:** Node.js ESM, Nuxt Content Markdown, Node test runner, Nuxt 4 static generation.

## Global Constraints

- Preserve complete questions, answers, dates, amounts, percentages, lists and source wording.
- Do not add external company information or rewrite original viewpoints.
- Produce exactly 45 chapters with volume counts 12, 12, 15 and 6.
- Keep Apple, Moutai, BBK, NetEase, Alibaba/Yahoo and Pop Mart as the 10 independent company chapters defined in the design.
- Render every company inside the five merged chapters as a level-three heading.
- Remove generic finished-section headings such as `相关问答` and `补充问答`.
- Keep all 208 historical part redirects and add 19 direct company redirects without redirect chains.
- Work directly on `main`; do not push or deploy unless the user explicitly asks.

---

### Task 1: Define the 45-topic catalogue and company consolidation map

**Files:**
- Modify: `scripts/qanda-cleaning-config.mjs`
- Modify: `tests/qanda-cleaning.test.mjs`

**Interfaces:**
- Produces: `MERGED_COMPANY_REDIRECTS: Map<string, string>` mapping every removed company slug to one new industry slug.
- Produces: `mergedCompanySectionForBlock(topicSlug, block)` returning `{ title, order, subsectionTitle, subsectionOrder }` for the five industry chapters.
- Changes: `TOPICS.length` from 59 to 45 and Company volume chapters from 29 to 15.

- [ ] **Step 1: Add failing catalogue tests**

Add assertions that `TOPICS.length === 45`, company topics number 15, the five new slugs exist, the 19 old slugs do not exist, and every redirect target is a valid topic.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --test-name-pattern='topic catalogue|merged company' tests/qanda-cleaning.test.mjs`

Expected: failures reporting 59 topics and missing merged-company exports.

- [ ] **Step 3: Replace the short company topic definitions**

Keep the 10 independent topics and add these five topics in order 270–274:

```js
topic('公司案例', 'qanda', 270, 'wenda-company-consumer-electronics', '消费电子与日本制造', ['消费电子', '日本制造']),
topic('公司案例', 'qanda', 271, 'wenda-company-china-games', '中国游戏公司群像', ['游戏公司', '中国游戏']),
topic('公司案例', 'qanda', 272, 'wenda-company-tech-platforms', '互联网、科技与新产业', ['互联网平台', '科技产业']),
topic('公司案例', 'qanda', 273, 'wenda-company-retail-services', '零售与服务业案例', ['零售', '服务业']),
topic('公司案例', 'qanda', 274, 'wenda-company-energy-industrial', '能源与工业企业案例', ['能源', '工业企业']),
```

- [ ] **Step 4: Define the 19 direct company mappings**

Map OPPO, vivo, Nintendo, Sony and Panasonic to consumer electronics; Perfect World, Giant Network, Kingsoft, Changyou and The9 to China games; Tencent, Pinduoduo, Google, Nvidia and Tesla to tech platforms; Costco and New Oriental to retail services; OXY and GE to energy and industrial.

- [ ] **Step 5: Add industry section/subsection catalogues**

Use explicit company keyword lists and stable subsection orders. A matched company produces its configured `subsectionTitle`; unmatched multi-company material goes to `跨公司比较` inside the final section of that industry chapter.

- [ ] **Step 6: Run the focused tests and verify GREEN**

Run: `node --test tests/qanda-cleaning.test.mjs`

Expected: all focused tests pass with 45 topics and 15 company chapters.

### Task 2: Render merged-company hierarchy and consolidate weak sections

**Files:**
- Modify: `scripts/qanda-cleaning-config.mjs`
- Modify: `scripts/qanda-cleaning-generate-lib.mjs`
- Modify: `tests/qanda-cleaning.test.mjs`

**Interfaces:**
- Extends: `sectionForBlock(topicSlug, block)` to optionally return `subsectionTitle` and `subsectionOrder`.
- Changes: `buildTopicChapter(topic, blocks)` renders `## 第N节` followed by ordered `### 公司名` groups.

- [ ] **Step 1: Add failing hierarchy and section-merge tests**

Cover an industry article containing two company subsections, chronological ordering within each company, and absence of `相关问答`/`补充问答` headings.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --test-name-pattern='company subsection|generic section' tests/qanda-cleaning.test.mjs`

Expected: missing level-three company headings and generic fallback headings still present.

- [ ] **Step 3: Render nested company groups**

Inside each configured section, group units by `subsectionTitle`, sort subsection groups by `subsectionOrder`, and render:

```md
## 第一节 互联网平台

### 腾讯

<complete Q&A units>

### 拼多多

<complete Q&A units>
```

Regular chapters continue rendering flat level-two sections.

- [ ] **Step 4: Apply explicit section mergers**

Update catalogues so the known weak sections merge as follows:

- Investment 01: merge faith, price/value and principle-boundary material into `价值、价格与原则边界`.
- Investment 02: merge `道、术与长期学习` into `简单、不容易与长期学习`.
- Investment 06: merge concentration into `长期持有与集中投资`.
- Business 04: merge the first three weak sections into `产品标准、用户需求与取舍`.
- Apple 01: merge single-product material into `商业模式、生态与聚焦`.
- Moutai 01: merge product-boundary material into `商业模式、供需与长期优势`.

For every configured chapter, replace the unmatched fallback `相关问答` with the last specific catalogue section rather than creating a generic section.

- [ ] **Step 5: Run the focused and full Node tests**

Run: `node --test tests/*.test.mjs`

Expected: all tests pass and generated test bodies contain no generic section headings.

### Task 3: Generate direct redirects and a 45-chapter topic index

**Files:**
- Modify: `scripts/generate-qanda-topics.mjs`
- Modify: `scripts/qanda-cleaning-audit-lib.mjs`
- Modify: `tests/qanda-audit.test.mjs`
- Modify: `tests/qanda-site-integration.test.mjs`
- Regenerate: `public/_redirects`

**Interfaces:**
- Produces: `audit.companyRedirects` containing exactly 19 `{ from, to }` mappings.
- Keeps: `audit.redirects` containing exactly 208 historical part redirects with removed targets rewritten directly to industry slugs.

- [ ] **Step 1: Add failing redirect and audit-count tests**

Assert base topics 45, 208 part redirects, 19 company redirects, every target is an active chapter, and no part redirect targets a removed company slug.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/qanda-audit.test.mjs tests/qanda-site-integration.test.mjs`

Expected: old 59-topic expectation and missing company redirects fail.

- [ ] **Step 3: Remap persisted historical redirects**

Before writing or storing part redirects, replace a destination found in `MERGED_COMPANY_REDIRECTS` with the new industry destination. Preserve all 208 sources.

- [ ] **Step 4: Write company redirects in the generated redirects block**

Append these 19 rules after the 208 part rules:

```text
/wenda-company-oppo /wenda-company-consumer-electronics 301
/wenda-company-perfect-world /wenda-company-china-games 301
/wenda-company-tencent /wenda-company-tech-platforms 301
/wenda-company-costco /wenda-company-retail-services 301
/wenda-company-oxy /wenda-company-energy-industrial 301
```

The remaining mappings follow the catalogue from Task 1.

- [ ] **Step 5: Include level-three headings in the topic index**

Parse both `##` and `###` headings from merged article bodies and indent company links beneath their level-two parent section.

- [ ] **Step 6: Run redirect and audit tests**

Run: `node --test tests/qanda-audit.test.mjs tests/qanda-site-integration.test.mjs`

Expected: 208 historical redirects plus 19 company redirects pass validation.

### Task 4: Regenerate 45 chapters and strengthen content-density auditing

**Files:**
- Modify: `scripts/audit-qanda-cleaning.mjs`
- Regenerate: `content/dao/qanda/wenda-*.md`
- Regenerate: `content/dao/investment-logic/wenda-invest-*.md`
- Regenerate: `content/dao/business-logic/wenda-business-*.md`
- Regenerate: `docs/content-audits/investment-qanda-cleaning-map.json`

**Interfaces:**
- Produces: exactly 45 `qanda-chapter` files and one topic index.
- Produces: audit metrics for weak sections and generic headings.

- [ ] **Step 1: Add audit checks before regeneration**

Require volume counts `{12, 12, 15, 6}`, reject generic level-two section titles, require all configured company level-three headings, and report sections below four Q&A or 600 visible characters as review warnings rather than automatic failures.

- [ ] **Step 2: Regenerate content**

Run: `node scripts/generate-qanda-topics.mjs --write`

Expected summary: 20 sources, 45 generated articles, 208 historical redirects and 19 company redirects.

- [ ] **Step 3: Inspect section-density candidates**

Run the audit, inspect every weak-section warning, and adjust explicit catalogues when the section lacks independent semantic value. Keep a short section only when it is a complete, distinct topic.

- [ ] **Step 4: Confirm migration completeness**

Verify every non-discarded source record targets one of the 45 active slugs and all 19 removed company slugs occur only as redirect sources or historical references.

- [ ] **Step 5: Run the cleaning audit**

Run: `node scripts/audit-qanda-cleaning.mjs`

Expected: zero errors, zero generic section headings, zero confirmed cross-article duplicate Q&A.

### Task 5: Full-site and book verification

**Files:**
- Verify: `.output/public/**`
- Verify: `output/段永平投资问答录.epub`
- Verify: `output/段永平投资问答录.pdf`

**Interfaces:**
- Confirms: website, sitemap, search data and books consume the 45 active chapters and exclude removed company slugs.

- [ ] **Step 1: Run all automated tests**

Run: `node --test tests/*.test.mjs`

Expected: zero failures.

- [ ] **Step 2: Run type checking**

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 3: Generate the static site without deployment**

Run: `SKIP_DEPLOY=1 NODE_OPTIONS=--max-old-space-size=8192 npm run generate`

Expected: static generation succeeds and all 45 active chapter routes are prerendered.

- [ ] **Step 4: Generate EPUB and PDF**

Run: `npm run book`

Expected: four Q&A volumes contain 12, 12, 15 and 6 chapters; all internal links are rewritten.

- [ ] **Step 5: Verify the final diff**

Run: `git diff --check`

Expected: no whitespace errors. Review final chapter, redirect and audit counts. Leave implementation changes uncommitted and unpushed until the user explicitly requests finalization.
