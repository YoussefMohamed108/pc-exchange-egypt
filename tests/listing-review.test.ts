import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
let db: PGlite;
const admin = "10000000-0000-4000-8000-000000000001",
  seller = "10000000-0000-4000-8000-000000000002",
  buyer = "10000000-0000-4000-8000-000000000003",
  inspector = "10000000-0000-4000-8000-000000000004",
  unconfirmed = "10000000-0000-4000-8000-000000000005";
async function asUser<T = Record<string, unknown>>(
  uid: string | null,
  sql: string,
  args: unknown[] = [],
) {
  await db.exec(`set role ${uid ? "authenticated" : "anon"}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid || ""]);
  try {
    return await db.query<T>(sql, args);
  } finally {
    await db.exec("reset role");
  }
}
async function createListing(uid = seller) {
  const path = `marketplace/${uid}/${crypto.randomUUID()}.webp`;
  await db.query("insert into storage.objects(bucket_id,name) values('marketplace-images',$1)", [
    path,
  ]);
  const payload = {
    title: "Isolated marketplace fixture",
    category_slug: "graphics-cards",
    brand: "Fixture",
    model: "Test",
    description: "Isolated test listing, never commercial inventory.",
    known_defects: "None reported",
    condition: "B",
    price_piastres: 100000,
    governorate: "Cairo",
    specifications: { VRAM: "8 GB" },
    image_paths: [path],
    status: "listed",
  };
  const result = await asUser<{ id: string }>(
    uid,
    "select public.save_marketplace_listing($1) id",
    [payload],
  );
  return { id: result.rows[0].id, payload };
}
async function submit(lid: string, uid = seller) {
  const path = `benchmarks/${uid}/${lid}/${crypto.randomUUID()}.pdf`;
  await db.query("insert into storage.objects(bucket_id,name) values('benchmark-evidence',$1)", [
    path,
  ]);
  const r = await db.query<{ id: string }>(
    "select public.submit_benchmark($1,$2,(select revision from public.marketplace_listings where id=$2),$3,1) id",
    [uid, lid, path],
  );
  return r.rows[0].id;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;",
  );
  await db.exec(readFileSync("supabase/migrations/202610130001_foundation.sql", "utf8"));
  await db.exec(
    "create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select on storage.objects to anon;grant select,insert,update,delete on storage.objects to authenticated;",
  );
  await db.exec(readFileSync("supabase/migrations/202610130002_storage.sql", "utf8"));
  for (const uid of [admin, seller, buyer, inspector, unconfirmed])
    await db.query("insert into auth.users(id,email_confirmed_at) values($1,$2)", [
      uid,
      uid === unconfirmed ? null : new Date().toISOString(),
    ]);
  await db.query(
    "insert into public.user_roles(user_id,role) values($1,'administrator'),($2,'hardware_inspector')",
    [admin, inspector],
  );
  for (const file of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql") && f > "202610130002_storage.sql")
    .sort()) {
    if (file === "20261016172711_listing_approval.sql") {
      for (const status of ["listed", "paused", "draft", "sold", "archived"])
        await db.query(
          "insert into marketplace_listings(seller_id,title,category_slug,brand,model,description,known_defects,condition,price_piastres,governorate,status) values($1,$2,'graphics-cards','Fixture','Legacy','Pre-migration disposable listing fixture','None reported','B',100000,'Cairo',$3)",
          [seller, `Legacy ${status}`, status],
        );
      await db.query(
        "insert into marketplace_listings(seller_id,title,category_slug,brand,model,description,known_defects,condition,price_piastres,governorate,status,deleted_at,hidden) values($1,'Legacy deleted','graphics-cards','Fixture','Legacy','Pre-migration disposable deleted fixture','None reported','B',100000,'Cairo','archived',now(),true)",
        [seller],
      );
    }
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  }
  for (const uid of [admin, seller, buyer])
    await asUser(uid, "select public.save_contact($1)", [
      {
        display_name: "Isolated test user",
        governorate: "Cairo",
        phone: "01012345678",
        social_url: "",
      },
    ]);
});
afterAll(async () => {
  await db?.close();
});
describe("listing approval", () => {
  it("queues existing eligible listings without changing paused/draft availability or inventing approvals", async () => {
    const rows = (
      await db.query<{
        title: string;
        status: string;
        review_status: string;
        review_submitted_at: string | null;
        reviewer_id: string | null;
      }>(
        "select title,status,review_status,review_submitted_at,reviewer_id from marketplace_listings where title like 'Legacy %' order by title",
      )
    ).rows;
    expect(rows).toHaveLength(6);
    for (const row of rows) {
      const previous = row.title.replace("Legacy ", "");
      const eligible = ["listed", "paused", "draft"].includes(previous);
      expect(row.status).toBe(
        previous === "listed" ? "pending_review" : previous === "deleted" ? "archived" : previous,
      );
      expect(row.review_status).toBe(eligible ? "pending" : "draft");
      expect(row.review_submitted_at !== null).toBe(eligible);
      expect(row.reviewer_id).toBeNull();
    }
    const queue = (
      await asUser<{ q: { total: number } }>(admin, "select admin_listing_review_queue('Legacy') q")
    ).rows[0].q;
    expect(queue.total).toBe(3);
    expect((await asUser(admin, "select * from listing_review_history")).rows).toHaveLength(0);
  });
  it("holds submissions privately and keeps evidence decisions independent", async () => {
    const { id } = await createListing();
    expect(
      (
        await db.query<{ status: string }>("select status from marketplace_listings where id=$1", [
          id,
        ])
      ).rows[0].status,
    ).toBe("pending_review");
    expect(
      (await asUser(null, "select id from marketplace_catalog where id=$1", [id])).rows,
    ).toHaveLength(0);
    const sid = await submit(id);
    await asUser(admin, "select review_benchmark($1,'approved','Independent evidence review')", [
      sid,
    ]);
    expect(
      (await asUser(null, "select id from marketplace_catalog where id=$1", [id])).rows,
    ).toHaveLength(0);
    await expect(review(id, seller)).rejects.toThrow(/Admin/);
    await expect(review(id, admin, "rejected", "")).rejects.toThrow(/reason/);
    await expect(
      asUser(admin, "select review_listing($1,now()-interval '1 day','approved','')", [id]),
    ).rejects.toThrow(/changed/);
    await review(id);
    expect(
      (await asUser(null, "select id from marketplace_catalog where id=$1", [id])).rows,
    ).toHaveLength(1);
    expect(
      (await asUser(seller, "select * from listing_review_history where listing_id=$1", [id])).rows,
    ).toHaveLength(1);
    expect(
      (await asUser(buyer, "select * from listing_review_history where listing_id=$1", [id])).rows,
    ).toHaveLength(0);
  });
  it("enforces queue privileges, refusal history, relist gating and independent admin hiding", async () => {
    const { id } = await createListing();
    await expect(asUser(buyer, "select admin_listing_review_queue()")).rejects.toThrow(/Admin/);
    await expect(asUser(unconfirmed, "select admin_listing_review_queue()")).rejects.toThrow(
      /Confirmed/,
    );
    await expect(
      asUser(seller, "select review_listing($1,now(),'approved','')", [id]),
    ).rejects.toThrow(/Admin/);
    const q = await asUser<{
      q: { total: number; items: { listing: { id: string }; seller: { display_name: string } }[] };
    }>(admin, "select admin_listing_review_queue($1) q", [id]);
    expect(q.rows[0].q.items[0].listing.id).toBe(id);
    await review(id, admin, "rejected", "Actual device photos are required");
    expect(
      (await asUser(seller, "select review_note from marketplace_listings where id=$1", [id]))
        .rows[0].review_note,
    ).toMatch(/photos/);
    await expect(
      asUser(seller, "delete from listing_review_history where listing_id=$1", [id]),
    ).rejects.toThrow(/permission/);
    await db.query("update marketplace_listings set status='sold' where id=$1", [id]);
    await asUser(
      seller,
      "select seller_listing_action($1,(select updated_at from marketplace_listings where id=$1),'relist','')",
      [id],
    );
    expect(
      (await asUser(null, "select id from marketplace_catalog where id=$1", [id])).rows,
    ).toHaveLength(0);
    await db.query("update marketplace_listings set hidden=true where id=$1", [id]);
    await review(id);
    expect(
      (await asUser(null, "select id from marketplace_catalog where id=$1", [id])).rows,
    ).toHaveLength(0);
    await expect(asUser(buyer, "select * from seller_contact($1)", [id])).rejects.toThrow(
      /unavailable/,
    );
    expect(
      (await asUser(seller, "select * from listing_review_history where listing_id=$1", [id])).rows,
    ).toHaveLength(2);
  });
  it("preserves price approval and invalidates substantial edits including admin saves", async () => {
    const { id, payload } = await createListing();
    await review(id);
    const save = async (extra: Record<string, unknown>) => {
      const stamp = (
        await db.query<{ stamp: string }>(
          "select updated_at::text stamp from marketplace_listings where id=$1",
          [id],
        )
      ).rows[0].stamp;
      await asUser(seller, "select save_marketplace_listing($1)", [
        { ...payload, id, expected_updated_at: stamp, ...extra },
      ]);
    };
    await save({ price_piastres: 110000 });
    expect(
      (await asUser(null, "select id from marketplace_catalog where id=$1", [id])).rows,
    ).toHaveLength(1);
    await save({ description: "Changed actual hardware description" });
    expect(
      (await asUser(null, "select id from marketplace_catalog where id=$1", [id])).rows,
    ).toHaveLength(0);
    await review(id, admin, "changes_requested", "Please supply clearer photographs");
    const stamp = (
      await db.query<{ stamp: string }>(
        "select updated_at::text stamp from marketplace_listings where id=$1",
        [id],
      )
    ).rows[0].stamp;
    await asUser(
      admin,
      "select admin_product_action('seller',$1,$2,'resume','Test resume attempt')",
      [id, stamp],
    );
    expect(
      (await asUser(null, "select id from marketplace_catalog where id=$1", [id])).rows,
    ).toHaveLength(0);
  });
});
async function review(id: string, uid = admin, decision = "approved", note = "") {
  const stamp = (
    await db.query<{ stamp: string }>(
      "select updated_at::text stamp from marketplace_listings where id=$1",
      [id],
    )
  ).rows[0].stamp;
  return asUser(uid, "select review_listing($1,$2,$3,$4)", [id, stamp, decision, note]);
}
