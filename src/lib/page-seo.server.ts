import { createPublicCatalogClient } from './public-catalog.server';
import type { PublicPageInfo, PublicPageKind } from './page-seo';

export async function readPublicPageInfo(kind: PublicPageKind, id: string): Promise<PublicPageInfo> {
  try {
    const db = createPublicCatalogClient();
    const query = kind === 'course' || kind === 'enrollment'
      ? db.from('courses').select('title,description,thumbnail_url').eq('id', id).eq('is_published', true)
      : kind === 'instructor'
        ? db.from('instructor_profiles').select('display_name,bio,photo_url').eq('id', id).eq('status', 'approved')
        : db.from('teachers').select('display_name,bio,photo_url').eq('id', id);
    const { data, error } = await query.maybeSingle();
    if (error) return { state: 'unavailable' };
    if (!data) return { state: 'missing' };
    const row = data as { title?: string; display_name?: string; description?: string | null; bio?: string | null; thumbnail_url?: string | null; photo_url?: string | null };
    const name = row.title || row.display_name;
    if (!name?.trim()) return { state: 'missing' };
    return { state: 'found', name, summary: row.description || row.bio, image: row.thumbnail_url || row.photo_url };
  } catch {
    return { state: 'unavailable' };
  }
}