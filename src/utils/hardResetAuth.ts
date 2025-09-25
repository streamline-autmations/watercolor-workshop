import { supabase } from "@/lib/supabase";

export async function hardResetAuth() {
  try { 
    // Only sign out from Supabase auth, don't clear all storage
    await supabase.auth.signOut(); 
  } catch {}
  
  // Only clear auth-related storage, not everything
  try { 
    localStorage.removeItem("sb-auth-token");
    localStorage.removeItem("supabase.auth.token");
    sessionStorage.removeItem("sb-auth-token");
    sessionStorage.removeItem("supabase.auth.token");
  } catch {}
  
  location.replace("/login");
}
