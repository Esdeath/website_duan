# 段永平投资问答录 EPUB/PDF 生成方案

## Context

段永平投资问答录模块有 **~85 篇** Markdown 文章（分布在 `content/dao/` 的 5 个子目录）：
- `concepts/` - 38 篇核心概念
- `speeches/` - 26 篇访谈实录
- `qanda/` - 6 篇问答录
- `investment-logic/` - 7 篇投资逻辑
- `business-logic/` - 8 篇商业逻辑

文章间通过 `[text](/library/slug)` 格式大量交叉引用（3178 处）。需要生成 EPUB 和 PDF 两种格式的电子书，保持网站"墨韵"设计系统的视觉风格，并让文章间的双链在文档内可点击跳转。

## 方案概览

创建一个 Node.js ESM 脚本 `scripts/generate-books.mjs`，读取所有 dao 文章，转换为带样式的 HTML，分别输出 EPUB 和 PDF。

## 依赖

新增 4 个 devDependencies：
- `gray-matter` — 解析 frontmatter
- `markdown-it` — Markdown → HTML（与 Nuxt Content 同系解析器）
- `epub-gen-memory` — EPUB 3.0 生成
- `puppeteer` — Headless Chromium 渲染 PDF（精确还原 CSS 样式 + CJK 排版）
> ✅ **已验证**：`qrcode` 已在 package.json 中（^1.5.4），无需额外安装

## 文件结构

```
scripts/generate-books.mjs    # 主脚本
output/                        # 输出目录（加入 .gitignore）
  段永平投资问答录.epub
  段永平投资问答录.pdf
```

## 实现步骤

### 1. 安装依赖 & 配置 npm scripts

**当前状态**：package.json 中无 book 相关脚本

**需要修改**：`package.json` 新增：
```json
"scripts": {
  "book": "node scripts/generate-books.mjs",
  "book:epub": "node scripts/generate-books.mjs --format epub",
  "book:pdf": "node scripts/generate-books.mjs --format pdf"
}
```

```bash
npm install -D gray-matter markdown-it epub-gen-memory puppeteer
```

### 2. 创建 `scripts/generate-books.mjs`

**Phase 1 — 加载 & 解析**
- 用 `fs` + glob 读取 `content/dao/**/*.md`
- `gray-matter` 解析 frontmatter（title, slug, category, order）
- 构建 `slug → article` 映射表

**Phase 2 — 组织章节**
- 按子目录分为 5 篇，顺序：
  1. 核心概念 (`concepts/`) — 内部按 `category` 再分组（核心哲学 → 投资理念 → 企业经营 → 品格与心性 → 财务指标）
  2. 访谈实录 (`speeches/`)
  3. 问答录 (`qanda/`)
  4. 投资逻辑 (`investment-logic/`)
  5. 商业逻辑 (`business-logic/`)
- 每组内按 `order` 字段排序

**Phase 3 — Markdown → HTML**
- 对原始 Markdown 做链接重写：`[text](/library/slug)` → `[text](#slug)`
- `markdown-it` 渲染为 HTML
- 每篇文章包裹 `<section id="{slug}"><h1>{title}</h1>...content...</section>`

**Phase 4 — 生成 EPUB**
- 每个"篇"作为一个 EPUB chapter（XHTML 文件）
- EPUB 内跨 chapter 链接：构建 `slug → chapterFilename` 映射，将 `#slug` 重写为 `chapterFile.xhtml#slug`
- 注入适配后的 CSS（将 CSS 变量展开为固定值，移除动画/hover）
- 不嵌入字体，CSS 中声明字体栈（设备有 LXGW WenKai TC 则自动使用）
- 元数据：书名"段永平投资问答录"，语言 zh-CN

**Phase 5 — 生成 PDF**
- 拼装完整 HTML：封面页 + 目录页 + 所有文章
- `<head>` 中引入 Google Fonts LXGW WenKai TC
- 注入完整 `.prose` CSS + `@page` 规则
- Puppeteer `page.setContent()` 加载，`waitUntil: 'networkidle0'` 等字体加载
- `page.pdf()` 参数：A4、`margin: 25mm/20mm`、`printBackground: true`、页脚页码
- 封面页设计（见下方封面设计章节）
- 目录页：按篇章列出所有文章标题，锚点链接

### 3. 更新 `.gitignore`

添加 `output/`

## 关键文件

| 文件 | 用途 | 当前状态 |
|------|------|----------|
| `app/assets/css/main.css:239-434` | `.prose` 样式，需适配提取 | ✅ 存在 |
| `content/dao/**/*.md` | 85 篇源文章 | ✅ 存在（5个子目录） |
| `content.config.ts` | frontmatter schema 定义 | ✅ 存在（title, slug, category, order） |
| `nuxt.config.ts` | Google Fonts 链接参考 | ✅ 存在（LXGW WenKai TC） |
| `package.json` | 添加依赖和 scripts | ❌ 需要修改 |
| `.gitignore` | 添加 output/ | ❌ 需要修改 |

## 内部链接处理细节

- 正则：`/\[([^\]]+)\]\(\/library\/([a-zA-Z0-9_-]+)\)/g`
- EPUB：两步重写 — 先统一改为 `#slug`，生成 chapter 后再改为 `chapterFile.xhtml#slug`（跨章节时）
- PDF：单文件，`#slug` 直接生效
- 所有链接目标 slug 都存在于 dao 集合中，无需处理孤链

## 样式适配要点

CSS 变量展开为固定值：
- `--fg: #2c2c2c`, `--accent: #b5462a`, `--bg: #f8f5f0`, `--line: #dddddd`
- `--surface: rgba(26,24,20,0.03)`, `--accent-soft: rgba(181,70,42,0.08)`
- `--reading: "LXGW WenKai TC", "Noto Serif SC", Georgia, serif`
- `--sans: "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`

PDF 额外规则：
- `@page { size: A4; margin: 25mm 20mm; }`
- `section { page-break-before: always; }` — 每篇文章起新页
- 封面和目录各占独立页

## 验证方式

1. 运行 `npm run book` 检查脚本无报错
2. 用 Apple Books / Calibre 打开 EPUB，检查：目录导航、文章间链接可跳转、blockquote/table 样式正确
3. 用预览 / Chrome 打开 PDF，检查：封面 + 目录 + 正文分页、链接可跳转、字体和配色与网页一致
4. 验证 EPUB 文件大小 < 5MB（不含字体）

