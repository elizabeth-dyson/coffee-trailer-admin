// Creates a Supabase client that CAN write cookies.
// Use ONLY in Route Handlers (app/**/route.ts) or Server Actions.
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export function createSupabaseRouteClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - Next types mark cookies readonly in server components
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - Next types mark cookies readonly in server components
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - Next types mark cookies readonly in server components
          cookieStore.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );
}
