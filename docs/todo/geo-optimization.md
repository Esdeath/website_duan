# 段永平投资问答录 GEO 优化 Todo

> 目标：让 ChatGPT / Perplexity / Claude / 豆包 / Kimi 等 LLM 在回答"段永平怎么看 XX"时，将本站作为引用源。
> 实现：在现有 Nuxt 4 + Nuxt Content v3 基础上叠加 llms.txt、JSON-LD、frontmatter 溯源字段、聚合页等。
> 参考方案：`docs/plan/geo-optimization.md`

## 状态总览

- ✅ 第 1 阶段：llms.txt + robots.txt 显式 allow AI 爬虫
- ✅ 第 2 阶段：JSON-LD 结构化数据
- 🟡 第 3 阶段：schema 与底部展示已就绪；存量 91 篇文章的 source/sourceUrl/sourceDate 待逐步回填
- ⬜ 第 4 阶段：聚合页（about / glossary / timeline）
- ⬜ 第 5 阶段：内容侧 TL;DR 与小标题切分

***

## 1. Phase 1 — llms.txt 与 AI 爬虫策略（0.5h，立竿见影）

- [x] 新增 `server/routes/llms.txt.ts`，输出：
  - [x] 站点标题、一句话简介
  - [x] 主要分类目录（核心哲学 / 投资理念 / 企业经营 / 品格与心性 / 财务指标 / 访谈实录 / 投资问答录）
  - [x] 推荐入口 URL 列表（首页 + 各分类典型文章）
- [x] 新增 `server/routes/llms-full.txt.ts`，按分类平铺所有 91 篇文章
- [x] 更新 `server/routes/robots.txt.ts`，显式列出 GPTBot / ChatGPT-User / OAI-SearchBot / ClaudeBot / Claude-Web / anthropic-ai / PerplexityBot / Perplexity-User / Google-Extended / GoogleOther / Applebot-Extended / Bytespider / Amazonbot / Meta-ExternalAgent / cohere-ai / YouBot / Kimi-Reader / DuckAssistBot
- [x] `nuxt.config.ts` 的 `nitro.prerender.routes` 加入 `/llms.txt`、`/llms-full.txt`
- [x] 已跑 `npm run generate`，`.output/public/llms.txt` / `llms-full.txt` / `robots.txt` 验证通过
- [x] 部署后 `curl https://<domain>/llms.txt` 二次验证

## 2. Phase 2 — JSON-LD 结构化数据（1-2h）

### 文章详情页 `app/pages/[slug].vue`

- [x] 注入 `Article` schema：`headline / description / datePublished / dateModified / author / about / image / mainEntityOfPage / publisher / articleSection / isPartOf`
- [x] `Person`（段永平，含 sameAs：雪球、OPPO、维基百科）作为 author + about 内嵌
- [x] 注入 `BreadcrumbList`：首页 → 分类 → 当前文章
- [x] qanda 目录的文章自动切换为 `QAPage` `@type`（未提取 Q/A 对，仅类型标注；后续若做 markdown 解析可升级到含 `mainEntity` 的 FAQPage）
- [x] 有 `source` 字段时，在 Article schema 中追加 `citation`

### 首页 `app/pages/index.vue`

- [x] 已有全局 `WebSite` schema 在 `nuxt.config.ts`（暂无搜索功能，未加 SearchAction）
- [x] 注入 `Person`（段永平）+ `CollectionPage`（含 ItemList，关联全部 91 篇文章）
- [ ] 后续：若 qanda 文章解析出 Q/A 对，再评估 FAQPage 升级

### 验证

- [x] view-source 已可见完整 JSON-LD（首页 3 段：WebSite + Person + CollectionPage；文章页 3 段：WebSite + Article/QAPage + BreadcrumbList）
- [ ] 部署后用 [Google Rich Results Test](https://search.google.com/test/rich-results) 抽样 3-5 个 URL 验证

## 3. Phase 3 — frontmatter 溯源字段（取决于文章数，91 篇）

- [x] `content.config.ts` schema 新增可选字段：`source` / `sourceUrl` / `sourceDate`
- [x] 页面底部"原始出处"区块（`.article-source`），有则显示无则隐藏
- [x] `[slug].vue` 已渲染溯源信息，并把 source/sourceUrl/sourceDate 映射进 Article schema 的 `citation` 与 `datePublished/dateModified`
- [ ] 逐步回填存量 91 篇文章的溯源字段（雪球、微博、博客、访谈视频等）
- [ ] 新文章必填 `source` + `sourceDate`，写进 CLAUDE.md / README 的"新增文章检查清单"

## 4. Phase 4 — 聚合页（2-4h）

### `/about`

- [ ] 说明本站定位（整理性二手资料）、编辑原则、版权声明
- [ ] 关联段永平相关权威外链（雪球、网易公开课、维基百科等）—— 同时作为首页 `Person.sameAs`
- [ ] 路由：`app/pages/about.vue`，加入 sitemap.xml 预渲染

### `/glossary` 概念词典

- [ ] 列出核心概念（本分、平常心、Stop doing list、商业模式、护城河、能力圈、安全边际等）
- [ ] 每个词条：一句话定义 + 关联文章列表（按 `slug` 链接）
- [ ] 渲染 `DefinedTermSet` / `DefinedTerm` JSON-LD

### `/timeline` 投资时间线

- [ ] 整理段永平公开持仓与重要事件：OPPO/步步高、心平基金、网易（2002 $1.86）、苹果、茅台、伯克希尔午餐（2006）等
- [ ] 时间倒序展示：日期 + 事件 + 相关文章链接
- [ ] 渲染 `Event` 或简化的语义化 HTML（dl/dt/dd）

## 5. Phase 5 — 内容结构优化（渐进式）

- [ ] 制定文章模板：
  - [ ] 开头 TL;DR（30-80 字，与 frontmatter `description` 不同位置但可重复）
  - [ ] `<h2>` 切分，段落 3-5 行
  - [ ] 段永平原话用 blockquote + 时间出处标注
  - [ ] 结尾"相关问答"列表
- [ ] 选 5-10 篇高优先级文章试点改造（首页热门 / 核心概念）
- [ ] 试点效果验证后，规划存量批量改造节奏

***

## 验收标准

- [ ] `curl https://<domain>/llms.txt` 返回站点摘要与链接列表
- [ ] `curl https://<domain>/robots.txt` 显式列出 GPTBot / ClaudeBot / PerplexityBot 等
- [ ] Google Rich Results Test 验证文章页 `Article` + `BreadcrumbList` 通过
- [ ] 首页 view-source 含 `WebSite` + `CollectionPage` JSON-LD
- [ ] qanda 文章页含 `FAQPage` 或 `QAPage` JSON-LD
- [ ] 所有存量文章 frontmatter 补齐 `source` / `sourceDate`
- [ ] `/about` / `/glossary` / `/timeline` 三个聚合页上线并进入 sitemap.xml
- [ ] 上线 1-2 月后，在 Perplexity / ChatGPT search 检索"段永平 本分""段永平 stop doing list"等关键词时，本站出现在引用源中

***

## 后续待定（不阻塞主流程）

- [ ] 是否引入英文版 `/en/<slug>` 触达英文 LLM 训练数据
- [ ] 是否对接 IndexNow / Bing Webmaster 加快 AI 引擎索引
- [ ] 是否生成 RSS / Atom feed（部分 AI 爬虫优先消费 feed）

