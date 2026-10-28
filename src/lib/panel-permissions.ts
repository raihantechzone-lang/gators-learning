export type PanelRole = 'admin' | 'moderator';
const moderatorPaths = new Set(['/admin/categories','/admin/courses','/admin/content','/admin/results','/admin/students','/admin/attendance','/admin/enrollments','/admin/certificates','/admin/course-verification','/admin/notices','/admin/messages']);
export function panelPathAllowed(role: PanelRole | null, path: string) {
  if (role === 'admin') return true;
  return role === 'moderator' && moderatorPaths.has(path.replace(/\/$/, ''));
}
export interface PanelClient { auth: { getUser: () => Promise<any> }; from: (table: string) => any }
export async function getPanelRole(client: PanelClient): Promise<PanelRole | null> {
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) return null;
  const roles = await client.from('user_roles').select('role').eq('user_id', data.user.id);
  if (roles.error) throw new Error('অ্যাকাউন্টের অনুমতি যাচাই করা যাচ্ছে না।');
  if (roles.data?.some((r: {role:string}) => r.role === 'admin')) return 'admin';
  if (roles.data?.some((r: {role:string}) => r.role === 'moderator')) return 'moderator';
  return null;
}