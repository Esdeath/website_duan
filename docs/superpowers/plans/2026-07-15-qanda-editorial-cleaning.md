# 投资问答录编辑性清洗 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对 45 篇投资问答录执行可追溯的保守清洗，修复确定性错字和符号问题，删除真正无信息的内容，同时保护观点与数据。

**Architecture:** 新建独立的编辑清洗模块，负责机械符号规范、白名单错字修正和变化记录；原有问答生成器负责按完整问答单元调用该模块。审计清单增加编辑变化记录和数字保护校验，确保所有生成内容仍可追溯到固定的 20 篇来源。

**Tech Stack:** Node.js ESM、Nuxt Content v3、Node test runner、Markdown、JSON 审计清单。

## Global Constraints

- 只修改能从上下文唯一确定的错别字、乱码、符号和无信息内容。
- 不改动核心观点、论证、日期、金额、比例、估值、公司数据和原有口语风格。
- “不知道”“没研究过”“看不懂”等能力圈表达必须保留。
- 不联网补写或校正原文事实。
- 保持 45 篇主题和 15 篇公司案例结构不变。
- 本轮只做本地修改和验证，不自动提交实施改动、不推送、不部署。

---

### Task 1: 建立可审计的编辑清洗模块

**Files:**
- Create: `scripts/qanda-editorial-cleaning.mjs`
- Modify: `tests/qanda-cleaning.test.mjs`

**Interfaces:**
- Produces: `cleanEditorialMarkdown(markdown, context): { markdown: string, changes: EditorialChange[] }`
- Produces: `EditorialChange = { type, before, after, rule }`
- Produces: `hasDangerousNumericChange(before, after): boolean`

- [ ] **Step 1: 写符号清理和数据保护失败测试**

覆盖以下输入：

```js
const source = '网友：茅台*()*怎么样？？\n\n大道：价格是1499元。。（2025-10-26)'
const result = cleanEditorialMarkdown(source, { blockId: 'sample' })
assert.equal(result.markdown, '网友：茅台怎么样？\n\n大道：价格是1499元。（2025-10-26）')
assert.equal(hasDangerousNumericChange(source, result.markdown), false)
```

同时验证 `1.06`、`40%`、`2025-10-26`、`1499元` 和正文列表编号不被修改。

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test --test-name-pattern='editorial symbols|numeric protection' tests/qanda-cleaning.test.mjs`

Expected: FAIL，提示模块或导出函数不存在。

- [ ] **Step 3: 实现严格的符号规范化**

模块仅处理显式规则：

```js
const TYPO_RULES = new Map([
  ['博有', '博友'],
  ['湖涂', '糊涂'],
  ['Andriod', 'Android'],
  ['巴非特', '巴菲特'],
  ['aeed have', 'need have'],
  ['necd have', 'need have'],
])

