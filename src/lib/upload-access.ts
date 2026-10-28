export async function requireUploadAccess(db: any, courseId?: string) {
  const { data, error } = await db.auth.getUser();
  if (error || !data?.user) throw new Error('Please sign in again.');
  const roles = await db.from('user_roles').select('role').eq('user_id', data.user.id).eq('role', 'admin');
  if (!roles.error && roles.data?.some((row: { role: string }) => row.role === 'admin')) return;
  if (courseId) {
    const assigned = await db.rpc('teaches_course', { target_course: courseId });
    if (!assigned.error && assigned.data === true) return;
  }
  throw new Error('You do not have permission to upload.');
}