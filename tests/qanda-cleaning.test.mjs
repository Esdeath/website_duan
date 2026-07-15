import test from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizeForDuplicate,
  parseFrontmatter,
  deduplicateBlocks,
  answerFingerprint,
  findNearDuplicatePairs,
  reviewNearDuplicatePair,
  reviewNearDuplicateBlocks,
  splitQuestionAnswerBlocks,
  splitMarkdownByLength,
  visibleTextLength,
} from '../scripts/qanda-cleaning-lib.mjs'
import {
  MERGED_COMPANY_REDIRECTS,
  TOPICS,
  VOLUMES,
  classifyBlock,
  sectionForBlock,
} from '../scripts/qanda-cleaning-config.mjs'
import {
  buildTopicChapter,
  extractBlockDate,
  isNoInformation,
  renderArticleFile,
  rewriteLegacyLinks,
  shortenParagraphs,
  standardizeQaMarkers,
  stripObsoleteQuestionOrdinals,
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

test('markdown hard breaks between unmarked Q&A pairs create separate source blocks', () => {
  const blocks = splitQuestionAnswerBlocks([
    '## 估值',
    '',
    '网友：第一个问题？',
    '',
    '第一个回答。（2025-09-25）  ',
    '网友：第二个问题？',
    '',
    '第二个回答。（2025-09-26）',
  ].join('\n'), { sourceSlug: 'source' })

  assert.equal(blocks.length, 2)
  assert.match(blocks[0].markdown, /第一个回答/)
  assert.doesNotMatch(blocks[0].markdown, /第二个问题/)
  assert.match(blocks[1].markdown, /第二个回答/)
})

test('standalone bold case labels separate adjacent source units', () => {
  const blocks = splitQuestionAnswerBlocks([
    '## 消费者导向',
    '',
    '**段永平：** 第一段独立观点。',
    '',
    '**案例1：iPhone 4s**',
    '',
    '**段永平：** 第二段案例内容。',
  ].join('\n'), { sourceSlug: 'source' })

  assert.equal(blocks.length, 2)
  assert.deepEqual(blocks[1].headingPath, ['消费者导向', '案例1：iPhone 4s'])
  assert.doesNotMatch(blocks[1].markdown, /第一段独立观点/)
})

test('standalone bold numbered labels split sections but bold numbered questions do not', () => {
  const blocks = splitQuestionAnswerBlocks([
    '## 苹果',
    '',
    '**段永平：** 第一段观点。',
    '',
    '**05．关于苹果的几点猜想：（2013.03.04）**',
    '',
    '**段永平：** 第二段观点。',
    '',
    '**06．网友：苹果会回购吗？**',
    '',
    '**段永平：** 会在价格合适时回购。',
  ].join('\n'), { sourceSlug: 'source' })

  assert.equal(blocks.length, 3)
  assert.deepEqual(blocks[1].headingPath, ['苹果', '关于苹果的几点猜想：（2013.03.04）'])
  assert.match(blocks[2].markdown, /06．网友/)
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

test('topic catalogue defines four continuous volumes and 45 chapters', () => {
  assert.equal(TOPICS.length, 45)
  assert.equal(new Set(TOPICS.map((topic) => topic.slug)).size, 45)
  assert.deepEqual(VOLUMES.map((volume) => volume.name), [
    '投资原则与方法',
    '商业模式与经营',
    '公司案例',
    '人生与成长',
  ])
  assert.deepEqual(
    VOLUMES.map((volume) => TOPICS.filter((topic) => topic.volume === volume.name).length),
    [12, 12, 15, 6],
  )
  for (const volume of VOLUMES) {
    const topics = TOPICS.filter((topic) => topic.volumeOrder === volume.order)
    assert.deepEqual(topics.map((topic) => topic.chapterOrder), topics.map((_, index) => index + 1))
  }
  assert.ok(TOPICS.every((topic) => topic.tags.length >= 3 && topic.tags.length <= 6))
})

test('merged company catalogue replaces 19 short articles with five industry chapters', () => {
  const activeSlugs = new Set(TOPICS.map((topic) => topic.slug))
  const mergedSlugs = [
    'wenda-company-consumer-electronics',
    'wenda-company-china-games',
    'wenda-company-tech-platforms',
    'wenda-company-retail-services',
    'wenda-company-energy-industrial',
  ]

  assert.equal(MERGED_COMPANY_REDIRECTS.size, 19)
  assert.ok(mergedSlugs.every((slug) => activeSlugs.has(slug)))
  for (const [oldSlug, newSlug] of MERGED_COMPANY_REDIRECTS) {
    assert.equal(activeSlugs.has(oldSlug), false)
    assert.equal(activeSlugs.has(newSlug), true)
  }
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
  }), 'wenda-company-energy-industrial')

  assert.equal(classifyBlock({
    sourceSlug: 'dadaotouziwendalu-disanzhanggongsidianping',
    headingPath: ['第三章 公司点评', '贵州茅台', '便宜或贵取决于对10年后状况的认识'],
    markdown: '**段永平：** 便宜还是贵要看十年后的利润和现金流。',
  }), 'wenda-company-maotai-03')

  assert.equal(classifyBlock({
    sourceSlug: 'dadaotouziwendalu-disanzhanggongsidianping',
    headingPath: ['第三章 公司点评', '其他', '松下、索尼、任天堂'],
    markdown: '网友：怎么看索尼？\n\n**段永平：** 索尼的问题还是索尼自己的产品。',
  }), 'wenda-company-consumer-electronics')
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

test('answer fingerprint recognizes a bold speaker name followed by an unbolded colon', () => {
  const sourceStyle = '网友：问题？\n\n**段永平** ：买股票就是买公司。（2010-05-23）'
  const canonicalStyle = '网友：另一个问法？\n\n**段永平：** 买股票就是买公司。（2010-05-23）'

  assert.equal(answerFingerprint(sourceStyle), answerFingerprint(canonicalStyle))
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

test('near duplicate review lets a dated full version replace an undated short version', () => {
  const dated = { markdown: '网友：投资最重要的一句话是什么？\n\n**段永平：** 买股票就是买公司。（2010-05-23）' }
  const undated = { markdown: '网友：最重要的投资原则？\n\n**段永平：** 买股票就是买公司。' }

  assert.equal(reviewNearDuplicatePair(dated, undated, 1).resolution, 'duplicate-reviewed')
})

test('reviewed near duplicates are removed globally across source topics', () => {
  const shared = '投资时应该把上市公司看成非上市公司，关注公司未来能够产生的现金流，理解商业模式、企业文化、竞争优势和长期风险，这也是价值投资者必须长期坚持的核心原则。'
  const blocks = [
    {
      id: 'company-copy',
      sourceSlug: 'company-source',
      headingPath: ['苹果'],
      markdown: `网友：苹果说明了什么？\n\n**段永平：** 买股票就是买公司。${shared}这个原则一直没有变。（2011-01-07）`,
      hasQuestion: true,
      hasAnswer: true,
    },
    {
      id: 'principle-master',
      sourceSlug: 'investment-source',
      headingPath: ['投资原则', '买股票就是买公司'],
      markdown: `网友：投资原则是什么？\n\n**段永平：** 买股票就是买公司；${shared}这个原则一直没有变。（2011-01-07）`,
      hasQuestion: true,
      hasAnswer: true,
    },
  ]
  const result = reviewNearDuplicateBlocks(blocks, { threshold: 0.94, minimumLength: 20 })

  assert.equal(result.kept.length, 1)
  assert.equal(result.candidates.length, 1)
  assert.equal(result.candidates[0].resolution, 'duplicate-reviewed')
  assert.equal(result.duplicateOf.size, 1)
})

test('only greetings and empty acknowledgements count as no-information', () => {
  assert.equal(isNoInformation({ markdown: '网友：谢谢。\n\n**段永平：** 不客气。' }), true)
  assert.equal(isNoInformation({ markdown: '**段永平：** 不知道。' }), true)
  assert.equal(isNoInformation({ markdown: '**网友：怎么看这家公司？** **段永平：** 没研究过。' }), true)
  assert.equal(isNoInformation({ markdown: '**段永平：** 不做空。' }), false)
})

test('dated reactions are no-information while short factual answers are retained', () => {
  assert.equal(isNoInformation({ markdown: '网友：看到了。\n\n**大道：** [点赞]（2026-01-23）' }), true)
  assert.equal(isNoInformation({ markdown: '网友：这个结论怎么样？\n\n**段永平：** 有点意思。（2025-06-12）' }), true)
  assert.equal(isNoInformation({ markdown: '网友：茅台提价的本质是什么？\n\n**段永平：** 需求。（2019-08-21）' }), false)
  assert.equal(isNoInformation({ markdown: '网友：您坐的特斯拉是哪款？\n\n**大道：** Model Y。（2026-02-05）' }), false)
})

test('topic builder emits one unlimited chapter with continuous numbered sections', () => {
  const topic = {
    slug: 'wenda-test',
    title: '测试主题',
    order: 200,
    volume: '投资原则与方法',
    volumeOrder: 1,
    chapterOrder: 1,
    tags: ['投资原则', '测试', '问答'],
  }
  const blocks = [
    { id: 'a', headingPath: ['原则'], markdown: `网友：问题一？\n\n**段永平：** ${'甲'.repeat(80)}。` },
    { id: 'b', headingPath: ['原则'], markdown: `网友：问题二？\n\n**段永平：** ${'乙'.repeat(80)}。` },
    { id: 'c', headingPath: ['案例'], markdown: `网友：问题三？\n\n**段永平：** ${'丙'.repeat(80)}。` },
  ]
  const article = buildTopicChapter(topic, blocks)

  assert.equal(article.slug, 'wenda-test')
  assert.deepEqual(article.blockIds, ['a', 'b', 'c'])
  assert.equal((article.body.match(/^## /gm) || []).length, 2)
  assert.match(article.body, /^## 第一节 原则$/m)
  assert.match(article.body, /^## 第二节 案例$/m)
  assert.ok(visibleTextLength(article.body) > 200)
})

test('curated sections replace inherited source-book headings for major chapters', () => {
  assert.deepEqual(sectionForBlock('wenda-business-08', {
    headingPath: ['第二章', '30个商业案例点评'],
    markdown: '网友：什么是企业文化？\n\n**段永平：** 企业文化就是做对的事情。',
  }), { title: '企业文化的定义', order: 1 })

  assert.deepEqual(sectionForBlock('wenda-company-apple-02', {
    headingPath: ['案例3：苹果'],
    markdown: '网友：怎么看库克这位CEO？\n\n**段永平：** 库克是一个好CEO。',
  }), { title: '库克与管理层', order: 2 })

  assert.deepEqual(sectionForBlock('wenda-invest-07', {
    headingPath: ['估值逻辑'],
    markdown: '**段永平：** 定性比定量分析重要，不能只依赖计算器。',
  }), { title: '估值逻辑与定性判断', order: 1 })
})

test('merged company blocks receive an industry section and company subsection', () => {
  assert.deepEqual(sectionForBlock('wenda-company-tech-platforms', {
    headingPath: ['公司点评', '腾讯'],
    markdown: '网友：怎么看腾讯？\n\n**段永平：** 微信是很好的产品。',
  }), {
    title: '互联网平台',
    order: 1,
    subsectionTitle: '腾讯',
    subsectionOrder: 1,
  })

  assert.deepEqual(sectionForBlock('wenda-company-consumer-electronics', {
    headingPath: ['其他公司', '松下、索尼、任天堂'],
    markdown: '网友：怎么看索尼？\n\n**段永平：** 索尼的问题还是产品。',
  }), {
    title: '日本消费电子与游戏',
    order: 2,
    subsectionTitle: '索尼',
    subsectionOrder: 2,
  })
})

test('merged company chapters render ordered level-three company headings', () => {
  const topic = TOPICS.find((item) => item.slug === 'wenda-company-tech-platforms')
  const article = buildTopicChapter(topic, [
    { id: 'pdd', headingPath: ['拼多多'], markdown: '网友：怎么看拼多多？\n\n**段永平：** 黄峥很关注消费者。（2020-01-01）' },
    { id: 'tencent-later', headingPath: ['腾讯'], markdown: '网友：怎么看腾讯？\n\n**段永平：** 微信是好产品。（2021-01-01）' },
    { id: 'tencent-earlier', headingPath: ['腾讯'], markdown: '网友：腾讯如何？\n\n**段永平：** 商业模式不错。（2019-01-01）' },
    { id: 'nvidia', headingPath: ['英伟达'], markdown: '网友：怎么看英伟达？\n\n**段永平：** 我不懂。（2024-01-01）' },
  ])

  assert.match(article.body, /^## 第一节 互联网平台$/m)
  assert.match(article.body, /^### 腾讯$/m)
  assert.match(article.body, /^### 拼多多$/m)
  assert.match(article.body, /^## 第二节 科技与新产业$/m)
  assert.match(article.body, /^### 英伟达$/m)
  assert.ok(article.body.indexOf('商业模式不错') < article.body.indexOf('微信是好产品'))
  assert.ok(article.body.indexOf('### 腾讯') < article.body.indexOf('### 拼多多'))
})

test('curated chapters use a specific final section instead of generic related questions', () => {
  const fallback = sectionForBlock('wenda-invest-01', {
    headingPath: ['其他问答'],
    markdown: '网友：还有一个没有命中关键词的问题？\n\n**段永平：** 慢慢想。',
  })

  assert.deepEqual(fallback, { title: '价值、价格与原则边界', order: 3 })
  const article = buildTopicChapter(TOPICS.find((item) => item.slug === 'wenda-invest-01'), [{
    id: 'fallback',
    headingPath: ['相关问答'],
    markdown: '网友：还有一个问题？\n\n**段永平：** 慢慢想。',
  }])
  assert.doesNotMatch(article.body, /相关问答|补充问答/)
})

test('closely related sparse sections share one stronger editorial section', () => {
  const cases = [
    ['wenda-company-apple-03', '估值', '长期风险', '看懂苹果、估值与长期风险'],
    ['wenda-company-bbk', '品牌与渠道', 'OPPO与vivo', '产品、品牌、渠道与公司案例'],
    ['wenda-life-03', '职业选择', '创业', '职业选择与创业'],
    ['wenda-invest-04', '风险第一', '风险纪律', '风险考量与纪律'],
    ['wenda-invest-07', '定性分析', '估值逻辑', '估值逻辑与定性判断'],
    ['wenda-invest-08', '买入', '卖出和成本', '买入、卖出与成本'],
    ['wenda-invest-10', '回购', '负债回购', '回购与负债边界'],
    ['wenda-invest-12', '平常心', '投资经验和心态', '平常心、理性与投资经验'],
    ['wenda-business-02', '商业模式', '好生意和坏生意', '商业模式与好坏生意'],
    ['wenda-business-07', '渠道', '出海', '渠道、零售与出海'],
    ['wenda-business-12', '多元化', '聚焦与能力圈', '多元化、聚焦与能力圈'],
  ]

  for (const [slug, left, right, title] of cases) {
    assert.equal(sectionForBlock(slug, { headingPath: [], markdown: left }).title, title)
    assert.equal(sectionForBlock(slug, { headingPath: [], markdown: right }).title, title)
  }
})

test('topic builder orders curated sections and dated Q&A chronologically', () => {
  const topic = TOPICS.find((item) => item.slug === 'wenda-invest-04')
  const blocks = [
    { id: 'later', headingPath: ['补充投资问答'], markdown: '网友：可以借钱投资吗？\n\n**段永平：** 不可以。（2020-01-01）' },
    { id: 'earlier', headingPath: ['其他观点与建议'], markdown: '网友：可以用margin吗？\n\n**段永平：** 不用margin。（2010-01-01）' },
    { id: 'short', headingPath: ['案例'], markdown: '网友：可以做空吗？\n\n**段永平：** 不做空。（2015-01-01）' },
  ]
  const article = buildTopicChapter(topic, blocks)

  assert.equal(extractBlockDate(blocks[0]), '2020-01-01')
  assert.doesNotMatch(article.body, /补充投资问答|其他观点与建议|## .*案例$/m)
  assert.ok(article.body.indexOf('2010-01-01') < article.body.indexOf('2020-01-01'))
  assert.ok(article.body.indexOf('不做空') < article.body.indexOf('不用margin'))
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
  assert.equal(rewriteLegacyLinks(source), '[企业文化](/wenda-business-08)')
})

test('question blocks receive a missing answer speaker marker without changing the answer', () => {
  const compact = '**网友: 投资是什么？**\n\n买股票就是买公司。'
  assert.equal(
    standardizeQaMarkers(compact),
    '**网友: 投资是什么？**\n\n**段永平：** 买股票就是买公司。',
  )

  const marked = '网友：投资是什么？\n\n**段永平：** 买股票就是买公司。'
  assert.equal(standardizeQaMarkers(marked), marked)

  const multiParagraphQuestion = [
    '网友：苹果的投资者结构发生变化，谁会成为买家？',
    '以前苹果的主要投资者是对冲基金，现在已经转为价值股。',
    '如果巴菲特也不投资苹果，谁来接货？',
    '**段永平：** 真正影响股价的买家最终是公司自己。',
  ].join('\n\n')
  assert.equal(standardizeQaMarkers(multiParagraphQuestion), multiParagraphQuestion)
})

test('obsolete source ordinals are removed only before question speakers', () => {
  const source = [
    '04．网友：什么样的人是价值投资者？',
    '',
    '**12、网友J：** 苹果怎么看？',
    '',
    '三、问：现在还能买吗？',
    '',
    '**段永平：** 1．先看懂公司。',
    '',
    '1、这是回答中的有效列表。',
    '',
    '2012年发生了一件事。',
  ].join('\n')

  assert.equal(stripObsoleteQuestionOrdinals(source), [
    '网友：什么样的人是价值投资者？',
    '',
    '**网友J：** 苹果怎么看？',
    '',
    '问：现在还能买吗？',
    '',
    '**段永平：** 1．先看懂公司。',
    '',
    '1、这是回答中的有效列表。',
    '',
    '2012年发生了一件事。',
  ].join('\n'))

  const article = buildTopicChapter(TOPICS.find((item) => item.slug === 'wenda-invest-01'), [{
    id: 'numbered-question',
    headingPath: ['价值投资'],
    markdown: '04．网友：什么样的人是价值投资者？\n\n**段永平：** 买股票就是买公司。',
  }])
  assert.match(article.body, /^网友：什么样的人是价值投资者？$/m)
  assert.doesNotMatch(article.body, /^04．网友/m)
})

test('rendered article has complete Nuxt Content metadata and visible tags', () => {
  const output = renderArticleFile({
    slug: 'wenda-test',
    title: '测试主题',
    order: 200,
    volume: '投资原则与方法',
    volumeOrder: 1,
    chapterOrder: 1,
    tags: ['投资原则', '测试', '问答'],
    body: '## 第一节 原则\n\n**段永平：** 回答。',
  })

  assert.match(output, /category: "投资问答录"/)
  assert.match(output, /type: "qanda-chapter"/)
  assert.match(output, /volume: "投资原则与方法"/)
  assert.match(output, /volumeOrder: 1/)
  assert.match(output, /chapterOrder: 1/)
  assert.match(output, /tags: \["投资原则","测试","问答"\]/)
  assert.match(output, /seoTitle:/)
  assert.match(output, /## 第一节 原则/)
})
