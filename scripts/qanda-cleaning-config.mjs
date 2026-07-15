export const VOLUMES = [
  { name: '投资原则与方法', order: 1, group: '投资原则' },
  { name: '商业模式与经营', order: 2, group: '商业经营' },
  { name: '公司案例', order: 3, group: '公司案例' },
  { name: '人生与成长', order: 4, group: '人生与成长' },
]

const chapterCounters = new Map()
const topic = (group, directory, order, slug, title, tags) => {
  const volume = VOLUMES.find((item) => item.group === group)
  const chapterOrder = (chapterCounters.get(group) || 0) + 1
  chapterCounters.set(group, chapterOrder)
  return {
    group,
    volume: volume.name,
    volumeOrder: volume.order,
    chapterOrder,
    directory,
    order,
    slug,
    title,
    tags: [group, ...tags],
  }
}

export const TOPICS = [
  topic('投资原则', 'investment-logic', 200, 'wenda-invest-01', '买股票就是买公司与价值投资', ['买股票就是买公司', '价值投资']),
  topic('投资原则', 'investment-logic', 201, 'wenda-invest-02', '投资为什么简单但不容易', ['投资理解', '投资者']),
  topic('投资原则', 'investment-logic', 202, 'wenda-invest-03', '看懂生意与能力圈', ['能力圈', '看懂生意']),
  topic('投资原则', 'investment-logic', 203, 'wenda-invest-04', '风险第一：不做空、不借钱、不懂不碰', ['风险控制', '不做空', '不加杠杆']),
  topic('投资原则', 'investment-logic', 204, 'wenda-invest-05', '市场波动、宏观与牛熊', ['宏观经济', '市场波动', '牛熊市']),
  topic('投资原则', 'investment-logic', 205, 'wenda-invest-06', '长期持有、集中投资与机会成本', ['长期持有', '集中投资', '机会成本']),
  topic('投资原则', 'investment-logic', 206, 'wenda-invest-07', '现金流折现、PE与定性判断', ['现金流折现', '估值', '市盈率']),
  topic('投资原则', 'investment-logic', 207, 'wenda-invest-08', '买卖时机与“持有就是买入”', ['买卖时机', '持有', '估值']),
  topic('投资原则', 'investment-logic', 208, 'wenda-invest-09', '财报、现金流、ROE与净资产', ['财务报表', '现金流', 'ROE']),
  topic('投资原则', 'investment-logic', 209, 'wenda-invest-10', '分红、回购与资本配置', ['分红', '回购', '资本配置']),
  topic('投资原则', 'investment-logic', 210, 'wenda-invest-11', '投机、套利、量化与衍生品', ['投机', '套利', '量化交易']),
  topic('投资原则', 'investment-logic', 211, 'wenda-invest-12', '投资心态、Golf、阅读与学习', ['平常心', 'Golf', '阅读']),

  topic('商业经营', 'business-logic', 230, 'wenda-business-01', '伟大企业与长坡厚雪', ['伟大企业', '长坡厚雪']),
  topic('商业经营', 'business-logic', 231, 'wenda-business-02', '商业模式与投资确定性', ['商业模式', '投资确定性']),
  topic('商业经营', 'business-logic', 232, 'wenda-business-03', '护城河与差异化', ['护城河', '差异化']),
  topic('商业经营', 'business-logic', 233, 'wenda-business-04', '好产品与用户导向', ['好产品', '用户导向']),
  topic('商业经营', 'business-logic', 234, 'wenda-business-05', '创新与敢为天下后', ['创新', '敢为天下后']),
  topic('商业经营', 'business-logic', 235, 'wenda-business-06', '品牌的本质', ['品牌', '产品']),
  topic('商业经营', 'business-logic', 236, 'wenda-business-07', '营销、广告、渠道与出海', ['营销', '广告', '渠道']),
  topic('商业经营', 'business-logic', 237, 'wenda-business-08', '企业文化', ['企业文化', '基业长青']),
  topic('商业经营', 'business-logic', 238, 'wenda-business-09', '本分、核心价值观与利润之上的追求', ['本分', '核心价值观', '利润之上的追求']),
  topic('商业经营', 'business-logic', 239, 'wenda-business-10', '创始人、CEO、团队与激励', ['管理层', '团队', '激励']),
  topic('商业经营', 'business-logic', 240, 'wenda-business-11', 'Stop Doing List、聚焦与更健康更长久', ['Stop Doing List', '聚焦', '长期主义']),
  topic('商业经营', 'business-logic', 241, 'wenda-business-12', '收购与多元化', ['收购', '多元化']),

  topic('公司案例', 'qanda', 260, 'wenda-company-apple-01', '苹果：产品、商业模式与生态', ['苹果', '产品', '生态系统']),
  topic('公司案例', 'qanda', 261, 'wenda-company-apple-02', '苹果：管理层与企业文化', ['苹果', '乔布斯', '库克']),
  topic('公司案例', 'qanda', 262, 'wenda-company-apple-03', '苹果：估值、持有与资本配置', ['苹果', '估值', '资本配置']),
  topic('公司案例', 'qanda', 263, 'wenda-company-maotai-01', '贵州茅台：产品、品牌与商业模式', ['贵州茅台', '品牌', '商业模式']),
  topic('公司案例', 'qanda', 264, 'wenda-company-maotai-02', '贵州茅台：治理、渠道与i茅台', ['贵州茅台', '公司治理', 'i茅台']),
  topic('公司案例', 'qanda', 265, 'wenda-company-maotai-03', '贵州茅台：估值与投资判断', ['贵州茅台', '估值', '长期持有']),
  topic('公司案例', 'qanda', 266, 'wenda-company-bbk', '小霸王与步步高', ['小霸王', '步步高']),
  topic('公司案例', 'qanda', 267, 'wenda-company-oppo', 'OPPO', ['OPPO', '消费电子']),
  topic('公司案例', 'qanda', 268, 'wenda-company-vivo', 'vivo', ['vivo', '消费电子']),
  topic('公司案例', 'qanda', 269, 'wenda-company-netease', '网易', ['网易', '丁磊', '游戏']),
  topic('公司案例', 'qanda', 270, 'wenda-company-tencent', '腾讯', ['腾讯', '马化腾', '微信']),
  topic('公司案例', 'qanda', 271, 'wenda-company-alibaba-yahoo', '阿里巴巴与雅虎', ['阿里巴巴', '雅虎', '马云']),
  topic('公司案例', 'qanda', 272, 'wenda-company-pinduoduo', '拼多多', ['拼多多', '黄峥']),
  topic('公司案例', 'qanda', 273, 'wenda-company-costco', 'Costco', ['Costco', '零售']),
  topic('公司案例', 'qanda', 274, 'wenda-company-pop-mart', '泡泡玛特', ['泡泡玛特', '情绪价值']),
  topic('公司案例', 'qanda', 275, 'wenda-company-nvidia', '英伟达', ['英伟达', '黄仁勋', 'AI']),
  topic('公司案例', 'qanda', 276, 'wenda-company-google', '谷歌', ['谷歌', '科技公司']),
  topic('公司案例', 'qanda', 277, 'wenda-company-tesla', '特斯拉', ['特斯拉', '新能源汽车']),
  topic('公司案例', 'qanda', 278, 'wenda-company-oxy', 'OXY（西方石油）', ['OXY', '西方石油']),
  topic('公司案例', 'qanda', 279, 'wenda-company-nintendo', '任天堂', ['任天堂', '游戏']),
  topic('公司案例', 'qanda', 280, 'wenda-company-sony', '索尼', ['索尼', '消费电子']),
  topic('公司案例', 'qanda', 281, 'wenda-company-panasonic', '松下', ['松下', '消费电子']),
  topic('公司案例', 'qanda', 282, 'wenda-company-ge', 'GE（通用电气）', ['GE', '通用电气', '反思']),
  topic('公司案例', 'qanda', 283, 'wenda-company-new-oriental', '新东方', ['新东方', '俞敏洪']),
  topic('公司案例', 'qanda', 284, 'wenda-company-perfect-world', '完美世界', ['完美世界', '游戏']),
  topic('公司案例', 'qanda', 285, 'wenda-company-giant-network', '巨人网络', ['巨人网络', '史玉柱']),
  topic('公司案例', 'qanda', 286, 'wenda-company-kingsoft', '金山', ['金山', '游戏']),
  topic('公司案例', 'qanda', 287, 'wenda-company-changyou', '畅游', ['畅游', '游戏']),
  topic('公司案例', 'qanda', 288, 'wenda-company-the9', '第九城市', ['第九城市', '游戏']),

  topic('人生与成长', 'qanda', 320, 'wenda-life-01', '做对的事情与把事情做对', ['做对的事情', '把事情做对']),
  topic('人生与成长', 'qanda', 321, 'wenda-life-02', '正直、理性与长期视角', ['正直', '理性', '长期主义']),
  topic('人生与成长', 'qanda', 322, 'wenda-life-03', '职业、创业与享受过程', ['职业', '创业', '享受过程']),
  topic('人生与成长', 'qanda', 323, 'wenda-life-04', '家庭、孩子与教育', ['家庭', '孩子', '教育']),
  topic('人生与成长', 'qanda', 324, 'wenda-life-05', '开放学习、公益与社会责任', ['开放心态', '公益', '社会责任']),
  topic('人生与成长', 'qanda', 325, 'wenda-life-06', '睡眠、减重、Zone 2与日常健康', ['健康', '睡眠', 'Zone 2']),
]