export function cleanEditorialMarkdown(markdown, context = {}) {
  const changes = []
  let output = markdown
  output = applyRecordedRule(output, /\*\(\)\*/g, '', 'format-normalized', 'empty-markdown-link', changes)
  output = applyRecordedRule(output, /\?\?+|？？+/g, '？', 'format-normalized', 'repeated-question-mark', changes)
  output = applyRecordedRule(output, /!!+|！！+/g, '！', 'format-normalized', 'repeated-exclamation-mark', changes)
  output = applyKnownTypos(output, changes)
  return { markdown: output, changes: changes.map((change) => ({ ...change, blockId: context.blockId })) }
}
```

括号、句号和中英文标点必须使用上下文明确的规则，不对代码、URL、小数和 Markdown 链接目标做全局替换。

- [ ] **Step 4: 实现数字签名保护**

分别提取日期、百分比、金额、小数和带单位数字；清洗前后多重集合不一致时返回 `true`。普通问题编号允许由已有的 `stripObsoleteQuestionOrdinals` 单独移除，不计为危险数据变化。

- [ ] **Step 5: 运行专项测试**

Run: `node --test --test-name-pattern='editorial symbols|numeric protection' tests/qanda-cleaning.test.mjs`

Expected: PASS。

- [ ] **Step 6: 检查本任务差异**

Run: `git diff --check -- scripts/qanda-editorial-cleaning.mjs tests/qanda-cleaning.test.mjs`

Expected: 无输出；不提交。

---

### Task 2: 收紧“无意义内容”判断

**Files:**
- Modify: `scripts/qanda-cleaning-generate-lib.mjs`
- Modify: `tests/qanda-cleaning.test.mjs`

**Interfaces:**
- Consumes: `cleanEditorialMarkdown(markdown, context)`
- Produces: `classifyNoInformation(block): { discard: boolean, reason?: string }`
- Keeps compatibility: `isNoInformation(block): boolean`

- [ ] **Step 1: 写删除与保留边界失败测试**

必须删除：

```js
['网友：谢谢！\n\n大道：不客气。', '网友：点赞。', '大道：呵呵。', '不明真相的群众：这个有点意思。']
```

必须保留：

```js
['大道：不知道。', '大道：没研究过。', '大道：看不懂。', '大道：不做空。', '大道：价格不便宜。']
```

乱码测试仅删除完整无语义键盘串；含有效观点的段落只能去除可明确隔离的乱码后缀。

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test --test-name-pattern='no-information editorial boundary' tests/qanda-cleaning.test.mjs`

Expected: FAIL，现有逻辑会错误删除能力圈回答或保留纯反应。

- [ ] **Step 3: 实现带原因的分类器**

分类器先剥离问答角色、日期和标点，再按完整语义判断：

```js
const PURE_REACTIONS = /^(?:谢谢|多谢|感谢|不客气|呵呵|哈哈|点赞|赞|明白了|正解|有点意思)$/u
const ABILITY_BOUNDARIES = /^(?:不知道|没看过|没研究过|没关注|不了解|看不懂|不懂)$/u
```

`ABILITY_BOUNDARIES` 必须优先返回保留；纯反应只有在不含其他事实或观点时才删除。

- [ ] **Step 4: 将无意义判断接入生成流程**

完整问答单元先做编辑清洗，再做无意义判断；删除始终以问答单元为边界。移除与正文无关的网友致谢名单时记录 `discarded-no-information` 和 `editorial-contributor-list`。

- [ ] **Step 5: 运行专项测试**

Run: `node --test --test-name-pattern='no-information editorial boundary' tests/qanda-cleaning.test.mjs`

Expected: PASS。

- [ ] **Step 6: 检查本任务差异**

Run: `git diff --check -- scripts/qanda-cleaning-generate-lib.mjs tests/qanda-cleaning.test.mjs`

Expected: 无输出；不提交。

---

### Task 3: 接入生成器并扩展审计清单

**Files:**
- Modify: `scripts/generate-qanda-topics.mjs`
- Modify: `scripts/qanda-cleaning-audit-lib.mjs`
- Modify: `scripts/audit-qanda-cleaning.mjs`
- Modify: `tests/qanda-audit.test.mjs`

**Interfaces:**
- Consumes: `cleanEditorialMarkdown`、`classifyNoInformation`、`hasDangerousNumericChange`
- Produces audit field: `editorialChanges: Array<{ blockId, sourceSlug, targetSlugs, type, rule, before, after }>`
- Produces audit count: `counts.editorialChanges`

- [ ] **Step 1: 写审计失败测试**

测试要求：

- 每条 `typo-corrected` 或 `format-normalized` 记录包含 `blockId/rule/before/after`。
- 每条删除记录包含非空原因。
- `dangerousNumericChanges` 必须为空。
- 45 篇生成文档不得出现 `*()*`、空括号、旧提问编号或已登记的确定性错字。

- [ ] **Step 2: 运行审计测试并确认失败**

Run: `node --test tests/qanda-audit.test.mjs`

Expected: FAIL，现有审计没有 `editorialChanges`。

- [ ] **Step 3: 在生成器汇总编辑变化**

