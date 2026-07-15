import test from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizeForDuplicate,
  parseFrontmatter,
  deduplicateBlocks,
  answerFingerprint,
  findNearDuplicatePairs,
  reviewNearDuplicatePair,
  splitQuestionAnswerBlocks,
  splitMarkdownByLength,
  visibleTextLength,
} from '../scripts/qanda-cleaning-lib.mjs'
import { TOPICS, classifyBlock } from '../scripts/qanda-cleaning-config.mjs'
import {
  buildTopicArticles,
  isNoInformation,
  renderArticleFile,
  rewriteLegacyLinks,
  shortenParagraphs,
  standardizeQaMarkers,
} from '../scripts/qanda-cleaning-generate-lib.mjs'

test('parseFrontmatter preserves article body and parses arrays', () => {
  const parsed = parseFrontmatter(`---\ntitle: "测试"\norder: 200\ntags: ["投资原则", "价值投资"]\n---\n\n网友：问题。\n\n**段永平：** 回答。\n`)

  assert.equal(parsed.data.title, '测试')
  assert.equal(parsed.data.order, 200)
  assert.deepEqual(parsed.data.tags, ['投资原则', '价值投资'])
  assert.match(parsed.body, /网友：问题/)
})

test('normalization ignores markdown, links, whitespace, width and latin case', () => {
  const left = '**段永平：** [买股票就是买公司](/jiazhitouzi) APPLE。'
  const right = '段永平: 买股票就是买公司 apple。'

  assert.equal(normalizeForDuplicate(left), normalizeForDuplicate(right))
})

test('question and answer stay in one source block with heading context', () => {
  const body = `## 投资是什么\n\n网友：投资是什么？\n\n**段永平：** 买股票就是买公司。（2010-05-23）\n\n网友：谢谢。\n\n**段永平：** 不客气。\n`
  const blocks = splitQuestionAnswerBlocks(body, { sourceSlug: 'source' })

  assert.equal(blocks.length, 2)
  assert.equal(blocks[0].headingPath.at(-1), '投资是什么')
  assert.match(blocks[0].markdown, /网友：投资是什么/)
  assert.match(blocks[0].markdown, /买股票就是买公司/)
  assert.equal(blocks[0].id, 'source#投资是什么#001')
})

test('visible length excludes frontmatter, markdown syntax and link destinations', () => {
  const markdown = `---\ntitle: "测试"\n---\n\n## 标题\n\n**段永平：** [价值投资](/jiazhitouzi)。`
  assert.equal(visibleTextLength(markdown), '标题段永平：价值投资。'.length)
})

