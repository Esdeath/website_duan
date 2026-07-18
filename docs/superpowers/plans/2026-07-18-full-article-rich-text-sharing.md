# Full Article Rich Text Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two article share controls with one button that copies the source URL, visible article title, and rendered article body as rich HTML plus plain text.

**Architecture:** A small framework-independent utility builds both clipboard representations and handles rich-text fallback. `ShareButtons.vue` reads only the rendered `ContentRenderer` element identified by the article page, normalizes its links, and delegates clipboard writing to the utility.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, browser Clipboard API, Node.js test runner

## Global Constraints

- The article page displays one button labeled `分享`.
- Clipboard order is source URL, article title, complete article body.
- Rich output preserves headings, paragraphs, lists, blockquotes, bold text, and links.
- Exclude description, tags, table of contents, source footer, chapter navigation, and comments.
- Fall back to plain text when rich clipboard writing is unavailable or rejected.
- Do not add a preview dialog or a new dependency.

---

### Task 1: Clipboard Content Utility

**Files:**
- Create: `app/utils/articleShare.ts`
- Create: `tests/article-share.test.mjs`

**Interfaces:**
- Consumes: rendered body HTML and text supplied as strings
- Produces: `buildArticleShareContent(source): ArticleShareContent`
- Produces: `copyArticleShareContent(content, options?): Promise<'rich' | 'plain'>`

- [ ] **Step 1: Write the failing content-format tests**

Create `tests/article-share.test.mjs` with tests that import the missing utility and assert exact ordering and escaping:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildArticleShareContent,
  copyArticleShareContent,
} from '../app/utils/articleShare.ts'

test('buildArticleShareContent puts the source link and title before the complete body', () => {
  const content = buildArticleShareContent({
    title: '买股票就是买公司',
    url: 'https://duan.example/maigupiao',
    bodyHtml: '<h2>第一节</h2><p>正文 <strong>重点</strong></p><blockquote>引用</blockquote>',
    bodyText: '第一节\n正文 重点\n引用',
  })

  assert.equal(
    content.html,
    '<p><strong>原文链接：</strong><a href="https://duan.example/maigupiao">https://duan.example/maigupiao</a></p><h1>买股票就是买公司</h1><h2>第一节</h2><p>正文 <strong>重点</strong></p><blockquote>引用</blockquote>',
  )
  assert.equal(
    content.text,
    '原文链接：https://duan.example/maigupiao\n\n买股票就是买公司\n\n第一节\n正文 重点\n引用',
  )
})

test('buildArticleShareContent escapes title and URL markup without changing rendered body HTML', () => {
  const content = buildArticleShareContent({
    title: '<投资 & 经营>',
    url: 'https://duan.example/a?x=1&y="2"',
    bodyHtml: '<ul><li><a href="https://duan.example/b">正文链接</a></li></ul>',
    bodyText: '正文链接',
  })

  assert.match(content.html, /<h1>&lt;投资 &amp; 经营&gt;<\/h1>/)
  assert.match(content.html, /href="https:\/\/duan\.example\/a\?x=1&amp;y=&quot;2&quot;"/)
  assert.match(content.html, /<ul><li><a href="https:\/\/duan\.example\/b">正文链接<\/a><\/li><\/ul>$/)
})
```

- [ ] **Step 2: Run the content-format tests and verify RED**

Run: `node --experimental-strip-types --test tests/article-share.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `app/utils/articleShare.ts`.

- [ ] **Step 3: Implement the content builder**

Create `app/utils/articleShare.ts` with the data types, HTML escaping helpers, and `buildArticleShareContent`. Trim surrounding whitespace from body HTML and text, but do not rewrite the rendered body markup.

```ts
export interface ArticleShareSource {
  title: string
  url: string
  bodyHtml: string
  bodyText: string
}

export interface ArticleShareContent {
  html: string
  text: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function buildArticleShareContent(source: ArticleShareSource): ArticleShareContent {
  const safeUrl = escapeHtml(source.url)
  const safeTitle = escapeHtml(source.title)
  const bodyHtml = source.bodyHtml.trim()
  const bodyText = source.bodyText.trim()

  return {
    html: `<p><strong>原文链接：</strong><a href="${safeUrl}">${safeUrl}</a></p><h1>${safeTitle}</h1>${bodyHtml}`,
    text: `原文链接：${source.url}\n\n${source.title}\n\n${bodyText}`,
  }
}
```

