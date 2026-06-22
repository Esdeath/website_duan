const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = String(config.public.siteUrl).replace(/\/$/, '')

  // @ts-expect-error server queryCollection requires (event, collection) but types resolve to client signature
  const dao: Array<{ slug: string }> = await queryCollection(event, 'dao').all()

  const staticRoutes = ['/']
  const daoRoutes = dao.map((d) => `/${d.slug}`)
  const routes = [...staticRoutes, ...daoRoutes]

  const urls = routes
    .map((route) => {
      return [
        '  <url>',
        `    <loc>${escapeXml(`${siteUrl}${route}`)}</loc>`,
        '    <changefreq>weekly</changefreq>',
        '    <priority>0.8</priority>',
        '  </url>'
      ].join('\n')
    })
    .join('\n')

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>'
  ].join('\n')
})
