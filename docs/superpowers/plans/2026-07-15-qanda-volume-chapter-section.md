# Investment Q&A Volume-Chapter-Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 230 mechanically split Investment Q&A pages with 59 unlimited-length chapters organized into four volumes and numbered sections.

**Architecture:** Keep the 59-topic classification as the canonical content boundary. Regenerate each topic as one `qanda-chapter` Markdown file from the pinned pre-cleaning source commit, add volume/chapter metadata, and generate a hierarchical directory plus Cloudflare redirects for former part URLs. The Nuxt UI, sitemap, LLM index, and book generator consume the new metadata instead of inferring structure from part filenames.

**Tech Stack:** Node.js ESM scripts and `node:test`, Nuxt 4, Vue 3, Nuxt Content v3, Markdown, Cloudflare Pages static redirects.

## Global Constraints

- Generate exactly 59 chapters in four volumes with counts 12, 12, 29, and 6.
- Do not impose a visible-character limit on a chapter.
- Preserve every retained Q&A unit, speaker, date, number, list, and internal link.
- Use `## 第N节 标题` for chapter sections and reserve `###` for content inside a section.
- Keep `category: "投资问答录"`, 3–6 tags, and globally unique base slugs.
- Hide migration guides from public catalogues, search, LLM indexes, books, and sitemap.
- Keep the 20 original legacy URLs as static migration guides and redirect every published `-part-N` URL to its base chapter.
- Work locally only; do not deploy or push.

---

## File Map

- `scripts/qanda-cleaning-config.mjs`: canonical 59-topic catalogue and volume/chapter metadata.
- `scripts/qanda-cleaning-generate-lib.mjs`: section grouping, Chinese numbering, long-chapter rendering, and legacy-link rewriting.
- `scripts/generate-qanda-topics.mjs`: pinned-source loading, 59-file generation, directory generation, redirect manifest, legacy guides, and audit JSON.
- `scripts/qanda-cleaning-audit-lib.mjs`: audit-manifest structural validation.
- `scripts/audit-qanda-cleaning.mjs`: on-disk validation for 59 chapters, sections, duplicates, and redirects.
- `content.config.ts`: Nuxt Content schema for volume/chapter fields.
- `app/layouts/default.vue`: fetch volume/chapter metadata for navigation.
- `app/components/LibrarySidebar.vue`: four-volume sidebar hierarchy and chapter numbering.
- `app/pages/index.vue`: 59-chapter count and topic-index destination.
- `app/pages/[slug].vue`: volume eyebrow, chapter title, TOC, and previous/next chapter navigation.
- `server/routes/llms-full.txt.ts`: include chapters, exclude navigation/migration pages.
- `server/routes/sitemap.xml.ts`: exclude migration pages.
- `scripts/generate-books.mjs`: four-volume electronic-book hierarchy.
- `public/_redirects`: generated `-part-N` to base-slug 301 mappings.
- `tests/qanda-cleaning.test.mjs`: generator unit tests.
- `tests/qanda-audit.test.mjs`: audit unit tests.
- `tests/qanda-site-integration.test.mjs`: source-level site integration assertions.
- `docs/content-audits/investment-qanda-cleaning-map.json`: regenerated unit-to-chapter manifest.
- `content/dao/{qanda,investment-logic,business-logic}/wenda-*.md`: generated directory and 59 chapters.

---

### Task 1: Canonical volume and chapter metadata

**Files:**
- Modify: `scripts/qanda-cleaning-config.mjs`
- Modify: `tests/qanda-cleaning.test.mjs`

**Interfaces:**
- Produces: `VOLUMES: Array<{ name: string, order: number, range: [number, number] }>`.
- Produces: each `TOPICS` item with `volume`, `volumeOrder`, and `chapterOrder`.

- [ ] **Step 1: Replace the catalogue test with volume assertions**

```js
test('topic catalogue defines four continuous volumes and 59 chapters', () => {
  assert.deepEqual(VOLUMES.map((v) => v.name), [
    '投资原则与方法', '商业模式与经营', '公司案例', '人生与成长',
  ])
  assert.deepEqual(VOLUMES.map((v) => TOPICS.filter((t) => t.volume === v.name).length), [12, 12, 29, 6])
  for (const volume of VOLUMES) {
    const topics = TOPICS.filter((topic) => topic.volumeOrder === volume.order)
    assert.deepEqual(topics.map((topic) => topic.chapterOrder), topics.map((_, index) => index + 1))
  }
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/qanda-cleaning.test.mjs`

