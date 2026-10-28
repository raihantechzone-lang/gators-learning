export async function requireUploadAccess(db: any, courseId?: string, moderatorAllowed = false) {
  const { data, error } = await db.auth.getUser();
  if (error || !data?.user) throw new Error('Please sign in again.');
  const roles = await db.from('user_roles').select('role').eq('user_id', data.user.id).eq('role', 'admin');
  let authorized = !roles.error && roles.data?.some((row: { role: string }) => row.role === 'admin');
  if (moderatorAllowed && !courseId) {
    const moderator = await db.from('user_roles').select('role').eq('user_id', data.user.id).eq('role','moderator');
    if (!moderator.error && moderator.data?.some((row:{role:string}) => row.role === 'moderator')) authorized = true;
  }
  if (courseId) {
    const assigned = await db.rpc('teaches_course', { target_course: courseId });
    if (!assigned.error && assigned.data === true) authorized = true;
  }
  if (!authorized) throw new Error('You do not have permission to upload.');
  const limit = await db.rpc('consume_upload_quota');
  if (limit.error || limit.data !== true) throw new Error('Upload security setup required or upload limit reached. Try again later.');
}