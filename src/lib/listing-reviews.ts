import "server-only";
import { createSupabaseClient } from "./supabase/server";
import type { SellerListing } from "./marketplace-validation";
import type { QueueSearch } from "./admin-review-queues";
export const listingReviewStatuses = [
  "pending",
  "all",
  "draft",
  "approved",
  "changes_requested",
  "rejected",
];
export async function getListingReviewQueue(search: QueueSearch) {
  const scalar = (k: string) => (typeof search[k] === "string" ? (search[k] as string) : "");
  const term = scalar("q").trim().slice(0, 150),
    status = listingReviewStatuses.includes(scalar("status")) ? scalar("status") : "pending",
    page = Math.max(1, Math.min(10000, parseInt(scalar("page"), 10) || 1));
  const client = await createSupabaseClient();
  if (!client) throw new Error("Listing review queue unavailable.");
  const { data, error } = await client.rpc("admin_listing_review_queue", {
    term,
    filter_status: status,
    page_number: page,
  });
  if (error) throw new Error("Listing review queue unavailable.");
  const result = data as unknown as {
    total: number;
    items: { listing: SellerListing; seller: { display_name: string; governorate: string } }[];
  };
  return { ...result, term, status, page };
}
