'use client';

import { useTransition } from "react";

export default function SignOutButton() {
  const [pending, start] = useTransition();

  return (
    <button
      onClick={() => 
        start(() => {
          void fetch('/admin/signout', { method: 'POST' })
            .then(() => { window.location.href = '/login'; })
            .catch(() => { window.location.href = '/login'; });
        })
      }
      className="rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
      disabled={pending}
      title="Sign out"
    >
      {pending ? 'Signing out...' : 'Sign out'}
    </button>
  );
}