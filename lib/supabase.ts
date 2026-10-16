import { createClient } from "@supabase/supabase-js";

export function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

export function getSupabaseAnonKey() {
  return process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
}

export function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function isSupabaseConfigured() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey() || getSupabaseServiceRoleKey();
  return Boolean(url && key);
}

export function createSupabaseClient(options?: { serviceRole?: boolean }) {
  const url = getSupabaseUrl();
  const key = options?.serviceRole ? getSupabaseServiceRoleKey() || getSupabaseAnonKey() : getSupabaseAnonKey();

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export const supabase = createSupabaseClient();
export const supabaseAdmin = createSupabaseClient({ serviceRole: true });
