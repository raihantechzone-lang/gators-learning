export type PublicPageKind = 'course' | 'enrollment' | 'teacher' | 'instructor';
export interface PublicPageInfo {
  state: 'found' | 'missing' | 'unavailable';
  name?: string;
  summary?: string | null;
  image?: string | null;
}

export function plainSummary(value?: string | null) {
  return (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
}

export function pageSEO(kind: PublicPageKind, id: string, info?: PublicPageInfo) {
  const path = { course: 'courses', enrollment: 'enroll', teacher: 'teachers', instructor: 'instructors' }[kind];
  const url = `https://gators-learning.lovable.app/${path}/${encodeURIComponent(id)}`;
  const found = info?.state === 'found' && Boolean(info.name?.trim());
  const subject = kind === 'course' || kind === 'enrollment' ? 'কোর্স' : 'শিক্ষক';
  const name = info?.name?.trim() || `${subject} ${info?.state === 'unavailable' ? 'তথ্য সাময়িকভাবে অনুপলব্ধ' : 'পাওয়া যায়নি'}`;
  const suffix = { course: 'পাঠ ও কোর্স কনটেন্ট', enrollment: 'ভর্তির তথ্য', teacher: 'শিক্ষক পরিচিতি', instructor: 'প্রশিক্ষক পরিচিতি' }[kind];
  const title = `${name} — ${suffix} | Gators Learning`;
  const context = { course: 'পাঠ ও কোর্স কনটেন্ট দেখুন', enrollment: 'কোর্সের বিবরণ ও ভর্তির তথ্য দেখুন', teacher: 'পরিচিতি ও প্রকাশিত কোর্সগুলো দেখুন', instructor: 'পরিচিতি, দক্ষতা ও প্রকাশিত কোর্সগুলো দেখুন' }[kind];
  const description = found ? `${name}: ${context}। ${plainSummary(info?.summary)}`.trim() : `${name}। Gators Learning-এর ${subject} তালিকা থেকে অন্য পাতা দেখুন।`;
  const image = found ? shareImage(info?.image) : null;
  const meta = [
    { title }, { name: 'description', content: description },
    { property: 'og:title', content: title }, { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' }, { property: 'og:url', content: url },
    { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' },
    { name: 'twitter:title', content: title }, { name: 'twitter:description', content: description },
    ...(!found ? [{ name: 'robots', content: 'noindex, follow' }] : []),
    ...(image ? [{ property: 'og:image', content: image }, { name: 'twitter:image', content: image }] : []),
  ];
  return { meta, links: [{ rel: 'canonical', href: url }] };
}

function shareImage(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    // The existing catalogue uses ImageKit; transform the same displayed photo.
    if (url.hostname === 'ik.imagekit.io') url.searchParams.set('tr', 'w-1200,h-630,fo-auto,q-80');
    return url.href;
  } catch { return null; }
}

export function escapeSEO(value: string) {
  return value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] || ch);
}

export function enrollmentSEOHTML(html: string, id: string, info: PublicPageInfo) {
  const head = pageSEO('enrollment', id, info);
  const tags = head.meta.map(tag => 'title' in tag
    ? `<title>${escapeSEO(tag.title || '')}</title>`
    : `<meta ${'property' in tag ? `property="${tag.property}"` : `name="${tag.name}"`} content="${escapeSEO(tag.content || '')}">`).join('\n    ');
  return html.replace('<!-- COURSE_SEO -->', `${tags}\n    <link rel="canonical" href="${escapeSEO(head.links[0].href)}">`);
}