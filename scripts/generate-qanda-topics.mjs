#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
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
import { TOPICS, TOPIC_BY_SLUG, classifyBlock } from './qanda-cleaning-config.mjs'
import { buildTopicArticles, isNoInformation, renderArticleFile } from './qanda-cleaning-generate-lib.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT_ROOT = path.join(ROOT, 'content', 'dao')
const AUDIT_PATH = path.join(ROOT, 'docs', 'content-audits', 'investment-qanda-cleaning-map.json')
const WRITE = process.argv.includes('--write')
const BODY_LIMIT = 5400

const sourcePriority = [
  'duanyongping-shangyeluoji-qianyan-maiqushoujiiumaishangsi',
  'dadaotouziwendalu-diyizhangtouzidadao',
  'duanyongping-touziluoji-di1zhang-touzilinian',
  'duanyongping-touziluoji-di2jie-touzilijie',
  'duanyongping-touziluoji-di3zhang-golfhetouzi',
  'duanyongping-touziluoji-di4zhang-caiwulijie',
  'duanyongping-touziluoji-di5zhang-guzhiluoji',
  'duanyongping-touziluoji-di6zhang-touzifangfalun',
  'dadaotouziwendalu-dierzhangshangyemoshiheqiyewenhua',
  'duanyongping-shangyeluoji-di1jie-weidaqiye',
  'duanyongping-shangyeluoji-di2jie-shangyemoshi',
  'duanyongping-shangyeluoji-di3jie-qiyewenhua',
  'duanyongping-shangyeluoji-di4jie-chanpin-chayihua-yu-chuangxin',
  'duanyongping-shangyeluoji-di5jie-pinpai-yingxiao-yu-guanggao',
  'duanyongping-shangyeluoji-di6jie-shougouheduoyuanhua',
  'duanyongping-shangyeluoji-di7jie-stop-doing-list-buweiqingdan',
  'dadaotouziwendalu-disanzhanggongsidianping',
  'duanyongping-touziluoji-di7zhang-anlifenxi',
  'dadaotouziwendalu-disizhangrenshengzhenyan',
  'dadaotouziwendalu-diliuzhangduzhegengxin',
]
const priorityBySlug = new Map(sourcePriority.map((slug, index) => [slug, index]))

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
}

function originalSourcePaths() {
  return git(['ls-tree', '-r', '--name-only', 'HEAD', '--', 'content/dao/qanda', 'content/dao/investment-logic', 'content/dao/business-logic'])
    .split(/\r?\n/)
    .filter((file) => file.endsWith('.md'))
}

function readHeadFile(file) {
  return git(['show', `HEAD:${file}`])
}

function loadSources() {
  const sources = []
  for (const file of originalSourcePaths()) {
    const raw = readHeadFile(file)
    const parsed = parseFrontmatter(raw)
    if (parsed.data.category !== '投资问答录') continue
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

function assignOrders(articles) {
  const byBase = new Map()
  for (const article of articles) {
    const list = byBase.get(article.baseSlug) || []
    list.push(article)
    byBase.set(article.baseSlug, list)
  }
  for (const list of byBase.values()) {
    list.sort((left, right) => left.part - right.part)
    list.forEach((article, index) => {
      article.order = list.length === 1 ? article.order : Number((article.order + (index + 1) / 100).toFixed(2))
    })
  }
  return articles
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
    articles.push(...buildTopicArticles(topic, topicBlocks, { limit: BODY_LIMIT }))
  }
  return assignOrders(articles)
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

function renderIndexFile(articles) {
  const grouped = new Map()
  for (const topic of TOPICS) {
    if (!grouped.has(topic.group)) grouped.set(topic.group, [])
    grouped.get(topic.group).push(...articles.filter((article) => article.baseSlug === topic.slug))
  }
  const body = [...grouped.entries()].map(([group, items]) => {
    const links = items.map((item) => `- [${item.title}](/${item.slug})`).join('\n')
    return `## ${group}\n\n${links}`
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
  const firstTargetByBase = new Map()
  for (const slug of targetSlugs) {
    const base = slug.replace(/-part-\d+$/, '')
    const current = firstTargetByBase.get(base)
    const part = Number(slug.match(/-part-(\d+)$/)?.[1] || 1)
    const currentPart = Number(current?.match(/-part-(\d+)$/)?.[1] || 1)
    if (!current || part < currentPart) firstTargetByBase.set(base, slug)
  }
  const links = TOPICS
    .filter((topic) => firstTargetByBase.has(topic.slug))
    .map((topic) => {
      const slug = firstTargetByBase.get(topic.slug)
      return `- [${topic.title}](/${slug})`
    })
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

async function main() {
  const sources = loadSources()
  const allBlocks = buildBlocks(sources)
  const noInformation = allBlocks.filter(isNoInformation)
  const noInformationIds = new Set(noInformation.map((block) => block.id))
  const informative = allBlocks.filter((block) => !noInformationIds.has(block.id))
  const deduplicated = deduplicateBlocks(informative, { minimumLength: 30, fingerprint: answerFingerprint })
  const dedupAudit = new Map(deduplicated.audit.map((item) => [item.id, item]))
  const nearReview = reviewNearDuplicates(deduplicated.kept)
  const articles = buildArticles(nearReview.kept)

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
    sourceCommit: git(['rev-parse', 'HEAD']).trim(),
    sourceArticles: sources.map((source) => ({ file: source.file, slug: source.data.slug, title: source.data.title })),
    baseTopics: TOPICS.length,
    generatedArticles: articles.length,
    bodyLimit: BODY_LIMIT,
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
      order: article.order,
      tags: article.tags,
      visibleLength: visibleTextLength(article.body),
      blockIds: article.blockIds,
    })),
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
  console.log(`Wrote ${articles.length} topic articles, 1 topic index, 20 legacy guides and ${path.relative(ROOT, AUDIT_PATH)}.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
