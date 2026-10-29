import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { teacherMeta } from '@/lib/teachers';
import { enrollmentHasAccess } from '@/lib/public-experience.js';
import { WhatsAppQueue, type QueueRecipient } from '@/components/admin/WhatsAppQueue';
import { MessageCircle } from 'lucide-react';

export const Route = createFileRoute('/admin/messages')({
  staticData: { sitemap: false },head: () => teacherMeta('Bulk WhatsApp Messages', 'Prepare course-wise student WhatsApp messages.'), component: MessagesAdmin});
function MessagesAdmin() {
  const [courseId,setCourseId] = useState('');
  const query = useQuery({queryKey:['message-students'], queryFn: async () => {
    const [profiles,enrollments,courses] = await Promise.all([
      supabase.from('profiles').select('id,full_name,phone').order('full_name'),
      supabase.from('enrollments').select('profile_id,course_id,status,payment_status'),
      supabase.from('courses').select('id,title').order('title'),
    ]);
    if(profiles.error || enrollments.error || courses.error) throw profiles.error || enrollments.error || courses.error;
    return {profiles:profiles.data || [],enrollments:enrollments.data || [],courses:courses.data || []};
  }});
  const recipients: QueueRecipient[] = (query.data?.profiles || []).filter(p => !courseId || query.data?.enrollments.some(e => e.profile_id === p.id && e.course_id === courseId && enrollmentHasAccess(e))).map(p => ({id:p.id,name:p.full_name || 'Student',phone:String(p.phone || ''),course:query.data?.courses.find(c => c.id === courseId)?.title || ''}));
  return <div className="space-y-6"><h1 className="text-2xl font-bold flex items-center gap-2"><MessageCircle />Bulk WhatsApp Message</h1>
    <select aria-label="Message course" className="bg-background border border-input rounded-md p-2 max-w-full" value={courseId} onChange={e => setCourseId(e.target.value)}><option value="">সব শিক্ষার্থী</option>{query.data?.courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
    {query.isLoading && <p>শিক্ষার্থী লোড হচ্ছে…</p>}{query.error && <p role="alert" className="text-destructive">{query.error.message}</p>}
    {query.data && <WhatsAppQueue key={courseId} recipients={recipients} initialTemplate={'প্রিয় {name},\n\nGators Learning-এর পক্ষ থেকে শুভেচ্ছা।\n\n*Gators Learning*'} />}
  </div>;
}