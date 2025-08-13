import { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type AppUserMetadata = {
  app_role?: string;
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const supabase = createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const role = (user.user_metadata as AppUserMetadata)?.app_role ?? '';
    if (!['owner', 'manager'].includes(role)) redirect('/login');

    return (
        <div className="min-h-screen">
            <header className="border-b bg-white">
                <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
                    <nav className="flex gap-4">
                        <Link href="/admin">Home</Link>
                        <Link href="/admin/menu">Menu</Link>
                        <Link href="/admin/inventory">Inventory</Link>
                        <Link href="/admin/settings">Settings</Link>
                        <Link href="/admin/preview">Preview</Link>
                    </nav>
                    <div className="text-sm text-gray-600">
                        {user.email} • {role}
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        </div>
    );
}