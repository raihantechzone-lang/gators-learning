import { useEffect, useState, useCallback, useRef, createContext, useContext, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { normalizeProfilePhoto } from './profile-photo';

export interface Profile {
  id: string;
  full_name?: string | null;
  photo_url?: string | null;
  roll_number?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
  email?: string | null;
  [key: string]: unknown;
}


interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateProfile: (profile: Profile) => void;
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  updateProfile: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRequest = useRef(0);
  const uid = session?.user?.id;
  const updateProfile = useCallback((saved: Profile) => {
    if (saved.id !== uid) return;
    profileRequest.current += 1;
    setProfile(normalizeProfilePhoto(saved));
  }, [uid]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    const loadProfile = () => {
      const request = ++profileRequest.current;
      return supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!cancelled && request === profileRequest.current && !error) {
          setProfile(data ? normalizeProfilePhoto(data as Profile) : null);
        }
      });
    };
    void loadProfile();
    const refresh = () => { void loadProfile(); };
    window.addEventListener('focus', refresh);
    return () => {
      cancelled = true;
      profileRequest.current += 1;
      window.removeEventListener('focus', refresh);
    };
  }, [uid]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, profile, loading, signOut, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + "/dashboard" },
  });
}
