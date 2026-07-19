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

const SHARE_SOURCE_NAME = '段永平投资问答录'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function unwrapArticleBodyLinks(root: ParentNode) {
  for (const link of root.querySelectorAll('a')) {
    const strong = link.ownerDocument.createElement('strong')
    strong.textContent = link.textContent ?? ''
    link.replaceWith(strong)
  }
}

export function removeLeadingArticleTitle(root: ParentNode) {
  const firstElement = root.firstElementChild
  if (firstElement?.tagName !== 'H1') return null

  const title = firstElement.textContent?.trim() || null
  firstElement.remove()
  return title
}

export function buildArticleShareContent(source: ArticleShareSource): ArticleShareContent {
  const safeUrl = escapeHtml(source.url)
  const safeTitle = escapeHtml(source.title)
  const bodyHtml = source.bodyHtml.trim()
  const bodyText = source.bodyText.trim()
  const attributionHtml = `<p><strong>来源：</strong>${SHARE_SOURCE_NAME}<br><strong>原文链接：</strong><a href="${safeUrl}">${safeUrl}</a></p>`
  const attributionText = `来源：${SHARE_SOURCE_NAME}\n原文链接：${source.url}`
  const articleText = [source.title, bodyText].filter(Boolean).join('\n\n')

  return {
    html: `${attributionHtml}<h1>${safeTitle}</h1>${bodyHtml}${attributionHtml}`,
    text: `${attributionText}\n\n${articleText}\n\n${attributionText}`,
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
