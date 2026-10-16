import { describe, expect, it } from "vitest";
import { listingReviewSchema } from "../src/lib/marketplace-validation";
const valid = {
  lid: "12345678-1234-4234-8234-123456789abc",
  expected_updated_at: "2026-10-16T14:30:00.123456+00:00",
  decision: "approved",
  note: "",
};
describe("publication review validation", () => {
  it("accepts database timestamp precision and optional approval note", () =>
    expect(listingReviewSchema.safeParse(valid).success).toBe(true));
  it("requires meaningful reasons for both refusal outcomes", () => {
    for (const decision of ["rejected", "changes_requested"]) {
      expect(listingReviewSchema.safeParse({ ...valid, decision, note: "    " }).success).toBe(
        false,
      );
      expect(
        listingReviewSchema.safeParse({ ...valid, decision, note: "Show the actual device." })
          .success,
      ).toBe(true);
    }
  });
  it("rejects a missing concurrency stamp and unknown decisions", () => {
    expect(listingReviewSchema.safeParse({ ...valid, expected_updated_at: "" }).success).toBe(
      false,
    );
    expect(listingReviewSchema.safeParse({ ...valid, decision: "listed" }).success).toBe(false);
  });
  it("rejects attempts to provide additional authority fields", () =>
    expect(listingReviewSchema.safeParse({ ...valid, reviewer_id: valid.lid }).success).toBe(
      false,
    ));
});
