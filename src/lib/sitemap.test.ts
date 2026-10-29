import { describe, expect, it } from 'vitest';
import { publishedCourseIds } from './public-catalog.server';
import { sitemapXML } from './sitemap';

describe('public sitemap inventory', () => {
  it('reads every batch in stable order', async () => {
    const offsets: number[] = [];
    const rows = [{ id: 'one' }, { id: 'two' }, { id: 'three' }];
    const ids = await publishedCourseIds(async (offset, limit) => {
      offsets.push(offset);
      return { data: rows.slice(offset, offset + limit), error: null };
    }, 2);
    expect(ids).toEqual(['one', 'two', 'three']);
    expect(offsets).toEqual([0, 2, 3]);
  });
  it('rejects a later batch failure rather than returning a partial inventory', async () => {
    await expect(publishedCourseIds(async offset => offset === 0
      ? { data: [{ id: 'one' }], error: null }
      : { data: null, error: new Error('read denied') }, 1)).rejects.toThrow('read denied');
  });
  it('uses the public origin and omits unsupported lastmod dates', () => {
    const xml = sitemapXML('https://gators-learning.lovable.app', [{ path: '/' }, { path: '/enroll/course' }]);
    expect(xml).toContain('<loc>https://gators-learning.lovable.app/enroll/course</loc>');
    expect(xml).not.toContain('lastmod');
  });
  it('rejects external URLs and deduplicates destinations', () => {
    expect(() => sitemapXML('https://gators-learning.lovable.app', [{ path: '//evil.example' }])).toThrow('Invalid sitemap path');
    expect(sitemapXML('https://gators-learning.lovable.app', [{ path: '/' }, { path: '/' }]).match(/<url>/g)).toHaveLength(1);
  });
});