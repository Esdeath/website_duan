#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  answerFingerprint,
  deduplicateBlocks,
  findNearDuplicatePairs,
  normalizeForDuplicate,
  parseFrontmatter,
  reviewNearDuplicatePair,
  splitQuestionAnswerBlocks,
  visibleTextLength,
} from './qanda-cleaning-lib.mjs'
import { TOPICS, TOPIC_BY_SLUG, VOLUMES, classifyBlock } from './qanda-cleaning-config.mjs'
import { buildTopicChapter, chineseNumber, isNoInformation, renderArticleFile } from './qanda-cleaning-generate-lib.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT_ROOT = path.join(ROOT, 'content', 'dao')
const AUDIT_PATH = path.join(ROOT, 'docs', 'content-audits', 'investment-qanda-cleaning-map.json')
const REDIRECTS_PATH = path.join(ROOT, 'public', '_redirects')
const WRITE = process.argv.includes('--write')

let priorityBySlug = new Map()

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
}

function originalSourcePaths(sourceCommit) {
  return git(['ls-tree', '-r', '--name-only', sourceCommit, '--', 'content/dao/qanda', 'content/dao/investment-logic', 'content/dao/business-logic'])
    .split(/\r?\n/)
    .filter((file) => file.endsWith('.md'))
}

function readSourceFile(sourceCommit, file) {
  return git(['show', `${sourceCommit}:${file}`])
}

function loadSources(sourceCommit, sourceSlugs) {
  const sources = []
  for (const file of originalSourcePaths(sourceCommit)) {
    const raw = readSourceFile(sourceCommit, file)
    const parsed = parseFrontmatter(raw)
    if (parsed.data.category !== '投资问答录' || !sourceSlugs.has(parsed.data.slug)) continue
    sources.push({ file, raw, ...parsed })
  }
  sources.sort((left, right) => {
    const leftPriority = priorityBySlug.get(left.data.slug) ?? 999
    const rightPriority = priorityBySlug.get(right.data.slug) ?? 999
    return leftPriority - rightPriority
  })
  if (sources.length !== 20) throw new Error(`Expected 20 source articles, found ${sources.length}`)
  return sources
}

function buildBlocks(sources) {
  return sources.flatMap((source) => splitQuestionAnswerBlocks(source.body, { sourceSlug: source.data.slug })
    .map((block) => ({ ...block, sourceFile: source.file, sourceTitle: source.data.title })))
}

function buildArticles(blocks) {
  const grouped = new Map(TOPICS.map((topic) => [topic.slug, []]))
  for (const block of blocks) {
    const topicSlug = classifyBlock(block)
    if (!topicSlug || !grouped.has(topicSlug)) throw new Error(`Unclassified block: ${block.id}`)
    grouped.get(topicSlug).push(block)
  }

  const articles = []
  for (const topic of TOPICS) {
    const topicBlocks = grouped.get(topic.slug)
    if (!topicBlocks.length) throw new Error(`Topic has no content: ${topic.slug}`)
    articles.push(buildTopicChapter(topic, topicBlocks))
  }
  return articles
}

function nearDuplicateCanonical(left, right) {
  const score = (block) => (block.hasQuestion ? 100 : 0)
    + (block.hasAnswer ? 100 : 0)
    + (block.headingPath?.length || 0) * 10
    + Math.min(visibleTextLength(block.markdown), 2000) / 2000
    - (priorityBySlug.get(block.sourceSlug) ?? 999) / 1000
  return score(left) >= score(right) ? left : right
}

