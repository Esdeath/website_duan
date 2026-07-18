import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

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