export const TOPIC_BY_SLUG = new Map(TOPICS.map((item) => [item.slug, item]))

const includesAny = (value, words) => words.some((word) => value.toLowerCase().includes(word.toLowerCase()))

function classifyAppleDetail(detail) {
  if (includesAny(detail, ['管理层', '企业文化', '乔布斯', '库克', 'ceo', '造钟人'])) return 'wenda-company-apple-02'
  if (includesAny(detail, ['估值', '价格', '便宜', '贵', '市值', '现金', '回购', '分红', '持有', '买入', '卖出', '资本配置'])) return 'wenda-company-apple-03'
  return 'wenda-company-apple-01'
}

function classifyMaotaiDetail(detail) {
  if (includesAny(detail, ['换帅', '管理层', '治理', '渠道', 'i茅台', '打假', '直销'])) return 'wenda-company-maotai-02'
  if (includesAny(detail, ['估值', '价格', '便宜', '贵', '市值', '增持', '买入', '卖出', '投资', '分红', '十年后', '现金流'])) return 'wenda-company-maotai-03'
  return 'wenda-company-maotai-01'
}

function classifyCompany(context) {
  if (includesAny(context, ['苹果', 'apple', 'iphone', 'ipad', '乔布斯', '库克'])) {
    return classifyAppleDetail(context)
  }
  if (context.includes('茅台')) {
    return classifyMaotaiDetail(context)
  }

  const entities = [
    [['小霸王', '步步高'], 'wenda-company-bbk'],
    [['oppo'], 'wenda-company-oppo'],
    [['vivo'], 'wenda-company-vivo'],
    [['网易', '丁磊'], 'wenda-company-netease'],
    [['腾讯', '马化腾', '微信'], 'wenda-company-tencent'],
    [['阿里巴巴', '雅虎', '马云'], 'wenda-company-alibaba-yahoo'],
    [['拼多多', '黄峥'], 'wenda-company-pinduoduo'],
    [['costco'], 'wenda-company-costco'],
    [['泡泡玛特', '王宁'], 'wenda-company-pop-mart'],
    [['英伟达', 'nvidia', '黄仁勋'], 'wenda-company-nvidia'],
    [['谷歌', 'google'], 'wenda-company-google'],
    [['特斯拉', 'tesla', '马斯克'], 'wenda-company-tesla'],
    [['oxy', '西方石油'], 'wenda-company-oxy'],
    [['任天堂', 'nintendo'], 'wenda-company-nintendo'],
    [['索尼', 'sony'], 'wenda-company-sony'],
    [['松下'], 'wenda-company-panasonic'],
    [['通用电气', 'ge', '韦尔奇'], 'wenda-company-ge'],
    [['新东方', '俞敏洪'], 'wenda-company-new-oriental'],
    [['完美世界'], 'wenda-company-perfect-world'],
    [['巨人网络', '史玉柱'], 'wenda-company-giant-network'],
    [['金山'], 'wenda-company-kingsoft'],
    [['畅游'], 'wenda-company-changyou'],
    [['第九城市', '九城'], 'wenda-company-the9'],
  ]
  for (const [aliases, slug] of entities) if (includesAny(context, aliases)) return slug
  return null
}

