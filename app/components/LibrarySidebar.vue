<script setup lang="ts">
type Article = { title: string; slug: string; category: string; order: number; type?: string }

const props = defineProps<{
  sections: Array<{
    name: string
    articles: Article[]
    categoryOrder?: string[]
  }>
  currentSlug: string
  theme?: string
}>()

const emit = defineEmits<{
  toggleTheme: []
}>()

type ArticleSubgroup = { label: string; items: Article[] }
type Group = { category: string; items: Article[]; count: number; subgroups: ArticleSubgroup[] }

const articleTypeLabels: Record<string, string> = {
  index: '概览',
  company: '公司',
  person: '人物',
  topic: '专题',
}

const articleTypeOrder = ['index', 'company', 'person', 'topic']

function getSubgroups(category: string, items: Article[]): ArticleSubgroup[] {
  if (category !== '公司与人物') {
    return [{ label: '', items }]
  }

  const map = new Map<string, Article[]>()
  for (const item of items) {
    const type = item.type || 'other'
    const list = map.get(type) || []
    list.push(item)
    map.set(type, list)
  }

  const orderedTypes = [
    ...articleTypeOrder.filter((type) => map.has(type)),
    ...Array.from(map.keys()).filter((type) => !articleTypeOrder.includes(type)),
  ]

  return orderedTypes.map((type) => ({
    label: articleTypeLabels[type] || '其他',
    items: map.get(type)!,
  }))
}

// Flatten: since there's only one section, go straight to categories
const groups = computed(() => {
  const section = props.sections[0]
  if (!section) return []

  const map = new Map<string, Article[]>()
  for (const article of section.articles) {
    const list = map.get(article.category) || []
    list.push(article)
    map.set(article.category, list)
  }

  if (section.categoryOrder) {
    return section.categoryOrder
      .filter((cat) => map.has(cat))
      .map((cat) => {
        const items = map.get(cat)!
        return { category: cat, items, count: items.length, subgroups: getSubgroups(cat, items) }
      })
  }

  return Array.from(map.entries()).map(([cat, items]) => ({
    category: cat,
    items,
    count: items.length,
    subgroups: getSubgroups(cat, items)
  }))
})

// Auto-open category of current article
const currentCategory = computed(() => {
  const section = props.sections[0]
  if (!section) return null
  const article = section.articles.find((a) => a.slug === props.currentSlug)
  return article?.category || null
})

const openCategories = ref(new Set<string>(
  currentCategory.value ? [currentCategory.value] : []
))

function onToggleCategory(cat: string, event: Event) {
  const details = event.target as HTMLDetailsElement
  if (details.open) {
    openCategories.value.add(cat)
  } else {
    openCategories.value.delete(cat)
  }
}

const activeRef = ref<HTMLElement | null>(null)
const navRef = ref<HTMLElement | null>(null)

function scrollToActive(behavior: ScrollBehavior = 'instant') {
  nextTick(() => {
    const el = (activeRef.value as { $el?: HTMLElement } | null)?.$el || activeRef.value
    const container = navRef.value
    if (!el || !container) return

    const elRect = el.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    const offset = elRect.top - containerRect.top - container.clientHeight / 2 + el.clientHeight / 2

    container.scrollBy({ top: offset, behavior })
  })
}

onMounted(() => {
  scrollToActive('instant')
})

watch(() => props.currentSlug, () => {
  scrollToActive('smooth')
})
</script>

<template>
  <aside class="sidebar">
    <header class="sidebar-header">
      <NuxtLink to="/" class="sidebar-brand">
        <!-- Seal / stamp logo — a stylized 道 character in a rounded square -->
        <svg class="brand-seal" width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="26" height="26" rx="4" stroke="currentColor" stroke-width="1.5"/>
          <text x="14" y="20.5" text-anchor="middle" font-family="serif" font-size="17" font-weight="700" fill="currentColor">道</text>
        </svg>
        <span class="brand-text">段永平投资问答录</span>
      </NuxtLink>
    </header>

    <div ref="navRef" class="sidebar-nav">
      <details
        v-for="group in groups"
        :key="group.category"
        class="category-group"
        :open="openCategories.has(group.category)"
        @toggle="onToggleCategory(group.category, $event)"
      >
        <summary class="category-summary">
          <svg class="chevron" width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="category-label">{{ group.category }}</span>
          <span class="category-count">{{ group.count }}</span>
        </summary>

        <div class="article-list">
          <div v-for="subgroup in group.subgroups" :key="subgroup.label || group.category" class="article-subgroup">
            <div v-if="subgroup.label" class="article-subgroup-label">{{ subgroup.label }}</div>
            <nav class="article-subgroup-links" :aria-label="subgroup.label || group.category">
              <NuxtLink
                v-for="article in subgroup.items"
                :key="article.slug"
                :ref="article.slug === currentSlug ? (el) => { activeRef = el as any } : undefined"
                :to="`/${article.slug}`"
                :class="{ active: article.slug === currentSlug }"
              >
                {{ article.title }}
              </NuxtLink>
            </nav>
          </div>
        </div>
      </details>
    </div>

    <div class="sidebar-footer">
      <button
        class="theme-toggle"
        :aria-label="theme === 'dark' ? '切换亮色模式' : '切换暗色模式'"
        @click="emit('toggleTheme')"
      >
        <Transition name="icon-flip" mode="out-in">
          <svg v-if="theme === 'dark'" key="sun" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg v-else key="moon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </Transition>
      </button>
      <a class="icp-link" href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">浙ICP备17053536号-2</a>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  /* Inverted theme: light site → dark sidebar, dark site → light sidebar */
  --sb-bg: #1e1e1e;
  --sb-fg: #ffffff;
  --sb-muted: #d0ccc6;
  --sb-subtle: #b5b0aa;
  --sb-line: #333;
  --sb-surface: rgba(255, 255, 255, 0.05);
  --sb-accent: #e07a5a;
  --sb-accent-soft: rgba(224, 122, 90, 0.12);

  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--sb-line);
  background: var(--sb-bg);
  color: var(--sb-fg);
}

