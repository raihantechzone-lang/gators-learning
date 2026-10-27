import { supabase } from '@/integrations/supabase/client';

// The external backend's generated types do not describe optional teacher tables.
export const teacherDb = supabase as any;
export interface Teacher { id: string; user_id: string; display_name: string; photo_url: string | null; title: string | null; bio: string | null }
export interface AssignedCourse { id: string; title: string; thumbnail_url?: string | null; is_published?: boolean; price?: number; discount_price?: number | null }
export const teacherMeta = (title: string, description: string) => ({ meta: [
  { title: `${title} | Gators Learning` }, { name: 'description', content: description },
  { property: 'og:title', content: `${title} | Gators Learning` }, { property: 'og:description', content: description },
  { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
] });

export async function loadTeachers(): Promise<Teacher[]> {
  const { data, error } = await teacherDb.from('teachers').select('id,user_id,display_name,photo_url,title,bio').order('display_name');
  if (error) throw new Error('শিক্ষক ব্যবস্থা চালু করতে Teacher setup SQL চালান।');
  return data || [];
}