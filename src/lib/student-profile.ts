import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export async function saveStudentProfile(user: User) {
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) throw error;
  const values = {
    id: user.id,
    full_name: profile?.full_name || user.user_metadata.full_name || "Student",
    phone: profile?.phone || user.user_metadata.phone || null,
    email: user.email,
    roll_number: profile?.roll_number || `GL${user.id.replaceAll("-", "").toUpperCase()}`,
  };
  const { error: saveError } = await supabase.from("profiles").upsert(values, { onConflict: "id" });
  if (saveError) throw saveError;
  return values;
}