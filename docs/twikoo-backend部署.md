# Twikoo 评论后端部署指南（Cloudflare Workers + D1）

本站文章评论用 [Twikoo](https://twikoo.js.org)，前端已集成（见 `app/components/ArticleComments.vue`），
但评论数据需要一个后端来存储。本指南把后端部署到 **Cloudflare Workers + D1**，与站点同在 Cloudflare，
冷启动 <0.5s，`workers.dev` 国内未被墙。

> 前端如何接入、环境变量说明见根目录 `CLAUDE.md` 的「文章评论（Twikoo）」一节。

## 前置条件

- 本地有 Node.js 和 git
- 一个 Cloudflare 账号（与站点 Pages 用同一个即可）

## 一次性部署步骤

```bash
# 1. 克隆官方后端仓库并安装依赖
git clone https://github.com/twikoojs/twikoo-cloudflare.git
cd twikoo-cloudflare
npm install

# 2. 免费版 Worker 有 1MiB 打包体积限制，删掉 3 个用不上的大包（必须做）
echo "" > node_modules/jsdom/lib/api.js
echo "" > node_modules/tencentcloud-sdk-nodejs/tencentcloud/index.js
echo "" > node_modules/nodemailer/lib/nodemailer.js

# 3. 登录 Cloudflare（会打开浏览器授权）
npx wrangler login

# 4. 创建 D1 数据库
npx wrangler d1 create twikoo
```

**第 5 步（手动改文件）**：把上一步输出里的 `database_name` 和 `database_id` 两行，
粘贴进 `wrangler.toml`，替换原占位值：

```toml
[[d1_databases]]
binding = "DB"
database_name = "twikoo"
database_id = "你刚拿到的-真实-id"   # ← 改这里
```

```bash
# 6. 初始化 D1 表结构
npx wrangler d1 execute twikoo --remote --file=./schema.sql

# 7. 创建 R2 存储桶（评论图片上传用；纯文字评论也建议建好，因为配置里有 R2 绑定）
npx wrangler r2 bucket create twikoo

# 8.（可选）若要支持图片上传，在 wrangler.toml 把 R2_PUBLIC_URL 改成你的 R2 公开域名
#    只发文字评论可暂时不管这一项

# 9. 部署
npx wrangler deploy --minify
```

**第 10 步（验证）**：部署成功后命令行会打印类似
`https://twikoo-cloudflare.<你的用户名>.workers.dev`。浏览器打开它，应看到：

```json
{"code":100,"message":"Twikoo 云函数运行正常...","version":"1.6.x"}
```

看到这行即后端就绪。**这个 URL 就是 `envId`。**

## 接入本站

本站是**静态站点**：`NUXT_PUBLIC_COMMENT_ENV_ID` 在跑 `nuxt generate` 那一刻被读出、烤进 HTML/JS，
之后没有服务端能再注入。生产部署链路是 `npm run generate` →（`postgenerate` 钩子）`scripts/deploy.sh`：
提交推送源码仓库 → 把 `.output/public` rsync 到部署仓库 `learn_duan_public` 并推送 → **Cloudflare Pages
监听该仓库、托管这些已构建好的静态文件**。注意 Cloudflare Pages 这里只**托管**、不执行 Nuxt 构建，
所以在 Pages 面板里设环境变量**无效**——变量必须在**本机 `nuxt generate` 时**通过 `.env` 烤进产物。

1. 在项目根目录创建 `.env`（已被 `.gitignore` 忽略，不会进仓库）：

   ```bash
   echo 'NUXT_PUBLIC_COMMENT_ENV_ID=https://twikoo-cloudflare.<你的用户名>.workers.dev' > .env
   ```

2. 重新构建并部署：

   ```bash
   npx nuxt generate && npm run preview   # 可选：先本地验证，确认评论区出现（不触发部署）
   npm run generate                       # 正式部署：postgenerate 钩子推送部署仓库，Cloudflare Pages 自动上线
   ```

3. 上线后打开任意文章 → 滚到底部评论区 → 点右下角齿轮/管理图标 →
   **首次设置管理员密码**，以后用它登录审核、删评论、配邮件通知。

> ⚠️ `npm run generate` 经 `postgenerate` 钩子会**自动推到生产**；只想本地验证用 `npx nuxt generate`。
> 未配置 `NUXT_PUBLIC_COMMENT_ENV_ID`（或构建时 `.env` 不存在）时，文章页评论区静默不渲染，不会报错。
> 验证产物是否带上：`grep -o 'commentEnvId:"[^"]*"' .output/public/index.html`，应是你的 worker 地址而非空串。

## 要点 & 已知限制

- **国内访问稳定性**：`workers.dev` 偶尔不稳，建议给 Worker 绑自定义域名
  （Cloudflare Dashboard → Workers → 你的 worker → Custom Domains），用自定义域当 `envId` 更稳。
- **已知限制**（均不影响匿名文字评论）：
  - 不支持 SMTP 邮件 —— 要邮件通知需用 SendGrid（免费 100 封/天）或 MailChannels（免费 3000 封/月）的 HTTPS API，
    在 Twikoo 管理面板按 README 的「Configure for email notifications」配置。
  - 无 IP 归属地显示。
  - 不做 URL 尾斜杠归一化 —— 前端已显式传 `path: '/<slug>'`（见 `app/pages/[slug].vue`），无影响。
- **版本**：前端 vendored 客户端为 `public/vendor/twikoo.all.min.js`（1.7.x），后端用最新版，跨小版本兼容。

## 参考

- 官方后端仓库：<https://github.com/twikoojs/twikoo-cloudflare>
- Twikoo 文档：<https://twikoo.js.org>
- 前端配置文档：<https://twikoo.js.org/frontend.html>
