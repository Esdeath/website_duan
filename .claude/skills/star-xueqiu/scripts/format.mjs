#!/usr/bin/env node
/**
 * star-xueqiu / format.mjs
 *
 * Turn a raw statuses JSON (from scrape.mjs) into a readable Markdown archive
 * and a CSV. The account owner's OWN words are prefixed with "<speaker>：",
 * and any quoted / replied-to content is labeled 【引用/被回复 @某某】 so the
 * attribution is never ambiguous.
 *
 * For 段永平 (user_id 1247347556, 雪球昵称「大道无形我有型」) the speaker label
 * defaults to 段永平 — that is the required convention for this project.
 *
 * Usage:
 *   node .claude/skills/star-xueqiu/scripts/format.mjs \
 *     --in=raw/xueqiu/1247347556.raw.json \
 *     [--out-md=raw/xueqiu/xxx.md] [--out-csv=raw/xueqiu/xxx.csv] [--speaker=段永平]
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] ?? true] : [a, true];
}));
const IN = String(argv.in || '');
if (!IN || !fs.existsSync(IN)) { console.error('format.mjs: --in=<raw.json> is required and must exist'); process.exit(1); }
const st = JSON.parse(fs.readFileSync(IN, 'utf8'));
if (!Array.isArray(st) || !st.length) { console.error('format.mjs: input has no statuses'); process.exit(1); }

// Known accounts whose display name differs from their handle.
const KNOWN = { '1247347556': '段永平' };
const owner = st[0]?.user;
const speaker = String(argv.speaker || KNOWN[String(owner?.id)] || owner?.screen_name || '本人');
const base = IN.replace(/\.raw\.json$|\.json$/i, '');
const OUT_MD = String(argv['out-md'] || `${base}.md`);
const OUT_CSV = String(argv['out-csv'] || `${base}.csv`);

const strip = (h) => (h || '')
  .replace(/<img[^>]*alt="([^"]*)"[^>]*>/g, '$1')
  .replace(/<img[^>]*title="([^"]*)"[^>]*>/g, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
const d = (ms) => new Date(ms + 8 * 3600e3);
const dt = (ms) => d(ms).toISOString().replace('T', ' ').slice(0, 16);

st.sort((a, b) => b.created_at - a.created_at);

// ---- Markdown ----
let md = `# ${speaker}（雪球「${owner?.screen_name || ''}」）发言存档\n\n`;
md += `- 时间范围：${d(st[st.length - 1].created_at).toISOString().slice(0, 10)} → ${d(st[0].created_at).toISOString().slice(0, 10)}\n`;
md += `- 共 ${st.length} 条 · user_id ${owner?.id ?? ''}\n`;
md += `- 说明：\`${speaker}：\` 开头为 ${speaker} 本人发言；\`【引用/被回复 @某某】\` 为被其回复或引用的他人内容\n\n---\n\n`;
for (const s of st) {
  const body = strip(s.text) || s.description || '(空)';
  md += `### ${dt(s.created_at)} · ${s.source || ''} · 赞${s.like_count || s.fav_count || 0} 转${s.retweet_count || 0} 评${s.reply_count || 0}\n`;
  md += `link: https://xueqiu.com/${s.user_id}/${s.id}\n\n`;
  md += `${speaker}：${body}\n`;
  if (s.retweeted_status) {
    const rt = s.retweeted_status;
    md += `\n> 【引用/被回复 @${(rt.user && rt.user.screen_name) || '?'}】${(strip(rt.text) || rt.description || '').replace(/\n/g, ' ')}\n`;
  }
  md += `\n---\n\n`;
}

// ---- CSV ----
const esc = (v) => { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
let csv = 'datetime,source,speaker,likes,retweets,replies,url,text,quoted\n';
for (const s of st) {
  csv += [dt(s.created_at), s.source || '', speaker, s.like_count || s.fav_count || 0, s.retweet_count || 0, s.reply_count || 0,
    `https://xueqiu.com/${s.user_id}/${s.id}`,
    (strip(s.text) || s.description || '').replace(/\n/g, ' '),
    s.retweeted_status ? (strip(s.retweeted_status.text) || s.retweeted_status.description || '').replace(/\n/g, ' ') : ''
  ].map(esc).join(',') + '\n';
}

fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
fs.writeFileSync(OUT_MD, md);
fs.writeFileSync(OUT_CSV, csv);
console.error(`[star-xueqiu] wrote ${OUT_MD} (${(fs.statSync(OUT_MD).size / 1024) | 0} KB) and ${OUT_CSV} (${(fs.statSync(OUT_CSV).size / 1024) | 0} KB)`);
console.log(`MD=${OUT_MD} CSV=${OUT_CSV} COUNT=${st.length} SPEAKER=${speaker}`);
