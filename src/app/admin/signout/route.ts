import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';

export async function POST(request: Request) {
  const supabase = createSupabaseRouteClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/login', request.url));
}
