// Creates a Supabase **server** client that reads/writes auth cookies.
// Next's Server Components expose cookies() as "readonly" in types, so
// TS complains when we set/remove cookies. At runtime, writes are only
// needed in contexts that allow them (route handlers, server actions).
// We add *targeted* ts-ignore on those writes to keep TS happy.

import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read current cookie value (works in all server contexts)
        get(name: string) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - Next types mark cookies readonly in server components
          return cookieStore.get(name)?.value;
        },

        // Supabase calls this when it refreshes tokens and needs to set cookies.
        // In some server contexts, Next marks cookies as readonly; TS flags .set().
        // At runtime in route handlers/server actions, this DOES work—so we ignore TS here.
        set(name: string, value: string, options: CookieOptions) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - Next types mark cookies readonly in server components
          cookieStore.set(name, value, options);
        },

        // Remove = set cookie with empty value + maxAge 0 (same caveat as above)
        remove(name: string, options: CookieOptions) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - Next types mark cookies readonly in server components
          cookieStore.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );
}
