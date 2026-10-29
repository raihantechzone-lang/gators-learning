import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { teacherDb, type Teacher, type AssignedCourse } from '@/lib/teachers';
import { SiteHeader } from '@/components/site/SiteHeader';
import { getPublicPageInfo } from '@/lib/page-seo.functions';
import { pageSEO } from '@/lib/page-seo';
export const Route = createFileRoute('/teachers/$teacherId')({
  staticData: { sitemap: false },
  loader: ({ params }) => getPublicPageInfo({ data: { kind: 'teacher', id: params.teacherId } }),
  head: ({ params, loaderData }) => pageSEO('teacher', params.teacherId, loaderData),
  component: TeacherProfile });
function TeacherProfile() {
  const { teacherId } = Route.useParams();
  const query = useQuery({ queryKey: ['teacher-public', teacherId], queryFn: async () => {
    const [profile, assignments] = await Promise.all([
      teacherDb.from('teachers').select('id,display_name,photo_url,title,bio').eq('id', teacherId).maybeSingle(),
      teacherDb.from('course_teachers').select('courses(id,title,thumbnail_url,price,discount_price,is_published)').eq('teacher_id', teacherId),
    ]);
    if (profile.error || assignments.error) throw new Error('Teacher profile could not be loaded.');
    return { teacher: profile.data as Teacher | null, courses: (assignments.data || []).flatMap((a: { courses: AssignedCourse | null }) => a.courses?.is_published ? [a.courses] : []) as AssignedCourse[] };
  } });
  return <div className="min-h-screen bg-background"><SiteHeader /><main className="max-w-5xl mx-auto px-4 pt-32 pb-16 space-y-8">
    {query.isPending ? <section aria-busy="true"><h1 className="text-2xl font-bold">শিক্ষকের পরিচিতি লোড হচ্ছে…</h1></section> : query.error ? <section role="alert"><h1 className="text-2xl font-bold">শিক্ষকের তথ্য লোড করা যায়নি</h1><p className="text-muted-foreground mt-3">কিছুক্ষণ পর আবার চেষ্টা করুন।</p></section> : !query.data.teacher?.display_name?.trim() ? <section><h1 className="text-2xl font-bold">শিক্ষকের পরিচিতি পাওয়া যায়নি</h1><p className="text-muted-foreground mt-3">এই লিংকে শিক্ষকের প্রকাশিত পরিচিতি নেই। অন্য কোর্সের শিক্ষকদের দেখতে <Link to="/courses" className="text-brand underline">কোর্স তালিকায় যান</Link>।</p></section> : <>
      <section className="flex flex-wrap gap-5 items-center border-b border-border pb-6">{query.data.teacher.photo_url && <img src={query.data.teacher.photo_url} alt={query.data.teacher.display_name} className="w-24 h-24 rounded-full object-cover" />}<div><p className="text-brand text-sm font-semibold">Teacher</p><h1 className="text-2xl font-bold">{query.data.teacher.display_name}</h1><p className="text-muted-foreground">{query.data.teacher.title}</p></div>{query.data.teacher.bio && <p className="w-full whitespace-pre-line">{query.data.teacher.bio}</p>}</section>
      <h2 className="text-xl font-bold">Courses · {query.data.courses.length}</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{query.data.courses.map(c => <Link key={c.id} to="/enroll/$courseId" params={{ courseId: c.id }} reloadDocument className="border border-border rounded-md overflow-hidden">
        {c.thumbnail_url && <img src={c.thumbnail_url} alt={c.title} className="w-full aspect-video object-cover" />}<div className="p-4 space-y-2"><h3 className="font-bold">{c.title}</h3><div className="flex items-center gap-2 text-sm">{query.data.teacher?.photo_url && <img src={query.data.teacher.photo_url} alt="" className="w-7 h-7 rounded-full object-cover" />}<span>{query.data.teacher?.display_name}</span><span className="text-brand">Teacher</span></div><p>৳{c.discount_price || c.price || 0}</p></div>
      </Link>)}</div>{!query.data.courses.length && <p className="text-muted-foreground">No published courses yet.</p>}
    </>}
  </main></div>;
}