function classifyCompositeCompany(markdown, candidates) {
  let best = null
  let bestCount = 0
  const lower = markdown.toLowerCase()
  for (const [aliases, slug] of candidates) {
    let count = 0
    for (const alias of aliases) {
      const escaped = alias.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      count += (lower.match(new RegExp(escaped, 'g')) || []).length
    }
    if (count > bestCount) {
      best = slug
      bestCount = count
    }
  }
  return best
}

function classifyInvestment(context) {
  if (includesAny(context, ['财报', '财务报表', 'roe', '净资产', '资产负债'])) return 'wenda-invest-09'
  if (includesAny(context, ['分红', '回购', '资本配置'])) return 'wenda-invest-10'
  if (includesAny(context, ['什么时候买卖', '买卖股票', '持有=买入', '持有就是买入', '卖出'])) return 'wenda-invest-08'
  if (includesAny(context, ['现金流', '折现', '估值', '市盈率', 'pe'])) return 'wenda-invest-07'
  if (includesAny(context, ['机会成本', '长期持有', '集中投资', '封仓', '十年'])) return 'wenda-invest-06'
  if (includesAny(context, ['宏观', '牛市', '熊市', '市场波动', '波动是朋友'])) return 'wenda-invest-05'
  if (includesAny(context, ['不做空', '借钱', 'margin', '杠杆', '风险第一'])) return 'wenda-invest-04'
  if (includesAny(context, ['能力圈', '看懂', '懂的才', '好生意'])) return 'wenda-invest-03'
  if (includesAny(context, ['套利', '衍生品', '期权', '量化', '投机'])) return 'wenda-invest-11'
  if (includesAny(context, ['golf', '高尔夫', '投资心态', '平常心', '书籍', '阅读'])) return 'wenda-invest-12'
  if (includesAny(context, ['简单但不容易', '适合做股票', '道需悟', '快即是慢'])) return 'wenda-invest-02'
  return 'wenda-invest-01'
}

