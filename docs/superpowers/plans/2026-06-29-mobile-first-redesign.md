# Mobile-First Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the Nuxt Content site so phone styles are the baseline, tablet and desktop are enhancements, and the mobile experience feels like a compact reading catalogue.

**Architecture:** Keep the existing Nuxt routes, content collection, layout shell, and sidebar data model. Change CSS and template class structure only where needed to create a phone-first home page, article page, drawer, and prose system.

**Tech Stack:** Nuxt 4, Vue 3, Nuxt Content v3, scoped Vue CSS, shared CSS variables in `app/assets/css/main.css`.

---

## File Structure

- Modify `app/assets/css/main.css`: mobile-first spacing tokens, prose defaults, table overflow behavior, and tablet/desktop spacing enhancements.
- Modify `app/layouts/default.vue`: top-bar sizing, shell overflow behavior, drawer width, and mobile touch affordances.
- Modify `app/pages/index.vue`: mobile catalogue treatment for hero, author links, recommended books, and category entries; tablet and desktop enhancements.
- Modify `app/pages/[slug].vue`: phone-first article header/body spacing, fixed breakpoint title sizing, and desktop-only TOC behavior.
- Modify `app/components/LibrarySidebar.vue` only if drawer touch spacing or long-title overflow requires it after the main layout changes.

### Task 1: Global Mobile-First Tokens And Prose

**Files:**
- Modify: `app/assets/css/main.css`

- [ ] **Step 1: Update root spacing tokens**

Replace the current `--px` value with a phone-first token and add tablet/desktop overrides near the responsive section:

```css
:root {
  --px: clamp(18px, 5vw, 28px);
}

@media (min-width: 721px) {
  :root {
    --px: clamp(28px, 4vw, 44px);
  }
}

@media (min-width: 1025px) {
  :root {
    --px: clamp(32px, 5vw, 56px);
  }
}
```

- [ ] **Step 2: Rework phone prose defaults**

Inside the existing `@media (max-width: 720px)` block, keep `.prose` at readable size and add heading/list/table handling:

```css
.prose {
  font-size: 16px;
  line-height: 1.75;
}

.prose h2 {
  margin-top: 1.55em;
  font-size: 19px;
}

.prose h3 {
  font-size: 16px;
}

.prose ul,
.prose ol {
  padding-left: 1.25em;
}

.prose table {
  display: block;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  font-size: 14px;
}
```

- [ ] **Step 3: Verify CSS syntax quickly**

Run:

```bash
git diff --check
```

Expected: no output and exit code 0.

### Task 2: Shared Layout And Mobile Drawer

**Files:**
- Modify: `app/layouts/default.vue`

- [ ] **Step 1: Tune shell and main area for phone baseline**

Keep the desktop grid but ensure the single-column mobile shell owns the viewport cleanly:

```css
.main-area {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  scroll-behavior: smooth;
}
```

- [ ] **Step 2: Improve mobile top bar**

Within `@media (max-width: 1024px)`, set stable spacing and touch-sized controls:

```css
.mobile-topbar {
  min-height: 58px;
  padding: 10px var(--px);
}

.mobile-menu-btn,
.mobile-theme-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--bg-elevated);
}
```

- [ ] **Step 3: Tune drawer width and head**

Update drawer rules so phone widths are bounded and usable:

```css
.mobile-drawer {
  width: min(360px, 92vw);
}

.mobile-drawer-head {
  min-height: 58px;
  padding: 12px 16px;
}
```

- [ ] **Step 4: Verify layout diff**

Run:

```bash
git diff --check
```

Expected: no output and exit code 0.

### Task 3: Home Page Mobile Catalogue

**Files:**
- Modify: `app/pages/index.vue`

- [ ] **Step 1: Make home spacing phone-first**

Change `.home-content`, `.book-cover`, `.cover-title`, `.cover-quotes`, and `.author-cards` so the base styles are phone-appropriate:

```css
.home-content {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 20px var(--px) 56px;
  animation: fadeInUp 0.5s var(--ease-out) both;
}

.book-cover {
  text-align: center;
  padding: 30px 0 28px;
  margin-bottom: 30px;
}

.cover-title {
  margin: 18px 0;
  font-size: 32px;
  letter-spacing: 0.18em;
}

.cover-quotes {
  margin: 24px auto 24px;
  font-size: 16px;
  line-height: 1.8;
}

.author-cards {
  grid-template-columns: 1fr;
}
```

- [ ] **Step 2: Convert book rows to tap-first phone rows**

Set the base `.book-row`, `.book-cover-link`, `.book-info`, `.book-meta`, and `.book-qr` styles for phones:

```css
.book-row {
  gap: 12px;
  padding: 16px 0;
}

.book-cover-link {
  width: 64px;
}

.book-info {
  min-width: 0;
}

.book-meta {
  margin-top: 8px;
  padding-top: 0;
}

.book-qr {
  display: none;
}
```

