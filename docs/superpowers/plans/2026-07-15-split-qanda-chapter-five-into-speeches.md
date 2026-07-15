# Split Q&A Chapter Five Into Speeches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the seven unique articles out of “问答录：第五章 演讲与访谈”, remove the obsolete aggregate page, and retarget every inbound link.

**Architecture:** A temporary deterministic Node.js migration script reads the current working-copy chapter, segments it at exact level-three headings, promotes heading levels, and writes seven standalone Nuxt Content Markdown files with complete frontmatter. Small metadata and link edits are applied directly, then the obsolete source file and temporary script are removed.

**Tech Stack:** Nuxt 4, Nuxt Content v3, Markdown/YAML frontmatter, Node.js, Git.

## Global Constraints

- Treat the current working-copy chapter as the source of truth so the user's uncommitted year-title edits are preserved.
- Preserve every source paragraph; only the extracted article heading hierarchy may change.
- Set all seven new articles to `category: "访谈实录"`.
- Delete the old chapter and leave no references to `dadaotouziwendalu-diwuzhangyanjiangyufangtan`.
- Do not commit or include unrelated worktree changes.

---

### Task 1: Generate the seven standalone articles

**Files:**
- Create temporarily: `scripts/split-chapter-five.mjs`
- Create: `content/dao/speeches/duanyongping-1998nian-bubugao-yingxiaorenyuan-jianghua.md`
- Create: `content/dao/speeches/duanyongping-2018nian-sitanfu-daxue-53wen.md`
- Create: `content/dao/speeches/feidele-2024nian-biyeyanjiang.md`
- Create: `content/dao/speeches/tim-cook-2015nian-huashengdundaxue-biyeyanjiang.md`
- Create: `content/dao/speeches/buffett-1998nian-foluolida-daxue-yanjiang.md`
- Create: `content/dao/speeches/shenwei-2025nian-vivo-30zhounian-wanyan-zhici.md`
- Create: `content/dao/speeches/shenwei-2015nian-vivo-20zhounian-wanyan-jianghua.md`

**Interfaces:**
- Consumes: Exact level-three sections in `content/dao/qanda/dadaotouziwendalu-diwuzhangyanjiangyufangtan.md`.
- Produces: Seven schema-valid `dao` collection pages with unique slugs and orders 98, 99, 124, 125, 127, 128, and 132.

- [x] **Step 1: Add a deterministic migration script**

The script must map these source headings to target slugs and orders:

```text
1998年:**段永平**对**步步高**所有营销人员的讲话 -> duanyongping-1998nian-bubugao-yingxiaorenyuan-jianghua, 98
1998年**巴菲特**：佛罗里达大学演讲1998 -> buffett-1998nian-foluolida-daxue-yanjiang, 99
2015年**苹果**CEO库克华盛顿大学毕业典礼演讲：找到你的北斗星 -> tim-cook-2015nian-huashengdundaxue-biyeyanjiang, 124
2015年**vivo**2015年20周年晚宴沈炜讲话 -> shenwei-2015nian-vivo-20zhounian-wanyan-jianghua, 125
2018年:**段永平**斯坦福大学53问 -> duanyongping-2018nian-sitanfu-daxue-53wen, 127
2024年费德勒演讲：最优秀的人，也经常失败 -> feidele-2024nian-biyeyanjiang, 128
2025年**vivo**30周年纪念晚宴沈炜致辞 -> shenwei-2025nian-vivo-30zhounian-wanyan-zhici, 132
```

For each section, replace its opening `### ` with `# ` and every nested `#### ` with `## `. The script must re-read each target and assert exact equality with the generated string before exiting successfully.

- [x] **Step 2: Run the migration and inspect generated frontmatter**

Run:

```bash
node scripts/split-chapter-five.mjs
rg -n '^(title|slug|category|order|seoTitle|seoDescription):' content/dao/speeches/*.md
```

Expected: the script reports seven verified files; each new file has complete metadata and `category: "访谈实录"`.

### Task 2: Reorder existing late-year speech articles

