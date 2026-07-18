# Shared Attribution And Title Deduplication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Copy each article with one title and matching fixed source/link blocks at both the beginning and end.

**Architecture:** A DOM helper removes only a cloned body's leading `h1`, so the live page stays unchanged and the formatter can provide one consistent title. The pure formatter creates identical fixed attribution blocks before and after the article without consuming article `source` metadata.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, DOM APIs, Node.js test runner

## Global Constraints

- The title appears exactly once in shared output.
- Both the opening and closing blocks contain `来源：段永平投资问答录`.
- Both the opening and closing blocks contain a clickable full article URL.
- Do not read or append any article `source`, `sourceUrl`, or `sourceDate` metadata.
- Preserve the prior behavior that removes hyperlinks from the article body while retaining their text.
- Do not modify the live article DOM or add dependencies.

---

### Task 1: Deduplicate The Title And Add Fixed Attribution

**Files:**
- Modify: `app/utils/articleShare.ts`
- Modify: `app/components/ShareButtons.vue`
- Modify: `tests/article-share.test.mjs`

**Interfaces:**
- Produces: `removeLeadingArticleTitle(root: ParentNode): void`
- Updates: `buildArticleShareContent(source): ArticleShareContent`

- [ ] **Step 1: Write failing tests**

Update the exact formatter expectations so HTML and plain text both contain identical opening and closing attribution blocks, with one title between them. Add a DOM-helper test where the first element is `H1` and verify it is removed; add a second case where the first element is `H2` and verify it remains.

- [ ] **Step 2: Verify RED**

Run: `node --experimental-strip-types --test tests/article-share.test.mjs`

Expected: FAIL because the closing attribution and `removeLeadingArticleTitle` do not exist.

- [ ] **Step 3: Implement the minimal formatter and DOM helper changes**

Use the fixed source name `段永平投资问答录`. Build one HTML attribution paragraph and one plain-text attribution block, placing each before and after the title/body. Implement:

```ts
export function removeLeadingArticleTitle(root: ParentNode) {
  const firstElement = root.firstElementChild
  if (firstElement?.tagName === 'H1') firstElement.remove()
}
```

- [ ] **Step 4: Apply title cleanup to the clone**

Import `removeLeadingArticleTitle` in `ShareButtons.vue` and call it immediately after cloning, before stripping body links and before reading `clone.innerHTML`.

- [ ] **Step 5: Run complete verification**

Run:

```bash
node --experimental-strip-types --test tests/*.test.mjs
npm run typecheck
SKIP_DEPLOY=1 npm run generate
```

Expected: all tests pass, typecheck exits 0, and Nuxt static generation succeeds without deployment.

- [ ] **Step 6: Commit and push**

```bash
git add docs/superpowers/specs/2026-07-18-full-article-rich-text-sharing-design.md docs/superpowers/plans/2026-07-18-shared-attribution-and-title-deduplication.md app/utils/articleShare.ts app/components/ShareButtons.vue tests/article-share.test.mjs
git commit -m "fix: deduplicate shared titles and add attribution"
git push origin main
```
