# Mobile-First Redesign Design

## Goal

Refresh the site for mobile-first use while preserving the current Nuxt Content architecture and the desktop reading shell. The result should feel like a compact reading catalogue on phones, not a desktop layout squeezed into a narrow viewport.

## Scope

In scope:

- Rework responsive styles for the home page, article page, shared layout, sidebar drawer, and global prose styles.
- Make phone styles the default baseline, then enhance at tablet and desktop breakpoints.
- Keep the existing content collection, routes, SEO metadata, comments, theme toggle, and sidebar data model.
- Preserve the current visual identity: paper background, ink text, cinnabar accent, reading-oriented typography.

Out of scope:

- Changing Markdown content.
- Changing Nuxt Content schema or route behavior.
- Replacing the desktop sidebar navigation model.
- Adding new client-side libraries or visual assets.

## Design Direction

The mobile experience should become a "pocket reading catalogue":

- The home page opens with a restrained book-cover identity section.
- The recommended book list becomes a tap-first list with cover, title, short note, and buying link.
- Category entry points read more like a table of contents than a card grid.
- The article page prioritizes line length, title hierarchy, and comfortable scrolling.
- The mobile drawer remains the directory, but spacing and hit targets should be tuned for touch.

The visual risk is the mobile catalogue treatment: instead of carrying desktop cards downward, phone screens should rely on text rhythm, dividers, small cover art, and a clear reading sequence.

## Breakpoint Strategy

Use three ranges:

- Phone: default styles and `max-width: 720px`.
- Tablet: `min-width: 721px` and `max-width: 1024px`.
- Desktop: `min-width: 1025px`.

Phone styles should be valid without media queries where practical. Tablet and desktop rules should add columns, wider spacing, larger typography, and persistent navigation.

## Component Plan

### Global CSS

Adjust `app/assets/css/main.css` so the root spacing token is mobile-first. The base `--px` should be smaller on phones and increase through tablet and desktop rules. Prose styles should keep Chinese reading comfortable on narrow screens, with tables remaining horizontally scrollable.

### Default Layout

Keep the current desktop sidebar at `1025px+`. Phones and tablets use the sticky top bar and drawer. The mobile top bar should have stable height, readable spacing, and touch-sized icon buttons. The drawer width should stay bounded by viewport width.

### Home Page

Rework `app/pages/index.vue` responsive CSS:

- The hero should use smaller phone-first title spacing and avoid excessive vertical height.
- Author links should become a single-column list on phones.
- Book rows should be phone-first: compact cover, flexible text column, no QR code on phones.
- Tablet can restore more generous spacing and optional multi-column category layout.
- Desktop can keep richer rows and QR code affordance.
- Category entries on phones should be dense, scan-friendly table-of-contents rows.

### Article Page

Rework `app/pages/[slug].vue` responsive CSS:

- Phone header margins should be tighter.
- Title size should scale by range, not by viewport width alone.
- Description and sharing controls should not crowd the first paragraph.
- Article body should remain single-column through tablet.
- Right-side table of contents only appears on desktop.

### Sidebar

Tune `app/components/LibrarySidebar.vue` only where needed:

- Keep search and category navigation behavior unchanged.
- Improve touch spacing in the drawer.
- Avoid long article titles forcing drawer overflow.

## Accessibility And Interaction

- Maintain `aria-label` values on icon buttons.
- Preserve tap targets near or above 44px where space allows.
- Keep color contrast aligned with the current light and dark themes.
- Avoid hover-only mobile affordances; primary mobile actions must be visible or tappable.
- Respect existing reduced-motion opportunities by not adding new required animation.

## Verification

Run:

```bash
git diff --check
npm run typecheck
npm run build
```

If local preview or browser validation is blocked by the environment, rely on build-focused verification and report that limitation.

## Acceptance Criteria

- The site is usable at common phone widths without horizontal page overflow.
- The home page book list and category entries are readable and tappable on phones.
- Article pages maintain comfortable Chinese reading rhythm on phones.
- Tablet widths do not inherit cramped phone styling or desktop-only sidebar behavior.
- Desktop layout remains recognizable and does not regress the existing persistent sidebar experience.
