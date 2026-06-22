# 百度统计：多子域名如何分开统计

> 配套文档：[analytics-setup.md](./analytics-setup.md)
> 问题：如果有多个子域名（如 `www.ayaseeri.com`、`blog.ayaseeri.com`、`notes.ayaseeri.com`）要分别统计，后台和代码该怎么配？

百度统计是按「网站」维度管理的，主域和子域怎么算取决于你怎么注册和上报。三种典型做法：

## 方案 1：每个子域**独立统计**（最干净，推荐）

后台「网站列表 → 新增网站」每个子域分别添加：

```
https://www.ayaseeri.com       → 拿到 site_id_A
https://blog.ayaseeri.com      → 拿到 site_id_B
https://notes.ayaseeri.com     → 拿到 site_id_C
```

每个子域对应的项目独立配置自己的 `NUXT_PUBLIC_BAIDU_TONGJI_ID`，报表也分开看，数据完全隔离。

- 优点：报表清爽，每个子域独立维度，权限也可以分开授予
- 缺点：跨子域跳转的用户会被算成 2 个 UV

## 方案 2：所有子域**汇总到一个 site_id**

只注册 `https://www.ayaseeri.com` 一个 site_id，所有子域的 `hm.js?<id>` 都引用同一个 token。

后台「管理 → 网站列表 → 设置 → 站点信息」里把「跨子域名统计」打开（cookie 会写到 `.ayaseeri.com` 顶级域），UV 就能跨子域去重。报表里看「受访页面」时 URL 自带主机名，可以筛选 `host:blog.ayaseeri.com` 单独看子域数据。

- 优点：UV 跨子域去重，符合「同一个用户」的直觉
- 缺点：单一报表，子域多了视图乱，筛选不如独立网站清爽

## 方案 3：**混合**——主站独立 + 重要子域独立 + 边缘子域合并

适合「主站、博客、文档站」这种主次分明的情况：

- `www` 一个 site_id
- `blog` 一个 site_id
- 临时/边缘子域共用 `www` 的 site_id

---

## 怎么选

| 场景 | 推荐 |
|---|---|
| 每个子域是**独立项目、独立内容**（比如 blog 是 Ghost、main 是 Nuxt） | 方案 1 |
| 子域只是**主站的不同入口**，用户经常跨子域跳转 | 方案 2 |
| 项目数 ≥ 3 且重要性差异大 | 方案 3 |

---

## 在 Nuxt 项目里的具体做法

### 情况 A：不同 Nuxt 项目部署到不同子域（最常见）

每个项目根目录的 `.env` 各自填自己的 site_id，互不影响：

```bash
# website_investor/.env  →  www.ayaseeri.com
NUXT_PUBLIC_BAIDU_TONGJI_ID=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

# another_project/.env   →  blog.ayaseeri.com
NUXT_PUBLIC_BAIDU_TONGJI_ID=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
```

每个项目走自己的 `plugins/baidu-tongji.client.ts`（见 [analytics-setup.md](./analytics-setup.md)），各管各的。

### 情况 B：同一个 Nuxt 项目同时服务多个子域（少见）

如果一个 Nuxt 项目通过 host 路由出多个子域内容（同源代码、不同域名），需要在插件里根据 `window.location.hostname` 动态选 site_id：

```ts
// plugins/baidu-tongji.client.ts（多子域版本示意）
const SITE_ID_MAP: Record<string, string> = {
  'www.ayaseeri.com': 'aaaaaaaa...',
  'blog.ayaseeri.com': 'bbbbbbbb...',
  'notes.ayaseeri.com': 'cccccccc...'
}

export default defineNuxtPlugin((nuxtApp) => {
  const host = window.location.hostname
  const siteId = SITE_ID_MAP[host]
  if (!siteId) return

  window._hmt = window._hmt || []
  const s = document.createElement('script')
  s.async = true
  s.src = `https://hm.baidu.com/hm.js?${siteId}`
  document.head.appendChild(s)

  nuxtApp.$router.afterEach((to) => {
    window._hmt.push(['_trackPageview', to.fullPath])
  })
})
```

---

## 站点所有权验证（多子域版）

每个独立的 site_id 都需要单独验证。`baidu-site-verification` meta 的内容每个站点不同。如果一个 Nuxt 项目对应一个子域、一个 site_id，按 [analytics-setup.md 第 2 步](./analytics-setup.md) 在 `nuxt.config.ts` 里写死就行。如果是情况 B（一个项目多个子域），需要在 `useHead` 里根据当前 host 动态注入对应的 verification meta。
