'use client';

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";

type ModifierGroup = {
  id: number;
  name: string;
  selection_type: string;
  sort_order: number;
}

export default function ModifierGroupLibrary() {
  const supabase = createSupabaseBrowserClient();

  const [groups, setGroups] = useState<ModifierGroup[] | []>([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [gName, setGName] = useState('');
  const [gType, setGType] = useState('single');
  
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr(null);

      const { data, error } = await supabase
        .from('modifier_groups')
        .select('id,name,selection_type,sort_order')
        .order('sort_order').order('name');
        
      if (!mounted) return;

      if (error) setErr(error.message);
      else setGroups((data ?? []) as ModifierGroup[]);

      setLoading(false);
    })();
    return () => { mounted = false };
  }, [supabase]);

  const maxSort = useMemo(
    () => (groups.length ? Math.max(...groups.map(g => g.sort_order)) : 0),
    [groups]
  );

  async function refresh() {
    const { data, error } = await supabase
      .from('modifier_groups')
      .select('id,name,selection_type,sort_order')
      .order('sort_order').order('name');
    if (error) setErr(error.message);
    else setGroups((data ?? []) as ModifierGroup[]);
  }

  async function AddGroup() {
    const name = gName.trim();
    const selectionType = gType.trim();
    if (!name || !selectionType) return;

    setErr(null);
    const { error } = await supabase.from('modifier_groups').insert({
      name,
      selection_type: selectionType,
      sort_order: maxSort + 1,
    });
    if (error) setErr(error.message);
    setGName(''); setGType('single');
    await refresh();
  }

  async function updateGroup(id: number, patch: Partial<ModifierGroup>) {
    setErr(null);
    const { error } = await supabase.from('modifier_groups').update(patch).eq('id', id);
    if (error) setErr(error.message);
    await refresh();
  }

  async function deleteGroup(id: number, name: string) {
    const confirmed = confirm(`Delete modifier group "${name}"?`);
    if (!confirmed) return;
    const { error } = await supabase.from('modifier_groups').delete().eq('id', id);
    if (error) alert(`Error deleting modifier group: ${error.message}`);
    else await refresh();
  }

  async function move(id: number, dir: 'up' | 'down') {
    const idx = groups.findIndex(g => g.id === id);
    if (idx < 0) return;
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= groups.length) return;

    const a = groups[idx];
    const b = groups[targetIdx];

    const u1 = supabase.from('modifier_groups').update({ sort_order: b.sort_order }).eq('id', a.id);
    const u2 = supabase.from('modifier_groups').update({ sort_order: a.sort_order }).eq('id', b.id);
    const [{ error: e1 }, { error: e2 }] = await Promise.all([u1, u2]);
    if (e1 || e2) setErr((e1?.message || e2?.message) ?? null);
    await refresh();
  }

  if (loading) return <div>Loading modifier groups...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Modifier Group Library
        </h1>
        <div className="flex items-center gap-4">
          <Link href={"/admin/menu/libraries"} className="text-sm text-blue-600 hover:underline">
            ← Back to Libraries
          </Link>
        </div>
      </div>

      {/* New Modifier Group Form */}
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          className="border rounded px-3 py-2 bg-white"
          placeholder="Modifier Group name (e.g., Syrups)"
          value={gName}
          onChange={(e) => setGName(e.target.value)}
        />
        <select
          className="border rounded px-3 py-2 bg-white"
          value={gType}
          onChange={(e) => setGType(e.target.value)}
        >
          <option value="">Select type...</option>
          <option value="single">Single (choose one)</option>
          <option value="multi">Multi (choose many)</option>
        </select>
        <div>
          <button
            onClick={() => startTransition(AddGroup)}
            disabled={isPending || !gName.trim()}
            className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
          >
            {isPending ? 'Adding...' : 'Add modifier group'}
          </button>
        </div>
      </div>

      {err && <p className="text-red-600 text-sm">{err}</p>}

      {/* Modifier Groups table */}
      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2 w-20">Order</th>
              <th className="px-4 py-2">Modifier Group</th>
              <th className="px-4 py-2 w-28">Selection Type</th>
              <th className="px-4 py-2">Delete</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g, i) => (
              <GroupRow
                key={g.id}
                g={g}
                isFirst={i === 0}
                isLast={i === groups.length - 1}
                onMove={move}
                onUpdate={updateGroup}
                onDelete={deleteGroup}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupRow({ g, isFirst, isLast, onMove, onUpdate, onDelete }: {
  g: ModifierGroup;
  isFirst: boolean;
  isLast: boolean;
  onMove: (id: number, dir: 'up' | 'down') => void;
  onUpdate: (id: number, patch: Partial<ModifierGroup>) => Promise<void>;
  onDelete: (id: number, name: string) => void;
}) {
  const [name, setName] = useState(g.name);
  const [selection_type, setType] = useState(g.selection_type);

  return (
    <tr className="border-t align-middle">
      <td className="px-4 py-2">
        <div className="flex gap-1">
          <button
            className="rounded border px-2 py-1 disabled:opacity-40"
            disabled={isFirst}
            onClick={() => onMove(g.id, 'up')}
            title="Move up"
          >▲</button>
          <button
            className="rounded border px-2 py-1 disabled:opacity-40"
            disabled={isLast}
            onClick={() => onMove(g.id, 'down')}
            title="Move down"
          >▼</button>
        </div>
      </td>

      <td className="px-4 py-2">
        <input
          className="border rounded px-2 py-1 bg-white"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name !== g.name && onUpdate(g.id, { name })}
        />
      </td>

      <td className="px-4 py-2">
        <select
          className="border rounded px-2 py-1 bg-white"
          value={selection_type}
          onChange={(e) => setType(e.target.value)}
          onBlur={() => selection_type !== g.selection_type && onUpdate(g.id, { selection_type })}
        >
          <option value="">Select type...</option>
          <option value="single">Single (choose one)</option>
          <option value="multi">Multi (choose many)</option>
        </select>
      </td>

      <td className="px-4 py-2">
        <button
          onClick={() => onDelete(g.id, g.selection_type)}
          className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}