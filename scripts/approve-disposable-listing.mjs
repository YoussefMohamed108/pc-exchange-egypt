import assert from "node:assert/strict";

// Use only with IDs created by the disposable marketplace acceptance fixture.
export async function approveDisposableListing(admin, lid) {
  const result = await admin.client.from("marketplace_listings").select("*").eq("id", lid).single();
  assert.equal(result.error, null);
  const row = result.data;
  if (row.review_status === "approved" && row.reviewed_revision === row.revision) return;
  assert.equal(row.review_status, "pending");
  const review = await admin.client.rpc("review_listing", {
    lid,
    expected_updated_at: row.updated_at,
    decision: "approved",
    note: "TEST ONLY — disposable acceptance fixture, not commercial inventory.",
  });
  assert.equal(review.error, null);
  const approved = await admin.client
    .from("marketplace_listings")
    .select("review_status,reviewed_revision,revision")
    .eq("id", lid)
    .single();
  assert.equal(approved.error, null);
  assert.equal(approved.data.review_status, "approved");
  assert.equal(approved.data.reviewed_revision, approved.data.revision);
}
