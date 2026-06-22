# Cloudflare Pages 部署指南（源码直连 + 自动构建）

本站现在用 **Cloudflare Pages 直接连 GitHub 源码仓库自动构建** 的方式部署。每次 `git push` 到
GitHub，CF 自动拉取、`nuxt generate`、发布。不再需要本地构建后手动推产物。

> 本文记录当前部署方案、完整配置，以及迁移过程中踩的坑（尤其是构建产物目录）。

## 架构总览

```
本地改内容 / 写文章
  └─ git push github <分支>
       └─ GitHub: Esdeath/investor
            └─ Cloudflare Pages 监听
                 ├─ npm clean-install
                 ├─ npx nuxt generate   (CF 自动切到 cloudflare-pages-static 预设)
                 │    └─ 产物输出到 dist/   ← 注意不是 .output/public
                 └─ 发布
                      ├─ 生产分支 minrui/duan → https://duan.ayaseeri.com
                      └─ 其它分支            → <分支名>.<项目>.pages.dev（自动预览）
```

- **源码仓库**：`git@github.com:Esdeath/investor.git`（CF 只能直连 GitHub/GitLab，连不了 gitcode）
- **生产分支**：`minrui/duan`（段永平站）
- **正式域名**：`duan.ayaseeri.com`

## Cloudflare Pages 项目配置

后台：**Workers & Pages → 你的项目 → Settings → Build & deployments**

| 配置项 | 值 |
|---|---|
| Production branch（生产分支） | `minrui/duan` |
| Framework preset | None |
| Build command | `npx nuxt generate` |
| **Build output directory** | **`dist`** ← 关键，见下方踩坑 |
| Root directory | `/`（默认） |

环境变量（**Production 和 Preview 两栏都要加**，因为 `.env` 不进 git）：

| 变量 | 值 |
|---|---|
| `NUXT_PUBLIC_SITE_URL` | `https://duan.ayaseeri.com` |
| `NUXT_PUBLIC_COMMENT_ENV_ID` | `https://twikoo-cloudflare.mymisaka.workers.dev` |
| `NODE_VERSION` | `20`（可选；实测 CF 默认的 22 也能构建） |
| `NODE_OPTIONS`（内容量大构建 OOM 时再加） | `--max-old-space-size=8192` |

## 踩坑记录（重要）

### 坑 1：构建产物目录是 `dist`，不是 `.output/public`

**现象**：构建明明成功（191 个路由全部预渲染），却在最后报：

```
Validating asset output directory
Error: Output directory ".output/public" not found.
Failed: build output directory not found
```

**原因**：本地 `nuxt generate` 产物在 `.output/public`，但 **CF 检测到是在自己环境里构建，会自动把
Nitro 预设切成 `cloudflare-pages-static`**，这个预设的产物目录是 **`dist/`**。日志可印证：

```
●  Nitro preset: cloudflare-pages-static
[success] [nitro] Generated public dist
[info] Generated dist/_headers
[info] Generated dist/_redirects
```

**解决**：CF 的 Build output directory 填 **`dist`**（不要填 `.output/public`）。

### 坑 2：构建命令不能用 `npm run generate`

`package.json` 原来有个 `postgenerate` 钩子会去跑 `scripts/deploy.sh`（git 提交 + 推送 + rsync 到
本地另一个仓库），那是旧的本地部署流程，在 CF 构建环境里会出错。

**解决**：已删掉 `postgenerate` 钩子。CF 构建命令用 **`npx nuxt generate`**（绕过 npm 生命周期钩子）。

### 坑 3：仓库里有个失效的 `dist` 软链

仓库根目录曾有一个被 git 跟踪的软链 `dist`，指向旧项目的绝对路径
`/Users/ruimin/Desktop/code/mental-model/.output/public`，本地和 CF 上都是断的，会干扰产物目录识别。

**解决**：已 `git rm dist` 删除。现在 CF 上 `nuxt generate` 会生成一个干净的真实 `dist/` 目录。

### 坑 4：环境变量必须在 CF 里配

`.env` 在 `.gitignore` 里，不会推到 GitHub。CF 自己构建时拿不到 `NUXT_PUBLIC_SITE_URL` /
`NUXT_PUBLIC_COMMENT_ENV_ID`，会导致 sitemap / JSON-LD 域名错误、评论区不渲染。

**解决**：在 CF 项目 Settings → Environment variables 里手动加（见上表）。

### 提示：D1 警告可忽略

构建日志里这条是 **警告不是错误**：

```
[warn] [@nuxt/content] Deploying to Cloudflare requires using D1 database, switching to D1 database with binding `DB`.
```

本站是全静态预渲染（所有路由生成 HTML + `__nuxt_content/dao/sql_dump.txt`，客户端用 WASM SQLite 读取），
不依赖 D1 运行时，无需创建 D1 绑定。

## 自定义域名迁移

`duan.ayaseeri.com` 同一时间只能绑在一个 Pages 项目上。从旧项目（连 `learn_duan_public` 那个）切到新项目：

1. 旧项目 → Custom domains → 删除 `duan.ayaseeri.com`
2. 新项目 → Custom domains → 添加 `duan.ayaseeri.com`
   （`ayaseeri.com` 的 DNS 在 Cloudflare 上，CNAME 会自动接好）

## 按分支预览

CF Pages 原生支持：非生产分支 push 后自动生成预览部署，网址为 `<分支名>.<项目>.pages.dev`。
**分支名里的 `/` 会被转成 `-`**：

| 分支 | 部署地址 |
|---|---|
| `minrui/duan` | `duan.ayaseeri.com`（生产） |
| `minrui/buffett` | `minrui-buffett.<项目>.pages.dev` |
| `minrui/it` | `minrui-it.<项目>.pages.dev` |

> 若某个分支要长期作为独立正式网站、绑各自的正式域名，应在同一仓库上**再建一个 Pages 项目**、
> 把它的生产分支设成那个分支，再绑该项目的自定义域名。

## 日常发布流程

```bash
# 改完内容后
git add -A
git commit -m "..."
git push github <分支>     # 推到 GitHub，CF 自动构建发布
```

- 不再需要本地 `npm run generate`，也不再用 `scripts/deploy.sh`。
- 想本地预览构建结果：`npx nuxt generate && npx nuxt preview`。

## 旧方案（已废弃，留作参考）

迁移前是「本地构建 → 推预构建产物到独立仓库 → CF 同步」：

1. 本地 `npm run generate` → `.output/public`
2. `postgenerate` 钩子跑 `scripts/deploy.sh`：源码推 gitcode、rsync 产物到
   `learn_duan_public`、再 commit + push 到 `github.com:Esdeath/learn_duan_public`
3. CF 监听 `learn_duan_public` 的 main

**缺点**：必须本地构建、链路长、且 CF 只看得到一个 main，无法按分支部署。新方案让 CF 直接构建源码后，
这套（`learn_duan_public` 仓库、旧 CF 项目、`scripts/deploy.sh`）都可以废弃。
