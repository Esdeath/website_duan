import test from 'node:test'
import assert from 'node:assert/strict'

import { validateAuditData } from '../scripts/qanda-cleaning-audit-lib.mjs'

test('audit data accepts complete mappings and reviewed near duplicates', () => {
  const errors = validateAuditData({
    sourceArticles: Array.from({ length: 20 }, (_, index) => ({ slug: `source-${index}` })),
    baseTopics: 59,
    generatedArticles: 1,
    bodyLimit: null,
    articles: [{
      slug: 'article',
      visibleLength: 100000,
      volumeOrder: 1,
      chapterOrder: 1,
      tags: ['投资原则', '价值投资', '问答'],
    }],
    redirects: [{ from: '/article-part-1', to: '/article' }],
    records: [
      { id: 'a', status: 'kept', targetSlugs: ['article'] },
      { id: 'b', status: 'duplicate', duplicateOf: 'a', targetSlugs: ['article'] },
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
    records: [{ id: 'a', status: 'kept', targetSlugs: [] }],
    nearDuplicateCandidates: [{ leftId: 'a', rightId: 'b' }],
  })

  assert.ok(errors.some((error) => error.includes('20 source articles')))
  assert.ok(errors.some((error) => error.includes('59 base topics')))
  assert.ok(errors.some((error) => error.includes('volume/chapter')))
  assert.ok(errors.some((error) => error.includes('tags')))
  assert.ok(errors.some((error) => error.includes('no target')))
  assert.ok(errors.some((error) => error.includes('unresolved')))
})
