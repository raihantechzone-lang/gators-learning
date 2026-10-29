import { it } from 'node:test';
import assert from 'node:assert/strict';
import { enrollmentSEOHTML, pageSEO } from './page-seo';

it('escapes public data before inserting it into full-document HTML', () => {
  const html = enrollmentSEOHTML('<!-- COURSE_SEO -->', '99009c2f-e99f-487b-bd3e-47555c960333', {
    state: 'found', name: '"><script>alert(1)</script>', summary: '" onmouseover="alert(2)',
  });
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('content="" onmouseover='));
  assert.ok(html.includes('&lt;script&gt;'));
});

it('never emits unsafe or relative social image sources', () => {
  for (const image of ['javascript:alert(1)', '/private.png', 'http://example.com/photo.jpg']) {
    const head = pageSEO('course', 'course-id', { state: 'found', name: 'Course', image });
    assert.ok(!head.meta.some(tag => tag.property === 'og:image'));
  }
});