function classifyBusiness(context) {
  if (includesAny(context, ['收购', '并购', '多元化', 'm&a'])) return 'wenda-business-12'
  if (includesAny(context, ['stop doing', '不为清单', '更健康更长久', '聚焦', '不做什么'])) return 'wenda-business-11'
  if (includesAny(context, ['创始人', 'ceo', '管理层', '团队', '激励', '公平心', '选人'])) return 'wenda-business-10'
  if (includesAny(context, ['核心价值观', '本分', '利润之上的追求'])) return 'wenda-business-09'
  if (includesAny(context, ['企业文化', '基业长青'])) return 'wenda-business-08'
  if (includesAny(context, ['营销', '广告', '渠道', '出海'])) return 'wenda-business-07'
  if (includesAny(context, ['品牌'])) return 'wenda-business-06'
  if (includesAny(context, ['创新', '敢为天下后'])) return 'wenda-business-05'
  if (includesAny(context, ['产品', '用户导向', '消费者导向', '用户需要'])) return 'wenda-business-04'
  if (includesAny(context, ['护城河', '差异化', '价格战'])) return 'wenda-business-03'
  if (includesAny(context, ['伟大企业', '伟大的企业', '长坡', '厚雪', '滚雪球', '造钟人'])) return 'wenda-business-01'
  return 'wenda-business-02'
}

