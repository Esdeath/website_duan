import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

test('public catalogue and sidebar filter legacy migration guides', () => {
  const layout = read('app/layouts/default.vue')
  const home = read('app/pages/index.vue')

  assert.match(layout, /article\.type !== 'legacy-index'/)
  assert.match(home, /article\.type !== 'legacy-index'/)
  assert.ok((home.match(/article\.type !== 'legacy-index'/g) || []).length >= 2)
})

test('article page renders tags and selects schema type from content type', () => {
  const article = read('app/pages/[slug].vue')

  assert.match(article, /class="article-tags"/)
  assert.match(article, /schemaType/)
  assert.match(article, /schema\.keywords = d\.tags/)
  assert.match(article, /topic-index.*CollectionPage/)
  assert.match(article, /legacy-index.*WebPage/)
})

test('content schema and sidebar expose volume chapter hierarchy', () => {
  const schema = read('content.config.ts')
  const layout = read('app/layouts/default.vue')
  const sidebar = read('app/components/LibrarySidebar.vue')

  assert.match(schema, /volume: z\.string\(\)\.optional\(\)/)
  assert.match(schema, /volumeOrder: z\.number\(\)\.optional\(\)/)
  assert.match(schema, /chapterOrder: z\.number\(\)\.optional\(\)/)
  assert.match(layout, /volume.*volumeOrder.*chapterOrder/)
  assert.match(sidebar, /category === '投资问答录'/)
  assert.match(sidebar, /qanda-chapter/)
  assert.match(sidebar, /主题总目录/)
  assert.match(sidebar, /第.*章/)
})

test('homepage counts qanda chapters and chapter page renders sibling navigation', () => {
  const home = read('app/pages/index.vue')
  const article = read('app/pages/[slug].vue')

  assert.match(home, /qanda-chapter/)
  assert.match(home, /wenda-topic-index/)
  assert.match(article, /chapterNavigation/)
  assert.match(article, /上一章/)
  assert.match(article, /返回本卷目录/)
  assert.match(article, /下一章/)
})

test('LLM index and electronic books exclude topic and legacy navigation pages', () => {
  const llms = read('server/routes/llms-full.txt.ts')
  const book = read('scripts/generate-books.mjs')

  assert.match(llms, /item\.type !== 'legacy-index'.*item\.type !== 'topic-index'/s)
  assert.match(book, /data\.type === "legacy-index" \|\| data\.type === "topic-index"/)
  assert.match(book, /qanda-chapter/)
  assert.match(book, /volumeOrder/)
  assert.match(book, /第一卷/)
})

test('sitemap excludes legacy routes while Nuxt still prerenders the 20 source guides', () => {
  const sitemap = read('server/routes/sitemap.xml.ts')
  const nuxtConfig = read('nuxt.config.ts')

  assert.match(sitemap, /type: string/)
  assert.match(sitemap, /filter\(.*legacy-index/s)
  assert.match(nuxtConfig, /legacyQandaRoutes/)
  assert.match(nuxtConfig, /dadaotouziwendalu-diyizhangtouzidadao/)
  assert.match(nuxtConfig, /duanyongping-shangyeluoji-di7jie-stop-doing-list-buweiqingdan/)
})

test('all historical qanda part URLs keep permanent redirects after regeneration', () => {
  const redirects = read('public/_redirects')
  const partRedirects = redirects.match(/^\/wenda-.*-part-\d+\s+\/wenda-\S+\s+301$/gm) || []

  assert.equal(partRedirects.length, 208)
})
