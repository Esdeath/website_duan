export interface ArticleShareSource {
  title: string
  url: string
  bodyHtml: string
  bodyText: string
}

export interface ArticleShareContent {
  html: string
  text: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function buildArticleShareContent(source: ArticleShareSource): ArticleShareContent {
  const safeUrl = escapeHtml(source.url)
  const safeTitle = escapeHtml(source.title)
  const bodyHtml = source.bodyHtml.trim()
  const bodyText = source.bodyText.trim()

  return {
    html: `<p><strong>原文链接：</strong><a href="${safeUrl}">${safeUrl}</a></p><h1>${safeTitle}</h1>${bodyHtml}`,
    text: `原文链接：${source.url}\n\n${source.title}\n\n${bodyText}`,
  }
}

interface ClipboardWriter {
  write(items: ClipboardItem[]): Promise<void>
  writeText(text: string): Promise<void>
}

interface CopyArticleShareOptions {
  clipboard?: ClipboardWriter
  ClipboardItemClass?: typeof ClipboardItem
}

export async function copyArticleShareContent(
  content: ArticleShareContent,
  options: CopyArticleShareOptions = {},
): Promise<'rich' | 'plain'> {
  const clipboard = options.clipboard ?? navigator.clipboard
  const ClipboardItemClass = options.ClipboardItemClass ?? globalThis.ClipboardItem

  if (ClipboardItemClass && typeof clipboard.write === 'function') {
    try {
      const item = new ClipboardItemClass({
        'text/html': new Blob([content.html], { type: 'text/html' }),
        'text/plain': new Blob([content.text], { type: 'text/plain' }),
      })
      await clipboard.write([item])
      return 'rich'
    } catch {
      // Some browsers expose ClipboardItem but reject rich clipboard writes.
    }
  }

  await clipboard.writeText(content.text)
  return 'plain'
}
