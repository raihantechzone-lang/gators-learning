import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { 
  BookOpen, Trophy, FileText, Settings, 
  ChevronRight, Lock, CheckCircle2, Download, Award, User, LogOut, Camera, Video, PenSquare, Play
} from "lucide-react";
import type { Course, Enrollment, CourseContent } from "@/lib/data";
import { isLessonLive, loadVisibleLessons, safeWebUrl } from "@/lib/public-experience.js";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { courseProgress, hasCourseAccess, readLocalProgress, type LessonProgressRecord } from "@/lib/student-progress";
import { loadStudentProgress } from "@/lib/progress-sync";
import { AcademicPanel } from "@/components/site/AcademicPanel";
import { CalendarCheck } from "lucide-react";
import { dashboardGroups, isFreeCourse } from '@/lib/management-rules';
import duIllustration from "@/assets/du-illustration.png";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [
    { title: "Student Dashboard | Gators Learning" },
    { name: "description", content: "Access your enrolled Gators Learning courses and certificates." },
    { property: "og:title", content: "Student Dashboard | Gators Learning" },
    { property: "og:description", content: "Access your enrolled Gators Learning courses and certificates." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: DashboardPage,
});

type DashboardTab = "courses" | "free" | "notes" | "live" | "results" | "attendance";