- [ ] **Step 3: Make category entries mobile catalogue rows**

Set the base `.overview-grid` to one column and `.overview-card` to a flatter directory-row style:

```css
.overview-grid {
  grid-template-columns: 1fr;
  gap: 10px;
}

.overview-card {
  gap: 12px;
  padding: 16px 0;
  background: transparent;
  border-width: 0 0 1px;
  border-radius: 0;
  box-shadow: none;
}

.card-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 6px;
}
```

- [ ] **Step 4: Add tablet and desktop enhancements**

Add `@media (min-width: 721px)` and `@media (min-width: 1025px)` blocks:

```css
@media (min-width: 721px) {
  .home-content {
    padding: 32px var(--px) 72px;
  }

  .cover-title {
    font-size: 38px;
    letter-spacing: 0.28em;
  }

  .cover-quotes {
    font-size: 19px;
  }

  .author-cards,
  .overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .overview-card {
    padding: 20px 22px;
    background: var(--bg-elevated);
    border: 1.5px solid color-mix(in srgb, var(--accent) 40%, transparent);
    border-radius: 6px;
  }
}

@media (min-width: 1025px) {
  .home-content {
    padding: 36px var(--px) 72px;
  }

  .book-qr {
    display: flex;
  }
}
```

- [ ] **Step 5: Remove conflicting old phone-only overrides**

Delete or simplify the existing `@media (max-width: 720px)` block in `app/pages/index.vue` so it does not fight the new base styles.

- [ ] **Step 6: Verify home page diff**

Run:

```bash
git diff --check
```

Expected: no output and exit code 0.

### Task 4: Article Page Reading Layout

**Files:**
- Modify: `app/pages/[slug].vue`

- [ ] **Step 1: Make article spacing phone-first**

Update base styles:

```css
.article-page {
  padding: 0 var(--px) 64px;
}

.article-header {
  max-width: var(--reading-width);
  margin: 24px 0 28px;
  padding-bottom: 22px;
}

.article-content {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  max-width: var(--reading-width);
}

.article-header h1 {
  font-size: 28px;
  line-height: 1.3;
  letter-spacing: 0;
}

.article-header .desc {
  font-size: 15px;
  line-height: 1.75;
}
```

- [ ] **Step 2: Keep TOC desktop-only**

Make `.article-toc` hidden by default and visible in the desktop breakpoint:

```css
.article-toc {
  display: none;
}

@media (min-width: 1025px) {
  .article-content {
    grid-template-columns: minmax(0, 1fr) 180px;
    gap: 24px;
  }

  .article-toc {
    display: block;
  }
}
```

- [ ] **Step 3: Add tablet/desktop article enhancements**

Add:

```css
@media (min-width: 721px) {
  .article-page {
    padding-bottom: 84px;
  }

  .article-header {
    margin: 34px 0 36px;
    padding-bottom: 26px;
  }

  .article-header h1 {
    font-size: 34px;
    line-height: 1.25;
  }
}

@media (min-width: 1025px) {
  .article-page {
    padding-bottom: 96px;
  }
}
```

- [ ] **Step 4: Remove conflicting old max-width article media blocks**

Remove old `@media (max-width: 1024px)` and `@media (max-width: 720px)` rules that duplicate the new default behavior.

- [ ] **Step 5: Verify article diff**

Run:

```bash
git diff --check
```

Expected: no output and exit code 0.

### Task 5: Sidebar Drawer Polish

**Files:**
- Modify: `app/components/LibrarySidebar.vue`

- [ ] **Step 1: Keep long titles contained**

If needed after layout changes, update the mobile block:

```css
.article-list a {
  min-height: 34px;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
```

- [ ] **Step 2: Keep search touch-friendly**

If the drawer feels cramped, keep the existing mobile search height and ensure input font size is 14px:

```css
.search-input {
  height: 40px;
  font-size: 14px;
}
```

- [ ] **Step 3: Verify sidebar diff**

Run:

```bash
git diff --check
```

Expected: no output and exit code 0.

### Task 6: Full Verification

**Files:**
- Check all modified files.

- [ ] **Step 1: Check changed files**

Run:

```bash
git status --short
```

Expected: only the implementation plan and intended UI files are changed.

- [ ] **Step 2: Whitespace check**

Run:

```bash
git diff --check
```

Expected: no output and exit code 0.

- [ ] **Step 3: Typecheck**

Run:

```bash
npm run typecheck
```

Expected: Nuxt typecheck completes successfully.

- [ ] **Step 4: Build**

Run:

```bash
npm run build
```

Expected: Nuxt build completes successfully.

- [ ] **Step 5: Review final diff**

Run:

```bash
git diff -- app/assets/css/main.css app/layouts/default.vue app/pages/index.vue app/pages/[slug].vue app/components/LibrarySidebar.vue
```

Expected: CSS-only or narrowly scoped template/style changes matching the approved mobile-first redesign spec.
