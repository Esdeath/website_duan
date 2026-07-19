# Shared Body Link Stripping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the clickable source link at the top of copied articles while turning every link inside the copied article body into bold text without a destination.

**Architecture:** Add a small DOM helper to the existing article sharing utility. `ShareButtons.vue` applies it only to the cloned `ContentRenderer` body before building clipboard HTML, leaving the live page and generated source link unchanged.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, DOM APIs, Node.js test runner

## Global Constraints

- Keep the generated `原文链接` anchor clickable.
- Replace every article-body anchor with a `strong` element containing its text content.
- Preserve the surrounding body markup and linked words.
- Do not change the live article DOM.
- Do not add dependencies.

---

### Task 1: Strip Links From Copied Article Bodies

**Files:**
- Modify: `app/utils/articleShare.ts`
- Modify: `app/components/ShareButtons.vue`
- Modify: `tests/article-share.test.mjs`

**Interfaces:**
- Produces: `unwrapArticleBodyLinks(root: ParentNode): void`
- Consumes: the cloned article body in `ShareButtons.vue`

- [ ] **Step 1: Write a failing utility test**

Add a test that passes two fake anchor nodes through the real helper and asserts that `replaceWith` receives only their text content:

```js
test('unwrapArticleBodyLinks replaces body anchors with bold text', () => {
  const replacements = []
  const ownerDocument = {
    createElement(tagName) {
      return { tagName: tagName.toUpperCase(), textContent: '' }
    },
  }
  const root = {
    querySelectorAll(selector) {
      assert.equal(selector, 'a')
      return [
        { ownerDocument, textContent: '能力圈', replaceWith(value) { replacements.push(value) } },
        { ownerDocument, textContent: '本分', replaceWith(value) { replacements.push(value) } },
      ]
    },
  }

  unwrapArticleBodyLinks(root)
  assert.deepEqual(replacements, [
    { tagName: 'STRONG', textContent: '能力圈' },
    { tagName: 'STRONG', textContent: '本分' },
  ])
})
```

- [ ] **Step 2: Verify RED**

Run: `node --experimental-strip-types --test tests/article-share.test.mjs`

Expected: FAIL because `unwrapArticleBodyLinks` is not exported.

- [ ] **Step 3: Implement the DOM helper**

Add the following focused helper to `app/utils/articleShare.ts`:

```ts
export function unwrapArticleBodyLinks(root: ParentNode) {
  for (const link of root.querySelectorAll('a')) {
    const strong = link.ownerDocument.createElement('strong')
    strong.textContent = link.textContent ?? ''
    link.replaceWith(strong)
  }
}
```

- [ ] **Step 4: Verify the helper test passes**

Run: `node --experimental-strip-types --test tests/article-share.test.mjs`

Expected: all focused tests pass.

- [ ] **Step 5: Add a failing component integration assertion**

Update the existing source integration test to require `unwrapArticleBodyLinks(clone)` and to reject the old absolute-link normalization block.

- [ ] **Step 6: Verify RED**

Run: `node --experimental-strip-types --test tests/article-share.test.mjs`

Expected: FAIL because `ShareButtons.vue` does not call the helper.

- [ ] **Step 7: Apply the helper to the cloned body**

Import `unwrapArticleBodyLinks` in `ShareButtons.vue`. Immediately after cloning the article body, call `unwrapArticleBodyLinks(clone)` and remove the source/cloned anchor matching loop.

- [ ] **Step 8: Run complete verification**

Run:

```bash
node --experimental-strip-types --test tests/*.test.mjs
npm run typecheck
SKIP_DEPLOY=1 npm run generate
```

Expected: all tests pass, typecheck exits 0, and Nuxt static generation succeeds without deployment.

- [ ] **Step 9: Commit and push**

```bash
git add docs/superpowers/specs/2026-07-18-full-article-rich-text-sharing-design.md docs/superpowers/plans/2026-07-18-shared-body-link-stripping.md app/utils/articleShare.ts app/components/ShareButtons.vue tests/article-share.test.mjs
git commit -m "fix: strip links from shared article bodies"
git push origin main
```