:global(html.dark) .sidebar {
  --sb-bg: #f4f0eb;
  --sb-fg: #2c2c2c;
  --sb-muted: #777;
  --sb-subtle: #999;
  --sb-line: #ddd;
  --sb-surface: rgba(0, 0, 0, 0.04);
  --sb-accent: #b5462a;
  --sb-accent-soft: rgba(181, 70, 42, 0.1);
}

/* ── Header / Brand ── */
.sidebar-header {
  flex-shrink: 0;
  padding: 24px 20px 20px;
  border-bottom: 1px solid var(--sb-line);
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--sb-fg);
  transition: color 0.25s var(--ease-out);
}

.sidebar-brand:hover {
  color: var(--sb-accent);
}

.brand-seal {
  flex-shrink: 0;
  color: var(--sb-accent);
  transition: transform 0.3s var(--ease-out);
}

.sidebar-brand:hover .brand-seal {
  transform: scale(1.06);
}

.brand-text {
  font-family: var(--reading);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--sb-fg);
}

/* ── Navigation ── */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 10px 24px;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--sb-line) 50%, transparent) transparent;
}

.sidebar-nav::-webkit-scrollbar {
  width: 3px;
}

.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--sb-line) 50%, transparent);
  border-radius: 3px;
}

.sidebar-nav:hover::-webkit-scrollbar-thumb {
  background: var(--sb-subtle);
}

/* Category */
.category-group + .category-group {
  margin-top: 1px;
}

.category-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  list-style: none;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--sb-muted);
  user-select: none;
  transition: background 0.2s var(--ease-out), color 0.2s var(--ease-out);
}

.category-summary::-webkit-details-marker {
  display: none;
}

.category-summary:hover {
  background: var(--sb-surface);
  color: var(--sb-fg);
}

.category-label {
  flex: 1;
  min-width: 0;
}

.category-count {
  font-size: 10px;
  font-weight: 500;
  color: color-mix(in srgb, var(--sb-subtle) 70%, transparent);
  font-variant-numeric: tabular-nums;
}

/* Chevron */
.chevron {
  flex-shrink: 0;
  color: color-mix(in srgb, var(--sb-subtle) 60%, transparent);
  transition: transform 0.25s var(--ease-out), color 0.25s var(--ease-out);
}

.category-summary:hover .chevron {
  color: var(--sb-subtle);
}

.category-group[open] > .category-summary > .chevron {
  transform: rotate(90deg);
}

/* Article links */
.article-list {
  display: flex;
  flex-direction: column;
  padding: 2px 0 6px 18px;
  margin-left: 4px;
  border-left: 1px solid color-mix(in srgb, var(--sb-line) 60%, transparent);
}

.article-subgroup + .article-subgroup {
  margin-top: 8px;
}

.article-subgroup-label {
  padding: 8px 10px 3px;
  font-size: 10px;
  line-height: 1.2;
  font-weight: 700;
  color: color-mix(in srgb, var(--sb-muted) 72%, transparent);
  letter-spacing: 0.12em;
}

.article-subgroup-links {
  display: flex;
  flex-direction: column;
}

.article-list a {
  display: block;
  padding: 4px 10px;
  margin-left: -1px;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--sb-subtle);
  border-left: 2px solid transparent;
  border-radius: 0 4px 4px 0;
  transition: color 0.2s var(--ease-out), background 0.2s var(--ease-out), border-color 0.2s var(--ease-out);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.article-list a:hover {
  color: var(--sb-fg);
  background: var(--sb-surface);
}

.article-list a.active {
  color: var(--sb-accent);
  font-weight: 600;
  border-left-color: var(--sb-accent);
  background: var(--sb-accent-soft);
}

/* ── Footer ── */
.sidebar-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-top: 1px solid color-mix(in srgb, var(--sb-line) 50%, transparent);
}

.icp-link {
  font-size: 10px;
  color: color-mix(in srgb, var(--sb-subtle) 60%, transparent);
  transition: color 0.2s var(--ease-out);
}

.icp-link:hover {
  color: var(--sb-subtle);
}

.theme-toggle {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--sb-line);
  border-radius: 8px;
  background: transparent;
  color: var(--sb-muted);
  cursor: pointer;
  transition: color 0.2s var(--ease-out), border-color 0.2s var(--ease-out), background 0.2s var(--ease-out);
}

.theme-toggle:hover {
  color: var(--sb-fg);
  border-color: color-mix(in srgb, var(--sb-fg) 30%, transparent);
  background: var(--sb-surface);
}

/* Icon flip transition */
.icon-flip-enter-active,
.icon-flip-leave-active {
  transition: transform 0.25s var(--ease-out), opacity 0.2s;
}

.icon-flip-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.8);
}

.icon-flip-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.8);
}

@media (max-width: 1024px) {
  .sidebar-header {
    padding: 20px 18px 16px;
  }

  .brand-text {
    font-size: 15px;
    letter-spacing: 0.05em;
  }

  .sidebar-nav {
    padding: 8px 8px 20px;
  }

  .category-summary {
    padding: 10px 10px;
    font-size: 14px;
  }

  .article-list {
    padding-left: 16px;
  }

  .article-list a {
    padding: 6px 10px;
    font-size: 13px;
  }

  .sidebar-footer {
    padding: 14px 18px;
  }

  .icp-link {
    font-size: 10px;
  }

  .theme-toggle {
    width: 34px;
    height: 34px;
  }
}
</style>
