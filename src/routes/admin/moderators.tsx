import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { teacherMeta } from '@/lib/teachers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, UserPlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminConfirm } from '@/components/admin/AdminActionDialog';
import { verifyAdminAccess } from '@/lib/admin-access';
import { createModeratorAccount } from '@/lib/moderator-login';

export const Route = createFileRoute('/admin/moderators')({
  staticData: { sitemap: false },head: () => teacherMeta('Moderator Management', 'Manage restricted moderator access to Gators Learning.'),component: ModeratorsAdmin});
function ModeratorsAdmin() {
  const cache = useQueryClient();
  const [search,setSearch] = useState('');
  const [selected,setSelected] = useState('');
  const [saving,setSaving] = useState(false);
  const [name,setName] = useState('');
  const [password,setPassword] = useState('');
  const create = async (event: React.FormEvent) => {
    event.preventDefault();setSaving(true);
    try {await createModeratorAccount(name,password);setName('');setPassword('');await cache.invalidateQueries({queryKey:['moderator-management']});toast.success('মডারেটর অ্যাকাউন্ট তৈরি হয়েছে');}
    catch(error){toast.error(error instanceof Error ? error.message : 'অ্যাকাউন্ট তৈরি হয়নি');}
    finally{setSaving(false);}
  };
  const query = useQuery({queryKey:['moderator-management'],queryFn: async () => {
    if (!await verifyAdminAccess()) throw new Error('শুধু অ্যাডমিন মডারেটর নির্ধারণ করতে পারবেন।');
    const [profiles,roles] = await Promise.all([supabase.from('profiles').select('id,full_name,roll_number').order('full_name'),supabase.from('user_roles').select('user_id,role')]);
    if (profiles.error || roles.error) throw profiles.error || roles.error;
    return {profiles:profiles.data || [],roles:roles.data || []};
  }});
  const moderators = query.data?.roles.filter(r => String(r.role) === 'moderator') || [];
  const choices = query.data?.profiles.filter(p => !query.data?.roles.some(r => r.user_id === p.id && ['admin','moderator'].includes(String(r.role))) && `${p.full_name || ''} ${p.roll_number || ''}`.toLowerCase().includes(search.toLowerCase())) || [];
  const save = async (id:string,enabled:boolean) => {
    if(!enabled && !await adminConfirm('মডারেটরের অনুমতি সরাবেন?')) return;
    setSaving(true);
    try {
      if (!await verifyAdminAccess()) throw new Error('অ্যাডমিন অনুমতি প্রয়োজন।');
      const {error} = await (supabase as any).rpc('set_moderator_access',{account_id:id,enabled});
      if(error) throw error;
      await cache.invalidateQueries({queryKey:['moderator-management']}); setSelected(''); toast.success(enabled ? 'মডারেটর যোগ হয়েছে' : 'মডারেটরের অনুমতি সরানো হয়েছে');
    } catch(error:any) {toast.error(error.message);} finally {setSaving(false);}
  };
  return <div className="space-y-6"><h1 className="text-2xl font-bold flex gap-2 items-center"><ShieldCheck />Moderator</h1>
    {query.error && <p role="alert" className="text-destructive">{query.error.message}</p>}{query.isLoading && <p>অ্যাকাউন্ট লোড হচ্ছে…</p>}
    <form onSubmit={create} className="space-y-3 border-b border-border pb-6"><h2 className="font-semibold">নতুন মডারেটর আইডি</h2><label className="block space-y-2"><span>লগইন নাম</span><Input required minLength={2} maxLength={80} autoComplete="off" value={name} onChange={e=>setName(e.target.value)} /></label><label className="block space-y-2"><span>পাসওয়ার্ড</span><Input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} /></label><Button type="submit" disabled={saving}><UserPlus size={16}/>{saving ? 'তৈরি হচ্ছে…' : 'মডারেটর আইডি তৈরি করুন'}</Button></form>
    <section className="space-y-3 border-b border-border pb-6"><h2 className="font-semibold">অ্যাকাউন্ট নির্বাচন</h2><Input aria-label="Find moderator account" placeholder="নাম বা রোল দিয়ে খুঁজুন" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Moderator account" className="w-full border border-input rounded-md bg-background p-2" value={selected} onChange={e => setSelected(e.target.value)}><option value="">বিদ্যমান অ্যাকাউন্ট নির্বাচন করুন</option>{choices.map(p => <option key={p.id} value={p.id}>{p.full_name || 'Student'} · {p.roll_number || ''}</option>)}</select><Button disabled={!selected || saving} onClick={() => save(selected,true)}><UserPlus size={16} />মডারেটর যোগ করুন</Button></section>
    <div className="space-y-3">{moderators.map(r => <article key={r.user_id} className="border border-border rounded-md p-4 flex gap-4 items-center justify-between"><h2 className="font-semibold">{query.data?.profiles.find(p => p.id === r.user_id)?.full_name || r.user_id}</h2><Button size="icon" variant="outline" aria-label="Remove moderator" disabled={saving} onClick={() => save(r.user_id,false)}><Trash2 size={16} /></Button></article>)}</div>
    {!query.isLoading && !moderators.length && <p className="text-muted-foreground">কোনো মডারেটর নেই।</p>}
  </div>;
}