// A tiny wrapper that returns a Supabase client for the **browser**
// It reads the NEXT_PUBLIC env vars and stores the auth session in browser cookies.
import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,      // ! tells TS "it will exist"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
