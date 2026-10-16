import { z } from "zod";
import { categorySlugs } from "./domain";
import { specificationsSchema } from "./validation";
import { egpToPiastres } from "./money";
import { requiredHardwareFields } from "./hardware-specifications";
export { pcFields, laptopFields } from "./hardware-specifications";

export const contactSchema = z
  .object({
    display_name: z.string().trim().min(2).max(100),
    governorate: z.string().trim().min(2).max(60),
    phone: z
      .string()
      .trim()
      .regex(/^$|^(\+20|0)1[0125][0-9]{8}$/),
    social_url: z
      .string()
      .trim()
      .regex(
        /^$|^https:\/\/(www\.)?(facebook\.com|instagram\.com|t\.me|wa\.me|m\.me)\/[A-Za-z0-9._/?=&%+-]{1,250}$/,
      ),
  })
  .strict()
  .refine((v) => !!(v.phone || v.social_url), "Add a phone number or social contact link.");
export const listingSchema = z
  .object({
    id: z.uuid().optional(),
    expected_updated_at: z.string().optional(),
    title: z.string().trim().min(5).max(150),
    category_slug: z.enum(categorySlugs),
    brand: z.string().trim().min(1).max(60),
    model: z.string().trim().min(1).max(100),
    description: z.string().trim().min(15).max(5000),
    known_defects: z.string().trim().min(2).max(2000),
    condition: z.enum(["A", "B", "C", "D"]),
    price: z.string().refine((v) => {
      try {
        return egpToPiastres(v) > 0;
      } catch {
        return false;
      }
    }),
    governorate: z.string().trim().min(2).max(60),
    specifications: specificationsSchema,
    image_paths: z.array(z.string().regex(/^marketplace\/[a-f0-9-]+\/[a-f0-9-]+\.webp$/)).max(8),
    status: z.enum(["draft", "listed", "paused", "sold", "archived"]),
  })
  .strict()
  .refine(
    (v) =>
      requiredHardwareFields(v.category_slug).every(
        (k) =>
          typeof v.specifications[k] === "string" && String(v.specifications[k]).trim().length > 0,
      ),
    "Complete every required hardware detail. State when a condition detail has not been tested.",
  )
  .refine(
    (v) => v.status !== "listed" || v.image_paths.length > 0,
    "Add a photo before submitting for review.",
  );

export type ContactProfile = z.output<typeof contactSchema> & { user_id: string };
export type SellerListing = Omit<
  z.output<typeof listingSchema>,
  "id" | "price" | "expected_updated_at" | "status"
> & {
  id: string;
  status: z.output<typeof listingSchema>["status"] | "pending_review";
  review_status: "draft" | "pending" | "approved" | "changes_requested" | "rejected";
  review_note: string;
  reviewed_revision: number | null;
  reviewer_id: string | null;
  reviewed_at: string | null;
  review_submitted_at: string | null;
  seller_id: string;
  reference_code: string;
  deleted_at: string | null;
  seller_deleted: boolean;
  price_piastres: number;
  hidden: boolean;
  revision: number;
  created_at: string;
  updated_at: string;
};
export type Benchmark = {
  id: string;
  listing_id: string;
  seller_id: string;
  revision: number;
  object_path: string;
  page_count: number;
  snapshot: Record<string, unknown>;
  submitted_at: string;
  status: "pending" | "approved" | "changes_requested" | "rejected";
  review_note: string;
  reviewer_id: string | null;
  reviewed_at: string | null;
  expires_at: string | null;
  revoked_at?: string | null;
  revoked_reason?: string | null;
};
export function isBenchmarkReviewed(b: Benchmark | undefined, revision: number) {
  return (
    !!b &&
    b.status === "approved" &&
    !b.revoked_at &&
    b.revision === revision &&
    !!b.expires_at &&
    Date.parse(b.expires_at) > Date.now()
  );
}

export type ListingReviewHistory = {
  id: string;
  listing_id: string;
  revision: number;
  decision: "approved" | "changes_requested" | "rejected";
  note: string;
  reviewer_id: string;
  reviewed_at: string;
};
export const listingReviewSchema = z
  .object({
    lid: z.uuid(),
    expected_updated_at: z.iso.datetime({ offset: true }),
    decision: z.enum(["approved", "changes_requested", "rejected"]),
    note: z.string().trim().max(2000),
  })
  .strict()
  .refine(
    (v) =>
      v.decision === "approved" ? v.note.length === 0 || v.note.length >= 5 : v.note.length >= 5,
    { message: "A refusal or changes request needs a reason of at least 5 characters." },
  );
