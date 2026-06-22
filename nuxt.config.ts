export default defineNuxtConfig({
  modules: ["@nuxt/content"],
  css: ["~/assets/css/main.css"],
  compatibilityDate: "2026-04-27",
  devtools: { enabled: true },
  app: {
    head: {
      htmlAttrs: { lang: "zh-CN" },
      meta: [
        { name: "theme-color", content: "#f9f6f1" },
        { name: "format-detection", content: "telephone=no" },
        {
          name: "keywords",
          content:
            "段永平,大道,芒格,查理芒格,巴菲特,价值投资,安全边际,商业模式,生意模式,企业文化,管理层,价值观,能力圈",
        },
        {
          name: "description",
          content: "整理段永平投资问答录，关于投资与商业本质的思考集。",
        },
        { property: "og:site_name", content: "段永平投资问答录" },
        { property: "og:locale", content: "zh_CN" },
      ],
      script: [
        {
          innerHTML: `(function(){try{var t=localStorage.getItem('theme');if(!t)t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}})()`,
          type: "text/javascript",
        },
        {
          type: "application/ld+json",
          innerHTML: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "段永平投资问答录",
            url: process.env.NUXT_PUBLIC_SITE_URL,
            description: "整理段永平投资问答录，关于投资与商业本质的思考集。",
            inLanguage: "zh-CN",
          }),
        },
        {
          innerHTML: `var _hmt = _hmt || [];
            (function() {
              var hm = document.createElement("script");
              hm.src = "https://hm.baidu.com/hm.js?e97a58a44fcce296ad36ac8b713018ef";
              var s = document.getElementsByTagName("script")[0];
              s.parentNode.insertBefore(hm, s);
            })();`,
          type: "text/javascript",
        },
      ],
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=LXGW+WenKai+TC&family=Crimson+Pro:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap",
        },
      ],
    },
  },
  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL,
      // Twikoo 评论后端地址（Cloudflare Worker URL）；为空则文章页不渲染评论区
      commentEnvId: process.env.NUXT_PUBLIC_COMMENT_ENV_ID,
    },
  },
  nitro: {
    prerender: {
      crawlLinks: true,
      concurrency: 5,
      routes: ["/sitemap.xml", "/robots.txt", "/llms.txt", "/llms-full.txt"],
    },
  },
});