- [ ] **Step 4: Run the content-format tests and verify GREEN**

Run: `node --experimental-strip-types --test tests/article-share.test.mjs`

Expected: 2 tests pass.

- [ ] **Step 5: Add failing rich clipboard and fallback tests**

Append tests that inspect both Blob payloads and force the rich writer to reject:

```js
test('copyArticleShareContent writes HTML and plain text in one ClipboardItem', async () => {
  const writes = []
  class FakeClipboardItem {
    constructor(items) {
      this.items = items
    }
  }
  const clipboard = {
    async write(items) { writes.push(items) },
    async writeText() { assert.fail('plain fallback should not run') },
  }

  const mode = await copyArticleShareContent(
    { html: '<h1>标题</h1>', text: '标题' },
    { clipboard, ClipboardItemClass: FakeClipboardItem },
  )

  assert.equal(mode, 'rich')
  assert.equal(await writes[0][0].items['text/html'].text(), '<h1>标题</h1>')
  assert.equal(await writes[0][0].items['text/plain'].text(), '标题')
})

test('copyArticleShareContent falls back to plain text when rich writing fails', async () => {
  const copied = []
  class FakeClipboardItem {
    constructor(items) { this.items = items }
  }
  const clipboard = {
    async write() { throw new Error('rich clipboard unavailable') },
    async writeText(text) { copied.push(text) },
  }

  const mode = await copyArticleShareContent(
    { html: '<h1>标题</h1>', text: '标题' },
    { clipboard, ClipboardItemClass: FakeClipboardItem },
  )

  assert.equal(mode, 'plain')
  assert.deepEqual(copied, ['标题'])
})
```

- [ ] **Step 6: Run the clipboard tests and verify RED**

Run: `node --experimental-strip-types --test tests/article-share.test.mjs`

Expected: FAIL because `copyArticleShareContent` is not exported.

- [ ] **Step 7: Implement rich clipboard writing and plain fallback**

Add the injectable browser API boundary to `app/utils/articleShare.ts`:

```ts
interface ClipboardWriter {
  write(items: ClipboardItem[]): Promise<void>
  writeText(text: string): Promise<void>
}

interface CopyArticleShareOptions {
  clipboard?: ClipboardWriter
  ClipboardItemClass?: typeof ClipboardItem
}

export async function copyArticleShareContent(
  content: ArticleShareContent,
  options: CopyArticleShareOptions = {},
): Promise<'rich' | 'plain'> {
  const clipboard = options.clipboard ?? navigator.clipboard
  const ClipboardItemClass = options.ClipboardItemClass ?? globalThis.ClipboardItem

  if (ClipboardItemClass && typeof clipboard.write === 'function') {
    try {
      const item = new ClipboardItemClass({
        'text/html': new Blob([content.html], { type: 'text/html' }),
        'text/plain': new Blob([content.text], { type: 'text/plain' }),
      })
      await clipboard.write([item])
      return 'rich'
    } catch {
      // Some browsers expose ClipboardItem but reject rich clipboard writes.
    }
  }

  await clipboard.writeText(content.text)
  return 'plain'
}
```

- [ ] **Step 8: Run the utility tests and commit**

Run: `node --experimental-strip-types --test tests/article-share.test.mjs`

Expected: 4 tests pass.

```bash
git add app/utils/articleShare.ts tests/article-share.test.mjs
git commit -m "feat: build rich article clipboard content"
```

---

### Task 2: Single Article Share Button

**Files:**
- Modify: `app/components/ShareButtons.vue`
- Modify: `app/pages/[slug].vue`
- Modify: `tests/article-share.test.mjs`

**Interfaces:**
- Consumes: `buildArticleShareContent` and `copyArticleShareContent` from Task 1
- Consumes: props `{ title: string; slug: string; contentId: string }`
- Produces: one article-page button that copies the rendered article content

