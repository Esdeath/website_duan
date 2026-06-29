<script setup lang="ts">
const route = useRoute()
const slug = computed(() => String(route.params.slug))

// Find the article in dao collection
const { data: page, error } = await useAsyncData(`dao-${slug.value}`, async () => {
  const dao = await queryCollection('dao').where('slug', '=', slug.value).first()
  if (dao) return { ...dao, _collection: 'dao' }
  return null
})

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: '文章不存在' })
}

const tocLinks = computed(() => (page.value as any)?.body?.toc?.links || [])
const eyebrow = computed(() => (page.value as any)?.category || '')

const activeId = ref('')

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeId.value = entry.target.id
          break
        }
      }
    },
    { rootMargin: '0px 0px -80% 0px', threshold: 0 }
  )
  nextTick(() => {
    for (const link of tocLinks.value) {
      const el = document.getElementById(link.id)
      if (el) observer.observe(el)
    }
  })
  onUnmounted(() => observer.disconnect())
})

const config = useRuntimeConfig()
const siteUrl = String(config.public.siteUrl || '').replace(/\/$/, '')

const pageData = computed(() => page.value as any)
const articleUrl = computed(() => `${siteUrl}/${pageData.value?.slug}`)
const isQanda = computed(() => {
  const path = String((pageData.value as any)?._path || (pageData.value as any)?.path || '')
  return path.includes('/qanda/') || pageData.value?.category === '投资问答录'
})

const duanyongpingPerson = {
  '@type': 'Person',
  name: '段永平',
  alternateName: ['Duan Yongping', 'BBQ'],
  description: '步步高、OPPO、vivo 创始人；心平基金创办人；价值投资者。',
  sameAs: [
    'https://xueqiu.com/u/1247347556',
    'https://www.oppo.com/',
    'https://zh.wikipedia.org/wiki/%E6%AE%B5%E6%B0%B8%E5%B9%B3',
  ],
}

const sourceInfo = computed(() => {
  const d = pageData.value
  if (!d) return null
  if (!d.source && !d.sourceUrl && !d.sourceDate) return null
  return {
    source: d.source as string | undefined,
    sourceUrl: d.sourceUrl as string | undefined,
    sourceDate: d.sourceDate as string | undefined,
  }
})

useSeoMeta({
  title: () => pageData.value?.seoTitle || `${pageData.value?.title}｜段永平投资问答录`,
  description: () => pageData.value?.seoDescription || pageData.value?.description,
  ogTitle: () => pageData.value?.title,
  ogDescription: () => pageData.value?.description,
  ogType: 'article',
  twitterCard: 'summary_large_image',
  ogImage: `${siteUrl}/og-image.png`,
})

const articleSchema = computed(() => {
  const d = pageData.value
  if (!d) return null
  const published = d.sourceDate || d.date
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': isQanda.value ? 'QAPage' : 'Article',
    headline: d.title,
    name: d.title,
    description: d.seoDescription || d.description,
    url: articleUrl.value,
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl.value },
    inLanguage: 'zh-CN',
    isPartOf: { '@type': 'WebSite', name: '段永平投资问答录｜段永平投资问答录', url: siteUrl },
    author: duanyongpingPerson,
    about: duanyongpingPerson,
    publisher: { '@type': 'Organization', name: '段永平投资问答录｜段永平投资问答录', url: siteUrl },
    image: `${siteUrl}/og-image.png`,
  }
  if (published) {
    schema.datePublished = published
    schema.dateModified = published
  }
  if (d.category) schema.articleSection = d.category
  if (d.source || d.sourceUrl) {
    schema.citation = [
      {
        '@type': 'CreativeWork',
        ...(d.source ? { name: d.source } : {}),
        ...(d.sourceUrl ? { url: d.sourceUrl } : {}),
        ...(d.sourceDate ? { datePublished: d.sourceDate } : {}),
      },
    ]
  }
  return schema
})

const breadcrumbSchema = computed(() => {
  const d = pageData.value
  if (!d) return null
  const items: any[] = [{ '@type': 'ListItem', position: 1, name: '首页', item: siteUrl }]
  if (d.category) {
    items.push({ '@type': 'ListItem', position: 2, name: d.category })
    items.push({ '@type': 'ListItem', position: 3, name: d.title, item: articleUrl.value })
  } else {
    items.push({ '@type': 'ListItem', position: 2, name: d.title, item: articleUrl.value })
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  }
})