Expected: FAIL because `VOLUMES` and per-topic chapter metadata do not exist.

- [ ] **Step 3: Add volume metadata to the catalogue**

```js
export const VOLUMES = [
  { name: '投资原则与方法', order: 1, group: '投资原则' },
  { name: '商业模式与经营', order: 2, group: '商业经营' },
  { name: '公司案例', order: 3, group: '公司案例' },
  { name: '人生与成长', order: 4, group: '人生与成长' },
]

const chapterCounters = new Map()
const topic = (group, directory, order, slug, title, tags) => {
  const volume = VOLUMES.find((item) => item.group === group)
  const chapterOrder = (chapterCounters.get(group) || 0) + 1
  chapterCounters.set(group, chapterOrder)
  return {
    group,
    volume: volume.name,
    volumeOrder: volume.order,
    chapterOrder,
    directory,
    order,
    slug,
    title,
    tags: [group, ...tags],
  }
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `node --test tests/qanda-cleaning.test.mjs`

Expected: the catalogue metadata assertions pass; the existing generator behavior tests remain unchanged in this task.

- [ ] **Step 5: Commit**

```bash
git add scripts/qanda-cleaning-config.mjs tests/qanda-cleaning.test.mjs docs/superpowers/plans/2026-07-15-qanda-volume-chapter-section.md
git commit -m "test: define qanda volume chapter metadata"
```

### Task 2: Generate one numbered-section chapter per topic

**Files:**
- Modify: `scripts/qanda-cleaning-generate-lib.mjs`
- Modify: `tests/qanda-cleaning.test.mjs`

**Interfaces:**
- Produces: `buildTopicChapter(topic, blocks): Article`.
- Produces: `numberSections(markdown): string` only through the chapter builder.
- Produces: `renderArticleFile(article): string` with `qanda-chapter` metadata.

- [ ] **Step 1: Write failing long-chapter and section tests**

```js
test('topic builder emits one unlimited chapter with continuous numbered sections', () => {
  const topic = {
    slug: 'wenda-test', title: '测试主题', order: 200,
    volume: '投资原则与方法', volumeOrder: 1, chapterOrder: 1,
    tags: ['投资原则', '测试', '问答'],
  }
  const blocks = [
    { id: 'a', headingPath: ['原则'], markdown: `**段永平：** ${'甲'.repeat(80)}。` },
    { id: 'b', headingPath: ['原则'], markdown: `**段永平：** ${'乙'.repeat(80)}。` },
    { id: 'c', headingPath: ['案例'], markdown: `**段永平：** ${'丙'.repeat(80)}。` },
  ]
  const article = buildTopicChapter(topic, blocks)
  assert.equal(article.slug, 'wenda-test')
  assert.deepEqual(article.blockIds, ['a', 'b', 'c'])
  assert.equal((article.body.match(/^## /gm) || []).length, 2)
  assert.match(article.body, /^## 第一节 原则$/m)
  assert.match(article.body, /^## 第二节 案例$/m)
})

test('rendered chapter includes volume and chapter metadata', () => {
  const output = renderArticleFile({
    slug: 'wenda-test', title: '测试主题', order: 200,
    volume: '投资原则与方法', volumeOrder: 1, chapterOrder: 1,
    tags: ['投资原则', '测试', '问答'], body: '## 第一节 原则\n\n回答。',
  })
  assert.match(output, /type: "qanda-chapter"/)
  assert.match(output, /volume: "投资原则与方法"/)
  assert.match(output, /volumeOrder: 1/)
  assert.match(output, /chapterOrder: 1/)
})
```

- [ ] **Step 2: Run the test and verify the old part behavior fails**

Run: `node --test tests/qanda-cleaning.test.mjs`

Expected: FAIL because `buildTopicChapter` is not exported and renderer still emits `qanda-topic`.

- [ ] **Step 3: Implement section grouping and unlimited chapter generation**

```js
const SECTION_ALIASES = new Map([
  ['其他', '补充问答'],
  ['其他话题', '补充问答'],
  ['其他公司', '相关公司比较'],
])

function chineseNumber(value) {
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  if (value < 10) return digits[value]
  if (value < 20) return `十${digits[value % 10] || ''}`
  if (value < 100) return `${digits[Math.floor(value / 10)]}十${digits[value % 10] || ''}`
  return String(value)
}

export function buildTopicChapter(topic, blocks) {
  const sections = new Map()
  for (const block of blocks) {
    const raw = plainHeading(block.headingPath?.at(-1) || '相关问答') || '相关问答'
    const title = SECTION_ALIASES.get(raw) || raw.replace(/^【|】$/g, '')
    const list = sections.get(title) || []
    list.push(shortenParagraphs(standardizeQaMarkers(rewriteLegacyLinks(block.markdown))))
    sections.set(title, list)
  }
  const body = [...sections.entries()].map(([title, units], index) =>
    `## 第${chineseNumber(index + 1)}节 ${title}\n\n${units.join('\n\n')}`
  ).join('\n\n')
  return { ...topic, baseSlug: topic.slug, body, blockIds: blocks.map((block) => block.id) }
}
```

Update `renderArticleFile()` to emit `type: "qanda-chapter"` and the four volume/chapter fields. Change the known legacy link target from `wenda-business-08-part-1` to `wenda-business-08`.

- [ ] **Step 4: Run unit tests**

Run: `node --test tests/qanda-cleaning.test.mjs`

Expected: PASS with no part-slug assertions remaining.

- [ ] **Step 5: Commit**

```bash
git add scripts/qanda-cleaning-generate-lib.mjs tests/qanda-cleaning.test.mjs
git commit -m "feat: generate unlimited qanda chapters"
```

### Task 3: Regenerate content, hierarchy, redirects, and audit manifest

**Files:**
- Modify: `scripts/generate-qanda-topics.mjs`
- Modify: `scripts/qanda-cleaning-audit-lib.mjs`
- Modify: `tests/qanda-audit.test.mjs`
- Create: `public/_redirects`
- Modify: `docs/content-audits/investment-qanda-cleaning-map.json`
- Replace: generated `content/dao/**/wenda-*.md`
- Modify: 20 `legacy-index` files under the three Investment Q&A source directories.

**Interfaces:**
- Consumes: `buildTopicChapter()` and topic volume metadata.
- Produces: audit `generatedArticles: 59`, `bodyLimit: null`, and `redirects` entries.

- [ ] **Step 1: Update audit tests for unlimited chapters and redirects**

```js
const valid = {
  sourceArticles: Array.from({ length: 20 }, (_, index) => ({ slug: `source-${index}` })),
  baseTopics: 59,
  generatedArticles: 59,
  bodyLimit: null,
  articles: [{
    slug: 'wenda-invest-01', visibleLength: 100000,
    volumeOrder: 1, chapterOrder: 1,
    tags: ['投资原则', '价值投资', '问答'],
  }],
  redirects: [{ from: '/wenda-invest-01-part-1', to: '/wenda-invest-01' }],
  records: [{ id: 'a', status: 'kept', targetSlugs: ['wenda-invest-01'] }],
  nearDuplicateCandidates: [],
}
assert.deepEqual(validateAuditData(valid), [])
```

- [ ] **Step 2: Run the audit test and verify it fails on the old length rule**

Run: `node --test tests/qanda-audit.test.mjs`

Expected: FAIL because the validator rejects `visibleLength > 6000` and does not validate chapter metadata.

- [ ] **Step 3: Pin source loading to the audit source commit**

Read `sourceCommit` from the existing audit JSON before generating. Replace `HEAD` in `git ls-tree` and `git show` with that commit, and filter source paths to `sourcePriority` slugs. Preserve `sourceCommit` in the next manifest instead of changing it to the current generated commit.

- [ ] **Step 4: Replace part generation with chapter generation**

Build exactly one article with `buildTopicChapter(topic, groupedBlocks)` for every `TOPICS` entry. Remove `BODY_LIMIT`, `assignOrders()`, part counts, and part-based target selection.

- [ ] **Step 5: Generate hierarchical topic index and redirects**

Render the topic index by `VOLUMES`, with `## 第N卷` headings and chapter links. Capture all current on-disk `-part-N` slugs before deleting generated files, then produce sorted Cloudflare rules:

```text
/wenda-invest-01-part-1 /wenda-invest-01 301
/wenda-invest-01-part-2 /wenda-invest-01 301
```

Keep unrelated existing `public/_redirects` lines if the file already contains them.

- [ ] **Step 6: Regenerate content**

Run: `node scripts/generate-qanda-topics.mjs --write`

Expected summary: 20 sources, 59 generated articles, 59 base topics, longest article allowed above 6000.

- [ ] **Step 7: Verify the generated tree**

Run:

```bash
find content/dao -type f -name 'wenda-*.md' | wc -l
rg -l 'type: "qanda-chapter"' content/dao | wc -l
rg -l 'slug: ".*-part-[0-9]+"' content/dao | wc -l
```

Expected: 60 total `wenda-*.md` files including the index, 59 chapters, and zero part slugs.

- [ ] **Step 8: Run unit tests and commit**

Run: `node --test tests/qanda-cleaning.test.mjs tests/qanda-audit.test.mjs`

Expected: PASS.

```bash
git add scripts/generate-qanda-topics.mjs scripts/qanda-cleaning-audit-lib.mjs tests/qanda-audit.test.mjs public/_redirects docs/content-audits/investment-qanda-cleaning-map.json content/dao
git commit -m "content: merge qanda parts into chapters"
```

### Task 4: Validate the 59-chapter structure on disk

**Files:**
- Modify: `scripts/audit-qanda-cleaning.mjs`

**Interfaces:**
- Consumes: generated audit JSON, chapters, and `public/_redirects`.
- Produces: nonzero exit on any content, metadata, section, mapping, or redirect failure.

- [ ] **Step 1: Replace active-article and length checks**

Select `type === 'qanda-chapter'`. Require exactly 59 active files, volume counts `[12, 12, 29, 6]`, continuous chapter numbers, 3–6 tags, and at least one heading matching `/^## 第.+节\s+.+$/m`. Remove the 5600-character error while retaining paragraph warnings.

- [ ] **Step 2: Add mapping and redirect checks**

Require every `kept` target to match a chapter slug. Parse `_redirects` into a map and verify every `audit.redirects` entry exists with status 301 and a valid chapter target.

- [ ] **Step 3: Run the audit**

Run: `node scripts/audit-qanda-cleaning.mjs`

Expected JSON: `activeArticles: 59`, `legacyGuides: 20`, `topicIndexes: 1`, `errors: 0`. Warnings are permitted only for preserved long source paragraphs and reviewed cross-chapter candidates.

- [ ] **Step 4: Commit**

```bash
git add scripts/audit-qanda-cleaning.mjs
git commit -m "test: audit qanda chapter hierarchy"
```

### Task 5: Render volume hierarchy and chapter navigation on the site

**Files:**
- Modify: `content.config.ts`
- Modify: `app/layouts/default.vue`
- Modify: `app/components/LibrarySidebar.vue`
- Modify: `app/pages/index.vue`
- Modify: `app/pages/[slug].vue`
- Modify: `tests/qanda-site-integration.test.mjs`

**Interfaces:**
- Article metadata: `volume?: string`, `volumeOrder?: number`, `chapterOrder?: number`.
- Sidebar subgroup: `{ label: string, volumeOrder?: number, items: Article[] }`.
- Chapter navigator: ordered `qanda-chapter` list with previous/next slugs.

- [ ] **Step 1: Write site integration assertions**

Require schema fields in `content.config.ts`; volume grouping in `LibrarySidebar.vue`; exclusion of `topic-index` from the 59 count; topic-index card destination; volume/chapter title rendering and previous/next navigation in `[slug].vue`.

- [ ] **Step 2: Run the site integration test and verify failure**

Run: `node --test tests/qanda-site-integration.test.mjs`

Expected: FAIL because volume metadata and chapter navigation are not rendered.

- [ ] **Step 3: Extend the content schema and layout query**

```ts
volume: z.string().optional(),
volumeOrder: z.number().optional(),
chapterOrder: z.number().optional(),
```

Select these fields in `app/layouts/default.vue` and pass them to the sidebar.

- [ ] **Step 4: Add four volume subgroups to the sidebar**

For `category === '投资问答录'`, keep the topic index as a standalone “主题总目录” link, group only `qanda-chapter` items by `volume`, order groups by `volumeOrder`, and render each link as `第N章 标题`. Category count equals the chapter count and excludes the topic index.

- [ ] **Step 5: Update homepage count and destination**

Count only `qanda-chapter` items for the Investment Q&A card. Set that card's destination to `/wenda-topic-index`; keep existing behavior for all other categories.

- [ ] **Step 6: Add chapter header and sibling navigation**

Query the ordered `qanda-chapter` metadata on chapter pages. Render eyebrow `第N卷 卷名`, title `第N章 主题名`, and footer links for previous chapter, topic index, and next chapter. Non-chapter article rendering remains unchanged.

- [ ] **Step 7: Run tests and typecheck**

Run:

```bash
node --test tests/qanda-site-integration.test.mjs
npm run typecheck
```

Expected: all tests pass and Nuxt typecheck exits 0.

- [ ] **Step 8: Commit**

```bash
git add content.config.ts app/layouts/default.vue app/components/LibrarySidebar.vue app/pages/index.vue app/pages/'[slug].vue' tests/qanda-site-integration.test.mjs
git commit -m "feat: browse qanda by volume and chapter"
```

### Task 6: Align sitemap, LLM index, and electronic books

**Files:**
- Modify: `server/routes/sitemap.xml.ts`
- Modify: `server/routes/llms-full.txt.ts`
- Modify: `scripts/generate-books.mjs`
- Modify: `tests/qanda-site-integration.test.mjs`

**Interfaces:**
- Public-index predicate excludes `legacy-index`; LLM and book predicates also exclude `topic-index`.
- Book article metadata includes volume order and chapter order.

- [ ] **Step 1: Add failing integration assertions**

Assert that sitemap filters `legacy-index`, LLM filters both navigation types, and book generation groups `qanda-chapter` items by volume and labels them with chapter numbers.

- [ ] **Step 2: Run test and verify failure**

Run: `node --test tests/qanda-site-integration.test.mjs`

Expected: FAIL on sitemap filtering and book volume grouping.

- [ ] **Step 3: Implement index filtering**

Filter `legacy-index` records before constructing sitemap routes. Filter both `legacy-index` and `topic-index` in `llms-full.txt`.

- [ ] **Step 4: Implement book hierarchy**

Parse `type`, `volume`, `volumeOrder`, and `chapterOrder`. Within the three existing source directories, present `qanda-chapter` content under the four canonical volume labels and show `第N章` in EPUB/PDF titles. Keep other categories and directories in their current order.

- [ ] **Step 5: Run tests and EPUB generation**

Run:

```bash
node --test tests/qanda-site-integration.test.mjs
npm run book:epub
```

Expected: tests pass and `output/段永平投资问答录.epub` is regenerated successfully.

- [ ] **Step 6: Commit**

```bash
git add server/routes/sitemap.xml.ts server/routes/llms-full.txt.ts scripts/generate-books.mjs tests/qanda-site-integration.test.mjs
git commit -m "feat: index qanda chapters by volume"
```

### Task 7: Full verification and generated-output inspection

**Files:**
- Verify only; fix the owning task's files if a check fails.

**Interfaces:**
- Consumes all prior task outputs.
- Produces fresh evidence for local completion.

- [ ] **Step 1: Run all Node tests and content audit**

```bash
node --test tests/*.test.mjs
node scripts/audit-qanda-cleaning.mjs
```

Expected: all tests pass; audit reports 59 active chapters and zero errors.

- [ ] **Step 2: Run Nuxt typecheck and static generation**

```bash
npm run typecheck
SKIP_DEPLOY=1 NODE_OPTIONS=--max-old-space-size=8192 npm run generate
```

Expected: both commands exit 0; postgenerate reports deployment skipped.

- [ ] **Step 3: Inspect generated routes and indexes**

```bash
test -f .output/public/wenda-topic-index/index.html
test -f .output/public/wenda-invest-07/index.html
rg -q '第一卷' .output/public/wenda-topic-index/index.html
rg -q '第七章' .output/public/wenda-invest-07/index.html
if rg -q 'wenda-invest-07-part-1' .output/public/sitemap.xml; then exit 1; fi
if rg -q 'legacy-index' .output/public/llms-full.txt; then exit 1; fi
```

Expected: all assertions exit 0.

- [ ] **Step 4: Generate both book formats**

Run: `npm run book`

Expected: EPUB and PDF generation both exit 0.

- [ ] **Step 5: Run repository hygiene checks**

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only intentional generated output or ignored book artifacts are present.

- [ ] **Step 6: Commit any verification-only corrections**

If verification required fixes, stage the exact files changed by those fixes, inspect `git diff --cached --name-only`, then commit them with `git commit -m "fix: complete qanda chapter verification"`. If no fixes were required, do not create an empty commit.

Do not push or deploy.
