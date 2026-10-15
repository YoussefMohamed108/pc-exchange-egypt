import "server-only";
import { z } from "zod";
import { createSupabaseClient } from "./supabase/server";

export const permanentDeletionSchema = z.object({
  expected_updated_at: z.string().min(10),
  confirmation: z
    .string()
    .trim()
    .regex(/^PCX-\d+$/),
  confirm_permanent: z.literal("yes"),
});

// Each RPC enforces its own authorization and only returns files queued by a committed deletion.
export async function cleanDeletedFiles(audience: "admin" | "owner") {
  const client = await createSupabaseClient();
  if (!client) return false;
  const pendingRpc =
    audience === "admin" ? "admin_pending_file_cleanup" : "seller_pending_file_cleanup";
  const finishRpc =
    audience === "admin" ? "admin_finish_file_cleanup" : "seller_finish_file_cleanup";
  const pending = await client.rpc(pendingRpc);
  if (pending.error) return false;
  await Promise.all(
    ["marketplace-images", "product-images", "benchmark-evidence"].map(async (bucket) => {
      const paths = pending.data
        .filter((file) => file.bucket_id === bucket)
        .map((file) => file.object_path);
      if (paths.length) await client.storage.from(bucket).remove(paths);
    }),
  );
  const finished = await client.rpc(finishRpc);
  const remaining = await client.rpc(pendingRpc);
  return !finished.error && !remaining.error && remaining.data.length === 0;
}
