import { TYPO_RULES } from './qanda-editorial-cleaning.mjs'

const EDITORIAL_RESIDUE_PATTERNS = [
  ['empty-markdown-link', /\*\(\)\*/u],
  ['empty-parentheses', /(?<!\*)\(\)(?!\*)|（）/u],
  ['repeated-question-mark', /[?？]{2,}/u],
  ['repeated-exclamation-mark', /[!！]{2,}/u],
  ['repeated-full-stop', /。{2,}/u],
  ['repeated-comma', /，{2,}/u],
  ['repeated-semicolon', /；{2,}/u],
  ['repeated-colon', /：{2,}/u],
  ['obsolete-question-ordinal', /^(?:[ \t]*(?:>\s*)?(?:\*\*)?)[０-９0-9一二三四五六七八九十百]{1,3}\s*(?:[.．、]\s*)?(?:_{1,2}\s*)?(?=(?:\*\*)?(?:网友|读者|问|雪球用户|投资者|用户|大道粉丝))/mu],
  ['keyboard-garble', /d\[0we8qfy-97p yvbcn\]/u],
  ['malformed-italic-number-label', /^_[０-９0-9]{1,3}[.．、]__/mu],
  ['trailing-underscore-debris', /[ \t]+__\s*$/mu],
]

export function findEditorialResidues(markdown) {
  const residues = EDITORIAL_RESIDUE_PATTERNS
    .filter(([, pattern]) => pattern.test(markdown))
    .map(([name]) => name)
  for (const typo of TYPO_RULES.keys()) {
    if (markdown.includes(typo)) residues.push(`known-typo:${typo}`)
  }
  return residues
}

export function validateAuditData(audit) {
  const errors = []
  if (audit.sourceArticles?.length !== 20) errors.push(`Expected 20 source articles, found ${audit.sourceArticles?.length || 0}`)
  if (audit.baseTopics !== 45) errors.push(`Expected 45 base topics, found ${audit.baseTopics}`)
  if (audit.generatedArticles !== audit.articles?.length) errors.push('Generated article count does not match article records')

  const slugs = new Set()
  for (const article of audit.articles || []) {
    if (slugs.has(article.slug)) errors.push(`Duplicate article slug: ${article.slug}`)
    slugs.add(article.slug)
    if (!Number.isInteger(article.volumeOrder) || article.volumeOrder < 1
      || !Number.isInteger(article.chapterOrder) || article.chapterOrder < 1) {
      errors.push(`Article volume/chapter metadata is invalid: ${article.slug}`)
    }
    if (!Array.isArray(article.tags) || article.tags.length < 3 || article.tags.length > 6) {
      errors.push(`Article tags must contain 3-6 values: ${article.slug}`)
    }
  }

  const redirectSources = new Set()
  for (const redirect of audit.redirects || []) {
    if (!/^\/[a-zA-Z0-9_-]+-part-\d+$/.test(redirect.from || '')) {
      errors.push(`Invalid part redirect source: ${redirect.from}`)
    }
    if (!slugs.has(String(redirect.to || '').replace(/^\//, ''))) {
      errors.push(`Part redirect has invalid chapter target: ${redirect.from}`)
    }
    if (redirectSources.has(redirect.from)) errors.push(`Duplicate part redirect source: ${redirect.from}`)
    redirectSources.add(redirect.from)
  }

  if (audit.companyRedirects?.length !== 19) {
    errors.push(`Expected 19 company redirects, found ${audit.companyRedirects?.length || 0}`)
  }
  for (const redirect of audit.companyRedirects || []) {
    if (!/^\/wenda-company-[a-z0-9-]+$/.test(redirect.from || '')) {
      errors.push(`Invalid company redirect source: ${redirect.from}`)
    }
    if (slugs.has(String(redirect.from || '').replace(/^\//, ''))) {
      errors.push(`Company redirect source is still an active chapter: ${redirect.from}`)
    }
    if (!slugs.has(String(redirect.to || '').replace(/^\//, ''))) {
      errors.push(`Company redirect has invalid chapter target: ${redirect.from}`)
    }
    if (redirectSources.has(redirect.from)) errors.push(`Duplicate redirect source: ${redirect.from}`)
    redirectSources.add(redirect.from)
  }

  const records = new Map((audit.records || []).map((record) => [record.id, record]))
  const validStatuses = new Set(['kept', 'duplicate', 'discarded-no-information'])
  for (const record of audit.records || []) {
    if (!validStatuses.has(record.status)) errors.push(`Invalid mapping status: ${record.id}`)
    if (record.status !== 'discarded-no-information' && !record.targetSlugs?.length) {
      errors.push(`Mapped block has no target: ${record.id}`)
    }
    for (const target of record.targetSlugs || []) {
      if (!slugs.has(target)) errors.push(`Mapped block has invalid target ${target}: ${record.id}`)
    }
    if (record.status === 'duplicate' && (!record.duplicateOf || !records.has(record.duplicateOf))) {
      errors.push(`Duplicate block has invalid canonical target: ${record.id}`)
    }
    if (record.status === 'discarded-no-information' && !record.reason) {
      errors.push(`Discarded block has no discard reason: ${record.id}`)
    }
  }

  if (audit.counts?.editorialChanges !== audit.editorialChanges?.length) {
    errors.push(`Editorial change count mismatch: ${audit.counts?.editorialChanges || 0} / ${audit.editorialChanges?.length || 0}`)
  }
  const validChangeTypes = new Set([
    'format-normalized',
    'typo-corrected',
    'discarded-no-information',
    'discarded-garbled',
    'kept-original',
  ])
  for (const change of audit.editorialChanges || []) {
    if (!records.has(change.blockId)) errors.push(`Editorial change has invalid blockId: ${change.blockId}`)
    if (!validChangeTypes.has(change.type)) errors.push(`Editorial change has invalid type: ${change.blockId}`)
    if (!change.rule || !Object.hasOwn(change, 'before') || !Object.hasOwn(change, 'after')) {
      errors.push(`Editorial change is incomplete: ${change.blockId}`)
    }
    if (!change.sourceSlug || !Array.isArray(change.targetSlugs)) {
      errors.push(`Editorial change has incomplete source/target mapping: ${change.blockId}`)
    }
  }
  if (audit.dangerousNumericChanges?.length) {
    errors.push(`Dangerous numeric changes found: ${audit.dangerousNumericChanges.length}`)
  }

  for (const candidate of audit.nearDuplicateCandidates || []) {
    if (!candidate.resolution) errors.push(`Near duplicate review unresolved: ${candidate.leftId} / ${candidate.rightId}`)
  }
  return errors
}
