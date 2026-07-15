import test from 'node:test'
import assert from 'node:assert/strict'

import { validateAuditData } from '../scripts/qanda-cleaning-audit-lib.mjs'
import { MERGED_COMPANY_REDIRECTS, TOPICS } from '../scripts/qanda-cleaning-config.mjs'

test('audit data accepts complete mappings and reviewed near duplicates', () => {
  const articles = TOPICS.map((topic) => ({
    slug: topic.slug,
    visibleLength: 100000,
    volumeOrder: topic.volumeOrder,
    chapterOrder: topic.chapterOrder,
    tags: topic.tags,
  }))
  const errors = validateAuditData({
    sourceArticles: Array.from({ length: 20 }, (_, index) => ({ slug: `source-${index}` })),
    baseTopics: 45,
    generatedArticles: 45,
    bodyLimit: null,
    articles,
    redirects: [{ from: '/wenda-invest-01-part-1', to: '/wenda-invest-01' }],
    companyRedirects: [...MERGED_COMPANY_REDIRECTS].map(([from, to]) => ({ from: `/${from}`, to: `/${to}` })),
    records: [
      { id: 'a', status: 'kept', targetSlugs: ['wenda-invest-01'] },
      { id: 'b', status: 'duplicate', duplicateOf: 'a', targetSlugs: ['wenda-invest-01'] },
      { id: 'c', status: 'discarded-no-information' },
    ],
    nearDuplicateCandidates: [{ leftId: 'a', rightId: 'b', resolution: 'duplicate-reviewed' }],
  })

  assert.deepEqual(errors, [])
})

test('audit data reports metadata, tag, target and unresolved review failures', () => {
  const errors = validateAuditData({
    sourceArticles: [],
    baseTopics: 1,
    generatedArticles: 1,
    articles: [{ slug: 'article', visibleLength: 6001, tags: ['问答'] }],
    companyRedirects: [],
    records: [{ id: 'a', status: 'kept', targetSlugs: [] }],
    nearDuplicateCandidates: [{ leftId: 'a', rightId: 'b' }],
  })

  assert.ok(errors.some((error) => error.includes('20 source articles')))
  assert.ok(errors.some((error) => error.includes('45 base topics')))
  assert.ok(errors.some((error) => error.includes('19 company redirects')))
  assert.ok(errors.some((error) => error.includes('volume/chapter')))
  assert.ok(errors.some((error) => error.includes('tags')))
  assert.ok(errors.some((error) => error.includes('no target')))
  assert.ok(errors.some((error) => error.includes('unresolved')))
})
