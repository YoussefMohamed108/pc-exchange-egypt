import "server-only";
import { createSupabaseClient } from "./supabase/server";
import type { Benchmark, SellerListing } from "./marketplace-validation";
import type { InspectionRequest } from "./inspections";
import type { Database } from "./database.types";
export const queueStatuses = {
  benchmark: ["pending", "all", "approved", "changes_requested", "rejected", "revoked"],
  physical: ["active", "all", "requested", "scheduled", "completed", "declined", "cancelled"],
} as const;
export type QueueKind = keyof typeof queueStatuses;
export type QueueSearch = Record<string, string | string[] | undefined>;
export type QueueItem<T> = {
  id: string;
  application: T;
  product: Pick<
    SellerListing,
    | "id"
    | "reference_code"
    | "title"
    | "category_slug"
    | "revision"
    | "status"
    | "hidden"
    | "deleted_at"
    | "seller_id"
    | "review_status"
  >;
  applicant: { display_name: string; governorate: string; phone: string; social_url: string };
  is_latest: boolean;
  report_id: string | null;
};
export async function getAdminReviewQueue<K extends QueueKind>(kind: K, search: QueueSearch) {
  const scalar = (key: string) => (typeof search[key] === "string" ? (search[key] as string) : "");
  const term = scalar("q").trim().slice(0, 150);
  const status = (queueStatuses[kind] as readonly string[]).includes(scalar("status"))
    ? scalar("status")
    : queueStatuses[kind][0];
  const page = Math.max(1, Math.min(10000, parseInt(scalar("page"), 10) || 1));
  const client = await createSupabaseClient();
  if (!client) throw new Error("Review queue unavailable.");
  const args: Database["public"]["Functions"]["admin_review_queue"]["Args"] = {
    queue_kind: kind,
    term,
    filter_status: status,
    page_number: page,
  };
  const { data, error } = await client.rpc("admin_review_queue", args);
  if (error) throw new Error("Review queue unavailable.");
  const result = data as {
    total: number;
    items: QueueItem<K extends "benchmark" ? Benchmark : InspectionRequest>[];
  };
  return { ...result, term, status, page };
}
