<script setup lang="ts">
import QRCode from 'qrcode'

const props = defineProps<{
  title: string
  description: string
  slug: string
}>()

const config = useRuntimeConfig()
const siteUrl = computed(() => String(config.public.siteUrl || 'https://duan.ayaseeri.com').replace(/\/$/, ''))
const articleUrl = computed(() => `${siteUrl.value}/${props.slug}`)
const displayHost = computed(() => siteUrl.value.replace(/^https?:\/\//, ''))

const copied = ref(false)
const generating = ref(false)

async function shareText() {
  const text = `${props.title}\n${props.description}\n${articleUrl.value}`

  if (navigator.share) {
    try {
      await navigator.share({ title: props.title, text: props.description, url: articleUrl.value })
      return
    } catch { }
  }

  await navigator.clipboard.writeText(text)
  copied.value = true
  setTimeout(() => { copied.value = false }, 1500)
}

function isDark() {
  return document.documentElement.classList.contains('dark')
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, maxWidth: number, lineHeight: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const char of text) {
    const test = line + char
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = char
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

async function shareImage() {
  generating.value = true
  try {
    const dark = isDark()
    const bg = dark ? '#1a1a1a' : '#f8f5f0'
    const fg = dark ? '#ffffff' : '#2c2c2c'
    const muted = dark ? '#999999' : '#777777'
    const accent = dark ? '#e07a5a' : '#b5462a'

    const W = 750
    const PAD = 60
    const contentW = W - PAD * 2
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    // Measure text heights first
    ctx.canvas.width = W
    ctx.canvas.height = 2000 // temp

    // Title
    ctx.font = `bold 42px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`
    const titleLines = wrapText(ctx, props.title, PAD, contentW, 56)

    // Description
    ctx.font = `28px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`
    const descLines = wrapText(ctx, props.description, PAD, contentW, 42)

    // Calculate total height
    const qrSize = 200
    const titleH = titleLines.length * 56
    const descH = descLines.length * 42
    const H = PAD + titleH + 32 + descH + 48 + qrSize + 36 + 24 + PAD

    canvas.width = W
    canvas.height = H

    // Background
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // Top accent line
    ctx.fillStyle = accent
    ctx.fillRect(PAD, PAD - 16, 40, 4)

    // Title
    ctx.fillStyle = fg
    ctx.font = `bold 42px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`
    ctx.textBaseline = 'top'
    let y = PAD
    for (const line of titleLines) {
      ctx.fillText(line, PAD, y)
      y += 56
    }

    // Description
    y += 32
    ctx.fillStyle = muted
    ctx.font = `28px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`
    for (const line of descLines) {
      ctx.fillText(line, PAD, y)
      y += 42
    }

    // Divider
    y += 24
    ctx.strokeStyle = dark ? '#333333' : '#dddddd'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PAD, y)
    ctx.lineTo(W - PAD, y)
    ctx.stroke()
    y += 24

    // QR Code
    const qrDataUrl = await QRCode.toDataURL(articleUrl.value, {
      width: qrSize,
      margin: 0,
      color: { dark: fg, light: bg }
    })
    const qrImg = new Image()
    await new Promise<void>((resolve) => {
      qrImg.onload = () => resolve()
      qrImg.src = qrDataUrl
    })
    const qrX = (W - qrSize) / 2
    ctx.drawImage(qrImg, qrX, y, qrSize, qrSize)
    y += qrSize + 16

    // Domain text
    ctx.fillStyle = muted
    ctx.font = `20px "PingFang SC", sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(displayHost.value, W / 2, y)

    // Generate blob and share/download
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png')
    })
    const file = new File([blob], `${props.slug}.png`, { type: 'image/png' })

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: props.title })
        return
      } catch { }
    }

    // Fallback: download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${props.slug}.png`
    a.click()
    URL.revokeObjectURL(url)
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <div class="share-buttons">
    <button class="share-btn" @click="shareText" :title="copied ? '已复制' : '分享文字'">
      <svg v-if="!copied" width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path
          d="M11.5 1.5h-5a2 2 0 0 0-2 2v1m7-3a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1m1-9V1.5ZM8.5 5.5h-5a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2Z"
          stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <svg v-else width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M3.5 8l3 3 5.5-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
          stroke-linejoin="round" />
      </svg>
      <span>{{ copied ? '已复制' : '分享链接' }}</span>
    </button>
    <button class="share-btn" @click="shareImage" :disabled="generating" title="分享图片">
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1.5" y="2.5" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.2" />
        <circle cx="5" cy="6" r="1.25" stroke="currentColor" stroke-width="1" />
        <path d="M1.5 10.5l3-3 2 2 3-3.5 4 4.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"
          stroke-linejoin="round" />
      </svg>
      <span>{{ generating ? '生成中...' : '分享图片' }}</span>
    </button>
  </div>
</template>

<style scoped>
.share-buttons {
  display: flex;
  gap: 8px;
  margin-top: 20px;
}

.share-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--subtle);
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 3px;
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: color 0.2s var(--ease-out), border-color 0.2s var(--ease-out);
}

.share-btn:hover {
  color: var(--fg);
  border-color: var(--fg);
}

.share-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
