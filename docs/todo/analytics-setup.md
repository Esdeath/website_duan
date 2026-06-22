# 网站访问统计接入 Todo（百度统计）

> 目标：为 ayaseeri.com 接入访问统计，收集 PV/UV、IP 地域、外部跳转来源、受访文章、停留时长、跳出率。
> 选型：百度统计（hm.baidu.com）。读者以国内为主，GA 在大陆被屏蔽不可用；百度统计免费、加载快、原生覆盖全部指标。
> 部署链路：本地 `npm run generate` → 拷贝 `.output/public/` 到 `~/Desktop/code/learn_duan_public/` → `git push` → Cloudflare Pages 自动发布。

## 0. 前置准备（百度后台一次性操作）

- [ ] 登录 [tongji.baidu.com](https://tongji.baidu.com) 注册账号
- [ ] 「网站列表 → 新增网站」添加 `https://www.ayaseeri.com`
- [ ] 复制 32 位 `site_id`（即 `hm.js?` 后那串），后面作为 `NUXT_PUBLIC_BAIDU_TONGJI_ID`
- [ ] 记下后台的 `baidu-site-verification` 验证码（用于第 2 步可选验证）

## 1. 新增客户端插件 `plugins/baidu-tongji.client.ts`

> 文件名必须以 `.client.ts` 结尾，保证仅浏览器执行，不污染 SSG 预渲染 HTML。

- [ ] 创建文件 `plugins/baidu-tongji.client.ts`
- [ ] 用 `defineNuxtPlugin((nuxtApp) => { ... })` 包裹
- [ ] 从 `useRuntimeConfig().public.baiduTongjiId` 读 token；为空直接 return（本地开发默认不上报）
- [ ] 初始化 `window._hmt = window._hmt || []`
- [ ] 动态创建 `<script async src="https://hm.baidu.com/hm.js?<token>">` 注入 `document.head`
- [ ] 通过 `nuxtApp.$router.afterEach((to) => window._hmt.push(['_trackPageview', to.fullPath]))` 监听 SPA 路由切换
- [ ] TypeScript：文件顶部 `declare global { interface Window { _hmt: any[] } }`，避免类型报错

## 2. 修改 `nuxt.config.ts`

- [ ] 在 `runtimeConfig.public` 加：
  ```ts
  baiduTongjiId: process.env.NUXT_PUBLIC_BAIDU_TONGJI_ID || ''
  ```
- [ ] （可选）在 `app.head.meta` 加站点所有权验证：
  ```ts
  { name: 'baidu-site-verification', content: '<后台给的验证码>' }
  ```

## 3. 本地环境变量

- [ ] 项目根目录新建 `.env`（已被 `.gitignore` 忽略，安全）：
  ```
  NUXT_PUBLIC_BAIDU_TONGJI_ID=<32位site_id>
  ```
- [ ] Nuxt 在 `npm run generate` 时会自动加载，token 被烘焙进静态 HTML
- [ ] 这是预期行为 —— 百度统计的 site_id 本来就是公开的、要让浏览器看到

## 4. 本地验证

- [ ] `npm run dev`，打开首页，DevTools Network 过滤 `hm.` → 应看到 `hm.js?<id>` + `hm.gif?...` 各一次
- [ ] 点击侧栏任一文章链接进入 `/<slug>` → Network 应出现**第二次** `hm.gif`，URL 参数带新路径
  - 这一步是验证 `afterEach` 钩子是否生效的关键，**必须确认**
- [ ] 临时把 `.env` 里的 `NUXT_PUBLIC_BAIDU_TONGJI_ID` 留空，重启 dev → **不应**有任何 `hm.baidu.com` 请求（验证默认关闭）

## 5. 生产发布

- [ ] `npm run generate`
- [ ] 把 `.output/public/` 内容复制到 `~/Desktop/code/learn_duan_public/`
- [ ] `cd ~/Desktop/code/learn_duan_public/ && git add . && git commit -m "feat: 接入百度统计" && git push`
- [ ] Cloudflare Pages 自动检测并发布（约 1–2 分钟）
- [ ] 部署完，浏览器打开 `https://www.ayaseeri.com`，查看页面源码或 Network，确认 `hm.baidu.com/hm.js?<id>` 加载成功

## 6. 后台数据验证

- [ ] 10–30 分钟内，百度统计后台「实时访客」看到自己的访问
- [ ] 24 小时后，分别打开这些面板确认数据进来：
  - [ ] 「访客分析 → 地域」→ IP 地域分布
  - [ ] 「来源分析 → 全部来源」→ 外部跳转来源（含搜索词、外链）
  - [ ] 「受访分析 → 受访页面」→ 每篇文章 PV、平均停留时长、跳出率
  - [ ] 「趋势分析」→ 日 PV/UV 趋势

## 7. 后续可选增强（不在本次范围）

- [ ] **Cloudflare Web Analytics**：在 CF Pages 控制台一键开启，免费、隐私友好，自动给 PV/referer/path/country —— 但**不含停留时长**。可作为「不依赖 JS / 防 adblock」的补充数据源。
- [ ] **自定义事件**：`_hmt.push(['_trackEvent', 'article', 'read_complete', slug])` 用于「读完一篇」「滚动到底」等深度行为
- [ ] **Umami Cloud**：覆盖海外读者数据（百度统计对海外 IP 识别较弱）

## 风险提示

- 百度统计 `hm.js` 体积约 13KB，会增加首屏 1 次第三方请求 —— 通过 `async` 加载，不阻塞渲染
- 装了 adblock 的用户会被屏蔽（占比通常 < 5%）—— 数据偏低是预期的
- Cloudflare 缓存静态 HTML —— 首次部署后旧访客可能短时间内访问的是旧 HTML，没注入脚本；隔天就齐了
