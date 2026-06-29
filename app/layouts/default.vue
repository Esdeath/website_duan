<script setup lang="ts">
const { theme, toggle: toggleTheme } = useTheme()

const daoCategoryOrder = ['核心哲学', '投资理念', '企业经营', '品格与心性', '财务指标', '访谈实录', '投资问答录', '公司与人物']

const { data: daoArticles } = await useAsyncData('layout-dao', () =>
  queryCollection('dao').select('title', 'slug', 'description', 'category', 'order', 'type', 'body').order('order', 'ASC').all()
)

const sections = computed(() => [
  { name: '段永平投资问答录', articles: (daoArticles.value as any) || [], categoryOrder: daoCategoryOrder }
])

const mobileMenuOpen = ref(false)
const mainArea = ref<HTMLElement | null>(null)
const route = useRoute()
const currentSlug = computed(() => String(route.params.slug || ''))

watch(() => route.path, () => {
  mobileMenuOpen.value = false
  nextTick(() => {
    mainArea.value?.scrollTo({ top: 0, behavior: 'instant' })
  })
})
</script>

<template>
  <div class="shell">
    <LibrarySidebar
      :sections="sections"
      :current-slug="currentSlug"
      :theme="theme"
      class="desktop-sidebar"
      @toggle-theme="toggleTheme"
    />

    <div ref="mainArea" class="main-area">
      <!-- Mobile top bar -->
      <div class="mobile-topbar">
        <button class="mobile-menu-btn" @click="mobileMenuOpen = true" aria-label="打开目录">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>
        <button class="mobile-theme-btn" :aria-label="theme === 'dark' ? '切换亮色模式' : '切换暗色模式'" @click="toggleTheme">
          <svg v-if="theme === 'dark'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>
      </div>

      <main>
        <slot />
      </main>
    </div>

    <!-- Mobile drawer -->
    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="mobileMenuOpen" class="mobile-overlay" @click="mobileMenuOpen = false">
          <div class="mobile-drawer" @click.stop>
            <div class="mobile-drawer-head">
              <span>目录</span>
              <button class="mobile-close" @click="mobileMenuOpen = false" aria-label="关闭">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
              </button>
            </div>
            <LibrarySidebar
              :sections="sections"
              :current-slug="currentSlug"
              :theme="theme"
              @toggle-theme="toggleTheme"
            />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  height: 100dvh;
  min-height: 100vh;
  overflow: hidden;
  max-width: 1440px;
  margin: 0 auto;
}

.desktop-sidebar {
  height: 100dvh;
  min-height: 0;
}

.main-area {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  scroll-behavior: smooth;
}

.mobile-topbar {
  display: none;
}

/* Mobile drawer */
.mobile-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.mobile-drawer {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: min(340px, 88vw);
  background: var(--bg);
  display: flex;
  flex-direction: column;
  box-shadow: 8px 0 32px rgba(0, 0, 0, 0.1);
}

.mobile-drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: 0.02em;
  flex-shrink: 0;
}

.mobile-close {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.mobile-close:hover {
  background: var(--surface);
  color: var(--fg);
}

.mobile-drawer :deep(.sidebar) {
  position: static;
  height: auto;
  flex: 1;
  overflow-y: auto;
  border-right: none;
}

/* Drawer transition */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.3s var(--ease-out);
}

.drawer-enter-active .mobile-drawer,
.drawer-leave-active .mobile-drawer {
  transition: transform 0.35s var(--ease-out);
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .mobile-drawer,
.drawer-leave-to .mobile-drawer {
  transform: translateX(-100%);
}

@media (max-width: 1024px) {
  .shell {
    grid-template-columns: 1fr;
  }

  .desktop-sidebar {
    display: none;
  }

  .mobile-topbar {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px var(--px);
    border-bottom: 1px solid var(--line);
    background: color-mix(in srgb, var(--bg) 92%, transparent);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    flex-shrink: 0;
  }

  .mobile-menu-btn,
  .mobile-theme-btn {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    transition: color 0.2s, border-color 0.2s;
  }

  .mobile-menu-btn:hover,
  .mobile-theme-btn:hover {
    color: var(--fg);
    border-color: var(--fg);
  }
}

@media (min-width: 1025px) {
  .mobile-overlay {
    display: none;
  }
}
</style>
