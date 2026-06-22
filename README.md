# 段永平投资问答录

整理段永平相关投资与经营文章的中文静态站点。技术栈：Nuxt 4 + Vue 3 + Nuxt Content v3，产物为预渲染静态文件，托管在 Cloudflare Pages。

> 面向贡献者 / Claude Code 的详细架构说明见 [`CLAUDE.md`](./CLAUDE.md)。

## 开发

```bash
npm install
npm run dev
```

## 验证

```bash
npm run typecheck
npx nuxt generate     # 本地生成 .output/public（不推送），含 sitemap.xml / robots.txt
```

## 部署

站点托管在 Cloudflare Pages，监听 GitHub 仓库并在 push 后自动构建上线：

```bash
npm run deploy                 # commit + push 当前分支 → CF 自动构建上线
npm run deploy -- "提交信息"     # 同上，自定义提交信息
npm run generate               # 本地生成成功后，也会自动 commit+push（postgenerate 钩子）
```

只想本地构建、不推送：`npx nuxt generate` 或 `SKIP_DEPLOY=1 npm run generate`。

环境变量写在根目录 `.env`（已被 `.gitignore` 忽略，参考 `.env.example`）：

```bash
NUXT_PUBLIC_SITE_URL=https://your-domain                              # 影响 sitemap / robots / JSON-LD
NUXT_PUBLIC_COMMENT_ENV_ID=https://twikoo-cloudflare.xxx.workers.dev  # Twikoo 评论后端；为空则不渲染评论区
```

## 内容维护

- 文章放在 `content/dao/<section>/*.md`（section 划分见 `CLAUDE.md`）。
- 每篇 frontmatter 必填 `title / slug / description / seoTitle / seoDescription`，可选 `category / order / date`；`slug` 全局唯一。
- 新增文章后运行 `npm run generate`，确认 `.output/public/sitemap.xml` 含新 slug。
