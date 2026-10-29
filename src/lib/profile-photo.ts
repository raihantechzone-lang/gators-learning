import type { SupabaseClient } from '@supabase/supabase-js';

export function normalizeProfilePhoto<T extends { photo_url?: unknown; avatar_url?: unknown }>(profile: T): T & { photo_url: string | null } {
  const photo = [profile.photo_url, profile.avatar_url].find(value => typeof value === 'string' && value.trim());
  return { ...profile, photo_url: typeof photo === 'string' ? photo.trim() : null };
}

export async function saveProfilePhoto(client: Pick<SupabaseClient, 'from'>, userId: string, photoUrl: string) {
  const { data, error } = await client.from('profiles')
    .update({ photo_url: photoUrl }).eq('id', userId).select('*').single();
  if (error) throw error;
  if (!data || data.id !== userId || data.photo_url !== photoUrl) {
    throw new Error('ছবি প্রোফাইলে সংরক্ষিত হয়নি। আবার চেষ্টা করুন।');
  }
  return normalizeProfilePhoto(data);
}