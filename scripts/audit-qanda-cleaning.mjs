#!/usr/bin/env node

import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeForDuplicate, parseFrontmatter, visibleTextLength } from './qanda-cleaning-lib.mjs'
import { validateAuditData } from './qanda-cleaning-audit-lib.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const AUDIT_PATH = path.join(ROOT, 'docs', 'content-audits', 'investment-qanda-cleaning-map.json')
const CONTENT_ROOT = path.join(ROOT, 'content', 'dao')

async function contentFiles() {
  const files = []
  for (const directory of ['qanda', 'investment-logic', 'business-logic']) {
    const dir = path.join(CONTENT_ROOT, directory)
    for (const name of await readdir(dir)) if (name.endsWith('.md')) files.push(path.join(dir, name))
  }
  return files
}

function requiredMetadata(data, file, errors) {
  for (const field of ['title', 'slug', 'description', 'category', 'seoTitle', 'seoDescription']) {
    if (!data[field]) errors.push(`Missing ${field}: ${path.relative(ROOT, file)}`)
  }
}

async function main() {
  const audit = JSON.parse(await readFile(AUDIT_PATH, 'utf8'))
  const errors = validateAuditData(audit)
  const warnings = []
  const active = []
  const legacy = []
  const indexes = []
  const slugs = new Map()
  const duplicateParagraphs = new Map()

  for (const file of await contentFiles()) {
    const parsed = parseFrontmatter(await readFile(file, 'utf8'))
    requiredMetadata(parsed.data, file, errors)
    if (parsed.data.slug) {
      if (slugs.has(parsed.data.slug)) errors.push(`Duplicate content slug: ${parsed.data.slug}`)
      slugs.set(parsed.data.slug, file)
    }
    if (parsed.data.type === 'legacy-index') legacy.push({ file, ...parsed })
    if (parsed.data.type === 'topic-index') indexes.push({ file, ...parsed })
    if (parsed.data.type !== 'qanda-topic') continue

    const length = visibleTextLength(parsed.body)
    const article = { file, ...parsed, length }
    active.push(article)
    if (length > 5600) errors.push(`Generated article exceeds 5600 characters: ${parsed.data.slug} (${length})`)
    if (!Array.isArray(parsed.data.tags) || parsed.data.tags.length < 3 || parsed.data.tags.length > 6) {
      errors.push(`Generated article needs 3-6 tags: ${parsed.data.slug}`)
    }

    for (const paragraph of parsed.body.split(/\n\s*\n+/)) {
      const normalized = normalizeForDuplicate(paragraph)
      const length = Array.from(normalized).length
      if (length > 180 && !/^(?:[-+*]|\d+[.、．]|\|)/.test(paragraph.trim())) {
        warnings.push(`Long paragraph ${length}: ${parsed.data.slug}`)
      }
      if (length < 50) continue
      const entries = duplicateParagraphs.get(normalized) || []
      entries.push(parsed.data.slug)
      duplicateParagraphs.set(normalized, entries)
    }
  }

  if (legacy.length !== 20) errors.push(`Expected 20 legacy guides, found ${legacy.length}`)
  if (indexes.length !== 1 || indexes[0]?.data.slug !== 'wenda-topic-index') errors.push('Expected one wenda-topic-index page')
  if (active.length !== audit.generatedArticles) {
    errors.push(`Manifest lists ${audit.generatedArticles} active articles, found ${active.length}`)
  }

  const manifestSlugs = new Set(audit.articles.map((article) => article.slug))
  const fileSlugs = new Set(active.map((article) => article.data.slug))
  for (const slug of manifestSlugs) if (!fileSlugs.has(slug)) errors.push(`Manifest article missing on disk: ${slug}`)
  for (const slug of fileSlugs) if (!manifestSlugs.has(slug)) errors.push(`Generated article missing from manifest: ${slug}`)

  const repeatedParagraphGroups = [...duplicateParagraphs.entries()]
    .map(([text, articleSlugs]) => ({ text, articleSlugs: [...new Set(articleSlugs)] }))
    .filter((item) => item.articleSlugs.length > 1)
  for (const item of repeatedParagraphGroups) {
    warnings.push(`Repeated paragraph across ${item.articleSlugs.length} articles: ${item.articleSlugs.slice(0, 4).join(', ')}`)
  }

  const result = {
    activeArticles: active.length,
    legacyGuides: legacy.length,
    topicIndexes: indexes.length,
    longestArticle: Math.max(...active.map((article) => article.length)),
    unresolvedNearDuplicates: audit.nearDuplicateCandidates.filter((candidate) => !candidate.resolution).length,
    repeatedParagraphGroups: repeatedParagraphGroups.length,
    longParagraphWarnings: warnings.filter((warning) => warning.startsWith('Long paragraph')).length,
    errors: errors.length,
    warnings: warnings.length,
  }
  console.log(JSON.stringify(result, null, 2))
  if (warnings.length) console.log(warnings.slice(0, 30).map((warning) => `WARN ${warning}`).join('\n'))
  if (errors.length) {
    console.error(errors.slice(0, 100).map((error) => `ERROR ${error}`).join('\n'))
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