function classifyLife(context) {
  if (includesAny(context, ['睡眠', '减重', 'zone2', 'zone 2', '冰水浴', '健康', '体脂'])) return 'wenda-life-06'
  if (includesAny(context, ['公益', '社会责任', '开放心态', '读书', '学习'])) return 'wenda-life-05'
  if (includesAny(context, ['家庭', '孩子', '小孩', '教育', '家人'])) return 'wenda-life-04'
  if (includesAny(context, ['职业', '创业', '享受过程', '喜欢做的事情', '工作'])) return 'wenda-life-03'
  if (includesAny(context, ['正直', '理性', '长期视角', '胸无大志', '脚踏实地'])) return 'wenda-life-02'
  return 'wenda-life-01'
}

export function classifyBlock(block) {
  const source = block.sourceSlug || ''
  const heading = (block.headingPath || []).join(' > ')
  const lastHeading = block.headingPath?.at(-1) || ''
  const context = `${heading}\n${block.markdown || ''}`

  const companySource = source.includes('disanzhanggongsidianping')
    || source.includes('di7zhang-anlifenxi')
    || (source.includes('diliuzhangduzhegengxin') && includesAny(heading, ['公司点评', '谈公司', '茅台', '泡泡玛特']))
  if (companySource) {
    if (includesAny(heading, ['苹果', 'apple'])) return classifyAppleDetail(`${lastHeading}\n${block.markdown || ''}`)
    if (heading.includes('茅台')) return classifyMaotaiDetail(`${lastHeading}\n${block.markdown || ''}`)
    if (includesAny(lastHeading, ['oppo、vivo', 'oppo、vivo、小天才'])) {
      return classifyCompositeCompany(block.markdown || '', [
        [['oppo'], 'wenda-company-oppo'],
        [['vivo'], 'wenda-company-vivo'],
        [['小天才', '步步高'], 'wenda-company-bbk'],
      ]) || 'wenda-company-bbk'
    }
    if (includesAny(lastHeading, ['costco、拼多多'])) {
      return classifyCompositeCompany(block.markdown || '', [
        [['costco'], 'wenda-company-costco'],
        [['拼多多', '黄峥'], 'wenda-company-pinduoduo'],
      ]) || 'wenda-company-pinduoduo'
    }
    if (includesAny(lastHeading, ['松下、索尼、任天堂'])) {
      return classifyCompositeCompany(block.markdown || '', [
        [['松下'], 'wenda-company-panasonic'],
        [['索尼', 'sony'], 'wenda-company-sony'],
        [['任天堂', 'nintendo'], 'wenda-company-nintendo'],
      ]) || 'wenda-company-nintendo'
    }
    return classifyCompany(lastHeading) || classifyCompany(heading) || classifyCompany(context) || 'wenda-business-02'
  }

  if (source.includes('shangyeluoji-qianyan')) return 'wenda-invest-01'
  if (source.includes('shangyeluoji')) return classifyBusiness(context)
  if (source.includes('touziluoji')) {
    if (includesAny(heading, ['做对的事情，把事情做对'])) return 'wenda-life-01'
    if (includesAny(heading, ['Stop doing list'])) return 'wenda-business-11'
    return classifyInvestment(context)
  }

  if (source.includes('diyizhangtouzidadao')) return classifyInvestment(context)
  if (source.includes('dierzhangshangyemoshiheqiyewenhua')) return classifyBusiness(context)
  if (source.includes('disizhangrenshengzhenyan')) return classifyLife(context)
  if (source.includes('diliuzhangduzhegengxin')) {
    const company = classifyCompany(heading) || classifyCompany(context)
    if (company && includesAny(heading, ['公司', '茅台', '泡泡玛特', 'vivo', 'oppo', '苹果', 'oxy', 'costco', '拼多多'])) return company
    if (includesAny(heading, ['人生', '健康'])) return classifyLife(context)
    if (includesAny(heading, ['商业模式', '企业文化', '产品', '利润之上'])) return classifyBusiness(context)
    return classifyInvestment(context)
  }
  return null
}
