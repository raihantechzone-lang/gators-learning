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
import { createTeacherAccount, requireTeacherAdmin, teacherNameSchema, teacherPasswordSchema } from '@/lib/teacher-login';

export const Route = createFileRoute('/admin/teachers')({ head: () => teacherMeta('Teachers Admin', 'Manage teacher profiles and course teaching assignments.'), component: TeachersAdmin });
const empty = { user_id: '', display_name: '', password: '', title: '', bio: '', photo_url: '' };
function TeachersAdmin() {
  const cache = useQueryClient();
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const teachers = useQuery({ queryKey: ['teachers'], queryFn: loadTeachers });
  const assignments = useQuery({ queryKey: ['teacher-assignments'], queryFn: async () => {
    const { data, error } = await teacherDb.from('course_teachers').select('teacher_id,course_id,courses(title)');
    if (error) throw error;
    return data as { teacher_id: string; course_id: string; courses: { title: string } | null }[];
  } });
  const save = async () => {
    if (!teacherNameSchema.safeParse(form.display_name).success) return toast.error('Enter a teacher name (2–80 characters).');
    if (!editing && !teacherPasswordSchema.safeParse(form.password).success) return toast.error('Password must be 8–128 characters.');
    setSaving(true);
    try {
      if (editing) {
        await requireTeacherAdmin();
        const { error } = await teacherDb.from('teachers').update({ display_name: form.display_name.trim(), title: form.title, bio: form.bio, photo_url: form.photo_url || null }).eq('id', editing).select('id').single();
        if (error) throw error;
      } else await createTeacherAccount(form);
      await cache.invalidateQueries({ queryKey: ['teachers'] });
      setForm(empty); setEditing(null); toast.success('Teacher saved');
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };
  const edit = (teacher: Teacher) => { setEditing(teacher.id); setForm({ user_id: teacher.user_id, display_name: teacher.display_name, password: '', photo_url: teacher.photo_url || '', title: teacher.title || '', bio: teacher.bio || '' }); };
  const remove = async (teacher: Teacher) => {
    if (!window.confirm('Remove this teacher and their course assignments? They will no longer be able to access the teacher dashboard.')) return;
    setDeleting(teacher.id);
    try {
      await requireTeacherAdmin();
      const { data, error } = await teacherDb.from('teachers').delete().eq('id', teacher.id).select('id').single();
      if (error) throw error;
      if (data?.id !== teacher.id) throw new Error('Teacher was not removed. Check your admin permissions.');
      if (editing === teacher.id) { setEditing(null); setForm(empty); }
      await Promise.all([cache.invalidateQueries({ queryKey: ['teachers'] }), cache.invalidateQueries({ queryKey: ['teacher-assignments'] }), cache.invalidateQueries({ queryKey: ['teacher-courses'] })]);
      toast.success('Teacher removed');
    } catch (error: any) { toast.error(error.message); } finally { setDeleting(null); }
  };
  return <div className="space-y-6">
    <h1 className="text-2xl font-bold text-foreground">Teachers</h1>
    {teachers.error && <p role="alert" className="text-destructive">{teachers.error.message}</p>}
    <section className="space-y-4 border-b border-border pb-6">
      <h2 className="text-lg font-semibold">{editing ? 'Edit teacher' : 'Create teacher'}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="teacher-name">Name / login name</Label><Input id="teacher-name" disabled={!!editing} maxLength={80} value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} /></div>
        {!editing && <div className="space-y-2"><Label htmlFor="teacher-password">Password</Label><Input id="teacher-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>}
        <div className="space-y-2"><Label htmlFor="teacher-title">Title</Label><Input id="teacher-title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="teacher-photo">Profile photo</Label>
        {form.photo_url && <div className="flex items-center gap-3"><img src={form.photo_url} alt="Teacher profile preview" className="h-20 w-20 rounded-full object-cover border border-border" /><Button size="icon" variant="ghost" title="Remove photo" aria-label="Remove photo" disabled={saving} onClick={() => setForm(f => ({ ...f, photo_url: '' }))}><Trash2 size={16} /></Button></div>}
        <Label className="inline-flex gap-2 items-center cursor-pointer text-brand"><Upload size={16} />Upload photo<input type="file" accept="image/*" className="sr-only" disabled={saving} onChange={async e => {
          const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; setSaving(true);
          try { await requireTeacherAdmin(); const url = await uploadToImageKit(file, '/teachers'); setForm(f => ({ ...f, photo_url: url })); } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
        }} /></Label></div>
      </div>
      <div className="space-y-2"><Label htmlFor="teacher-bio">Bio</Label><textarea id="teacher-bio" className="w-full p-3 border border-input rounded-md bg-background" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} /></div>
      <div className="flex gap-2"><Button disabled={saving || !!teachers.error || !form.display_name.trim() || (!editing && !form.password)} onClick={save}><Plus />{saving ? 'Saving…' : editing ? 'Save teacher' : 'Create teacher account'}</Button>{editing && <Button variant="outline" onClick={() => { setEditing(null); setForm(empty); }}>Cancel</Button>}</div>
    </section>
    <div className="grid gap-4 sm:grid-cols-2">{teachers.data?.map(t => <article key={t.id} className="border border-border rounded-md p-4 flex gap-4 items-start bg-background">
      {t.photo_url && <img src={t.photo_url} alt={t.display_name} className="h-14 w-14 rounded-full object-cover" />}
      <div className="flex-1 min-w-0"><h2 className="font-bold">{t.display_name}</h2><p className="text-muted-foreground text-sm">{t.title}</p><p className="text-sm text-brand mt-2">{assignments.data?.filter(a => a.teacher_id === t.id).length || 0} courses</p>{assignments.data?.filter(a => a.teacher_id === t.id).map(a => <p key={a.course_id} className="text-sm">{a.courses?.title}</p>)}</div>
      <Button size="icon" variant="ghost" title="Edit teacher" aria-label={`Edit ${t.display_name}`} disabled={saving || deleting !== null} onClick={() => edit(t)}><Pencil /></Button><Button size="icon" variant="ghost" title="Remove teacher" aria-label={`Remove ${t.display_name}`} disabled={saving || deleting !== null} onClick={() => remove(t)}><Trash2 /></Button>
    </article>)}</div>
  </div>;
}