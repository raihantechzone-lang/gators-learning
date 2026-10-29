import { createClient } from '@supabase/supabase-js';

// Match the site's existing external public catalogue, never the unrelated Cloud backend.
export function createPublicCatalogClient() {
  const key = 'sb_publishable_Y1rY5LYRuDF9iqJNWS1blQ_9EqPBOp9';
  return createClient('https://jouwcthdcjoegcqgwlpl.supabase.co', key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
      headers.set('apikey', key);
      return fetch(input, { ...init, headers });
    } },
  });
}

export async function publishedCourseIds(
  readPage: (offset: number, limit: number) => PromiseLike<{ data: { id: string }[] | null; error: unknown }>,
  pageSize = 1000,
): Promise<string[]> {
  const ids: string[] = [];
  for (let offset = 0; ; ) {
    const { data, error } = await readPage(offset, pageSize);
    if (error) throw error;
    if (!data) throw new Error('Public course inventory was not returned');
    if (data.length === 0) return ids;
    ids.push(...data.map(row => row.id));
    offset += data.length;
  }
}
