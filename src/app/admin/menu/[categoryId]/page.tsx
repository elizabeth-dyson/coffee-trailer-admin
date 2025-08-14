'use client';

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from 'next/link';
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import ImageUpload from '@/components/ImageUpload';

type Category = {
  id: number;
  name: string;
  is_active: boolean;
  sort_order: number;
};

type Item = {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  base_price: number;
  sort_order: number;
  is_active: boolean;
  is_featured: boolean;
};

export default function ItemsForCategoryPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const params = useParams<{ categoryId: string }>();

  const initialCatId = Number(params.categoryId);
  const [cats, setCats] = useState<Category[]>([]);
  const [catId, setCatId] = useState<number>(initialCatId);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [nName, setNName] = useState('');
  const [nPrice, setNPrice] = useState<string>('0.00');
  const [nDesc, setNDesc] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order').order('name');
      if (!mounted) return;
      if (error) setErr(error.message);
      else setCats((data ?? []) as Category[]);
      setLoading(false);
    })();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const urlId = Number(params.categoryId);
    if (!Number.isNaN(urlId) && urlId != catId) setCatId(urlId);
  }, [params.categoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!catId) return;
    let mounted = true;
    (async () => {
      setErr(null);
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('category_id', catId)
        .order('sort_order').order('name');
      if (!mounted) return;
      if (error) setErr(error.message);
      else setItems((data ?? []) as Item[]);
    })();
    return () => { mounted = false; };
  }, [catId, supabase]);

  const maxSort = useMemo(
    () => (items.length ? Math.max(...items.map(i => i.sort_order)) : 0),
    [items]
  );

  async function refresh() {
    if (!catId) return;
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('category_id', catId)
      .order('sort_order').order('name');
    if (error) setErr(error.message);
    else setItems((data ?? []) as Item[]);
  }

  async function addItem() {
    if (!catId) return;
    const name = nName.trim();
    const price = Number.parseFloat(nPrice);
    if (!name || Number.isNaN(price)) return;

    setErr(null);
    const { error } = await supabase.from('items').insert({
      category_id: catId,
      name,
      base_price: price,
      description: nDesc.trim() || null,
      is_active: true,
      is_featured: false,
      sort_order: maxSort + 1,
    });
    if (error) setErr(error.message);
    setNName(''); setNPrice('0.00'); setNDesc('');
    await refresh();
  }

  async function updateItem(id: number, patch: Partial<Item>) {
    setErr(null);
    const { error } = await supabase.from('items').update(patch).eq('id', id);
    if (error) setErr(error.message);
    await refresh();
  }

  async function deleteItem(id: number, name: string) {
    const confirmed = confirm(
      `Are you sure you want to delete "${name}"?`
    );
    if (!confirmed) return;

    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) {
      alert(`Error deleting item: ${error.message}`);
    } else {
      await refresh();
    }
  }

  async function move(id: number, dir: 'up' | 'down') {
    const idx = items.findIndex(i => i.id === id);
    if (idx < 0) return;
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const a = items[idx];
    const b = items[targetIdx];

    const u1 = supabase.from('items').update({ sort_order: b.sort_order }).eq('id', a.id);
    const u2 = supabase.from('items').update({ sort_order: a.sort_order }).eq('id', b.id);
    const [{ error: e1 }, { error: e2 }] = await Promise.all([u1, u2]);
    if (e1 || e2) setErr((e1?.message || e2?.message) ?? null);
    await refresh();
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Items</h1>
        <Link href="/admin/menu" className="text-sm text-blue-600 hover:underline">← Back to Categories</Link>
      </div>

      {/* Category picker that navigates to the category's URL */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">Category:</label>
        <select
          className="border rounded px-3 py-2 bg-white"
          value={catId ?? ''}
          onChange={(e) => {
            const next = Number(e.target.value);
            setCatId(next);
            router.replace(`/admin/menu/${next}`);
          }}
        >
          {cats.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}{c.is_active ? '' : ' (inactive)'}
            </option>
          ))}
        </select>
      </div>

      {/* New item form */}
      <div className="grid gap-2 sm:grid-cols-4">
        <input 
          className="border rounded px-3 py-2 bg-white"
          placeholder="Item name (e.g., Latte)"
          value={nName}
          onChange={(e) => setNName(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2 bg-white"
          placeholder="Base price (e.g., 4.00)"
          inputMode="decimal"
          value={nPrice}
          onChange={(e) => setNPrice(e.target.value)}
        />
        <input 
          className="border rounded px-3 py-2 bg-white sm:col-span-2"
          placeholder="Description (optional)"
          value={nDesc}
          onChange={(e) => setNDesc(e.target.value)}
        />
        <div className="sm:col-span-4">
          <button
            onClick={() => startTransition(addItem)}
            disabled={isPending || !nName.trim()}
            className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
          >
            {isPending ? 'Adding...' : 'Add item'}
          </button>
        </div>
      </div>

      {err && <p className="text-red-600 text-sm">{err}</p>}

      {/* Items table */}
      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2 w-20">Order</th>
              <th className="px-4 py-2">Item</th>
              <th className="px-4 py-2 w-28">Price</th>
              <th className="px-4 py-2">Image</th>
              <th className="px-4 py-2 w-28">Featured</th>
              <th className="px-4 py-2 w-28">Active</th>
              <th className="px-4 py-2">Delete</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <ItemRow
                key={it.id}
                it={it}
                isFirst={i === 0}
                isLast={i === items.length - 1}
                onMove={move}
                onUpdate={updateItem}
                onDelete={deleteItem}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --- ItemRow component ------------------------------------------------ */
function ItemRow({ it, isFirst, isLast, onMove, onUpdate, onDelete }: {
  it: Item;
  isFirst: boolean;
  isLast: boolean;
  onMove: (id: number, dir: 'up' | 'down') => void;
  onUpdate: (id: number, patch: Partial<Item>) => Promise<void>;
  onDelete: (id: number, name: string) => void;
}) {
  const [name, setName] = useState(it.name);
  const [desc, setDesc] = useState(it.description ?? '');
  const [price, setPrice] = useState(it.base_price.toFixed(2));

  return (
    <tr className="border-t align-middle">
      <td className="px-4 py-2">
        <div className="flex gap-1">
          <button 
            className="rounded border px-2 py-1 disabled:opacity-40"
            disabled={isFirst}
            onClick={() => onMove(it.id, 'up')}
          >
            ▲
          </button>
          <button
            className="rounded border px-2 py-1 disabled:opacity-40"
            disabled={isLast}
            onClick={() => onMove(it.id, 'down')}
          >
            ▼
          </button>
        </div>
      </td>

      <td className="px-4 py-2">
        <div className="grid gap-2">
          <input
            className="border rounded px-2 py-1 bg-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name !== it.name && onUpdate(it.id, { name })}
          />
          <input
            className="border rounded px-2 py-1 bg-white"
            placeholder="Description"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={() => (desc !== (it.description ?? '')) && onUpdate(it.id, { description: desc || null })}
          />
        </div>
      </td>

      <td className="px-4 py-2">
        <input
          className="border rounded px-2 py-1 w-24 bg-white"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={() => {
            const p = Number.parseFloat(price);
            if (!Number.isNaN(p) && p !== it.base_price) void onUpdate(it.id, { base_price: p });
          }}
        />
      </td>

      <td className="px-4 py-2">
        <ImageUpload
          itemId={it.id}
          currentUrl={it.image_url}
          onUploaded={(url) => { void onUpdate(it.id, { image_url: url }); }}
        />
      </td>

      <td className="px-4 py-2">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={it.is_featured} onChange={(e) => void onUpdate(it.id, { is_featured: e.target.checked })}/>
          <span>Featured</span>
        </label>
      </td>

      <td className="px-4 py-2">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={it.is_active} onChange={(e) => void onUpdate(it.id, { is_active: e.target.checked })}/>
          <span>{it.is_active ? 'Active' : 'Inactive'}</span>
        </label>
      </td>

      <button
        onClick={() => onDelete(it.id, it.name)}
        className='inline-flex items-center text-sm bg-red-500 text-white rounded hover:bg-red-600'
      >
        Delete
      </button>
    </tr>
  );
}