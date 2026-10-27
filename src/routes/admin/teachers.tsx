import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Upload, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { loadTeachers, teacherDb, teacherMeta, type Teacher } from '@/lib/teachers';
import { uploadToImageKit } from '@/lib/imagekit';

export const Route = createFileRoute('/admin/teachers')({ head: () => teacherMeta('Teachers Admin', 'Manage teacher profiles and course teaching assignments.'), component: TeachersAdmin });
const empty = { user_id: '', display_name: '', title: '', bio: '', photo_url: '' };
function TeachersAdmin() {
  const cache = useQueryClient();
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const teachers = useQuery({ queryKey: ['teachers'], queryFn: loadTeachers });
  const accounts = useQuery({ queryKey: ['teacher-accounts'], queryFn: async () => {
    const { data, error } = await teacherDb.from('profiles').select('id,full_name,email').order('full_name');
    if (error) throw error;
    return data as { id: string; full_name: string | null; email: string | null }[];
  } });
  const assignments = useQuery({ queryKey: ['teacher-assignments'], queryFn: async () => {
    const { data, error } = await teacherDb.from('course_teachers').select('teacher_id,course_id,courses(title)');
    if (error) throw error;
    return data as { teacher_id: string; course_id: string; courses: { title: string } | null }[];
  } });
  const save = async () => {
    if (!form.user_id || !form.display_name.trim()) return;
    setSaving(true);
    try {
      const values = { ...form, display_name: form.display_name.trim(), photo_url: form.photo_url || null };
      const result = editing ? await teacherDb.from('teachers').update(values).eq('id', editing).select('id').single()
        : await teacherDb.from('teachers').insert(values).select('id').single();
      if (result.error) throw result.error;
      await cache.invalidateQueries({ queryKey: ['teachers'] });
      setForm(empty); setEditing(null); toast.success('Teacher saved');
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };
  const edit = (teacher: Teacher) => { setEditing(teacher.id); setForm({ user_id: teacher.user_id, display_name: teacher.display_name, photo_url: teacher.photo_url || '', title: teacher.title || '', bio: teacher.bio || '' }); };
  return <div className="space-y-6">
    <div className="flex flex-wrap justify-between gap-3"><h1 className="text-2xl font-bold text-foreground">Teachers</h1><Button asChild variant="outline"><a href="/teacher-setup.sql" download>Teacher setup SQL</a></Button></div>
    {teachers.error && <p role="alert" className="text-destructive">{teachers.error.message}</p>}
    <section className="space-y-4 border-b border-border pb-6">
      <h2 className="text-lg font-semibold">{editing ? 'Edit teacher' : 'Create teacher'}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="teacher-account">Account</Label><select id="teacher-account" className="w-full h-10 border border-input rounded-md bg-background px-3" value={form.user_id} onChange={e => {
          const account = accounts.data?.find(a => a.id === e.target.value);
          setForm({ ...form, user_id: e.target.value, display_name: form.display_name || account?.full_name || '' });
        }}><option value="">Select registered account</option>{accounts.data?.map(a => <option key={a.id} value={a.id}>{a.full_name || a.email || a.id}</option>)}</select>{accounts.error && <p className="text-destructive">Accounts could not be loaded.</p>}</div>
        <div className="space-y-2"><Label htmlFor="teacher-name">Name</Label><Input id="teacher-name" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="teacher-title">Title</Label><Input id="teacher-title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="teacher-photo">Profile photo</Label><Input id="teacher-photo" value={form.photo_url} onChange={e => setForm({ ...form, photo_url: e.target.value })} placeholder="Photo URL" />
        <Label className="inline-flex gap-2 items-center cursor-pointer text-brand"><Upload size={16} />Upload photo<input type="file" accept="image/*" className="sr-only" disabled={saving} onChange={async e => {
          const file = e.target.files?.[0]; if (!file) return; setSaving(true);
          try { const url = await uploadToImageKit(file, '/teachers'); setForm(f => ({ ...f, photo_url: url })); } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
        }} /></Label></div>
      </div>
      <div className="space-y-2"><Label htmlFor="teacher-bio">Bio</Label><textarea id="teacher-bio" className="w-full p-3 border border-input rounded-md bg-background" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} /></div>
      <div className="flex gap-2"><Button disabled={saving || !!teachers.error || !form.user_id || !form.display_name.trim()} onClick={save}><Plus />{saving ? 'Saving…' : 'Save teacher'}</Button>{editing && <Button variant="outline" onClick={() => { setEditing(null); setForm(empty); }}>Cancel</Button>}</div>
    </section>
    <div className="grid gap-4 sm:grid-cols-2">{teachers.data?.map(t => <article key={t.id} className="border border-border rounded-md p-4 flex gap-4 items-start bg-background">
      {t.photo_url && <img src={t.photo_url} alt={t.display_name} className="h-14 w-14 rounded-full object-cover" />}
      <div className="flex-1 min-w-0"><h2 className="font-bold">{t.display_name}</h2><p className="text-muted-foreground text-sm">{t.title}</p><p className="text-sm text-brand mt-2">{assignments.data?.filter(a => a.teacher_id === t.id).length || 0} courses</p>{assignments.data?.filter(a => a.teacher_id === t.id).map(a => <p key={a.course_id} className="text-sm">{a.courses?.title}</p>)}</div>
      <Button size="icon" variant="ghost" title="Edit teacher" onClick={() => edit(t)}><Pencil /></Button><Button size="icon" variant="ghost" title="Delete teacher" onClick={async () => {
        if (!window.confirm('Remove this teacher and their course assignments?')) return;
        const { error } = await teacherDb.from('teachers').delete().eq('id', t.id); if (error) toast.error(error.message); else { cache.invalidateQueries({ queryKey: ['teachers'] }); cache.invalidateQueries({ queryKey: ['teacher-assignments'] }); }
      }}><Trash2 /></Button>
    </article>)}</div>
  </div>;
}