function reviewNearDuplicates(blocks) {
  const blockById = new Map(blocks.map((block) => [block.id, block]))
  const candidates = []
  for (const topic of TOPICS) {
    const topicBlocks = blocks.filter((block) => classifyBlock(block) === topic.slug)
    for (const pair of findNearDuplicatePairs(topicBlocks, { threshold: 0.94, minimumLength: 50, fingerprint: answerFingerprint })) {
      candidates.push({ topicSlug: topic.slug, ...pair })
    }
  }

  const duplicateOf = new Map()
  const resolve = (id) => {
    let current = id
    while (duplicateOf.has(current)) current = duplicateOf.get(current)
    return current
  }

  candidates.sort((left, right) => right.similarity - left.similarity)
  for (const candidate of candidates) {
    const left = blockById.get(candidate.leftId)
    const right = blockById.get(candidate.rightId)
    Object.assign(candidate, reviewNearDuplicatePair(left, right, candidate.similarity))
    if (candidate.resolution !== 'duplicate-reviewed') continue

    const leftRoot = resolve(candidate.leftId)
    const rightRoot = resolve(candidate.rightId)
    if (leftRoot === rightRoot) {
      candidate.duplicateOf = leftRoot
      continue
    }
    const canonical = nearDuplicateCanonical(blockById.get(leftRoot), blockById.get(rightRoot))
    const duplicate = canonical.id === leftRoot ? rightRoot : leftRoot
    duplicateOf.set(duplicate, canonical.id)
    candidate.duplicateOf = canonical.id
  }

  for (const [id, canonical] of duplicateOf) duplicateOf.set(id, resolve(canonical))
  return {
    kept: blocks.filter((block) => !duplicateOf.has(block.id)),
    candidates,
    duplicateOf,
    resolve,
  }
}

function headingId(value) {
  return value
    .toLocaleLowerCase('zh-CN')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
}

