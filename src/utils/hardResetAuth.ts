import { supabase } from "@/lib/supabase";

export async function hardResetAuth() {
  try { await supabase.auth.signOut({ scope: "local" }); } catch {}
  try { localStorage.removeItem("device_id"); } catch {}
  try { localStorage.clear(); sessionStorage.clear(); } catch {}
  try {
    // @ts-ignore
    const dbs = (await indexedDB.databases?.()) || [];
    dbs.forEach(d => d?.name && indexedDB.deleteDatabase(d.name));
  } catch {}
  location.replace("/login");
}