每个保留或删除单元执行清洗并保存变化；文章构建使用清洗后的 Markdown。审计 JSON 追加 `editorialChanges` 和 `dangerousNumericChanges`，不得覆盖现有来源映射、重复关系和 227 条重定向记录。

- [ ] **Step 4: 扩展审计校验**

`validateAuditData` 校验编辑记录字段完整、规则类型合法、引用的 `blockId` 存在；`audit-qanda-cleaning.mjs` 校验生成稿残留符号和危险数据变化为零。

- [ ] **Step 5: 运行审计测试**

Run: `node --test tests/qanda-audit.test.mjs tests/qanda-cleaning.test.mjs`

Expected: PASS。

- [ ] **Step 6: 检查本任务差异**

Run: `git diff --check -- scripts/generate-qanda-topics.mjs scripts/qanda-cleaning-audit-lib.mjs scripts/audit-qanda-cleaning.mjs tests/qanda-audit.test.mjs`

Expected: 无输出；不提交。

---

### Task 4: 重新生成并人工复核高风险候选

**Files:**
- Modify: `content/dao/qanda/wenda-*.md`
- Modify: `content/dao/investment-logic/wenda-*.md`
- Modify: `content/dao/business-logic/wenda-*.md`
- Modify: `docs/content-audits/investment-qanda-cleaning-map.json`

**Interfaces:**
- Consumes: 固定来源清单、编辑清洗模块和主题配置
- Produces: 45 篇清洗后的主题文章及完整审计记录

- [ ] **Step 1: 干跑生成器**

Run: `node scripts/generate-qanda-topics.mjs`

Expected: 20 个来源、45 篇成品、0 个危险数字变化。

- [ ] **Step 2: 写入生成结果**

Run: `node scripts/generate-qanda-topics.mjs --write`

Expected: 45 篇、1 个主题目录、20 个迁移导读、208 条分篇重定向、19 条公司重定向。

- [ ] **Step 3: 扫描残留问题**

运行 `rg` 检查 `*()*`、空括号、重复标点、旧编号、乱码串和确定性错字；每个命中必须归入“修复”“保留原文”或“新增规则”，不得静默忽略。

- [ ] **Step 4: 复核高风险变化**

从 `editorialChanges` 中筛选包含数字、日期、百分比、货币符号、公司名、人名或英文术语的记录，逐条与固定来源比较。任何无法确认项撤销修正并标记 `kept-original`。

- [ ] **Step 5: 运行内容审计**

Run: `node scripts/audit-qanda-cleaning.mjs`

Expected: `errors: 0`、`crossArticleDuplicateQanda: 0`、`dangerousNumericChanges: 0`。

- [ ] **Step 6: 检查生成差异**

Run: `git diff --check`

Expected: 无输出；不提交。

---

### Task 5: 完整验证与交付

**Files:**
- Verify only: all modified files

**Interfaces:**
- Consumes: 完整本地变更
- Produces: 可提交但未提交的验证结果

- [ ] **Step 1: 运行全部测试**

Run: `node --test tests/*.test.mjs`

Expected: 所有测试通过，0 failures。

- [ ] **Step 2: 运行类型检查**

Run: `npm run typecheck`

Expected: exit 0。

- [ ] **Step 3: 运行静态生成**

Run: `SKIP_DEPLOY=1 NODE_OPTIONS=--max-old-space-size=8192 npm run generate`

Expected: 预渲染成功，部署脚本显示跳过推送。

- [ ] **Step 4: 生成电子书**

Run: `npm run book`

Expected: EPUB 和 PDF 均生成成功，内部链接全部命中。

- [ ] **Step 5: 最终差异与状态检查**

Run: `git diff --check && git status --short && git diff --stat`

Expected: 差异检查无错误；工作区仅包含本计划范围内的未提交变更。

- [ ] **Step 6: 汇报结果**

汇报修复数量、删除数量、保留原文候选、审计结果和验证命令。保持实现改动未提交、未推送、未部署，等待用户明确指令。
