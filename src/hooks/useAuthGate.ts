import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useAuthGate() {
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session ?? null);
      } catch (e: any) {
        setError(e.message || "Auth check failed");
      } finally {
        setChecking(false);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { checking, session, error };
}