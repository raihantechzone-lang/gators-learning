import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { teacherNameSchema, teacherPasswordSchema, requireTeacherAdmin } from './teacher-login';

export async function moderatorLoginEmail(name: string) {
  const normalized = teacherNameSchema.parse(name);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  return `${Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2,'0')).join('')}@moderators.gators.invalid`;
}

export async function createModeratorAccount(name: string, passwordInput: string) {
  await requireTeacherAdmin();
  const loginName = teacherNameSchema.parse(name);
  const password = teacherPasswordSchema.parse(passwordInput);
  const email = await moderatorLoginEmail(name);
  const {error:setupError,data:exists} = await (supabase as any).rpc('moderator_login_exists',{login_name_input:loginName});
  if (setupError) throw new Error('মডারেটর তৈরির অনুমতি চালু হয়নি। সংযুক্ত ডাটাবেজের সংশোধনী প্রয়োজন।');
  if (exists) throw new Error('এই নামে মডারেটর রয়েছে। অন্য নাম দিন।');
  const {default:source} = await import('@/integrations/supabase/client.ts?raw');
  const url=source.match(/const SUPABASE_URL = ['"]([^'"]+)['"]/)?.[1];
  const key=source.match(/const SUPABASE_PUBLISHABLE_KEY = ['"]([^'"]+)['"]/)?.[1];
  if (!url || !key) throw new Error('অ্যাকাউন্ট তৈরির ব্যবস্থা পাওয়া যায়নি।');
  const isolated=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>{
    const headers=new Headers(init?.headers);
    if(key.startsWith('sb_') && headers.get('Authorization')===`Bearer ${key}`) headers.delete('Authorization');
    headers.set('apikey',key); return fetch(input,{...init,headers});
  }}});
  try {
    let {data,error}=await isolated.auth.signUp({email,password,options:{data:{full_name:name.trim()}}});
    if(error || !data.session){const retry=await isolated.auth.signInWithPassword({email,password});if(!retry.error && retry.data.session){data=retry.data;error=null;}}
    if(error) throw error;
    if(!data.session || !data.user) throw new Error('অ্যাকাউন্ট নিশ্চিতকরণ প্রয়োজন; মডারেটর এখনো তৈরি হয়নি।');
    await requireTeacherAdmin();
    const result=await (supabase as any).rpc('register_moderator_account',{account_id:data.user.id,login_name_input:loginName,moderator_name:name.trim()});
    if(result.error) throw new Error(`অ্যাকাউন্টের অনুমতি যোগ হয়নি: ${result.error.message}। একই নাম ও পাসওয়ার্ড দিয়ে আবার চেষ্টা করুন।`);
  } finally {await isolated.auth.signOut({scope:'local'});}
}