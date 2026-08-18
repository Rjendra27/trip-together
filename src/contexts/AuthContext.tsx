import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import i18n from "@/i18n";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncLang = async (u: User | null) => {
      if (!u) return;
      const { data } = await supabase
        .from("profiles")
        .select("preferred_language")
        .eq("user_id", u.id)
        .maybeSingle();
      const lang = (data as any)?.preferred_language;
      if (lang && lang !== i18n.language) {
        await i18n.changeLanguage(lang);
        localStorage.setItem("tripmate_lang", lang);
      }
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      syncLang(session?.user ?? null);
    });

    // Manually parse hash or search parameters to prevent React Router from stripping them before Supabase reads them
    const parseUrlTokens = async () => {
      const hash = window.location.hash || window.location.search;
      if (!hash) return;

      const cleanHash = hash.startsWith("#") || hash.startsWith("?") ? hash.substring(1) : hash;
      const params = new URLSearchParams(cleanHash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error && data?.session) {
            setSession(data.session);
            setUser(data.session.user);
            syncLang(data.session.user);
          }
        } catch (err) {
          console.error("Failed to parse URL session tokens:", err);
        }
      }
    };

    // Get current session and parse tokens
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      syncLang(session?.user ?? null);
      
      // Parse tokens if this was a redirect link
      parseUrlTokens();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
