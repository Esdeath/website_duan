export function validateAuditData(audit) {
  const errors = []
  if (audit.sourceArticles?.length !== 20) errors.push(`Expected 20 source articles, found ${audit.sourceArticles?.length || 0}`)
  if (audit.baseTopics !== 59) errors.push(`Expected 59 base topics, found ${audit.baseTopics}`)
  if (audit.generatedArticles !== audit.articles?.length) errors.push('Generated article count does not match article records')

  const slugs = new Set()
  for (const article of audit.articles || []) {
    if (slugs.has(article.slug)) errors.push(`Duplicate article slug: ${article.slug}`)
    slugs.add(article.slug)
    if (article.visibleLength > 5600) errors.push(`Article length exceeds 5600: ${article.slug} (${article.visibleLength})`)
    if (!Array.isArray(article.tags) || article.tags.length < 3 || article.tags.length > 6) {
      errors.push(`Article tags must contain 3-6 values: ${article.slug}`)
    }
  }

  const records = new Map((audit.records || []).map((record) => [record.id, record]))
  const validStatuses = new Set(['kept', 'duplicate', 'discarded-no-information'])
  for (const record of audit.records || []) {
    if (!validStatuses.has(record.status)) errors.push(`Invalid mapping status: ${record.id}`)
    if (record.status !== 'discarded-no-information' && !record.targetSlugs?.length) {
      errors.push(`Mapped block has no target: ${record.id}`)
    }
    if (record.status === 'duplicate' && (!record.duplicateOf || !records.has(record.duplicateOf))) {
      errors.push(`Duplicate block has invalid canonical target: ${record.id}`)
    }
  }

  for (const candidate of audit.nearDuplicateCandidates || []) {
    if (!candidate.resolution) errors.push(`Near duplicate review unresolved: ${candidate.leftId} / ${candidate.rightId}`)
  }
  return errors
}
