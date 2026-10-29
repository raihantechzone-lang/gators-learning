import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
    assert.deepEqual(ids, ['one', 'two', 'three']);
    assert.deepEqual(offsets, [0, 2, 3]);
  });
  it('rejects a later batch failure rather than returning a partial inventory', async () => {
    await assert.rejects(publishedCourseIds(async offset => offset === 0
      ? { data: [{ id: 'one' }], error: null }
      : { data: null, error: new Error('read denied') }, 1), /read denied/);
  });
  it('uses the public origin and omits unsupported lastmod dates', () => {
    const xml = sitemapXML('https://gators-learning.lovable.app', [{ path: '/' }, { path: '/enroll/course' }]);
    assert.ok(xml.includes('<loc>https://gators-learning.lovable.app/enroll/course</loc>'));
    assert.ok(!xml.includes('lastmod'));
  });
  it('rejects external URLs and deduplicates destinations', () => {
    assert.throws(() => sitemapXML('https://gators-learning.lovable.app', [{ path: '//evil.example' }]), /Invalid sitemap path/);
    assert.equal(sitemapXML('https://gators-learning.lovable.app', [{ path: '/' }, { path: '/' }]).match(/<url>/g)?.length, 1);
  });
});