// Add, modify, or delete modifiers within each group. 
// Add link back to groups library

'use client';

import { useEffect, useMemo, useState, useTransition } from "react";
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ModifierGroup = {
  id: number;
  name: string;
  selection_type: string;
}

type Modifier = {
  id: number;
  group_id: number;
  name: string;
  price_delta: number;
  is_active: boolean;
  affects_prep: boolean;
  sort_order: number;
}

export default function ModifiersPage() {
  const supabase = createSupabaseBrowserClient();
  const params = useParams<{ groupId: string; }>();
  const groupId = Number(params.groupId);

  const [group, setGroup] = useState<ModifierGroup | null>(null);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [mName, setMName] = useState('');
  const [mDelta, setMDelta] = useState('0.00');
  const [mPrep, setMPrep] = useState(false);
    
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr(null);

      const [gQ, mQ] = await Promise.all([
        supabase.from('modifier-groups')
          .select('id,name,selection_type')
          .eq('id', groupId)
          .maybeSingle(),
        supabase.from('modifiers')
          .select('*')
          .eq('group_id', groupId)
          .order('sort_order')
          .order('name'),
      ]);

      if (!mounted) return;

      if (gQ.error) setErr(gQ.error.message);
      else setGroup(gQ.data as ModifierGroup | null);

      if (mQ.error) setErr(mQ.error.message);
      else setModifiers((mQ.data ?? []) as Modifier[]);

      setLoading(false);
    })();
    return () => { mounted = false };
  }, [groupId, supabase]);

  const maxSort = useMemo(
    () => (modifiers.length ? Math.max(...modifiers.map(m => m.sort_order)) : 0),
    [modifiers]
  );

  async function refresh() {
    const { data, error } = await supabase
      .from('modifiers')
      .select('*')
      .eq('group_id', groupId)
      .order('sort_order')
      .order('name');
    if (error) setErr(error.message);
    else setModifiers((data ?? []) as Modifier[]);
  }

  async function addModifier() {
    const name = mName.trim();
    const delta = Number.parseFloat(mDelta);
    const prep = mPrep;

    if (!name || Number.isNaN(delta)) return;

    setErr(null);
    const { error } = await supabase.from('modifiers').insert({
      group_id: groupId,
      name,
      price_delta: delta,
      is_active: true,
      affects_prep: prep,
      sort_order: maxSort + 1,
    });
    if (error) setErr(error.message);
    setMName(''); setMDelta('0.00'); setMPrep(false);
    await refresh();
  }

  async function updateModifier(id: number, patch: Partial<Modifier>) {
    setErr(null);
    const { error } = await supabase.from('modifiers').update(patch).eq('id', id);
    if (error) setErr(error.message);
    await refresh();
  }

  async function deleteModifier(id: number, name: string) {
    const confirmed = confirm(`Delete modifier "${name}"?`);
    if (!confirmed) return;
    const { error } = await supabase.from('modifiers').delete().eq('id', id);
    if (error) alert(`Error deleting modifier: ${error.message}`);
    else await refresh();
  }

  async function move(id: number, dir: 'up' | 'down') {
    const idx = modifiers.findIndex(m => m.id === id);
    if (idx < 0) return;
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= modifiers.length) return;

    const a = modifiers[idx];
    const b = modifiers[targetIdx];

    const u1 = supabase.from('modifiers').update({ sort_order: b.sort_order }).eq('id', a.id);
    const u2 = supabase.from('modifiers').update({ sort_order: a.sort_order }).eq('id', b.id);
    const [{ error: e1 }, { error: e2 }] = await Promise.all([u1, u2]);
    if (e1 || e2) setErr((e1?.message || e2?.message) ?? null);
    await refresh();
  }

  if (loading) return <div>Loading modifiers...</div>;
  if (!group) return <div className="text-red-600">Item not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Modifiers - <span className="font-normal text-gray-600">{group.name}</span>
        </h1>
        <div className="flex items-center gap-4">
          <Link href="/admin/menu/libraries" className="text-blue-600 hover:text-blue-800 underline text-base">
            Libraries
          </Link>
          <Link href="/admin/menu/libraries/modifier-groups" className="text-sm text-blue-600 hover:underline">
            ← Back to Groups
          </Link>
        </div>
      </div>

      {/* New modifier form*/}
      <div className="grid gap-2 sm:grid-cols-4">
        <input
          className="border rounded px-3 py-2 bg-white"
          placeholder="Modifier name (e.g. Whole Milk)"
          value={mName}
          onChange={(e) => setMName(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2 bg-white"
          placeholder="Price delta (e.g., 0.50 or -0.25)"
          inputMode="decimal"
          value={mDelta}
          onChange={(e) => setMDelta(e.target.value)}
        />
        {/* Add affects prep checkbox */}
        <div>
          <button
            onClick={() => startTransition(addModifier)}
            disabled={isPending || !mName.trim()}
            className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
          >
            {isPending ? 'Adding...' : 'Add modifier'}
          </button>
        </div>
      </div>

      {err && <p className="text-red-600 text-sm">{err}</p>}

      {/* Modifiers table */}
      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2 w-20">Order</th>
              <th className="px-4 py-2">Modifier</th>
              <th className="px-4 py-2 w-28">Δ Price</th>
              <th className="px-4 py-2 w-28">Affects Prep?</th>
              <th className="px-4 py-2 w-28">Active?</th>
              <th className="px-4 py-2">Delete</th>
            </tr>
          </thead>
          <tbody>
            {modifiers.map((m, i) => (
              <ModifierRow
                key={m.id}
                m={m}
                isFirst={i === 0}
                isLast={i === modifiers.length - 1}
                onMove={move}
                onUpdate={updateModifier}
                onDelete={deleteModifier}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModifierRow({ m, isFirst, isLast, onMove, onUpdate, onDelete }: {
  m: Modifier;
  isFirst: boolean;
  isLast: boolean;
  onMove: (id: number, dir: 'up' | 'down') => void;
  onUpdate: (id: number, patch: Partial<Modifier>) => Promise<void>;
  onDelete: (id: number, name: string) => void;
}) {
  const [name, setName] = useState(m.name);
  const [delta, setDelta] = useState(m.price_delta.toFixed(2));
  
  return (
    <tr className="border-t align-middle">
      <td className="px-4 py-2">
        <div className="flex gap-1">
          <button
            className="rounded border px-2 py-1 disabled:opacity-40"
            disabled={isFirst}
            onClick={() => onMove(m.id, 'up')}
            title="Move up"
          >▲</button>
          <button
            className="rounded border px-2 py-1 disabled:opacity-40"
            disabled={isLast}
            onClick={() => onMove(m.id, 'down')}
            title="Move down"
          >▼</button>
        </div>
      </td>

      <td className="px-4 py-2">
        <input
          className="border rounded px-2 py-1 bg-white"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name !== m.name && onUpdate(m.id, { name })}
        />
      </td>

      <td className="px-4 py-2">
        <input
          className="border rounded px-2 py-1 w-24 bg-white"
          inputMode="decimal"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          onBlur={() => {
            const d = Number.parseFloat(delta);
            if (!Number.isNaN(d) && d !== m.price_delta) void onUpdate(m.id, { price_delta: d });
          }}
        />
      </td>

      <td className="px-4 py-2">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={m.is_active}
            onChange={(e) => void onUpdate(m.id, { is_active: e.target.checked })}
            />
            <span>{m.is_active ? 'Active' : 'Inactive'}</span>
        </label>
      </td>

      <td className="px-4 py-2">
        <button
          onClick={() => onDelete(m.id, m.name)}
          className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}