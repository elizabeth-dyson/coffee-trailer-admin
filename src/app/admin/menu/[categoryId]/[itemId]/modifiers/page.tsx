'use client';

// Modifier Groups can be added or deleted from that item, as well as specific modifiers within a group.
// This should only affect the ITEM'S modifiers, not add or delete modifiers as a whole.

import { useEffect, useMemo, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Link from 'next/link';
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Category = {
  id: number;
  name: string;
};

type Item = {
  id: number;
  category_id: number;
  name: string;
  base_price: number;
};

type ModifierGroup = {
  id: number;
  name: string;
  selection_type: string;
  sort_order: number;
};

type Modifier = {
  id: number;
  group_id: number;
  name: string;
  price_delta: number;
  is_active: boolean;
  affects_prep: boolean;
  sort_order: number;
};

export default function ItemModifiersPage() {
  const supabase = createSupabaseBrowserClient();
  const params = useParams<{ categoryId: string; itemId: string }>();

  const categoryId = Number(params.categoryId);
  const itemId = Number(params.itemId);

  
}