import { answerFingerprint, normalizeForDuplicate, splitMarkdownByLength, visibleTextLength } from './qanda-cleaning-lib.mjs'

const LEGACY_LINK_TARGETS = new Map([
  ['duanyongping-shangyeluoji-di3jie-qiyewenhua', 'wenda-business-08-part-1'],
])

export function rewriteLegacyLinks(markdown) {
  return markdown.replace(/\]\(\/([a-zA-Z0-9_-]+)\)/g, (match, slug) => {
    const target = LEGACY_LINK_TARGETS.get(slug)
    return target ? match.replace(`/${slug}`, `/${target}`) : match
  })
}

function plainParagraph(paragraph) {
  return paragraph
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .trim()
}

export function standardizeQaMarkers(markdown) {
  let awaitingAnswer = false
  return markdown
    .split(/\n\s*\n+/)
    .map((paragraph) => {
      const plain = plainParagraph(paragraph)
      const question = /^(?:\d+[.、．]\s*)?(?:网友|读者|问|雪球用户|投资者|用户|大道粉丝)[^：:]{0,30}[：:]/u.test(plain)
      const answer = /(?:段永平|大道|答)\s*[：:]/u.test(plain)
      if (question) {
        awaitingAnswer = !answer
        return paragraph
      }
      if (awaitingAnswer && !answer) {
        awaitingAnswer = false
        return `**段永平：** ${paragraph}`
      }
      if (answer) awaitingAnswer = false
      return paragraph
    })
    .join('\n\n')
}

export function isNoInformation(block) {
  const normalized = answerFingerprint(block.markdown) || normalizeForDuplicate(block.markdown)
  const withoutSpeakers = normalized
    .replace(/网友[:：]?/g, '')
    .replace(/段永平[:：]?/g, '')
    .replace(/大道[:：]?/g, '')
  if (Array.from(withoutSpeakers).length < 3) return true
  if (/^(?:谢谢|多谢|感谢|不客气|呵呵|哈哈|不知道|没看过|没研究过|不了解|看不懂|不懂)[。.!！?？]*$/.test(withoutSpeakers)) return true
  if (Array.from(withoutSpeakers).length <= 18 && /谢谢.*不客气|感谢.*不用谢|请收下.*谢谢/.test(withoutSpeakers)) return true
  return false
}

function plainHeading(value) {
  return value
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitLongParagraph(paragraph, limit) {
  if (Array.from(paragraph.replace(/\s+/g, '')).length <= limit) return [paragraph]
  if (/^(?:#{1,6}\s|[-+*]\s|\d+[.、．]\s|>|\|)/.test(paragraph.trim())) return [paragraph]

  const sentences = paragraph.split(/(?<=[。！？；])|(?<=[.!?;])(?=\s)/u).filter(Boolean)
  if (sentences.length <= 1) return [paragraph]
  const parts = []
  let current = ''
  for (const sentence of sentences) {
    const candidate = current + sentence
    if (current && Array.from(candidate.replace(/\s+/g, '')).length > limit) {
      parts.push(current.trim())
      current = sentence
    } else {
      current = candidate
    }
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

export function shortenParagraphs(markdown, limit = 180) {
  return markdown
    .split(/\n\s*\n+/)
    .flatMap((paragraph) => splitLongParagraph(paragraph.trim(), limit))
    .filter(Boolean)
    .join('\n\n')
    .replace(/[ \t]+$/gm, '')
}

function fragmentBlock(block, limit) {
  const section = plainHeading(block.headingPath?.at(-1) || '相关问答') || '相关问答'
  const cleaned = standardizeQaMarkers(rewriteLegacyLinks(block.markdown))
  const markdown = `## ${section}\n\n${shortenParagraphs(cleaned)}`
  if (visibleTextLength(markdown) <= limit) return [{ markdown, blockIds: [block.id] }]
  return splitMarkdownByLength(markdown, limit).map((part) => ({ markdown: part, blockIds: [block.id] }))
}

function collapseRepeatedHeadings(markdown) {
  let lastHeading = null
  return markdown
    .split('\n')
    .filter((line) => {
      const heading = line.match(/^##\s+(.+)$/)
      if (!heading) return true
      if (heading[1] === lastHeading) return false
      lastHeading = heading[1]
      return true
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
}

export function buildTopicArticles(topic, blocks, { limit = 5600 } = {}) {
  const fragments = blocks.flatMap((block) => fragmentBlock(block, limit))
  const parts = []
  let current = null
  for (const fragment of fragments) {
    const candidate = collapseRepeatedHeadings(current
      ? `${current.body}\n\n${fragment.markdown}`
      : fragment.markdown)
    if (current && visibleTextLength(candidate) > limit) {
      parts.push(current)
      current = { body: fragment.markdown, blockIds: [...fragment.blockIds] }
    } else if (current) {
      current.body = candidate
      current.blockIds.push(...fragment.blockIds)
    } else {
      current = { body: fragment.markdown, blockIds: [...fragment.blockIds] }
    }
  }
  if (current) parts.push(current)

  return parts.map((part, index) => {
    const split = parts.length > 1
    return {
      ...topic,
      slug: split ? `${topic.slug}-part-${index + 1}` : topic.slug,
      title: split ? `${topic.title}（${index + 1}/${parts.length}）` : topic.title,
      body: collapseRepeatedHeadings(part.body).trim(),
      blockIds: [...new Set(part.blockIds)],
      baseSlug: topic.slug,
      part: index + 1,
      partCount: parts.length,
    }
  })
}

export function renderArticleFile(article) {
  const description = `汇集段永平关于“${article.title.replace(/（\d+\/\d+）$/, '')}”的公开问答，按主题重排并删除重复内容。`
  const lines = [
    '---',
    `title: ${JSON.stringify(article.title)}`,
    `slug: ${JSON.stringify(article.slug)}`,
    `description: ${JSON.stringify(description)}`,
    'category: "投资问答录"',
    `order: ${article.order}`,
    `seoTitle: ${JSON.stringify(`${article.title}｜段永平投资问答录`)}`,
    `seoDescription: ${JSON.stringify(description)}`,
    'type: "qanda-topic"',
    `tags: ${JSON.stringify(article.tags)}`,
    '---',
    '',
    article.body.trim(),
    '',
  ]
  return lines.join('\n')
}
