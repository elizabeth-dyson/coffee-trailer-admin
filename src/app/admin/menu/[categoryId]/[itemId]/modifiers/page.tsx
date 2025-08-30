'use client';

// Modifier Groups can be added or deleted from that item, as well as specific modifiers within a group.
// This should only affect the ITEM'S modifiers, not add or delete modifiers as a whole.

{/* Imports */}
import { useEffect, useMemo, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Link from 'next/link';
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

{/* Type Definitions */}
type Item = {           // Menu Item
  id: number;
  category_id: number;
  name: string;
  base_price: number;
};

type ModifierGroup = {    // Category of Modifiers
  id: number;
  name: string;
  selection_type: string;
  sort_order: number;
};

type Modifier = {    // Actual Modifier
  id: number;
  group_id: number;
  name: string;
  price_delta: number;
  is_active: boolean;
  affects_prep: boolean;
  sort_order: number;
};

type IMLink = {    // Link between Modifier Group and Item
  id: number;
  item_id: number;
  group_id: number;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  max_choices: number | null;
  default_modifier_id: number | null;
  modifier_groups: ModifierGroup;
}

export default function ItemModifiersPage() {

  {/* Create supabase client, Define url params */}
  const supabase = createSupabaseBrowserClient();
  const params = useParams<{ categoryId: string; itemId: string }>();

  const categoryId = Number(params.categoryId);
  const itemId = Number(params.itemId);

  {/* Set states for incoming data */}
  const [item, setItem] = useState<Item | null>(null);
  const [iMLinks, setIMLinks] = useState<IMLink[]>([]);
  const [mGroups, setMGroups] = useState<ModifierGroup[]>([]);
  const [modifiersByGroup, setModifiersByGroup] = useState<Record<number, Modifier[]>>({});

  {/* Set states for loads and errors */}
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  {/* Set states for adding new groups */}
  const [groupOptions, setGroupOptions] = useState<ModifierGroup[]>([]);
  const [chosenGroup, setChosenGroup] = useState<ModifierGroup | null>(null);

  {/* Initial Data Load */}
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr(null);

      // Load item data and item-modifier group link data
      const [iQ, lQ] = await Promise.all([
        supabase.from('items')
          .select('id,category_id,name,base_price')
          .eq('id', itemId)
          .maybeSingle(),
        supabase.from('item_modifier_groups')
          .select('*,modifier_groups(id,name,selection_type,sort_order)')
          .eq('item_id', itemId)
          .order('sort_order')
          .order('id'),
      ]);

      if (!mounted) return;
      
      if (iQ.error) setErr(iQ.error.message);
      else setItem(iQ.data as Item | null);

      const links = (lQ.data ?? []) as IMLink[];
      if (lQ.error) setErr(lQ.error.message);
      else setIMLinks(links);

      // Get group ids that are linked to this item
      const groupIds = links.map(link => link.group_id);

      if (groupIds.length > 0) {
        // If there is at least 1 group id linked,
        // Get group data, modifier data, and dropdown data for adding new group
        const [gQ, mQ, allGQ] = await Promise.all([
          supabase.from('modifier_groups')
            .select('id,name,selection_type,sort_order')
            .in('id', groupIds)
            .order('sort_order')
            .order('name'),
          supabase.from('modifiers')
            .select('*')
            .in('group_id', groupIds)
            .order('sort_order')
            .order('name'),
          supabase.from('modifier_groups')
            .select('id,name,selection_type,sort_order')
            .not('id', 'in', `(${groupIds.join(',')})`)
            .order('sort_order')
            .order('name'),
        ]);

        if (!mounted) return;

        if (gQ.error) setErr(gQ.error.message);
        else setMGroups((gQ.data ?? []) as ModifierGroup[]);

        if (allGQ.error) setErr(allGQ.error.message);
        else setGroupOptions((allGQ.data ?? []) as ModifierGroup[]);

        if (mQ.error) setErr(mQ.error.message);
        else {
          // Sort modifiers by modifier group
          const modifiersData = ((mQ.data ?? []) as Modifier[]);
          const grouped = modifiersData.reduce((acc, mod) => {
            if (!acc[mod.group_id]) acc[mod.group_id] = [];
            acc[mod.group_id].push(mod);
            return acc;
          }, {} as Record<number, Modifier[]>);
          setModifiersByGroup(grouped);
        }
      } else {
        // If there are no group ids linked,
        // Get all modifier group data from adding new groups dropdown.
        const { data, error } = await supabase
          .from('modifier_groups')
          .select('id,name,selection_type,sort_order')
          .order('sort_order')
          .order('name');
        
        if (!mounted) return;

        if (error) setErr(error.message);
        else setGroupOptions((data ?? []) as ModifierGroup[]);
      }

      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [supabase, itemId]);

  {/* Find the maximum sort_order value */}
  const maxSort = useMemo(
    () => (iMLinks.length ? Math.max(...iMLinks.map(lin => lin.sort_order)) : 0),
    [iMLinks]
  );

  {/* Refresh function to reload data when changes are made */}
  async function refresh() {
    const { data, error } = await supabase
      .from('item_modifier_groups')
      .select('*,modifier_groups(id,name,selection_type,sort_order)')
      .eq('item_id', itemId)
      .order('sort_order')
      .order('id');

    const links = (data ?? []) as IMLink[];
    if (error) setErr(error.message);
    else setIMLinks(links);

    const groupIds = links.map(lin => lin.group_id);

    if (groupIds.length > 0) {
      const [gQ, mQ, allGQ] = await Promise.all([
        supabase.from('modifier_groups')
          .select('id,name,selection_type,sort_order')
          .in('id', groupIds)
          .order('sort_order')
          .order('name'),
        supabase.from('modifiers')
          .select('*')
          .in('group_id', groupIds)
          .order('sort_order')
          .order('name'),
        supabase.from('modifier_groups')
          .select('id,name,selection_type,sort_order')
          .not('id', 'in', `(${groupIds.join(',')})`)
          .order('sort_order')
          .order('name'),
      ]);

      if (gQ.error) setErr(gQ.error.message);
      else setMGroups((gQ.data ?? []) as ModifierGroup[]);

      if (allGQ.error) setErr(allGQ.error.message);
      else setGroupOptions((allGQ.data ?? []) as ModifierGroup[]);

      if (mQ.error) setErr(mQ.error.message);
      else {
        const modifiersData = ((mQ.data ?? []) as Modifier[]);
        const grouped = modifiersData.reduce((acc, mod) => {
          if (!acc[mod.group_id]) acc[mod.group_id] = [];
          acc[mod.group_id].push(mod);
          return acc;
        }, {} as Record<number, Modifier[]>);
        setModifiersByGroup(grouped);
      }
    } else {
      const { data, error } = await supabase
        .from('modifier_groups')
        .select('id,name,selection_type,sort_order')
        .order('sort_order')
        .order('name');

      if (error) setErr(error.message);
      else setGroupOptions((data ?? []) as ModifierGroup[]);
    }
  }

  {/* Function for Adding a new Group to an Item (aka New Link between Groups and Items) */}
  async function addGroupLink() {
    if (!chosenGroup) return;
    const groupId = chosenGroup.id;

    setErr(null);
    const { error } = await supabase.from('item_modifier_groups').insert({
      item_id: itemId,
      group_id: groupId,
      is_required: false,
      is_active: true,
      sort_order: maxSort + 1,
    });
    if (error) setErr(error.message);
    setChosenGroup(null);
    await refresh();
  }

  {/* Function for Updating Linked information between group and item. */}
  async function updateGroupLink(id: number, patch: Partial<IMLink>) {
    setErr(null);
    const { error } = await supabase.from('item_modifier_groups').update(patch).eq('id', id);
    if (error) setErr(error.message);
    await refresh();
  }

  {/* Unassign group to item */}
  async function deleteGroupLink(id: number, group_name: string) {
    const confirmed = confirm(`Delete "${group_name}" from Item?`);
    if (!confirmed) return;
    const { error } = await supabase.from('item_modifier_groups').delete().eq('id', id);
    if (error) alert(`Error deleting group: ${error.message}`);
    else await refresh();
  }

  {/* Move display order of groups for this item */}
  async function move(id: number, dir: 'up' | 'down') {
    const idx = iMLinks.findIndex(lin => lin.id === id);
    if (idx < 0) return;
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= iMLinks.length) return;

    const a = iMLinks[idx];
    const b = iMLinks[targetIdx]

    const u1 = supabase.from('item_modifier_groups').update({ sort_order: b.sort_order }).eq('id', a.id);
    const u2 = supabase.from('item_modifier_groups').update({ sort_order: a.sort_order }).eq('id', b.id);

    const [{ error: e1 }, { error: e2 }] = await Promise.all([u1, u2]);
    if (e1 || e2) setErr((e1?.message || e2?.message) ?? null);
    await refresh();
  }

  if (loading) return <div>Loading modifiers...</div>;
  if (!item) return <div className="text-red-600">Item not found.</div>;

  return (
    <div className="space-y-6">

      {/* Headings */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Modifier Groups - <span className="font-normal text-gray-600">{item.name}</span>
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

      {/* New group selection */}
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          className="border rounded px-3 py-2 bg-white"
          value={chosenGroup?.id || ''}
          onChange={(e) => {
            const groupId = Number(e.target.value);
            const group = groupOptions.find(g => g.id === groupId);
            setChosenGroup(group || null);
          }}
        >
          <option value="">Select a modifier group to add...</option>
          {groupOptions.map(group => (
            <option key={group.id} value={group.id}>
              {group.name} ({group.selection_type})
            </option>
          ))}
        </select>
        <div>
          <button
            onClick={() => startTransition(addGroupLink)}
            disabled={isPending || !chosenGroup}
            className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
          >
            {isPending ? 'Adding...' : 'Add modifier group to item'}
          </button>
        </div>
      </div>

      {err && <p className="text-red-600 text-sm">{err}</p>}

      {/* Modifier Groups table for this Item */}
      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2 w-20">Order</th>
              <th className="px-4 py-2">Modifier Group (Selection Type)</th>
              <th className="px-4 py-2 w-28">Required?</th>
              <th className="px-4 py-2 w-28">Active?</th>
              <th className="px-4 py-2 w-28">Max Choices</th>
              <th className="px-4 py-2 w-28">Default Modifier</th>
              <th className="px-4 py-2">Delete</th>
            </tr>
          </thead>
          <tbody>
            {iMLinks.map((lin, i) => (
              <ItemModifierGroupRow
                key={lin.id}
                lin={lin}
                isFirst={i === 0}
                isLast={i === iMLinks.length - 1}
                onMove={move}
                onUpdate={updateGroupLink}
                onDelete={deleteGroupLink}
                modifiersByGroup={modifiersByGroup}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ItemModifierGroupRow({ lin, isFirst, isLast, onMove, onUpdate, onDelete, modifiersByGroup }: {
  lin: IMLink;
  isFirst: boolean;
  isLast: boolean;
  onMove: (id: number, dir: 'up' | 'down') => void;
  onUpdate: (id: number, patch: Partial<IMLink>) => Promise<void>;
  onDelete: (id: number, group_name: string) => void;
  modifiersByGroup: Record<number, Modifier[]>;
}) {
  {/* Define states for input fields */}
  const [maxChoices, setMaxChoices] = useState(lin.max_choices);
  const [defaultMod, setDefaultMod] = useState(lin.default_modifier_id);

  {/* Set max choices to 1 if selection type is 'single' and set disabled to true for that value */}
  useEffect(() => {
    if (lin.modifier_groups.selection_type === 'single' && lin.max_choices !== 1) {
      onUpdate(lin.id, { max_choices: 1 });
      setMaxChoices(1);
    }
  }, [lin.modifier_groups.selection_type, lin.max_choices, lin.id, onUpdate]);

  const maxDisabled = lin.modifier_groups.selection_type === 'single';
  const groupModifiers = modifiersByGroup[lin.group_id] || [];

  return (
    <tr className="border-t align-middle">

      {/* Sort column */}
      <td className="px-4 py-2">
        <div className="flex gap-1">
          <button
            className="rounded border px-2 py-1 disabled:opacity-40"
            disabled={isFirst}
            onClick={() => onMove(lin.id, 'up')}
            title="Move up"
          >▲</button>
          <button
            className="rounded border px-2 py-1 disabled:opacity-40"
            disabled={isLast}
            onClick={() => onMove(lin.id, 'down')}
            title="Move down"
          >▼</button>
        </div>
      </td>

      {/* Modifier Group Info (Name & Selection Type) */}
      <td className="px-4 py-2">
        <input 
          className="border rounded px-2 py-1 bg-white"
          value={lin.modifier_groups.name}
          readOnly
        />
        <button
          className="rounded border px-2 py-1 disabled:opacity-40"
          disabled={true}
        >{lin.modifier_groups.selection_type}</button>
      </td>
      
      {/* Active? */}
      <td className="px-4 py-2">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={lin.is_active}
            onChange={(e) => void onUpdate(lin.id, { is_active: e.target.checked })}
          />
          <span>{lin.is_active ? 'Active' : 'Inactive'}</span>
        </label>
      </td>

      {/* Required? */}
      <td className="px-4 py-2">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={lin.is_required}
            onChange={(e) => void onUpdate(lin.id, { is_required: e.target.checked })}
          />
          <span>{lin.is_required ? 'Required' : 'Not Required'}</span>
        </label>
      </td>

      {/* Max Choices */}
      <td className="px-4 py-2">
        <input
          className="border rounded px-2 py-1 bg-white disabled:bg-gray-100"
          type="number"
          min="1"
          value={maxChoices || ''}
          disabled={maxDisabled}
          onChange={(e) => setMaxChoices(Number(e.target.value))}
          onBlur={() => {
            if (!Number.isNaN(maxChoices) && maxChoices !== lin.max_choices && Number(maxChoices) > 0) void onUpdate(lin.id, { max_choices: Number(maxChoices) });
          }}
        />
      </td>

      {/* Default Modifier */}
      <td className="px-4 py-2">
        <select
          className="border rounded px-2 py-1 bg-white"
          value={defaultMod || ''}
          onChange={(e) => {
            const value = e.target.value ? Number(e.target.value) : null;
            setDefaultMod(value);
          }}
          onBlur={() => {
            defaultMod !== lin.default_modifier_id && onUpdate(lin.id, { default_modifier_id: defaultMod })
          }}
        >
          <option value="">No default set</option>
          {groupModifiers.map(modifier => (
            <option
              key={modifier.id}
              value={modifier.id}
            >
              {modifier.name} (${modifier.price_delta.toFixed(2)})
            </option>
          ))}
        </select>
      </td>

      {/* Delete Button */}
      <td className="px-4 py-2">
        <button
          onClick={() => onDelete(lin.id, lin.modifier_groups.name)}
          className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}