function DashboardPage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>("courses");
  const [enrollments, setEnrollments] = useState<(Enrollment & { courses: Course | null, certificate_url?: string | null })[]>([]);
  const [toast, setToast] = useState<{ title: string, desc: string, show: boolean }>({ title: "", desc: "", show: false });
  const [newlyUnlockedCertId, setNewlyUnlockedCertId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [catalog, setCatalog] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<CourseContent[]>([]);
  const [progress, setProgress] = useState<LessonProgressRecord[]>([]);
  const [dataError, setDataError] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const approved = enrollments.filter(hasCourseAccess);
  const groups = dashboardGroups(catalog, enrollments);
  const liveLessons = lessons.filter(l => isLessonLive(l) && (approved.some(e => e.course_id === l.course_id) || groups.free.some(c => c.id === l.course_id)));
  const otherCourses = groups.other;
  const getProgress = (id: string) => courseProgress(lessons.filter(l => l.course_id === id).map(l => l.id), progress);
  const totalProgress = courseProgress(lessons.filter(l => approved.some(e => e.course_id === l.course_id)).map(l => l.id), progress);
  const resumeCourse = approved.find(e => progress.some(p => p.course_id === e.course_id && p.progress_percent > 0 && !p.completed)) || approved[0];

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [enc, courses, contents, saved] = await Promise.all([
        supabase.from("enrollments").select("*, courses(*)").eq("profile_id", user.id),
        supabase.from("courses").select("*").eq("is_published", true),
        loadVisibleLessons(supabase),
        loadStudentProgress(user.id).catch(() => readLocalProgress(user.id)),
      ]);
      setDataError(enc.error?.message || courses.error?.message || contents.error?.message || "");
      setEnrollments((enc.data as any) ?? []);
      setCatalog((courses.data as Course[]) ?? []);
      setLessons(contents.data ?? []);
      setProgress(saved);
      setDataLoading(false);
    };
    load();
    const refresh = () => { load(); };
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('gl-progress', refresh);
    const refreshTimer = window.setInterval(refresh, 30000);

    // Subscribe to enrollment changes (specifically for certificates)
    const channel = supabase
      .channel('enrollment-updates')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'enrollments',
          filter: `profile_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time enrollment update:', payload);
          // If a certificate_url was added (unlocked)
          if (!payload.old.certificate_url && payload.new.certificate_url) {
            showToast("Congratulations! Your certificate is now unlocked and available for download.", "Certificate Unlocked!");
            setNewlyUnlockedCertId(payload.new.id);
            setTimeout(() => setNewlyUnlockedCertId(null), 5000); // Clear highlight after 5s
          }
          load(); // Refresh the list to show the badge
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lesson_progress', filter: `profile_id=eq.${user.id}` }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'enrollments', filter: `profile_id=eq.${user.id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'course_contents' }, load)
      .subscribe();

    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('gl-progress', refresh);
      clearInterval(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [user]);

  const showToast = (desc: string, title = "Notification") => {
    setToast({ title, desc, show: true });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    showToast("Uploading profile picture...", "Please wait");
    
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photo_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      showToast("Profile photo updated successfully!", "Success");
      router.invalidate();
    } catch (error: any) {
      showToast(error.message, "Upload Failed");
    }
  };

  const editName = async () => {
    const newName = prompt("Enter your new name:", profile?.full_name || "");
    if (newName && newName.trim() !== "" && user) {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: newName.trim() })
        .eq('id', user.id);
      
      if (!error) {
        showToast("Name updated successfully!", "Profile Updated");
        router.invalidate();
      }
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
       <div className="w-12 h-12 border-4 border-[#0f9d58]/20 border-t-[#0f9d58] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f9fafb] font-['Inter',sans-serif] text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Navbar - Fixed & Blurred */}
      <header className="fixed top-2 sm:top-6 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 w-full max-w-7xl mx-auto">
        <nav className="bg-white/90 backdrop-blur-xl border border-gray-100 shadow-[0_4px_30px_rgb(0,0,0,0.05)] rounded-2xl px-4 py-2 sm:px-6 sm:py-3 flex items-center justify-between">
          <Link to="/" reloadDocument className="flex items-center">
            <img src="https://ik.imagekit.io/n7rgjyaxh/Untitled%20design_20260630_142739_0000.png" alt="Logo" className="h-12 sm:h-16 w-auto object-contain" />
          </Link>
          
          <div className="hidden sm:flex items-center gap-6">
            <Link to="/" reloadDocument className="text-sm font-semibold text-slate-900 hover:text-[#0f9d58] transition-colors">Home</Link>
            <Link to="/" reloadDocument hash="courses" className="text-sm font-semibold text-slate-900 hover:text-[#0f9d58] transition-colors">Our Courses</Link>
          </div>

          <div className="flex items-center gap-4">
             <span className="hidden md:block text-sm font-bold text-[#0f9d58]">Dashboard</span>
             <div className="h-10 w-10 rounded-full bg-emerald-50 border-2 border-[#0f9d58] overflow-hidden shadow-sm ring-offset-2 hover:ring-2 hover:ring-emerald-200 transition-all cursor-pointer">
                <img src={String(profile?.photo_url || `https://ui-avatars.com/api/?name=${profile?.full_name || 'Student'}&background=0f9d58&color=fff`)} className="w-full h-full object-cover" alt="" />
             </div>
          </div>
        </nav>
      </header>

      <main className="pt-32 sm:pt-40 pb-20 max-w-[1000px] mx-auto px-4 sm:px-6">
        {/* Profile Card */}
        <div className="bg-gradient-to-r from-[#eafaf1] to-[#f4fbf7] rounded-[2rem] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between shadow-sm border-2 border-[#0f9d58]/60 relative overflow-hidden mb-8 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
           <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
              <div 
                className="relative group cursor-pointer" 
                onClick={() => fileInputRef.current?.click()}
              >
                 <div className="w-24 h-24 bg-white rounded-full border-4 border-[#0f9d58] shadow-md overflow-hidden flex items-center justify-center transition-colors">
                    {profile?.photo_url ? (
                      <img src={String(profile.photo_url)} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <User size={44} className="text-[#0f9d58]" strokeWidth={1.8} />
                    )}
                 </div>
                 <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white" size={24} />
                 </div>
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </div>

              <div className="text-center sm:text-left">
                 <div className="flex items-center gap-2 justify-center sm:justify-start">
                     <h2 className="text-2xl font-bengali font-bold text-gray-900">{profile?.full_name || "Student Name"}</h2>
                    <button onClick={editName} className="text-slate-400 hover:text-[#0f9d58] transition-colors">
                       <PenSquare size={18} />
                    </button>
                 </div>
                 <p className="text-sm font-bold text-[#0f9d58] mt-1">Roll No: {profile?.roll_number || "PENDING"}</p>
                 
                 <div className="flex gap-4 mt-4 justify-center sm:justify-start">
                    <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-xl border border-orange-200 text-xs font-bold text-gray-700 shadow-sm flex items-center gap-2">
                       <BookOpen size={14} className="text-orange-500" /> Enrolled: {approved.length}
                     </div>
                    <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-xl border border-purple-200 text-xs font-bold text-gray-700 shadow-sm flex items-center gap-2">
                       <CheckCircle2 size={14} className="text-purple-500" /> Completed: {totalProgress}%
                    </div>
                 </div>
              </div>
           </div>

           <div className="hidden md:block relative z-10 shrink-0">
              <div className="rounded-[1.5rem] border-2 border-[#0f9d58]/60 bg-white/70 backdrop-blur p-2 shadow-[0_10px_30px_-10px_rgba(15,157,88,0.35)] rotate-2">
                 <img src={duIllustration} alt="Dhaka University" loading="lazy" width={816} height={816} className="w-36 h-36 object-contain" />
              </div>
           </div>
        </div>

        {/* Dashboard Nav Tabs */}
        <div className="flex gap-8 sm:gap-14 overflow-x-auto pb-4 mb-10 border-b border-gray-100 no-scrollbar">
           <TabButton active={activeTab === 'courses'} onClick={() => setActiveTab('courses')} icon={BookOpen} label="আমার কোর্সসমূহ" color="orange" />
           <TabButton active={activeTab === 'free'} onClick={() => setActiveTab('free')} icon={Play} label="ফ্রি কোর্স" color="emerald" />
           <TabButton active={activeTab === 'live'} onClick={() => setActiveTab('live')} icon={Video} label="লাইভ ক্লাস" color="red" />
           <TabButton active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} icon={FileText} label="ক্লাস নোটস" color="purple" />
           <TabButton active={activeTab === 'results'} onClick={() => setActiveTab('results')} icon={Trophy} label="পরীক্ষার ফলাফল" color="emerald" />
           <TabButton active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} icon={CalendarCheck} label="হাজিরা" color="orange" />
        </div>

        {/* Sections */}
        <div className="space-y-10 animate-in fade-in duration-700">
           {activeTab === 'courses' && (
             <>
               {/* Resume Watching */}
               {resumeCourse && (
                 <Link to="/courses/$courseId" params={{ courseId: resumeCourse.course_id }} className="bg-slate-900 rounded-[2rem] p-6 sm:p-8 flex items-center justify-between group cursor-pointer border border-slate-800 hover:border-slate-700 transition-all shadow-xl shadow-slate-200/50">
                    <div className="flex-1 min-w-0 pr-4">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Continue Watching</span>
                       <h4 className="font-bengali font-bold text-white text-lg sm:text-xl truncate">{resumeCourse.courses?.title}</h4>
                       <div className="mt-4 flex items-center gap-4">
                          <Progress className="flex-1 max-w-[200px]" value={getProgress(resumeCourse.course_id)} />
                          <span className="text-xs font-bold text-muted-foreground">{getProgress(resumeCourse.course_id)}% Done</span>
                       </div>
                    </div>
                    <span className="w-14 h-14 rounded-full bg-brand text-brand-foreground flex items-center justify-center shrink-0"><Play size={24} fill="currentColor" /></span>
                 </Link>
               )}

               {dataLoading && <p className="text-ink-muted">কোর্স লোড হচ্ছে…</p>}
               {dataError && <p role="alert" className="text-destructive">{dataError}</p>}
               {/* Course Grid */}
               <div>
                  <h3 className="text-xl sm:text-2xl font-bengali font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-8 bg-[#0f9d58] rounded-full"></span> এনরোলকৃত কোর্সসমূহ
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                     {approved.filter(e => !isFreeCourse(e.courses)).map(e => (
                        <div key={e.id} className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                           <div className="h-40 relative">
                              <img src={e.courses?.thumbnail_url || ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                              <div className="absolute top-3 right-3 bg-[#0f9d58] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">Enrolled</div>
                           </div>
                           <div className="p-5">
                              <h4 className="font-bengali font-bold text-slate-800 line-clamp-2 min-h-[3rem]">{e.courses?.title}</h4>
                              <div className="mt-3"><Progress value={getProgress(e.course_id)} /><p className="text-xs text-ink-muted mt-1">{getProgress(e.course_id)}% সম্পন্ন</p></div>
                              <div className="mt-4 flex items-center justify-between">
                                 <Link 
                                   to="/courses/$courseId"
                                   params={{ courseId: e.course_id }}
                                   className="text-[#0f9d58] font-bold text-xs flex items-center gap-1 hover:underline"
                                 >
                                    কন্টিনিউ করুন <ChevronRight size={14} />
                                 </Link>
                                  {e.certificate_url && (
                                    <div className={`${newlyUnlockedCertId === e.id ? 'animate-bounce scale-125' : ''} transition-all duration-700`}>
                                       <Award className="text-[#0f9d58]" size={20} />
                                    </div>
                                  )}
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
               {groups.pending.length > 0 && <section>
                 <h3 className="text-xl font-bold text-ink mb-6 font-bengali">অনুমোদনের অপেক্ষায়</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{groups.pending.map(course => <article key={course.id} className="bg-background border border-border rounded-lg overflow-hidden">
                   {course.thumbnail_url && <img src={course.thumbnail_url} alt={course.title} className="h-40 w-full object-cover" />}
                   <div className="p-5 space-y-3"><h4 className="font-bold text-ink font-bengali">{course.title}</h4><p className="text-sm font-semibold text-ink-muted">Pending — পেমেন্ট যাচাইয়ের অপেক্ষায়</p><Lock size={18} className="text-ink-muted" /></div>
                 </article>)}</div>
               </section>}
               <section>
                 <h3 className="text-xl font-bold text-ink mb-6 font-bengali">অন্যান্য কোর্সসমূহ</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                   {otherCourses.map(course => {
                     const request = enrollments.find(e => e.course_id === course.id) as (Enrollment & { payment_status?: string }) | undefined;
                     return <div key={course.id} className="bg-background border border-border rounded-lg overflow-hidden">
                       {course.thumbnail_url && <img src={course.thumbnail_url} alt={course.title} className="h-40 w-full object-cover" />}
                       <div className="p-5">
                         <h4 className="font-bold text-ink font-bengali">{course.title}</h4>
                         <p className="mt-2 text-sm text-ink-muted">৳{course.discount_price ?? course.price ?? 0}</p>
                         {request?.payment_status === 'pending' && <p className="text-sm text-ink-muted mt-2">পেমেন্ট যাচাইয়ের অপেক্ষায়</p>}
                         {request?.payment_status === 'failed' && <p className="text-sm text-destructive mt-2">পেমেন্ট অনুমোদিত হয়নি</p>}
                         <Button asChild variant="outline" className="mt-4"><Link to="/enroll/$courseId" params={{ courseId: course.id }} reloadDocument>কোর্স দেখুন <ChevronRight size={14} /></Link></Button>
                       </div>
                     </div>;
                   })}
                 </div>
                 {!dataLoading && !otherCourses.length && <p className="text-ink-muted">আর কোনো প্রকাশিত কোর্স নেই।</p>}
               </section>
             </>
           )}

           {activeTab === 'free' && <section>
             <h3 className="text-xl font-bold text-ink mb-6 font-bengali">ফ্রি কোর্স</h3>
             {dataLoading && <p className="text-ink-muted">কোর্স লোড হচ্ছে…</p>}
             {dataError && <p role="alert" className="text-destructive">{dataError}</p>}
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{groups.free.map(course => <article key={course.id} className="bg-background border border-border rounded-lg overflow-hidden">
               {course.thumbnail_url && <img src={course.thumbnail_url} alt={course.title} className="h-40 w-full object-cover" />}
               <div className="p-5 space-y-3"><h4 className="font-bold text-ink font-bengali">{course.title}</h4><Progress value={getProgress(course.id)} /><Button asChild variant="outline"><Link to="/courses/$courseId" params={{courseId:course.id}}><Play size={16} />ক্লাস শুরু করুন</Link></Button></div>
             </article>)}</div>
             {!dataLoading && !groups.free.length && <p className="text-ink-muted">এখন কোনো ফ্রি কোর্স নেই।</p>}
           </section>}

           {activeTab === 'live' && (
             <section className="space-y-6">
               <h3 className="text-xl font-bold text-ink font-bengali">লাইভ ক্লাস</h3>
               {dataLoading && <p className="text-ink-muted">ক্লাস লোড হচ্ছে…</p>}
               {dataError && <p role="alert" className="text-destructive">{dataError}</p>}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 {liveLessons.map(lesson => <div key={lesson.id} className="bg-background border border-border rounded-lg overflow-hidden">
                   {lesson.thumbnail_url && <img src={lesson.thumbnail_url} alt={lesson.title} className="w-full aspect-video object-cover" />}
                   <div className="p-5 space-y-3">
                     <span className="text-destructive text-xs font-bold">LIVE</span>
                     <h4 className="text-ink font-bold">{lesson.title}</h4>
                     <p className="text-sm text-ink-muted">{catalog.find(c => c.id === lesson.course_id)?.title}</p>
                     <Button asChild variant="destructive"><a href={safeWebUrl(lesson.live_url) || undefined} target="_blank" rel="noopener noreferrer"><Video size={16} /> লাইভ ক্লাসে যোগ দিন</a></Button>
                   </div>
                 </div>)}
               </div>
               {!dataLoading && !liveLessons.length && <p className="text-ink-muted">এখন কোনো লাইভ ক্লাস নেই।</p>}
             </section>
           )}

           {(activeTab === 'results' || activeTab === 'attendance') && user && (
             <AcademicPanel
               mode={activeTab}
               userId={user.id}
               courses={[...new Map([...approved.flatMap(e => e.courses ? [[e.course_id, { id: e.course_id, title: e.courses.title }] as const] : []), ...groups.free.map(c => [c.id, {id:c.id,title:c.title}] as const)]).values()]}
               lessons={lessons as any}
             />
           )}

           {activeTab === 'notes' && (
             <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <h3 className="text-xl sm:text-2xl font-bengali font-bold text-gray-900 flex items-center gap-3">
                     <span className="w-1.5 h-8 bg-purple-500 rounded-full"></span> আমার ক্লাস নোটস
                   </h3>
                </div>
                <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                   <div className="grid gap-4 md:grid-cols-2">
                     {lessons.filter(l => safeWebUrl(l.pdf_url) && (approved.some(e => e.course_id === l.course_id) || groups.free.some(c => c.id === l.course_id))).map(l => <a key={l.id} href={safeWebUrl(l.pdf_url)} target="_blank" rel="noopener noreferrer" className="p-4 bg-brand-soft border border-border rounded-lg flex items-center justify-between text-ink"><span>{l.title}</span><Download size={18} /></a>)}
                     {!lessons.some(l => l.pdf_url && (approved.some(e => e.course_id === l.course_id) || groups.free.some(c => c.id === l.course_id))) && <p className="text-ink-muted">কোনো ক্লাস নোটস নেই।</p>}
                   </div>
                </div>
             </div>
           )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-16 border-t-[6px] border-[#0f9d58]">
         <div className="max-w-[1000px] mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
               <div>
                  <div className="bg-white p-2 rounded-xl w-fit mb-6">
                     <img src="https://ik.imagekit.io/n7rgjyaxh/Untitled%20design_20260630_142739_0000.png" alt="" className="h-8" />
                  </div>
                  <p className="font-bengali text-sm leading-relaxed">আপনার শেখার যাত্রাকে সহজ ও আনন্দদায়ক করতে আমরা সবসময় আপনার পাশে আছি।</p>
               </div>
               <div>
                  <h4 className="text-white font-bold mb-6">Support</h4>
                  <ul className="space-y-3 text-sm">
                     <li className="flex items-center gap-3"><span className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-[#0f9d58]"><Video size={14} /></span> Support Center</li>
                     <li className="flex items-center gap-3"><span className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-[#0f9d58]"><Settings size={14} /></span> Privacy Policy</li>
                  </ul>
               </div>
               <div className="space-y-6">
                  <button onClick={signOut} className="flex items-center gap-2 text-rose-500 font-bold hover:text-rose-400 transition-colors">
                     <LogOut size={18} /> Log Out from Device
                  </button>
               </div>
            </div>
            <div className="pt-8 border-t border-slate-900 text-center text-xs font-bold uppercase tracking-widest">
               © 2026 Gators Learning. All rights reserved.
            </div>
         </div>
      </footer>

      {/* Toast Notification */}
      <div className={`fixed bottom-6 right-6 z-[100] transition-all duration-500 ${toast.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
         <div className="bg-white border border-gray-100 shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[300px]">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#0f9d58] flex items-center justify-center">
               <CheckCircle2 size={24} />
            </div>
            <div>
               <h4 className="font-bold text-sm">{toast.title}</h4>
               <p className="text-xs text-slate-500">{toast.desc}</p>
            </div>
         </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label, color }: { active: boolean, onClick: () => void, icon: any, label: string, color: string }) {
  const colors: Record<string, string> = {
    orange: 'bg-orange-100 text-orange-500 active:bg-orange-500',
    red: 'bg-red-100 text-red-500 active:bg-red-500',
    purple: 'bg-purple-100 text-purple-500 active:bg-purple-500',
    emerald: 'bg-emerald-100 text-[#0f9d58] active:bg-[#0f9d58]',
  };

  return (
    <div className="flex flex-col items-center gap-3 cursor-pointer group min-w-[80px]" onClick={onClick}>
       <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all duration-300 shadow-sm group-hover:scale-110 ${active ? colors[color].split(' ')[0].replace('100', '500') + ' text-white' : colors[color] + ' group-hover:' + colors[color].split(' ')[0].replace('100', '500') + ' group-hover:text-white'}`}>
          <Icon size={24} />
       </div>
       <span className={`text-[10px] sm:text-xs font-bold font-bengali text-center transition-colors ${active ? 'text-slate-900' : 'text-slate-500'}`}>{label}</span>
    </div>
  );
}