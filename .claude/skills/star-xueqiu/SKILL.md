---
name: star-xueqiu
description: >-
  Scrape a Xueqiu (雪球) user's posts/timeline and format them for archiving.
  Defaults to 段永平 (雪球昵称「大道无形我有型」, user_id 1247347556) — the subject of
  this repo. Use this WHENEVER the user asks to 抓取/获取雪球发言, fetch a Xueqiu user's
  recent posts, get 段永平/大道无形我有型 的最近发言/动态, pull the last N posts, or grab the
  past week/month/three-months of statements — even if they don't say "Xueqiu"
  or "puppeteer" explicitly. It handles the Aliyun WAF + slider CAPTCHA (headless
  Chromium + stealth), the login wall (decrypts the local Google Chrome login
  cookie so pagination past the newest ~20 posts works), and produces Markdown +
  CSV where 段永平's own words are prefixed 段永平：原文 and quoted content is labeled.
compatibility: macOS + Google Chrome (for cookie decryption); Node with the repo's puppeteer.
---

# star-xueqiu

Scrape a Xueqiu user's timeline, then format it into a readable archive. Built and
verified against 段永平's account; works for any public Xueqiu user id.

## Why this needs a skill (the three walls)

Xueqiu can't be fetched with `curl`/WebFetch and can't be paged naively:

1. **WAF + slider CAPTCHA.** Plain requests get an Aliyun WAF JS challenge; a
   naive headless browser gets the "滑动验证页面" slider. We defeat this with a
   headless Chromium plus stealth evasions (`navigator.webdriver=undefined`,
   fake `plugins`/`languages`/`hardwareConcurrency`, `window.chrome`). The page's
   own JS then signs API requests (the `md5__1038` query param) for us.
2. **Login wall.** The timeline API `v4/statuses/user_timeline.json?...&page=N`
   returns 20 posts/page, but anonymous access only gets **page 1** — page ≥2
   returns `error_code 10022 "请登录雪球查看更多内容"`. To page further you must send
   a logged-in cookie.
3. **Cookie is encrypted.** Google Chrome stores cookies AES-encrypted with a key
   in the macOS login Keychain. `scrape.mjs` copies the cookie DB, reads the key
   via `security find-generic-password`, and decrypts `xueqiu.com` cookies to
   inject them. Reading the Keychain pops a macOS permission dialog — **the user
   must click Allow**; that click is their consent.

## Prerequisites

- **macOS + Google Chrome, already logged in to xueqiu.com** (the "Default" profile
  by default). Without login you only get the latest ~20 posts.
- Run from the **repo root** so `node_modules/puppeteer` resolves. If generate/
  puppeteer was never installed, run `npm i` first.
- Tell the user a Keychain prompt will appear and they must approve it.

## Workflow

Two steps: **scrape → format**. Both are bundled scripts; don't re-derive them.

```bash
# 1. scrape into raw JSON (default: 段永平, past 3 months)
node .claude/skills/star-xueqiu/scripts/scrape.mjs --months=3

# 2. format into Markdown + CSV (段永平：原文 attribution)
node .claude/skills/star-xueqiu/scripts/format.mjs --in=raw/xueqiu/1247347556.raw.json
```

`scrape.mjs` writes progress to stderr and a final `OUT=<path> COUNT=<n>` to stdout.
`format.mjs` writes `<base>.md` + `<base>.csv` next to the input.

### scrape.mjs options

| flag | default | meaning |
|------|---------|---------|
| `--user-id=<id>` | `1247347556` (段永平) | Xueqiu numeric user id (from `xueqiu.com/u/<id>`) |
| `--months=<n>` | `3` | fetch back this many months |
| `--pages=<n>` | — | fetch exactly N pages (20/page) instead of by date; overrides `--months` |
| `--out=<path>` | `raw/xueqiu/<id>.raw.json` | raw JSON output |
| `--chrome-profile=<name>` | `Default` | Chrome profile holding the login (check with the sqlite snippet below) |
| `--anonymous` | off | skip cookie decryption; only the latest ~20 posts |

For "最近三条 / 最近20条" style asks, prefer `--pages=1` (20 posts, no login needed)
and take the top N. For "过去一周/一月/三个月" use `--months`.

### format.mjs options

| flag | default | meaning |
|------|---------|---------|
| `--in=<raw.json>` | (required) | scrape.mjs output |
| `--out-md` / `--out-csv` | next to input | override output paths |
| `--speaker=<name>` | 段永平 for id 1247347556, else the account handle | attribution prefix |

## Output format (attribution is the point)

段永平's own words are prefixed with `段永平：`; content he replied to / retweeted is
labeled `【引用/被回复 @某某】`. This keeps authorship unambiguous — critical because the
material feeds a 段永平 content site and mis-attribution is unacceptable.

**Example (Markdown entry):**

```
### 2026-05-07 22:10 · iPad · 赞4396 转120 评88
link: https://xueqiu.com/1247347556/387543201

段永平：$泡泡玛特(09992)$ 我把我的神华都换了泡泡玛特了……将来有机会我还会再回来的。I'll be back

> 【引用/被回复 @某某】……（网友原话）
```

When you present results in chat (not just files), use the same `段永平：原文` convention.

## Storage convention

Scraped material is raw source, not site content: keep it under `raw/xueqiu/` which
this repo already gitignores (the `raw/` rule) so it is never committed or prerendered.
Do NOT drop scraped posts directly into `content/dao/`. Turning selected posts into
proper articles is a separate, deliberate step (fill the required frontmatter, unique
`slug`, correct section) — offer it, don't do it automatically.

## Security & etiquette

- The login cookie is the user's live session credential. Never print token values,
  never write them into the repo, and don't send them anywhere. `scrape.mjs` deletes
  the copied cookie DB when done.
- Scraping uses the user's own logged-in account; be considerate with volume and the
  built-in per-page delay. The user can revoke access afterwards via Xueqiu → 退出登录.

## Troubleshooting

- **Title is "滑动验证页面" / "hit WAF/CAPTCHA wall":** transient bot detection. Re-run;
  if persistent, it may need a real (headful) session — remove `headless: 'new'` to debug.
- **`logged-in: false` / stops after page 1:** the chosen Chrome profile isn't logged in.
  Find the right one:
  ```bash
  for p in Default "Profile 1" "Profile 2"; do
    db="$HOME/Library/Application Support/Google/Chrome/$p/Cookies"; [ -f "$db" ] || continue
    cp "$db" /tmp/_c.db; echo "$p:"; sqlite3 /tmp/_c.db \
      "SELECT name FROM cookies WHERE host_key LIKE '%xueqiu.com%' AND name='xq_a_token';"; rm -f /tmp/_c.db
  done
  ```
  Pass the profile that prints `xq_a_token` via `--chrome-profile`.
- **Keychain prompt didn't appear / access denied:** the user must approve it; re-run.
- **Not macOS or not Chrome:** cookie decryption is skipped (anonymous, latest ~20 only).
  Alternative: have the user paste their `Cookie` header and adapt the injection.
