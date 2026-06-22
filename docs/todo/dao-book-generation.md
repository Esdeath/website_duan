# 段永平投资问答录 EPUB/PDF 生成 Todo

> 目标：将 `content/dao/**/*.md`（91 篇，5 个子目录）转换为 EPUB 和 PDF 电子书，保留"墨韵"视觉风格，让 `[text](/library/slug)` 双链在文档内可点击跳转。
> 实现：Node.js ESM 脚本 `scripts/generate-books.mjs`，输出到 `output/`。
> 参考方案：`docs/plan/foamy-painting-tome.md`

## 状态总览

- ✅ 脚本可运行：`npm run book` / `book:epub` / `book:pdf`
- ✅ 输出：`output/段永平投资问答录.epub`、`output/段永平投资问答录.pdf`
- ✅ 链接重写命中率 5190/5190（EPUB 与 PDF 均 100%）
- ✅ 整页背景填充（PDF 用 `body::before` 固定定位 + 负偏移在每页重复绘制；`html/body { background }` 在 Chromium PDF 中仅首页生效）

## 1. 依赖安装与脚本注册

- [x] devDependencies：`gray-matter ^4.0.3`、`markdown-it ^14.1.1`、`epub-gen-memory ^1.1.2`、`puppeteer ^25.0.2`
- [x] `package.json` `scripts` 新增 `book` / `book:epub` / `book:pdf`
- [x] `.gitignore` 添加 `output/`

## 2. Phase 1 加载 & 解析

- [x] 读取 `content/dao/**/*.md`（自定义 `listMarkdown` + `parseFrontmatter`，避免引入额外解析器）
- [x] 解析 frontmatter：`title`、`slug`、`category`、`order`
- [x] 构建 `slug → article` 全局映射（`allSlugs`）
- [x] CLI 参数 `--format epub|pdf`，未传则两种都生成

## 3. Phase 2 章节组织

- [x] 按 5 个子目录划分：核心概念 / 访谈实录 / 问答录 / 投资逻辑 / 商业逻辑
- [x] 核心概念再按 `category` 分 5 组（核心哲学 → 投资理念 → 企业经营 → 品格与心性 → 财务指标）
- [x] 每组内按 `order` 升序
- [x] console 输出各篇文章数（实际：42 / 28 / 6 / 7 / 8 = 91 篇）

## 4. Phase 3 Markdown → HTML

- [x] 链接重写：`[text](/slug)` → `[text](#slug)`
- [x] 额外处理：源文件中误写的 `![text](/slug)` 图片语法还原为普通链接（避免 markdown-it 渲染 `<img>`）
- [x] 链接命中统计输出
- [x] `markdown-it` 渲染（`html: true, linkify: true, typographer: false`）
- [x] 文章包裹 `<section id="{slug}" class="article">...</section>`

## 5. Phase 4 生成 EPUB

- [x] 每"篇"作为一个 EPUB chapter，章名取 5 个分类名
- [x] `slug → chapterFile` 映射，跨章节链接重写为 `chapterFile.xhtml#slug`
- [x] CSS 从 `app/assets/css/main.css` `.prose` 段提取并适配，变量展开为固定值
- [x] 移除 `:hover` / `transition` / `animation`
- [x] 仅声明字体栈，不嵌入字体文件
- [x] 元数据：`title: 段永平投资问答录`、`lang: zh`、`author: 段永平`、`publisher: 段永平投资问答录`
- [x] 输出 `output/段永平投资问答录.epub`

## 6. Phase 5 生成 PDF

- [x] HTML 文档：封面页 + 目录页 + 5 个分篇分隔页 + 所有文章
- [x] `<head>` 通过 Google Fonts 引入 LXGW WenKai TC + Noto Serif SC
- [x] 注入 `.prose` CSS + `@page { size: A4; margin: 25mm 20mm; }` + `section.article { page-break-before: always; }`
- [x] 封面页：书名、副标题、视觉装饰（朱砂色调）
- [x] 目录页：按 5 篇列出所有文章标题，`<a href="#slug">` 锚点
- [ ] 目录页每个条目后追加对应的页码（需在 PDF 首次渲染后回填真实页码，或用 Puppeteer 测量每个 `section.article` 的起始页）
- [x] 分篇分隔页（"第 N 篇 · 标题"）
- [x] Puppeteer 流程：`setContent` → `page.pdf({ printBackground: true, displayHeaderFooter: true, ... })`
- [x] 页码 footer 模板（`<span class="pageNumber"></span> / <span class="totalPages"></span>`）
- [x] 输出 `output/段永平投资问答录.pdf`

## 7. 样式适配（CSS 变量展开）

- [x] `--fg` → `#2c2c2c`
- [x] `--accent` → `#b5462a`
- [x] `--bg` → `#f8f5f0`
- [x] `--line` → `#dddddd`
- [x] `--surface` → `rgba(26,24,20,0.03)`
- [x] `--accent-soft` → `rgba(181,70,42,0.08)`
- [x] `--reading` → `"LXGW WenKai TC", "Noto Serif SC", Georgia, serif`
- [x] `--sans` → `"PingFang SC", "Microsoft YaHei", system-ui, sans-serif`

## 8. 验证

- [x] `npm run book` / `book:epub` / `book:pdf` 均无报错
- [x] 链接重写 5190/5190 全部命中
- [x] PDF 整页背景填充（`html, body { background: #f8f5f0; }` —— Chromium 仅 `html` 背景能覆盖 @page margin 区域）
- [x] PDF 封面、目录、分隔页、正文分页正确
- [ ] **EPUB 阅读器实测**（Apple Books / Calibre）
  - [ ] 目录导航 5 篇全部可跳转
  - [ ] 跨章节双链点击跳转目标正确
  - [ ] `blockquote` / `table` / `code` / 列表样式正确
  - [ ] 文件大小 < 5MB
- [ ] **PDF 阅读器实测**（预览 / Chrome）
  - [ ] 目录页锚点可点击
  - [ ] 文章内双链可点击
  - [ ] 字体显示为 LXGW WenKai TC
  - [ ] 页码正常
- [ ] 随机抽 3 处内部链接，确认两种格式都跳转正确

## 9. 已知问题 / 后续

- EPUB 背景色在 Apple Books 等使用自定义主题的阅读器中会被覆盖，仅尊重 CSS 的阅读器（Calibre、Readium）能看到米色背景
- Google Fonts 需联网；离线生成 PDF 需改为本地字体文件
- 总页数：1912 页（PDF）
- Puppeteer 首次安装会下载 Chromium（\~170MB），CI 环境需注意

