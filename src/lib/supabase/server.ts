// Creates a Supabase client that can READ auth cookies in Server Components.
// It intentionally NO-OPs any cookie writes to avoid Next's runtime error.
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export function createSupabaseServerClient() {
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
        // NO-OP in Server Components (cannot modify cookies here)
        set() {},
        remove() {},
      },
    }
  );
}