**Files:**
- Modify: `content/dao/speeches/duanyongping-2016nianzheda60zhounianzhuanfang.md`
- Modify: `content/dao/speeches/duanyongping-2025nianzhejiangdaxueyanjiangjiwendawanzhengban.md`
- Modify: `content/dao/speeches/duanyongping-2025niantantangpingyuneijuan-yuwangshijiaoliuzinvjiaoyu.md`
- Modify: `content/dao/speeches/duanyongping-2025nian-fangsanwenduihuaduanyongping-zuozijinenggouxihuandeshiqing.md`

**Interfaces:**
- Consumes: Existing article metadata.
- Produces: Integer chronological ordering through the new articles.

- [x] **Step 1: Apply exact order changes**

```text
2016年浙大60周年专访: 124 -> 126
2025年浙江大学演讲及问答完整版: 125 -> 129
2025年谈躺平与内卷、与王石交流子女教育: 126 -> 130
2025年方三文对话段永平: 127 -> 131
```

- [x] **Step 2: Verify every speech order is unique**

Run a frontmatter scan over `content/dao/speeches/*.md` and assert that no numeric `order` occurs twice.

Expected: 35 unique order values across 35 speech files.

### Task 3: Retarget inbound links and remove the aggregate chapter

**Files:**
- Modify: `content/dao/company-people/person-wangning.md`
- Modify: `content/dao/company-people/company-pop-mart.md`
- Modify: `content/dao/company-people/person-huangrenxun.md`
- Modify: `content/dao/company-people/person-huangzheng.md`
- Modify: `content/dao/company-people/company-pinduoduo.md`
- Delete: `content/dao/qanda/dadaotouziwendalu-diwuzhangyanjiangyufangtan.md`
- Delete: `scripts/split-chapter-five.mjs`

**Interfaces:**
- Consumes: Existing speech slugs.
- Produces: No internal references to the removed chapter route.

- [x] **Step 1: Replace the five old source links**

Use these exact targets:

```text
person-wangning.md -> /duanyongping-2025niantantangpingyuneijuan-yuwangshijiaoliuzinvjiaoyu
company-pop-mart.md -> /duanyongping-2025niantantangpingyuneijuan-yuwangshijiaoliuzinvjiaoyu
person-huangrenxun.md -> /duanyongping-2025nian-fangsanwenduihuaduanyongping-zuozijinenggouxihuandeshiqing
person-huangzheng.md -> /duanyongping-2025nianzhejiangdaxueyanjiangjiwendawanzhengban and /duanyongping-2025nian-fangsanwenduihuaduanyongping-zuozijinenggouxihuandeshiqing
company-pinduoduo.md -> /duanyongping-2025nianzhejiangdaxueyanjiangjiwendawanzhengban and /duanyongping-2025nian-fangsanwenduihuaduanyongping-zuozijinenggouxihuandeshiqing
```

- [x] **Step 2: Delete the old chapter and temporary script**

Remove both files only after the generated-file equality assertions have passed.

- [x] **Step 3: Prove the old route has no references**

Run:

```bash
test ! -e content/dao/qanda/dadaotouziwendalu-diwuzhangyanjiangyufangtan.md
! rg 'dadaotouziwendalu-diwuzhangyanjiangyufangtan' content app server
```

Expected: both commands exit successfully with no matches.

### Task 4: Validate the content collection and generated site

**Files:**
- Verify all modified content files.

**Interfaces:**
- Consumes: The completed content migration.
- Produces: A schema-valid static site with seven new article routes and no old chapter route.

- [x] **Step 1: Check slug uniqueness and Markdown diff quality**

Run checks that collect every `slug:` value under `content/dao`, fail on duplicates, run `git diff --check`, and inspect `git diff --stat`.

Expected: no duplicate slugs, no whitespace errors, and only scoped content/docs changes.

- [x] **Step 2: Run type checking**

Run:

```bash
npm run typecheck
```

Expected: exit code 0.

- [x] **Step 3: Generate without deploying**

Run:

```bash
SKIP_DEPLOY=1 NODE_OPTIONS=--max-old-space-size=8192 npm run generate
```

Expected: exit code 0, all seven new slugs present in `.output/public/sitemap.xml`, and the removed chapter slug absent.