- [ ] **Step 1: Add a failing article-page integration test**

Append a source integration test that protects the component boundary and removes the old controls:

```js
import fs from 'node:fs'

const readProjectFile = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('article page exposes only one full-article share control', () => {
  const page = readProjectFile('app/pages/[slug].vue')
  const component = readProjectFile('app/components/ShareButtons.vue')

  assert.match(page, /id="article-share-content"/)
  assert.match(page, /content-id="article-share-content"/)
  assert.match(component, /buildArticleShareContent/)
  assert.match(component, /copyArticleShareContent/)
  assert.equal((component.match(/<button\b/g) || []).length, 1)
  assert.doesNotMatch(component, /分享链接|分享图片|QRCode/)
})
```

- [ ] **Step 2: Run the integration test and verify RED**

Run: `node --experimental-strip-types --test tests/article-share.test.mjs`

Expected: FAIL because the page has no `article-share-content` target and the component still contains two buttons.

- [ ] **Step 3: Replace the component behavior and template**

Rewrite `ShareButtons.vue` to:

1. Accept `title`, `slug`, and `contentId`; remove `description`, QR generation, canvas generation, native share, and image download.
2. Resolve the article URL from `runtimeConfig.public.siteUrl` with the existing production fallback.
3. Find `document.getElementById(contentId)`, clone it, and change every cloned anchor `href` to the corresponding live anchor's absolute `href`.
4. Pass `clone.innerHTML` and `body.innerText` to `buildArticleShareContent`, then call `copyArticleShareContent`.
5. Use states `idle`, `copying`, `copied`, and `failed`; disable only while copying; reset feedback after 1.5 seconds and clear the timer on unmount.
6. Render one familiar share icon and label it `分享`, `复制中...`, `已复制`, or `复制失败` according to state.

The core handler should follow this shape:

```ts
async function shareArticle() {
  const body = document.getElementById(props.contentId)
  if (!body) {
    showTemporaryState('failed')
    return
  }

  state.value = 'copying'
  try {
    const clone = body.cloneNode(true) as HTMLElement
    const sourceLinks = body.querySelectorAll('a[href]')
    const clonedLinks = clone.querySelectorAll('a[href]')
    clonedLinks.forEach((link, index) => {
      const absoluteHref = (sourceLinks[index] as HTMLAnchorElement | undefined)?.href
      if (absoluteHref) link.setAttribute('href', absoluteHref)
    })

    await copyArticleShareContent(buildArticleShareContent({
      title: props.title,
      url: articleUrl.value,
      bodyHtml: clone.innerHTML,
      bodyText: body.innerText,
    }))
    showTemporaryState('copied')
  } catch {
    showTemporaryState('failed')
  }
}
```

Keep the existing compact visual treatment, but rename `.share-buttons` to `.share-action` and remove the unused flex gap.

- [ ] **Step 4: Connect the rendered article body**

Update `app/pages/[slug].vue`:

```vue
<ShareButtons
  :title="displayTitle"
  :slug="slug"
  content-id="article-share-content"
/>
```

Add the stable target only to `ContentRenderer`:

```vue
<ContentRenderer id="article-share-content" class="prose" :value="page" />
```

This placement excludes the source footer, navigation, comments, header description, tags, and table of contents.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --experimental-strip-types --test tests/article-share.test.mjs`

Expected: 5 tests pass.

- [ ] **Step 6: Run type checking and fix only share-related errors**

Run: `npm run typecheck`

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 7: Run the full Node test suite**

Run: `node --experimental-strip-types --test tests/*.test.mjs`

Expected: all tests pass.

- [ ] **Step 8: Run static generation without deployment**

Run: `SKIP_DEPLOY=1 npm run generate`

Expected: Nuxt prerenders the site successfully and skips the deploy script.

- [ ] **Step 9: Commit the UI integration**

```bash
git add app/components/ShareButtons.vue app/pages/[slug].vue tests/article-share.test.mjs
git commit -m "feat: copy full articles as rich text"
```
