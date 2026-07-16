const INVESTMENT_UNDERSTANDING = 'duanyongping-touziluoji-di2jie-touzilijie'
const READER_UPDATES = 'dadaotouziwendalu-diliuzhangduzhegengxin'

export const MANUAL_DECISIONS = [
  {
    id: 'f45-remove-loyal-follower-reaction',
    sourceSlug: INVESTMENT_UNDERSTANDING,
    contains: '这个忠实信徒很有趣哈',
    action: 'discard',
    reason: 'manual-cleanup-f45ab92',
  },
  {
    id: 'f45-remove-charlie-almanack-reaction',
    sourceSlug: INVESTMENT_UNDERSTANDING,
    contains: '网友Y：《穷查理宝典》',
    action: 'discard',
    reason: 'manual-cleanup-f45ab92',
  },
  {
    id: 'f45-remove-translator-editorial-note',
    sourceSlug: INVESTMENT_UNDERSTANDING,
    contains: '网友黑色伤：我用了两天',
    action: 'discard',
    reason: 'manual-cleanup-f45ab92',
  },
  {
    id: 'f45-remove-third-party-profile-x',
    sourceSlug: INVESTMENT_UNDERSTANDING,
    contains: '网友X：他的网站整理了好多Buffett',
    action: 'discard',
    reason: 'manual-cleanup-f45ab92',
  },
  {
    id: 'f45-remove-standalone-put-update',
    sourceSlug: READER_UPDATES,
    contains: '开始卖点put了。投入资金',
    action: 'discard',
    reason: 'manual-cleanup-f45ab92',
  },
  {
    id: 'f45-remove-insurance-ai-non-answer',
    sourceSlug: READER_UPDATES,
    contains: '家庭保险配置问题',
    action: 'discard',
    reason: 'manual-cleanup-f45ab92',
  },
]

export function applyManualDecisions(blocks, decisions = MANUAL_DECISIONS) {
  const kept = blocks.map((block) => ({ ...block }))
  const discarded = []
  const fragmentChanges = []

  for (const decision of decisions) {
    const matches = kept.filter((block) => (
      block.sourceSlug === decision.sourceSlug
      && block.markdown.includes(decision.contains)
    ))
    if (matches.length !== 1) {
      throw new Error(`Manual decision ${decision.id} must match exactly one source block; found ${matches.length}`)
    }

    const block = matches[0]
    if (decision.action === 'discard') {
      discarded.push({ block, decision })
      kept.splice(kept.findIndex((item) => item.id === block.id), 1)
      continue
    }
    if (decision.action !== 'remove-fragment') {
      throw new Error(`Manual decision ${decision.id} has invalid action: ${decision.action}`)
    }

    const before = block.markdown
    block.markdown = block.markdown
      .replace(decision.contains, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    fragmentChanges.push({
      blockId: block.id,
      decisionId: decision.id,
      before,
      after: block.markdown,
      reason: decision.reason,
    })
  }

  return { kept, discarded, fragmentChanges }
}
