import "server-only";
import { cache } from "react";
import { createSupabaseClient } from "./supabase/server";
import type { Benchmark, ContactProfile, SellerListing } from "./marketplace-validation";
export const getContactProfile = cache(async (uid: string) => {
  const client = await createSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from("profile_contacts")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw new Error("Contact profile could not be loaded.");
  return data as ContactProfile | null;
});
export const getSellerListing = cache(async (id: string) => {
  if (!/^[a-f0-9-]{36}$/i.test(id)) return null;
  const client = await createSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from("marketplace_listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Listing could not be loaded.");
  return data as SellerListing | null;
});
export async function getBenchmarks(id: string) {
  const client = await createSupabaseClient();
  if (!client) return [] as Benchmark[];
  const { data, error } = await client
    .from("benchmark_submissions")
    .select("*")
    .eq("listing_id", id)
    .order("submitted_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(20);
  if (error) throw new Error("Benchmark evidence could not be loaded.");
  return data as Benchmark[];
}
export function marketplaceImage(path: string) {
  return /^marketplace\/[a-f0-9-]+\/[a-f0-9-]+\.webp$/.test(path) &&
    process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/marketplace-images/${path}`
    : null;
}
