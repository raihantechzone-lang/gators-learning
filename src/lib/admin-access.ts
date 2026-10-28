import { supabase } from '@/integrations/supabase/client';

export interface AdminAuthClient {
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null }; error: unknown }> };
  from: (table: string) => any;
}

// getUser validates the token with Auth; browser flags never grant access.
export async function verifyAdminAccess(client: AdminAuthClient = supabase): Promise<boolean> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return false;
  const { data: roles, error: roleError } = await client.from('user_roles')
    .select('role').eq('user_id', data.user.id).eq('role', 'admin');
  if (roleError) throw new Error('অ্যাডমিনের অনুমতি যাচাই করা যাচ্ছে না। সংযুক্ত ডাটাবেজের অনুমতি পরীক্ষা করুন।');
  return roles?.some((row: { role: string }) => row.role === 'admin') === true;
}