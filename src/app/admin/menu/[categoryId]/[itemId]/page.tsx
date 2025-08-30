'use client';

import { useEffect, useMemo, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Link from 'next/link';
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Item = {
  id: number;
  category_id: number;
  name: string;
  base_price: number;
};

type Variant = {
  id: number;
  item_id: number;
  name: string;
  price_delta: number;
  sort_order: number;
  is_active: boolean;
};

export default function VariantsPage() {
  const supabase = createSupabaseBrowserClient();
  const params = useParams<{ categoryId: string; itemId: string }>();

  const categoryId = Number(params.categoryId);
  const itemId = Number(params.itemId);

  const [item, setItem] = useState<Item | null>(null);
  const [vars_, setVars] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // new variant inputs
  const [vName, setVName] = useState('');
  const [vDelta, setVDelta] = useState('0.00');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr(null);

      const [iQ, vQ] = await Promise.all([
        supabase.from('items')
          .select('id,category_id,name,base_price')
          .eq('id', itemId)
          .maybeSingle(),
        supabase.from('variants')
          .select('*')
          .eq('item_id', itemId)
          .order('sort_order')
          .order('name'),
      ]);

      if (!mounted) return;

      if (iQ.error) setErr(iQ.error.message);
      else setItem(iQ.data as Item | null);

      if (vQ.error) setErr(vQ.error.message);
      else setVars((vQ.data ?? []) as Variant[]);

      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [itemId, supabase]);

  const maxSort = useMemo(
    () => (vars_.length ? Math.max(...vars_.map(v => v.sort_order)) : 0),
    [vars_]
  );

  async function refresh() {
    const { data, error } = await supabase
      .from('variants')
      .select('*')
      .eq('item_id', itemId)
      .order('sort_order')
      .order('name');
    if (error) setErr(error.message);
    else setVars((data ?? []) as Variant[]);
  }

  async function addVariant() {
    const name = vName.trim();
    const delta = Number.parseFloat(vDelta);
    if (!name || Number.isNaN(delta)) return;

    setErr(null);
    const { error } = await supabase.from('variants').insert({
      item_id: itemId,
      name,
      price_delta: delta,
      is_active: true,
      sort_order: maxSort + 1,
    });
    if (error) setErr(error.message);
    setVName(''); setVDelta('0.00');
    await refresh();
  }

  async function updateVariant(id: number, patch: Partial<Variant>) {
    setErr(null);
    const { error } = await supabase.from('variants').update(patch).eq('id', id);
    if (error) setErr(error.message);
    await refresh();
  }

  async function deleteVariant(id: number, name: string) {
    const confirmed = confirm(`Delete variant "${name}"?`);
    if (!confirmed) return;
    const { error } = await supabase.from('variants').delete().eq('id', id);
    if (error) alert(`Error deleting variant: ${error.message}`);
    else await refresh();
  }

  async function move(id: number, dir: 'up' | 'down') {
    const idx = vars_.findIndex(v => v.id === id);
    if (idx < 0) return;
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= vars_.length) return;

    const a = vars_[idx];
    const b = vars_[targetIdx];

    const u1 = supabase.from('variants').update({ sort_order: b.sort_order }).eq('id', a.id);
    const u2 = supabase.from('variants').update({ sort_order: a.sort_order }).eq('id', b.id);
    const [{ error: e1 }, { error: e2 }] = await Promise.all([u1, u2]);
    if (e1 || e2) setErr((e1?.message || e2?.message) ?? null);
    await refresh();
  }

  if (loading) return <div>Loading variants...</div>;
  if (!item) return <div className="text-red-600">Item not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Variants — <span className="font-normal text-gray-600">{item.name}</span>
        </h1>
        <div className="flex items-center gap-4">
          <Link href="/admin/menu/libraries" className="text-blue-600 hover:text-blue-800 underline text-base">
            Libraries
          </Link>
          <Link href={`/admin/menu/${categoryId}`} className="text-sm text-blue-600 hover:underline">
            ← Back to Items
          </Link>
          <Link href="/admin/menu" className="text-sm text-blue-600 hover:underline">
            Categories
          </Link>
        </div>
      </div>

      {/* New variant form */}
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          className="border rounded px-3 py-2 bg-white"
          placeholder="Variant name (e.g., Large)"
          value={vName}
          onChange={(e) => setVName(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2 bg-white"
          placeholder="Price delta (e.g., 0.50 or -0.25)"
          inputMode="decimal"
          value={vDelta}
          onChange={(e) => setVDelta(e.target.value)}
        />
        <div>
          <button
            onClick={() => startTransition(addVariant)}
            disabled={isPending || !vName.trim()}
            className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
          >
            {isPending ? 'Adding...' : 'Add variant'}
          </button>
        </div>
      </div>

      {err && <p className="text-red-600 text-sm">{err}</p>}

      {/* Variants table */}
      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2 w-20">Order</th>
              <th className="px-4 py-2">Variant</th>
              <th className="px-4 py-2 w-28">Δ Price</th>
              <th className="px-4 py-2 w-28">Active</th>
              <th className="px-4 py-2">Delete</th>
            </tr>
          </thead>
          <tbody>
            {vars_.map((v, i) => (
              <VariantRow
                key={v.id}
                v={v}
                isFirst={i === 0}
                isLast={i === vars_.length - 1}
                onMove={move}
                onUpdate={updateVariant}
                onDelete={deleteVariant}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VariantRow({ v, isFirst, isLast, onMove, onUpdate, onDelete }: {
  v: Variant;
  isFirst: boolean;
  isLast: boolean;
  onMove: (id: number, dir: 'up' | 'down') => void;
  onUpdate: (id: number, patch: Partial<Variant>) => Promise<void>;
  onDelete: (id: number, name: string) => void;
}) {
  const [name, setName] = useState(v.name);
  const [delta, setDelta] = useState(v.price_delta.toFixed(2));

  return (
    <tr className="border-t align-middle">
      <td className="px-4 py-2">
        <div className="flex gap-1">
          <button
            className="rounded border px-2 py-1 disabled:opacity-40"
            disabled={isFirst}
            onClick={() => onMove(v.id, 'up')}
            title="Move up"
          >▲</button>
          <button
            className="rounded border px-2 py-1 disabled:opacity-40"
            disabled={isLast}
            onClick={() => onMove(v.id, 'down')}
            title="Move down"
          >▼</button>
        </div>
      </td>

      <td className="px-4 py-2">
        <input
          className="border rounded px-2 py-1 bg-white"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name !== v.name && onUpdate(v.id, { name })}
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
            if (!Number.isNaN(d) && d !== v.price_delta) void onUpdate(v.id, { price_delta: d });
          }}
        />
      </td>

      <td className="px-4 py-2">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={v.is_active}
            onChange={(e) => void onUpdate(v.id, { is_active: e.target.checked })}
          />
          <span>{v.is_active ? 'Active' : 'Inactive'}</span>
        </label>
      </td>

      <td className="px-4 py-2">
        <button
          onClick={() => onDelete(v.id, v.name)}
          className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}