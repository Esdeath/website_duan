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

test('LLM index and electronic books exclude topic and legacy navigation pages', () => {
  const llms = read('server/routes/llms-full.txt.ts')
  const book = read('scripts/generate-books.mjs')

  assert.match(llms, /item\.type !== 'legacy-index'/)
  assert.match(book, /data\.type === "legacy-index" \|\| data\.type === "topic-index"/)
})

test('sitemap keeps legacy routes with reduced priority for static prerendering', () => {
  const sitemap = read('server/routes/sitemap.xml.ts')
  const nuxtConfig = read('nuxt.config.ts')

  assert.match(sitemap, /type: string/)
  assert.match(sitemap, /legacy-index.*0\.2/s)
  assert.match(nuxtConfig, /legacyQandaRoutes/)
  assert.match(nuxtConfig, /dadaotouziwendalu-diyizhangtouzidadao/)
  assert.match(nuxtConfig, /duanyongping-shangyeluoji-di7jie-stop-doing-list-buweiqingdan/)
})
