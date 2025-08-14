'use client';

import { useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Props = {
  itemId: number;
  currentUrl?: string | null;
  onUploaded: (publicUrl: string) => void;
};

export default function ImageUpload({ itemId, currentUrl, onUploaded }: Props) {
  const supabase = createSupabaseBrowserClient();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File) {
    setErr(null);
    setBusy(true);

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `items/${itemId}/main.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('menu-images')
      .upload(path, file, { upsert: true });

    if (upErr) {
      setErr(upErr.message);
      setBusy(false);
      return;
    }

    const { data } = supabase.storage.from('menu-images').getPublicUrl(path);
    const url = data.publicUrl;
    onUploaded(url);
    setBusy(false);
  }

  return (
    <div className='flex items-center gap-3'>
      {currentUrl ? (
        <img
          src={currentUrl}
          alt="item"
          className='h-12 w-12 rounded object-cover border'
        />
      ) : (
        <div className='h-12 w-12 rounded bg-gray-100 grid place-items-center text-xs text-gray-500 border'>
          no img
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className='hidden'
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      <button
        type="button"
        className='rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50'
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? 'Uploading...' : currentUrl ? 'Replace image' : 'Upload image'}
      </button>

      {err && <span className='text-xs text-red-600'>{err}</span>}
    </div>
  );
}