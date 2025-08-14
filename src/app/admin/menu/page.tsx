'use client';

// Admin > Menu Page (Phase 1: Categories)

import { useEffect, useMemo, useState, useTransition } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import Link from 'next/link';

type Category = {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export default function MenuPage() {
  const supabase = createSupabaseBrowserClient();

  // Local state
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [isPending, startTransition] = useTransition();

  // Load categories on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr(null);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (!mounted) return;
      if (error) setErr(error.message);
      else setCats((data ?? []) as Category[]);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [supabase]);

  const maxSort = useMemo(
    () => (cats.length ? Math.max(...cats.map(c => c.sort_order)) : 0),
    [cats]
  );

  async function refresh() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order')
      .order('name');
    if (error) setErr(error.message);
    else setCats((data ?? []) as Category[]);
  }

  async function addCategory() {
    const name = newName.trim();
    if (!name) return;
    setErr(null);

    const { error } = await supabase.from('categories').insert({
      name,
      sort_order: maxSort + 1,
      is_active: true,
    });
    if (error) setErr(error.message);
    setNewName('');
    await refresh();
  }

  async function renameCategory(id: number, name: string) {
    const clean = name.trim();
    if (!clean) return;
    setErr(null);
    const { error } = await supabase
      .from('categories')
      .update({name: clean})
      .eq('id', id);
    if (error) setErr(error.message);
    await refresh();
  }

  async function toggleActive(id: number, is_active: boolean) {
    setErr(null);
    const { error } = await supabase
      .from('categories')
      .update({ is_active })
      .eq('id', id);
    if (error) setErr(error.message);
    await refresh();
  }

  /**
   * Reorder:
   * - Find the neighbor above/below by sort_order
   * - Swap sort_order values in a small transaction-like sequence
   *   (Two updates; if the second fails, you may briefly have a duplicate
   *    sort_order, but refresh will fix the visual state.)
   */
  async function move(id: number, direction: 'up' | 'down') {
    const idx = cats.findIndex(c => c.id === id);
    if (idx < 0) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= cats.length) return;

    const a = cats[idx];
    const b = cats[targetIdx];

    const u1 = supabase.from('categories')
      .update({ sort_order: b.sort_order })
      .eq('id', a.id);
    const u2 = supabase.from('categories')
      .update({ sort_order: a.sort_order })
      .eq('id', b.id);
    
    const [{ error: e1 }, { error: e2 }] = await Promise.all([u1, u2]);
    if (e1 || e2) setErr((e1?.message || e2?.message) ?? null);
    await refresh();
  }

  // ------ UI ---------------------------------------------------------------------
  if (loading) {
    return <div className="text-sm text-gray-600">Loading categories...</div>;
  }
  return (
    <div className='space-y-6'>
      <h1 className='text-xl font-semibold'>Menu Manager - Categories</h1>

      {/* Add new */}
      <div className='flex gap-2'>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name"
          className='border rounded px-3 py-2 w-72 bg-white'
        />
        <button
          onClick={() => startTransition(addCategory)}
          className='rounded bg-black text-white px-4 py-2 disabled:opacity-50'
          disabled={isPending || !newName.trim()}
        >
          {isPending ? 'Adding...' : 'Add'}
        </button>
      </div>

      {err && <p className='text-red-600 text-sm'>{err}</p>}

      {/* List */}
      <div className='overflow-hidden rounded-xl border bg-white'>
        <table className='w-full text-sm'>
          <thead className='bg-gray-50 text-left'>
            <tr>
              <th className='px-4 py-2 w-16'>Order</th>
              <th className='px-4 py-2'>Name</th>
              <th className='px-4 py-2 w-28'>Active</th>
              <th className='px-4 py-2 w-40'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c, i) => (
              <CategoryRow
                key={c.id}
                cat={c}
                isFirst={i === 0}
                isLast={i === cats.length - 1}
                onRename={renameCategory}
                onToggle={toggleActive}
                onMove={move}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Child row component (kept here for simplicity for now) --------------------------------------------

function CategoryRow({
  cat, isFirst, isLast, onRename, onToggle, onMove,
}: {
  cat: Category;
  isFirst: boolean;
  isLast: boolean;
  onRename: (id: number, name: string) => void;
  onToggle: (id: number, is_active: boolean) => void;
  onMove: (id: number, dir: 'up' | 'down') => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);

  return (
    <tr className='border-t'>
      <td className='px-4 py-2'>
        <div className='flex gap-1'>
          <button
            className='rounded border px-2 py-1 disabled:opacity-40'
            disabled={isFirst}
            onClick={() => onMove(cat.id, 'up')}
            title="Move up"
          >▲</button>
          <button
            className='rounded border px-2 py-1 disabled:opacity-40'
            disabled={isLast}
            onClick={() => onMove(cat.id, 'down')}
            title='Move down'
          >▼</button>
        </div>
      </td>

      <td className='px-4 py-2'>
        {editing ? (
          <div className='flex gap-2'>
            <input
              className='border rounded px-2 py-1 bg-white'
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <button
              className='rounded bg-black text-white px-3'
              onClick={() => { setEditing(false); if (name !== cat.name) onRename(cat.id, name); }}
            >
              Save
            </button>
            <button className='rounded border px-3' onClick={() => { setEditing(false); setName(cat.name); }}>
              Cancel
            </button>
          </div>
        ) : (
          <div className='flex items-center gap-3'>
            <Link
              href={`/admin/menu/${cat.id}`}
              className='text-blue-600 hover:underline'
              title="Open items in this category"
            >
              {cat.name}
            </Link>
            <button className='text-xs text-gray-600' onClick={() => setEditing(true)}>
              Edit
            </button>
          </div>
        )}
      </td>

      <td className='px-4 py-2'>
        <label className='inline-flex items-center gap-2'>
          <input
            type="checkbox"
            checked={cat.is_active}
            onChange={(e) => onToggle(cat.id, e.target.checked)}
          />
          <span>{cat.is_active ? 'Active' : 'Inactive'}</span>
        </label>
      </td>

      <td className='px-4 py-2'>
        <span className='text-gray-500'>id: {cat.id}</span>
      </td>
    </tr>
  );
}