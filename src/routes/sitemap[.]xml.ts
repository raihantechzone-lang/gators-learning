import { createFileRoute } from '@tanstack/react-router';
import { getRouterInstance } from '@tanstack/react-start';
import { isSitemapRouteIncluded, sitemapPathForLocation, sitemapStaticPaths, sitemapXML, type SitemapEntry } from '@/lib/sitemap';

const BASE_URL = 'https://gators-learning.lovable.app';

export const Route = createFileRoute('/sitemap.xml')({
  staticData: { sitemap: false },
  server: { handlers: { GET: async () => {
    try {
      const router = await getRouterInstance();
      const entries: SitemapEntry[] = sitemapStaticPaths(router).map(path => ({ path }));
      const routeId = '/enroll/$courseId';
      if (isSitemapRouteIncluded(router.routesById[routeId])) {
        const { createPublicCatalogClient, publishedCourseIds } = await import('@/lib/public-catalog.server');
        const client = createPublicCatalogClient();
        const ids = await publishedCourseIds((offset, limit) => client.from('courses').select('id')
          .eq('is_published', true).order('id').range(offset, offset + limit - 1));
        for (const courseId of ids) {
          const location = router.buildLocation({ to: '/enroll/$courseId', params: { courseId }, search: () => ({}), hash: '' });
          const path = sitemapPathForLocation(router, location, routeId);
          if (path) entries.push({ path });
        }
      }
      if (!entries.length) return new Response('No public pages configured', { status: 404 });
      return new Response(sitemapXML(BASE_URL, entries), {
        headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
      });
    } catch {
      return new Response('Public course inventory is temporarily unavailable', {
        status: 503, headers: { 'Cache-Control': 'no-store' },
      });
    }
  } } },
});
