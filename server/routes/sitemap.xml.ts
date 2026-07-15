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
  const dao: Array<{ slug: string; type: string }> = await queryCollection(event, 'dao')
    .select('slug', 'type')
    .all()

  const staticRoutes = [{ path: '/', type: 'home' }]
  const daoRoutes = dao.map((d) => ({ path: `/${d.slug}`, type: d.type }))
  const routes = [...staticRoutes, ...daoRoutes]

  const urls = routes
    .map((route) => {
      const legacy = route.type === 'legacy-index'
      const changefreq = legacy ? 'yearly' : 'weekly'
      const priority = legacy ? '0.2' : '0.8'
      return [
        '  <url>',
        `    <loc>${escapeXml(`${siteUrl}${route.path}`)}</loc>`,
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
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