useHead({
  link: [{ rel: 'canonical', href: articleUrl.value }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify(articleSchema.value)),
    },
    {
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify(breadcrumbSchema.value)),
    },
  ],
})
</script>

<template>
  <div v-if="page" class="article-page">
    <header class="article-header">
      <p class="eyebrow">{{ eyebrow }}</p>
      <h1>{{ (page as any).title }}</h1>
      <p class="desc">{{ (page as any).description }}</p>
      <ShareButtons :title="(page as any).title" :description="(page as any).description" :slug="slug" />
    </header>

    <div class="article-content">
      <article class="article-body">
        <ContentRenderer class="prose" :value="page" />
        <footer v-if="sourceInfo" class="article-source">
          <p class="source-label">原始出处</p>
          <p class="source-body">
            <a v-if="sourceInfo.sourceUrl" :href="sourceInfo.sourceUrl" target="_blank" rel="noopener nofollow">{{ sourceInfo.source || sourceInfo.sourceUrl }}</a>
            <span v-else-if="sourceInfo.source">{{ sourceInfo.source }}</span>
            <span v-if="sourceInfo.sourceDate" class="source-date">{{ sourceInfo.sourceDate }}</span>
          </p>
        </footer>
        <ArticleComments :key="slug" :path="'/' + slug" />
      </article>

      <aside v-if="tocLinks.length" class="article-toc" aria-label="文章目录">
        <p>目录</p>
        <nav>
          <a v-for="link in tocLinks" :key="link.id" :href="`#${link.id}`" :class="{ active: activeId === link.id }">{{ link.text }}</a>
        </nav>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.article-page {
  padding: 0 var(--px) 64px;
  animation: fadeInUp 0.5s var(--ease-out) 0.1s both;
}

.article-header {
  max-width: var(--reading-width);
  margin: 24px 0 28px;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--line);
}

.article-content {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  max-width: var(--reading-width);
}

.article-body {
  min-width: 0;
}

.eyebrow {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--subtle);
}

.article-header h1 {
  margin: 14px 0 0;
  font-family: var(--sans);
  font-size: 28px;
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: 0;
}

.article-header .desc {
  margin: 16px 0 0;
  color: var(--muted);
  font-family: var(--reading);
  font-size: 15px;
  line-height: 1.75;
}

/* 原始出处 footer */
.article-source {
  margin-top: 48px;
  padding-top: 20px;
  border-top: 1px dashed var(--line);
}

.source-label {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--subtle);
}

.source-body {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--muted);
  line-height: 1.6;
}

.source-body a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
}

.source-body a:hover {
  border-bottom-color: var(--accent);
}

.source-date {
  margin-left: 10px;
  color: var(--subtle);
  font-variant-numeric: tabular-nums;
}

/* TOC — sticky in the right grid column */
.article-toc {
  display: none;
  position: sticky;
  top: 48px;
  align-self: start;
  max-height: calc(100vh - 96px);
  overflow-y: auto;
  padding-left: 16px;
}

.article-toc p {
  margin: 0 0 14px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--subtle);
}

.article-toc nav {
  display: grid;
  gap: 2px;
}

.article-toc a {
  display: block;
  padding: 4px 0;
  padding-right: 12px;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
  transition: none;
  white-space: normal;
  word-break: break-all;
  border-right: 2px solid transparent;
}

.article-toc a:hover {
  color: var(--fg);
}

.article-toc a.active {
  color: var(--fg);
  font-weight: 600;
  border-right-color: #c0392b;
}

@media (min-width: 721px) {
  .article-header {
    margin: 34px 0 36px;
    padding-bottom: 26px;
  }

  .article-header h1 {
    font-size: 34px;
    line-height: 1.25;
  }
}

@media (min-width: 1025px) {
  .article-page {
    padding-bottom: 96px;
  }

  .article-header {
    margin: 40px 0;
    padding-bottom: 28px;
  }

  .article-header h1 {
    font-size: 36px;
    letter-spacing: -0.02em;
  }

  .article-header .desc {
    font-size: 16px;
    line-height: 1.8;
  }

  .article-content {
    grid-template-columns: minmax(0, 1fr) 180px;
    gap: 24px;
  }

  .article-toc {
    display: block;
  }
}
</style>
