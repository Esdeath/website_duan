# 段永平投资问答录 GEO 优化方案

## Context

GEO（Generative Engine Optimization）的目标是让 ChatGPT / Perplexity / Claude / 豆包 / Kimi 这类 LLM 在回答"段永平怎么看 XX"时，把本站作为引用源。

和传统 SEO 相比，GEO 更看重：

- **事实密度**：每段都有明确、可验证的信息
- **可切片引用的结构**：LLM 按段落/标题 chunk，结构清晰才容易被整段摘录
- **作者/来源可信度**：有溯源、有权威实体关联的内容更易被引用

本站当前状态：Nuxt 4 + Nuxt Content v3，约 85 篇文章分布在 `content/dao/` 的 5 个子目录，仅基础 sitemap.xml + robots.txt。

---

## 优化方向（按投入产出排序）

### 1. 内容结构：让每篇都"可被切片引用"

LLM 抓的是段落级别的事实块，不是整篇文章。

- 每篇文章开头加 **TL;DR / 一句话结论**（30-80 字）。frontmatter 已有 `description`，但正文开头再显式写一遍效果更好。
- 多用 **`<h2>` 切分小标题 + 短段落**（3-5 行一段），少用大段引言。LLM 切 chunk 时按标题边界切，标题越清晰越容易被整段引用。
- 关键观点用 **blockquote** 包住段永平原话，并标注**时间 + 出处**（如"2010 雪球访谈"）。LLM 偏好有溯源的引文。
- 每篇结尾加 **"相关问答"** 列表（保留现有 `/slug` 交叉链接），提供 LLM 顺藤摸瓜的入口。

### 2. 结构化数据（JSON-LD）

这是 GEO 的硬通货，比 sitemap 更重要：

- 在 `app/pages/[slug].vue` 里给每篇注入 `Article` + `Person`（段永平为 author 或 about）+ `BreadcrumbList` 的 JSON-LD。
- 首页注入 `WebSite` + `CollectionPage` + `FAQPage`（如果 qanda 目录的问答能映射成 Q/A 对，直接做 FAQPage schema，Perplexity 和 Google AI Overview 都吃这个）。
- 文章里的问答段落（"问：... 答：..."）也可以单独包 `QAPage` schema。

### 3. llms.txt / llms-full.txt

新兴的事实标准，给 AI 爬虫一个"按图索骥"的入口：

- 在 `server/routes/` 加 `llms.txt.ts`：站点简介 + 主要分类 + 推荐入口 URL 列表。
- 可选 `llms-full.txt`：把所有文章的 title + description + URL 平铺一份，方便 LLM 训练/抓取时一次性拿全。
- 同时在 `robots.txt` 显式 allow `GPTBot / ClaudeBot / PerplexityBot / Google-Extended / Bytespider`。

### 4. 来源与权威性信号

LLM 倾向引用"看起来权威"的来源：

- 每篇 frontmatter 加 `source`（原始出处）、`sourceUrl`（雪球/微博原帖）、`sourceDate`，并在页面底部渲染成"原始出处：xx 2010-03-12"。
- 站点 footer 写清楚"本站为整理性二手资料，原文版权归段永平本人"。
- 新增 `/about` 页说明编辑原则。这条对 Perplexity 这类有 citation 评分的引擎尤其有用。

### 5. 实体一致性

- 全站统一"段永平"的英文/拼音写法（Duan Yongping），首页/about/JSON-LD `sameAs` 关联他的雪球、微博、OPPO/步步高、网易公开课等权威外链 —— 帮 LLM 把这个站和"那个段永平"绑定。
- 关键概念（本分、平常心、Stop doing list、商业模式、护城河等）建一个 `/glossary` 或 tag 页，每个词条聚合相关文章。LLM 在做名词解释类查询时，这种聚合页特别容易被引用。

### 6. 可被验证的事实

LLM 会优先引用"能交叉验证"的内容：

- 涉及数字（如"2002 年以 1.86 美元买入网易"）务必准确，并放在独立短句里，便于摘录。
- 涉及时间线（OPPO、vivo、心平基金、网易、苹果、茅台仓位）做一个 `/timeline` 时间线页面。这种页面 GEO 命中率很高。

---

## 落地顺序（按改造成本由低到高）

| 顺序 | 任务 | 预计工作量 | 影响范围 |
| --- | --- | --- | --- |
| 1 | 新增 `llms.txt` + 调整 `robots.txt` 显式 allow AI 爬虫 | 0.5h | `server/routes/`、`nuxt.config.ts` prerender |
| 2 | `[slug].vue` 注入 Article/Person/BreadcrumbList JSON-LD；首页注入 WebSite/CollectionPage/FAQPage | 1-2h | `app/pages/index.vue`、`app/pages/[slug].vue` |
| 3 | 给所有文章补 `source / sourceUrl / sourceDate` frontmatter + 页面底部展示 | 取决于文章数（~85 篇） | `content.config.ts` schema、`content/dao/**`、`[slug].vue` |
| 4 | 新建 `/about`、`/glossary`、`/timeline` 三个聚合页 | 2-4h | 新增 `app/pages/about.vue` 等 |
| 5 | 内容侧逐步补 TL;DR 和小标题切分 | 渐进式 | `content/dao/**` |

---

## 验收标准

- `curl https://<domain>/llms.txt` 返回正确的站点摘要与链接列表
- `curl https://<domain>/robots.txt` 中显式列出 GPTBot/ClaudeBot/PerplexityBot 等
- 文章页 view-source 可见完整 JSON-LD（`Article` + `BreadcrumbList`），用 Google Rich Results Test 验证通过
- 首页 JSON-LD 包含 `WebSite` 和 `CollectionPage`，问答页含 `FAQPage`
- 在 Perplexity / ChatGPT search 检索"段永平 本分""段永平 stop doing list"等关键词时，本站逐步出现在引用源中（需观察 1-2 个月）

---

## 后续待定

- 是否引入英文版（`/en/<slug>`）以触达英文 LLM 训练数据。段永平在英文世界知名度有限，但若做，可显著扩大 GEO 覆盖面。
- 是否对接 IndexNow / Bing Webmaster，加快 AI 引擎索引速度。
