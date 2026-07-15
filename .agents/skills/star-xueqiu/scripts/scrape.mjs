#!/usr/bin/env node
/**
 * star-xueqiu / scrape.mjs
 *
 * Scrape a Xueqiu (雪球) user's timeline into a raw JSON array of statuses.
 *
 * Handles:
 *   - Aliyun WAF + slider CAPTCHA  -> headless Chromium + stealth evasions
 *   - login wall (page>=2 needs auth) -> decrypt the local Google Chrome login cookie
 *   - pagination until a date cutoff (default: 3 months) or a fixed page count
 *
 * macOS + Google Chrome only (cookie decryption uses the login Keychain).
 * Requires the project's puppeteer (run from the repo root).
 *
 * Usage:
 *   node .claude/skills/star-xueqiu/scripts/scrape.mjs \
 *     [--user-id=1247347556] [--months=3] [--pages=N] \
 *     [--out=raw/xueqiu/<id>.raw.json] [--chrome-profile=Default] [--anonymous]
 *
 * Prints progress to stderr and a final "OUT=<path> COUNT=<n>" line to stdout.
 */
import puppeteer from 'puppeteer';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ---------- args ----------
const argv = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] ?? true] : [a, true];
}));
const USER_ID = String(argv['user-id'] || '1247347556');
const MONTHS = argv.months != null ? Number(argv.months) : 3;
const PAGES = argv.pages != null ? Number(argv.pages) : null; // hard page cap (overrides months when set)
const CHROME_PROFILE = String(argv['chrome-profile'] || 'Default');
const ANON = !!argv.anonymous;
const OUT = String(argv.out || `raw/xueqiu/${USER_ID}.raw.json`);
const MAX_PAGES = 300; // safety backstop
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.error('[star-xueqiu]', ...a);

// ---------- 1. decrypt Chrome login cookies (macOS) ----------
function loadChromeCookies() {
  if (process.platform !== 'darwin') { log('non-macOS: skipping cookie decryption (anonymous mode)'); return []; }
  const dbSrc = path.join(os.homedir(), `Library/Application Support/Google/Chrome/${CHROME_PROFILE}/Cookies`);
  if (!fs.existsSync(dbSrc)) { log(`no Chrome cookie DB at profile "${CHROME_PROFILE}"; anonymous mode`); return []; }
  const dbTmp = path.join(os.tmpdir(), `_starxq_${process.pid}.db`);
  fs.copyFileSync(dbSrc, dbTmp);
  try {
    const rows = execFileSync('sqlite3', [dbTmp,
      "SELECT name || '\t' || hex(encrypted_value) FROM cookies WHERE host_key LIKE '%xueqiu.com%';"],
      { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    // Keychain -> AES key (triggers a macOS permission prompt the user must approve)
    log('reading Chrome Safe Storage key from Keychain (approve the prompt if it appears)...');
    const kcPass = execFileSync('security',
      ['find-generic-password', '-w', '-s', 'Chrome Safe Storage', '-a', 'Chrome'],
      { encoding: 'utf8' }).trim();
    const aesKey = crypto.pbkdf2Sync(kcPass, 'saltysalt', 1003, 16, 'sha1');
    const iv = Buffer.alloc(16, 0x20);
    const decrypt = (hex) => {
      const buf = Buffer.from(hex, 'hex');
      if (buf.slice(0, 3).toString() !== 'v10') return null;
      const dec = crypto.createDecipheriv('aes-128-cbc', aesKey, iv);
      dec.setAutoPadding(false);
      let out = Buffer.concat([dec.update(buf.slice(3)), dec.final()]);
      const pad = out[out.length - 1];
      if (pad > 0 && pad <= 16) out = out.slice(0, out.length - pad);
      // newer Chrome prepends 32-byte SHA256(domain); strip if leading bytes are non-printable
      if (out.length > 32 && out.slice(0, 32).some((b) => b < 0x20 || b > 0x7e)) out = out.slice(32);
      return out.toString('utf8');
    };
    const cookies = [];
    for (const line of rows) {
      const [name, hex] = line.split('\t');
      const value = decrypt(hex);
      if (value != null) cookies.push({ name, value, domain: '.xueqiu.com', path: '/' });
    }
    return cookies;
  } finally {
    fs.rmSync(dbTmp, { force: true });
  }
}

// ---------- 2. scrape ----------
const cutoff = new Date();
cutoff.setMonth(cutoff.getMonth() - MONTHS);
const CUTOFF = cutoff.getTime();

const cookies = ANON ? [] : loadChromeCookies();
const authed = cookies.some((c) => c.name === 'xq_a_token');
log(`cookies: ${cookies.length}, logged-in: ${authed}`);
if (!authed && !ANON) log('WARNING: no xq_a_token — only the latest ~20 posts are reachable (login wall).');

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=zh-CN,zh',
    '--disable-blink-features=AutomationControlled', '--window-size=1400,900'],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    window.chrome = { runtime: {} };
    const oq = window.navigator.permissions.query;
    window.navigator.permissions.query = (p) =>
      p.name === 'notifications' ? Promise.resolve({ state: Notification.permission }) : oq(p);
  });
  if (cookies.length) await browser.setCookie(...cookies.map((c) => ({ ...c, url: 'https://xueqiu.com' })));

  await page.goto(`https://xueqiu.com/u/${USER_ID}`, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(4500);
  const title = await page.title();
  log('page title:', title);
  if (/验证|verify/i.test(title)) throw new Error('hit WAF/CAPTCHA wall (title="' + title + '"). Try re-running.');

  const fetchPage = (pg) => page.evaluate(async (uid, pg) => {
    const r = await fetch(`https://xueqiu.com/v4/statuses/user_timeline.json?user_id=${uid}&page=${pg}`,
      { headers: { Accept: 'application/json' }, credentials: 'include' });
    const t = await r.text();
    try { return { status: r.status, data: JSON.parse(t) }; }
    catch { return { status: r.status, raw: t.slice(0, 140) }; }
  }, USER_ID, pg);

  const all = [];
  const seen = new Set();
  let reached = false;
  const cap = PAGES ?? MAX_PAGES;
  for (let pg = 1; pg <= cap && !reached; pg++) {
    let res = await fetchPage(pg);
    if (res.status !== 200 || !res.data) {
      if (res.raw && res.raw.includes('10022')) { log('login wall reached (10022); stopping.'); break; }
      log(`page ${pg} status=${res.status}; retry once`);
      await sleep(3000);
      res = await fetchPage(pg);
      if (res.status !== 200 || !res.data) { log(`page ${pg} failed, stopping.`); break; }
    }
    const list = res.data.statuses || [];
    if (!list.length) { log(`page ${pg} empty, stopping.`); break; }
    let added = 0;
    for (const s of list) if (!seen.has(s.id)) { seen.add(s.id); all.push(s); added++; if (s.created_at < CUTOFF) reached = true; }
    const oldest = Math.min(...list.map((s) => s.created_at));
    log(`page ${pg}/${res.data.maxPage}: +${added} total=${all.length} oldest=${new Date(oldest + 8 * 3600e3).toISOString().slice(0, 10)}`);
    if (PAGES == null && reached) { log('reached date cutoff.'); }
    await sleep(1100 + (pg % 5) * 250);
  }

  const kept = PAGES != null ? all : all.filter((s) => s.created_at >= CUTOFF);
  kept.sort((a, b) => b.created_at - a.created_at);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(kept));
  log(`DONE fetched=${all.length} kept=${kept.length} -> ${OUT}`);
  console.log(`OUT=${OUT} COUNT=${kept.length}`);
} finally {
  await browser.close();
}