test('long markdown splits only at heading boundaries and stays within limit', () => {
  const markdown = `# 主题\n\n## 一\n\n${'甲'.repeat(40)}\n\n## 二\n\n${'乙'.repeat(40)}\n\n## 三\n\n${'丙'.repeat(40)}\n`
  const parts = splitMarkdownByLength(markdown, 60)

  assert.equal(parts.length, 3)
  assert.ok(parts.every((part) => visibleTextLength(part) <= 60))
  assert.match(parts[0], /## 一/)
  assert.match(parts[1], /## 二/)
  assert.match(parts[2], /## 三/)
})

test('topic catalogue has exactly 59 unique active article slugs', () => {
  assert.equal(TOPICS.length, 59)
  assert.equal(new Set(TOPICS.map((topic) => topic.slug)).size, 59)
  assert.deepEqual(
    [...new Set(TOPICS.map((topic) => topic.group))],
    ['投资原则', '商业经营', '公司案例', '人生与成长'],
  )
  assert.ok(TOPICS.every((topic) => topic.tags.length >= 3 && topic.tags.length <= 6))
})

test('source heading context routes representative blocks to their canonical topic', () => {
  assert.equal(classifyBlock({
    sourceSlug: 'duanyongping-touziluoji-di5zhang-guzhiluoji',
    headingPath: ['第五章 估值逻辑', '第1节 现金流（折现）角度思考'],
    markdown: '**段永平：** 估值就是未来现金流的折现。',
  }), 'wenda-invest-07')

  assert.equal(classifyBlock({
    sourceSlug: 'duanyongping-shangyeluoji-di4jie-chanpin-chayihua-yu-chuangxin',
    headingPath: ['第4节 产品、差异化与创新', '三、创新'],
    markdown: '**段永平：** 创新必须满足用户需要。',
  }), 'wenda-business-05')

  assert.equal(classifyBlock({
    sourceSlug: 'dadaotouziwendalu-disanzhanggongsidianping',
    headingPath: ['第三章 公司点评', '苹果公司', '库克是乔布斯最伟大的发明之一'],
    markdown: '**段永平：** 库克是乔布斯最伟大的发明之一。',
  }), 'wenda-company-apple-02')

  assert.equal(classifyBlock({
    sourceSlug: 'dadaotouziwendalu-disizhangrenshengzhenyan',
    headingPath: ['第四章 人生箴言', '陪好家人过好小日子', '家庭总是最重要的'],
    markdown: '**段永平：** 家庭总是最重要的。',
  }), 'wenda-life-04')

  assert.equal(classifyBlock({
    sourceSlug: 'dadaotouziwendalu-disanzhanggongsidianping',
    headingPath: ['第三章 公司点评', '其他', '通用电气'],
    markdown: '网友在问题中比较了雅虎与通用电气。\n\n**段永平：** GE的问题在企业文化。',
  }), 'wenda-company-ge')

  assert.equal(classifyBlock({
    sourceSlug: 'dadaotouziwendalu-disanzhanggongsidianping',
    headingPath: ['第三章 公司点评', '贵州茅台', '便宜或贵取决于对10年后状况的认识'],
    markdown: '**段永平：** 便宜还是贵要看十年后的利润和现金流。',
  }), 'wenda-company-maotai-03')

  assert.equal(classifyBlock({
    sourceSlug: 'dadaotouziwendalu-disanzhanggongsidianping',
    headingPath: ['第三章 公司点评', '其他', '松下、索尼、任天堂'],
    markdown: '网友：怎么看索尼？\n\n**段永平：** 索尼的问题还是索尼自己的产品。',
  }), 'wenda-company-sony')
})

test('exact duplicate blocks keep the version with fuller source context', () => {
  const blocks = [
    { id: 'short', sourceSlug: 'a', headingPath: ['苹果'], markdown: '**段永平：** ' + '苹果是好公司。'.repeat(8), hasQuestion: false, hasAnswer: true },
    { id: 'full', sourceSlug: 'b', headingPath: ['公司点评', '苹果', '商业模式'], markdown: '**段永平：** ' + '苹果是好公司。'.repeat(8), hasQuestion: true, hasAnswer: true },
  ]
  const result = deduplicateBlocks(blocks)

  assert.deepEqual(result.kept.map((item) => item.id), ['full'])
  assert.equal(result.audit.find((item) => item.id === 'short').status, 'duplicate')
  assert.equal(result.audit.find((item) => item.id === 'short').duplicateOf, 'full')
})

test('answer fingerprint matches the same answer under different questions and speaker markup', () => {
  const left = `**网友：问题一？**\n\n买股票就是买公司。（2010-05-23）`
  const right = `网友：另一个问法？\n\n**段永平：** 买股票就是买公司。（2010-05-23）`

  assert.equal(answerFingerprint(left), answerFingerprint(right))
})

test('answer fingerprint removes a question that shares a paragraph with its answer', () => {
  const compact = '**网友：问题一？** **段永平：** 买股票就是买公司。（2010-05-23）'
  const expanded = '网友：另一个问法？\n\n**段永平：** 买股票就是买公司。（2010-05-23）'

  assert.equal(answerFingerprint(compact), answerFingerprint(expanded))
})

test('near duplicate scan finds wording variants but ignores unrelated answers', () => {
  const base = '段永平：买股票就是买公司，投资时要把上市公司看成非上市公司来理解。'
  const blocks = [
    { id: 'a', markdown: base },
    { id: 'b', markdown: `${base} 这是最重要的一句话。` },
    { id: 'c', markdown: '段永平：家庭永远是最重要的。' },
  ]
  const pairs = findNearDuplicatePairs(blocks, { threshold: 0.72 })

  assert.deepEqual(pairs.map((pair) => [pair.leftId, pair.rightId]), [['a', 'b']])
})

test('near duplicate review removes only minor variants with identical data', () => {
  const left = { markdown: '**段永平：** 买股票就是买公司，这个原则一直没变。（2011-01-07）' }
  const minorVariant = { markdown: '**段永平：** “买股票就是买公司”，这个原则一直没有变。（2011-01-07）' }
  const changedDate = { markdown: '**段永平：** 买股票就是买公司，这个原则一直没变。（2012-01-07）' }
  const addedViewpoint = { markdown: `**段永平：** 买股票就是买公司，这个原则一直没变。（2011-01-07）${'此外还要理解生意模式。'.repeat(8)}` }

  assert.equal(reviewNearDuplicatePair(left, minorVariant, 0.97).resolution, 'duplicate-reviewed')
  assert.equal(reviewNearDuplicatePair(left, changedDate, 0.97).resolution, 'kept-distinct-data')
  assert.equal(reviewNearDuplicatePair(left, addedViewpoint, 0.97).resolution, 'kept-distinct-additional-content')
})

test('only greetings and empty acknowledgements count as no-information', () => {
  assert.equal(isNoInformation({ markdown: '网友：谢谢。\n\n**段永平：** 不客气。' }), true)
  assert.equal(isNoInformation({ markdown: '**段永平：** 不知道。' }), true)
  assert.equal(isNoInformation({ markdown: '**网友：怎么看这家公司？** **段永平：** 没研究过。' }), true)
  assert.equal(isNoInformation({ markdown: '**段永平：** 不做空。' }), false)
})

test('topic builder splits at complete source blocks and assigns part slugs', () => {
  const topic = { slug: 'wenda-test', title: '测试主题', order: 200, tags: ['投资原则', '测试', '问答'] }
  const blocks = [
    { id: 'a', headingPath: ['原则'], markdown: `网友：问题一？\n\n**段永平：** ${'甲'.repeat(45)}。` },
    { id: 'b', headingPath: ['案例'], markdown: `网友：问题二？\n\n**段永平：** ${'乙'.repeat(45)}。` },
  ]
  const articles = buildTopicArticles(topic, blocks, { limit: 80 })

  assert.equal(articles.length, 2)
  assert.deepEqual(articles.map((item) => item.slug), ['wenda-test-part-1', 'wenda-test-part-2'])
  assert.deepEqual(articles.map((item) => item.blockIds), [['a'], ['b']])
  assert.ok(articles.every((item) => visibleTextLength(item.body) <= 80))
})

test('topic builder does not repeat the same section heading for adjacent blocks', () => {
  const topic = { slug: 'wenda-test', title: '测试主题', order: 200, tags: ['投资原则', '测试', '问答'] }
  const blocks = [
    { id: 'a', headingPath: ['原则'], markdown: '网友：问题一？\n\n**段永平：** 回答一。' },
    { id: 'b', headingPath: ['原则'], markdown: '网友：问题二？\n\n**段永平：** 回答二。' },
  ]
  const [article] = buildTopicArticles(topic, blocks, { limit: 200 })

  assert.equal((article.body.match(/^## 原则$/gm) || []).length, 1)
})

test('long English prose splits at original sentence boundaries', () => {
  const prose = `${'This is an original sentence with useful context. '.repeat(5)}This is the final sentence.`
  const shortened = shortenParagraphs(prose, 90)

  assert.ok(shortened.split(/\n\n/).length > 1)
  assert.equal(shortened.replace(/\n\n/g, ' '), prose.trim())
})

test('paragraph cleanup removes trailing whitespace from source hard breaks', () => {
  assert.equal(shortenParagraphs('第一句。  \n第二句。  '), '第一句。\n第二句。')
})

test('generated answers rewrite an unambiguous legacy link to its topic master', () => {
  const source = '[企业文化](/duanyongping-shangyeluoji-di3jie-qiyewenhua)'
  assert.equal(rewriteLegacyLinks(source), '[企业文化](/wenda-business-08-part-1)')
})

test('question blocks receive a missing answer speaker marker without changing the answer', () => {
  const compact = '**网友: 投资是什么？**\n\n买股票就是买公司。'
  assert.equal(
    standardizeQaMarkers(compact),
    '**网友: 投资是什么？**\n\n**段永平：** 买股票就是买公司。',
  )

  const marked = '网友：投资是什么？\n\n**段永平：** 买股票就是买公司。'
  assert.equal(standardizeQaMarkers(marked), marked)
})

test('rendered article has complete Nuxt Content metadata and visible tags', () => {
  const output = renderArticleFile({
    slug: 'wenda-test',
    title: '测试主题',
    order: 200,
    tags: ['投资原则', '测试', '问答'],
    body: '## 原则\n\n**段永平：** 回答。',
  })

  assert.match(output, /category: "投资问答录"/)
  assert.match(output, /tags: \["投资原则","测试","问答"\]/)
  assert.match(output, /seoTitle:/)
  assert.match(output, /## 原则/)
})
