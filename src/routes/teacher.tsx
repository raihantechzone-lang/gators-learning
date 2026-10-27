import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/lib/auth';
import { teacherDb, teacherMeta, type Teacher, type AssignedCourse } from '@/lib/teachers';
import { ContentAdmin } from './admin/content';
import { SiteHeader } from '@/components/site/SiteHeader';
import { Button } from '@/components/ui/button';
import { BookOpen, Upload } from 'lucide-react';
import { assignedCourseIds } from '@/lib/teacher-assignment.js';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/teacher')({ head: () => teacherMeta('Teacher Dashboard', 'Manage lessons for your assigned Gators Learning courses.'), component: TeacherDashboard });
function TeacherDashboard() {
  const cache = useQueryClient();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [editing, setEditing] = useState<string | null>(null);
  const query = useQuery({ queryKey: ['teacher-dashboard', user?.id], enabled: !!user, queryFn: async () => {
    if (!user) return { teacher: null, courses: [] };
    const profile = await teacherDb.from('teachers').select('id,user_id,display_name,photo_url,title,bio').eq('user_id', user.id).maybeSingle();
    if (profile.error) throw new Error('শিক্ষক ব্যবস্থা এখনো চালু করা হয়নি।');
    if (!profile.data) return { teacher: null, courses: [] };
    const assignments = await teacherDb.from('course_teachers').select('course_id,teacher_id,courses(id,title,thumbnail_url,is_published)').eq('teacher_id', profile.data.id);
    if (assignments.error) throw assignments.error;
    const ids = assignedCourseIds(assignments.data || [], profile.data.id);
    return { teacher: profile.data as Teacher, courses: (assignments.data || []).flatMap((row: { course_id: string; courses: AssignedCourse | null }) => ids.includes(row.course_id) && row.courses ? [row.courses] : []) as AssignedCourse[] };
  } });
  return <div className="min-h-screen bg-background"><SiteHeader /><main className="max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-16 space-y-6">
    <h1 className="text-2xl font-bold text-foreground">Teacher Dashboard</h1>
    {loading || (user && query.isPending) ? <p className="text-muted-foreground">Loading…</p> : !user ? <Button asChild><Link to="/auth" search={{ mode: 'login' }}>Log in</Link></Button> : query.error ? <p role="alert" className="text-destructive">{query.error.message}</p> : !query.data?.teacher ? <><p className="text-muted-foreground">No teacher profile is assigned to this account.</p><Button asChild variant="outline"><Link to="/auth" search={{ mode: 'login' }}>Log in</Link></Button></> : <>
      <Button variant="outline" onClick={async () => { await cache.cancelQueries(); cache.clear(); await supabase.auth.signOut(); await navigate({ to: '/auth', search: { mode: 'login' }, replace: true }); }}>Sign out</Button>
      <div className="flex gap-3 items-center">{query.data.teacher.photo_url && <img src={query.data.teacher.photo_url} alt="" className="w-14 h-14 rounded-full object-cover" />}<div><h2 className="font-bold">{query.data.teacher.display_name}</h2><p className="text-sm text-brand">Teacher · {query.data.courses.length} courses</p></div></div>
      {editing ? <><Button variant="outline" onClick={() => setEditing(null)}><BookOpen />My courses</Button><ContentAdmin key={editing} allowedCourses={query.data.courses} initialCourseId={editing} /></> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{query.data.courses.map(course => <article key={course.id} className="border border-border rounded-md overflow-hidden">
        {course.thumbnail_url && <img src={course.thumbnail_url} alt={course.title} className="w-full aspect-video object-cover" />}<div className="p-4 space-y-3"><h3 className="font-bold">{course.title}</h3><p className="text-sm text-muted-foreground">{course.is_published ? 'Published' : 'Draft'}</p><Button onClick={() => setEditing(course.id)}><Upload />Course content</Button></div>
      </article>)}{!query.data.courses.length && <p className="text-muted-foreground">No courses assigned yet.</p>}</div>}
    </>}
  </main></div>;
}