function renderIndexFile(articles) {
  const body = VOLUMES.map((volume) => {
    const chapters = articles
      .filter((article) => article.volumeOrder === volume.order)
      .sort((left, right) => left.chapterOrder - right.chapterOrder)
      .map((article) => {
        const sections = [...article.body.matchAll(/^##\s+(.+)$/gm)]
          .map((match) => `- [${match[1]}](/${article.slug}#${headingId(match[1])})`)
          .join('\n')
        return `### 第${chineseNumber(article.chapterOrder)}章 [${article.title}](/${article.slug})\n\n${sections}`
      })
      .join('\n\n')
    return `## 第${chineseNumber(volume.order)}卷 ${volume.name}\n\n${chapters}`
  }).join('\n\n')
  const description = '按投资原则、商业经营、公司案例、人生与成长整理的段永平投资问答主题目录。'
  return [
    '---',
    'title: "投资问答录主题目录"',
    'slug: "wenda-topic-index"',
    `description: ${JSON.stringify(description)}`,
    'category: "投资问答录"',
    'order: 190',
    'seoTitle: "投资问答录主题目录｜段永平投资问答录"',
    `seoDescription: ${JSON.stringify(description)}`,
    'type: "topic-index"',
    'tags: ["投资问答录","主题目录","投资原则","商业经营","公司案例","人生与成长"]',
    '---',
    '',
    body,
    '',
  ].join('\n')
}

function renderLegacyFile(source, targetSlugs) {
  const targets = new Set(targetSlugs)
  const links = TOPICS
    .filter((topic) => targets.has(topic.slug))
    .map((topic) => `- [${topic.title}](/${topic.slug})`)
    .join('\n')
  const description = `${source.data.title}已按主题拆分，本页保留旧地址并提供新文章入口。`
  return [
    '---',
    `title: ${JSON.stringify(source.data.title)}`,
    `slug: ${JSON.stringify(source.data.slug)}`,
    `description: ${JSON.stringify(description)}`,
    'category: "投资问答录"',
    `order: ${source.data.order}`,
    `seoTitle: ${JSON.stringify(`${source.data.title}｜主题迁移导读`)}`,
    `seoDescription: ${JSON.stringify(description)}`,
    'type: "legacy-index"',
    'tags: ["投资问答录","旧版导读","主题索引"]',
    '---',
    '',
    '## 本章内容已按主题重组',
    '',
    '原地址继续保留。正文已去重并迁移到以下主题文章：',
    '',
    links || '- [投资问答录主题目录](/wenda-topic-index)',
    '',
    '完整目录见：[投资问答录主题目录](/wenda-topic-index)。',
    '',
  ].join('\n')
}

async function removeGeneratedFiles() {
  for (const directory of ['qanda', 'investment-logic', 'business-logic']) {
    const dir = path.join(CONTENT_ROOT, directory)
    for (const name of await readdir(dir)) {
      if (/^wenda-(?:invest|business|company|life)-.+\.md$/.test(name) || name === 'wenda-topic-index.md') {
        await rm(path.join(dir, name))
      }
    }
  }
}

async function collectPartRedirects() {
  const redirects = []
  for (const directory of ['qanda', 'investment-logic', 'business-logic']) {
    const dir = path.join(CONTENT_ROOT, directory)
    for (const name of await readdir(dir)) {
      const match = name.match(/^(wenda-(?:invest|business|company|life)-.+)-part-(\d+)\.md$/)
      if (!match) continue
      redirects.push({ from: `/${match[1]}-part-${match[2]}`, to: `/${match[1]}` })
    }
  }
  return redirects.sort((left, right) => left.from.localeCompare(right.from, 'en', { numeric: true }))
}

async function writePartRedirects(redirects) {
  let existing = ''
  try {
    existing = await readFile(REDIRECTS_PATH, 'utf8')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const start = '# BEGIN GENERATED QANDA CHAPTER REDIRECTS'
  const end = '# END GENERATED QANDA CHAPTER REDIRECTS'
  const block = [start, ...redirects.map((item) => `${item.from} ${item.to} 301`), end].join('\n')
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}\\n?`, 'g')
  const withoutGenerated = existing.replace(pattern, '').trim()
  const output = withoutGenerated ? `${withoutGenerated}\n\n${block}\n` : `${block}\n`
  await writeFile(REDIRECTS_PATH, output, 'utf8')
}

async function pinnedSourceManifest() {
  const existingAudit = JSON.parse(await readFile(AUDIT_PATH, 'utf8'))
  if (!/^[0-9a-f]{40}$/.test(existingAudit.sourceCommit || '')) {
    throw new Error('Existing audit does not contain a valid pinned sourceCommit')
  }
  if (!Array.isArray(existingAudit.sourceArticles) || existingAudit.sourceArticles.length !== 20) {
    throw new Error('Existing audit does not contain the expected 20 sourceArticles')
  }
  return {
    sourceCommit: existingAudit.sourceCommit,
    sourceArticles: existingAudit.sourceArticles,
  }
}

async function main() {
  const { sourceCommit, sourceArticles } = await pinnedSourceManifest()
  priorityBySlug = new Map(sourceArticles.map((source, index) => [source.slug, index]))
  const sources = loadSources(sourceCommit, new Set(sourceArticles.map((source) => source.slug)))
  const allBlocks = buildBlocks(sources)
  const noInformation = allBlocks.filter(isNoInformation)
  const noInformationIds = new Set(noInformation.map((block) => block.id))
  const informative = allBlocks.filter((block) => !noInformationIds.has(block.id))
  const deduplicated = deduplicateBlocks(informative, { minimumLength: 30, fingerprint: answerFingerprint })
  const dedupAudit = new Map(deduplicated.audit.map((item) => [item.id, item]))
  const nearReview = reviewNearDuplicates(deduplicated.kept)
  const articles = buildArticles(nearReview.kept)
  const redirects = await collectPartRedirects()

  const blockTargets = new Map()
  for (const article of articles) {
    for (const blockId of article.blockIds) {
      const targets = blockTargets.get(blockId) || []
      targets.push(article.slug)
      blockTargets.set(blockId, [...new Set(targets)])
    }
  }

  const nearDuplicateCandidates = nearReview.candidates

  const records = allBlocks.map((block) => {
    if (noInformationIds.has(block.id)) {
      return {
        id: block.id,
        sourceSlug: block.sourceSlug,
        headingPath: block.headingPath,
        status: 'discarded-no-information',
      }
    }
    const state = dedupAudit.get(block.id)
    if (state?.status === 'duplicate') {
      const canonical = nearReview.resolve(state.duplicateOf)
      return {
        id: block.id,
        sourceSlug: block.sourceSlug,
        headingPath: block.headingPath,
        status: 'duplicate',
        duplicateOf: canonical,
        targetSlugs: blockTargets.get(canonical) || [],
      }
    }
    if (nearReview.duplicateOf.has(block.id)) {
      const canonical = nearReview.resolve(block.id)
      return {
        id: block.id,
        sourceSlug: block.sourceSlug,
        headingPath: block.headingPath,
        status: 'duplicate',
        duplicateOf: canonical,
        targetSlugs: blockTargets.get(canonical) || [],
      }
    }
    return {
      id: block.id,
      sourceSlug: block.sourceSlug,
      headingPath: block.headingPath,
      status: 'kept',
      targetSlugs: blockTargets.get(block.id) || [],
    }
  })

  const audit = {
    version: 1,
    sourceCommit,
    sourceArticles: sources.map((source) => ({ file: source.file, slug: source.data.slug, title: source.data.title })),
    baseTopics: TOPICS.length,
    generatedArticles: articles.length,
    bodyLimit: null,
    counts: {
      sourceBlocks: allBlocks.length,
      keptBlocks: records.filter((item) => item.status === 'kept').length,
      duplicateBlocks: records.filter((item) => item.status === 'duplicate').length,
      discardedNoInformation: records.filter((item) => item.status === 'discarded-no-information').length,
      nearDuplicateCandidates: nearDuplicateCandidates.length,
    },
    articles: articles.map((article) => ({
      slug: article.slug,
      baseSlug: article.baseSlug,
      title: article.title,
      group: article.group,
      volume: article.volume,
      volumeOrder: article.volumeOrder,
      chapterOrder: article.chapterOrder,
      order: article.order,
      tags: article.tags,
      visibleLength: visibleTextLength(article.body),
      blockIds: article.blockIds,
    })),
    redirects,
    nearDuplicateCandidates,
    records,
  }

  console.log(JSON.stringify({
    sources: sources.length,
    sourceBlocks: allBlocks.length,
    informativeBlocks: informative.length,
    keptBlocks: nearReview.kept.length,
    generatedArticles: articles.length,
    nearDuplicateCandidates: nearDuplicateCandidates.length,
    longestArticle: Math.max(...audit.articles.map((article) => article.visibleLength)),
  }, null, 2))

  if (!WRITE) {
    console.log('Dry run only. Pass --write to generate files.')
    return
  }

  await removeGeneratedFiles()
  for (const article of articles) {
    const topic = TOPIC_BY_SLUG.get(article.baseSlug)
    const target = path.join(CONTENT_ROOT, topic.directory, `${article.slug}.md`)
    await writeFile(target, renderArticleFile(article), 'utf8')
  }
  await writeFile(path.join(CONTENT_ROOT, 'qanda', 'wenda-topic-index.md'), renderIndexFile(articles), 'utf8')
  await writePartRedirects(redirects)

  const recordBySource = new Map()
  for (const record of records) {
    const list = recordBySource.get(record.sourceSlug) || []
    list.push(record)
    recordBySource.set(record.sourceSlug, list)
  }
  for (const source of sources) {
    const targetSlugs = [...new Set((recordBySource.get(source.data.slug) || []).flatMap((record) => record.targetSlugs || []))]
    await writeFile(path.join(ROOT, source.file), renderLegacyFile(source, targetSlugs), 'utf8')
  }

  await mkdir(path.dirname(AUDIT_PATH), { recursive: true })
  await writeFile(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${articles.length} chapters, 1 topic index, 20 legacy guides, ${redirects.length} redirects and ${path.relative(ROOT, AUDIT_PATH)}.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
