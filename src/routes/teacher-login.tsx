import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { teacherLoginEmail } from '@/lib/teacher-login';
import { teacherDb, teacherMeta } from '@/lib/teachers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SiteHeader } from '@/components/site/SiteHeader';

export const Route = createFileRoute('/teacher-login')({ head: () => teacherMeta('Teacher Login', 'Sign in to your Gators Learning teacher dashboard with your assigned name and password.'), component: TeacherLogin });
function TeacherLogin() {
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <div className="min-h-screen bg-background"><SiteHeader /><main className="mx-auto max-w-md px-4 pt-32 pb-16">
    <h1 className="text-2xl font-bold mb-6">Teacher Login</h1>
    <form className="space-y-5" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError('');
      try {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({ email: await teacherLoginEmail(name), password });
        if (loginError || !data.user) throw new Error('Incorrect teacher name or password.');
        const { data: teacher, error: profileError } = await teacherDb.from('teachers').select('id').eq('user_id', data.user.id).maybeSingle();
        if (profileError || !teacher) {
          await cache.cancelQueries(); cache.clear(); await supabase.auth.signOut();
          throw new Error('This account is not assigned as a teacher. Contact your administrator.');
        }
        await navigate({ to: '/teacher', replace: true });
      } catch (err) { setError(err instanceof Error ? err.message : 'Could not sign in.'); }
      finally { setBusy(false); }
    }}>
      <div className="space-y-2"><Label htmlFor="login-name">Name</Label><Input id="login-name" autoComplete="username" required minLength={2} maxLength={80} value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="login-password">Password</Label><Input id="login-password" type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Log in'}</Button>
    </form>
  </main></div>;
}