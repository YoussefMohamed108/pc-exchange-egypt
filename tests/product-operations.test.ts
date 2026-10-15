import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { inspectionChecklist } from "@/lib/inspections";
import { categorySlugs } from "@/lib/domain";
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
  await db.query<Record<string, unknown>>("select set_config('request.jwt.claim.sub',$1,false)", [
    uid || "",
  ]);
  try {
    return await db.query<T>(sql, args);
  } finally {
    await db.exec("reset role");
  }
}
async function createListing(uid = seller) {
  const path = `marketplace/${uid}/${crypto.randomUUID()}.webp`;
  await db.query<Record<string, unknown>>(
    "insert into storage.objects(bucket_id,name) values('marketplace-images',$1)",
    [path],
  );
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
  await db.query<Record<string, unknown>>(
    "insert into storage.objects(bucket_id,name) values('benchmark-evidence',$1)",
    [path],
  );
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
    await db.query<Record<string, unknown>>(
      "insert into auth.users(id,email_confirmed_at) values($1,$2)",
      [uid, uid === unconfirmed ? null : new Date().toISOString()],
    );
  await db.query<Record<string, unknown>>(
    "insert into public.user_roles(user_id,role) values($1,'administrator'),($2,'hardware_inspector')",
    [admin, inspector],
  );
  for (const file of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql") && f > "202610130002_storage.sql")
    .sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
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
async function operate(
  id: string,
  operation: string,
  source = "seller",
  uid = admin,
  stamp?: string,
) {
  const table = source === "seller" ? "marketplace_listings" : "products";
  const current = (
    await db.query<{ updated_at: string }>(
      `select updated_at::text from public.${table} where id=$1`,
      [id],
    )
  ).rows[0].updated_at;
  return asUser(uid, "select public.admin_product_action($1,$2,$3,$4,$5)", [
    source,
    id,
    stamp || current,
    operation,
    "Isolated moderation test",
  ]);
}
async function request(id: string, uid = seller) {
  return (
    await asUser<{ id: string }>(
      uid,
      "select public.request_field_inspection($1,1,'Cairo; weekday afternoons') id",
      [id],
    )
  ).rows[0].id;
}
async function sellerAction(
  id: string,
  operation: string,
  uid: string | null = seller,
  stamp?: string,
  confirmation?: string,
) {
  const current = (
    await db.query<{ updated_at: string; reference_code: string }>(
      "select updated_at::text,reference_code from public.marketplace_listings where id=$1",
      [id],
    )
  ).rows[0];
  return asUser(uid, "select public.seller_listing_action($1,$2,$3,$4)", [
    id,
    stamp || current.updated_at,
    operation,
    confirmation ?? current.reference_code,
  ]);
}

describe("seller availability controls", () => {
  it("lets an owner pause/resume and mark sold/relist while preserving references, evidence and revision", async () => {
    const { id } = await createListing(buyer);
    const bid = await submit(id, buyer);
    const rid = await request(id, buyer);
    await sellerAction(id, "pause", buyer);
    expect(
      (await asUser(null, "select id from public.marketplace_catalog where id=$1", [id])).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query<{ status: string }>(
          "select status from public.inspection_requests where id=$1",
          [rid],
        )
      ).rows[0].status,
    ).toBe("cancelled");
    await asUser(admin, "select public.review_benchmark($1,'approved','')", [bid]);
    expect(
      (
        await db.query<{ status: string }>(
          "select status from public.marketplace_listings where id=$1",
          [id],
        )
      ).rows[0].status,
    ).toBe("paused");
    await sellerAction(id, "resume", buyer);
    expect(
      (
        await asUser(null, "select benchmark_status from public.marketplace_catalog where id=$1", [
          id,
        ])
      ).rows[0].benchmark_status,
    ).toBe("benchmark_reviewed");
    const before = (
      await db.query<Record<string, unknown>>(
        "select reference_code,revision from public.marketplace_listings where id=$1",
        [id],
      )
    ).rows[0];
    await sellerAction(id, "sold", buyer);
    expect(
      (await asUser(null, "select id from public.marketplace_catalog where id=$1", [id])).rows,
    ).toHaveLength(0);
    await sellerAction(id, "relist", buyer);
    expect(
      (
        await db.query<Record<string, unknown>>(
          "select reference_code,revision from public.marketplace_listings where id=$1",
          [id],
        )
      ).rows[0],
    ).toEqual(before);
    expect(
      (await asUser(null, "select id from public.marketplace_catalog where id=$1", [id])).rows,
    ).toHaveLength(1);
  });
  it("rejects other owners, anonymous/unconfirmed accounts, stale changes and invalid transitions", async () => {
    const { id } = await createListing(buyer);
    for (const uid of [seller, admin, unconfirmed, null]) {
      await expect(sellerAction(id, "delete", uid)).rejects.toThrow();
    }
    await expect(sellerAction(id, "resume", buyer)).rejects.toThrow(/state changed/);
    const stamp = (
      await db.query<{ stamp: string }>(
        "select updated_at::text stamp from public.marketplace_listings where id=$1",
        [id],
      )
    ).rows[0].stamp;
    await sellerAction(id, "pause", buyer);
    await expect(sellerAction(id, "sold", buyer, stamp)).rejects.toThrow(/reload/);
    await expect(sellerAction(id, "delete", buyer, undefined, "PCX-0")).rejects.toThrow(/Confirm/);
  });
  it("moves owner deletions out of public view and restores only as a draft without bypassing admin restrictions", async () => {
    const { id, payload } = await createListing(buyer);
    await operate(id, "pause");
    await sellerAction(id, "delete", buyer);
    const removed = (
      await db.query<{
        hidden: boolean;
        seller_deleted: boolean;
        deleted_at: string;
        updated_at: string;
      }>(
        "select hidden,seller_deleted,deleted_at,updated_at::text from public.marketplace_listings where id=$1",
        [id],
      )
    ).rows[0];
    expect(removed.hidden).toBe(true);
    expect(removed.seller_deleted).toBe(true);
    expect(removed.deleted_at).toBeTruthy();
    expect(
      (await asUser(null, "select id from public.marketplace_catalog where id=$1", [id])).rows,
    ).toHaveLength(0);
    await expect(
      asUser(buyer, "select public.save_marketplace_listing($1)", [
        { ...payload, id, expected_updated_at: removed.updated_at },
      ]),
    ).rejects.toThrow(/Restore/);
    await sellerAction(id, "restore", buyer);
    const restored = (
      await db.query<Record<string, unknown>>(
        "select status,hidden,deleted_at,seller_deleted from public.marketplace_listings where id=$1",
        [id],
      )
    ).rows[0];
    expect(restored).toEqual({
      status: "draft",
      hidden: true,
      deleted_at: null,
      seller_deleted: false,
    });
    await sellerAction(id, "sold", buyer);
    await expect(sellerAction(id, "relist", buyer)).rejects.toThrow(/admin/);
    await operate(id, "delete");
    await expect(sellerAction(id, "restore", buyer)).rejects.toThrow(/own deletion/);
    await operate(id, "restore");
    await operate(id, "resume");
    await sellerAction(id, "pause", buyer);
    await operate(id, "pause");
    await expect(sellerAction(id, "resume", buyer)).rejects.toThrow(/admin/);
    await operate(id, "resume");
    await sellerAction(id, "resume", buyer);
    await sellerAction(id, "delete", buyer);
    await sellerAction(id, "restore", buyer);
    expect(
      (
        await db.query<Record<string, unknown>>(
          "select status,hidden from public.marketplace_listings where id=$1",
          [id],
        )
      ).rows[0],
    ).toEqual({ status: "draft", hidden: false });
  });
  it("requires current photos and contact setup before resuming", async () => {
    const { id, payload } = await createListing(buyer);
    await sellerAction(id, "pause", buyer);
    await db.query("delete from storage.objects where name=$1", [payload.image_paths[0]]);
    await expect(sellerAction(id, "resume", buyer)).rejects.toThrow(/photos/);
    await db.query("insert into storage.objects(bucket_id,name) values('marketplace-images',$1)", [
      payload.image_paths[0],
    ]);
    await db.query("delete from public.profile_contacts where user_id=$1", [buyer]);
    await expect(sellerAction(id, "resume", buyer)).rejects.toThrow(/contact/);
    await asUser(buyer, "select public.save_contact($1)", [
      {
        display_name: "Isolated test buyer",
        governorate: "Cairo",
        phone: "01012345678",
        social_url: "",
      },
    ]);
  });
});
async function schedule(id: string) {
  await asUser(
    admin,
    "select public.manage_inspection_request($1,'scheduled','Agreed with seller',now()+interval '1 hour')",
    [id],
  );
}
async function reportPayload(rid: string) {
  const path = `marketplace/${admin}/${crypto.randomUUID()}.webp`;
  await db.query<Record<string, unknown>>(
    "insert into storage.objects(bucket_id,name) values('marketplace-images',$1)",
    [path],
  );
  const today = (
    await db.query<{ d: string }>("select (now() at time zone 'Africa/Cairo')::date::text d")
  ).rows[0].d;
  return {
    request_id: rid,
    attended: "yes",
    inspected_on: today,
    serial_number: "PRIVATE-SERIAL-TEST",
    identity_description: "Unique device description, serial ending TEST",
    findings: "Isolated test report; never a real inspection.",
    known_defects: "Test only",
    checks: Object.fromEntries(
      inspectionChecklist("graphics-cards").map((k) => [
        k,
        { result: "pass", notes: "Measured result in isolated fixture" },
      ]),
    ),
    photo_paths: [path],
    outcome: "passed",
  };
}
describe("owner permanent deletion", () => {
  async function purgeOwn(
    id: string,
    uid: string | null = buyer,
    overrides: { stamp?: string; confirmation?: string | null } = {},
  ) {
    const row = (
      await db.query<{ stamp: string; reference_code: string }>(
        "select updated_at::text stamp,reference_code from public.marketplace_listings where id=$1",
        [id],
      )
    ).rows[0];
    return asUser(uid, "select public.seller_delete_listing($1,$2,$3)", [
      id,
      overrides.stamp ?? row.stamp,
      overrides.confirmation === undefined ? row.reference_code : overrides.confirmation,
    ]);
  }
  it("enforces confirmed ownership, exact confirmation, stale protection and private implementation access", async () => {
    const { id } = await createListing(buyer);
    for (const uid of [seller, admin, unconfirmed, null])
      await expect(purgeOwn(id, uid)).rejects.toThrow();
    for (const confirmation of ["PCX-0", null])
      await expect(purgeOwn(id, buyer, { confirmation })).rejects.toThrow(/exact product/);
    await expect(purgeOwn(id, buyer, { stamp: "2000-01-01T00:00:00Z" })).rejects.toThrow(/changed/);
    await expect(
      asUser(
        buyer,
        "select pcx_private.delete_product('seller',$1,now(),'PCX-0','Bypass attempt',false)",
        [id],
      ),
    ).rejects.toThrow(/permission/);
    expect(
      (await db.query("select id from public.marketplace_listings where id=$1", [id])).rows,
    ).toHaveLength(1);
    await sellerAction(id, "delete", buyer);
    await purgeOwn(id);
    expect(
      (await db.query("select id from public.marketplace_listings where id=$1", [id])).rows,
    ).toHaveLength(0);
  });
  it("removes its dependencies, scopes cleanup to the deleting owner and retains the audit reference", async () => {
    const { id, payload } = await createListing(buyer);
    await submit(id, buyer);
    const rid = await request(id, buyer);
    await schedule(rid);
    const report = await reportPayload(rid);
    await asUser(admin, "select public.publish_field_inspection($1)", [report]);
    await asUser(seller, "select public.seller_contact($1)", [id]);
    await purgeOwn(id);
    for (const table of ["benchmark_submissions", "inspection_requests", "field_inspections"])
      expect(
        (await db.query(`select id from public.${table} where listing_id=$1`, [id])).rows,
      ).toHaveLength(0);
    expect(
      (
        await db.query("select listing_id from pcx_private.contact_access where listing_id=$1", [
          id,
        ])
      ).rows,
    ).toHaveLength(0);
    const audit = (
      await db.query<{ details: { actor_scope: string; reference_code: string } }>(
        "select details from public.audit_logs where entity_id=$1 and action='product.permanently_deleted'",
        [id],
      )
    ).rows[0];
    expect(audit.details.actor_scope).toBe("owner");
    expect(audit.details.reference_code).toMatch(/^PCX-/);
    const pending = (
      await asUser<{ bucket_id: string; object_path: string }>(
        buyer,
        "select * from public.seller_pending_file_cleanup()",
      )
    ).rows;
    expect(pending.some((f) => f.object_path === payload.image_paths[0])).toBe(true);
    expect(pending.some((f) => f.object_path === report.photo_paths[0])).toBe(true);
    const paths = pending.map((f) => f.object_path);
    expect(
      (await asUser(seller, "select * from public.seller_pending_file_cleanup()")).rows,
    ).toHaveLength(0);
    await asUser(seller, "delete from storage.objects where name=any($1)", [paths]);
    expect(
      (await db.query("select name from storage.objects where name=$1", [report.photo_paths[0]]))
        .rows,
    ).toHaveLength(1);
    await asUser(buyer, "select public.seller_finish_file_cleanup()");
    expect(
      (await asUser(buyer, "select * from public.seller_pending_file_cleanup()")).rows.length,
    ).toBeGreaterThan(0);
    await asUser(buyer, "delete from storage.objects where name=any($1)", [paths]);
    await asUser(buyer, "select public.seller_finish_file_cleanup()");
    expect(
      (await asUser(buyer, "select * from public.seller_pending_file_cleanup()")).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("select name from storage.objects where name=any($1)", [paths])).rows,
    ).toHaveLength(0);
    await expect(
      asUser(null, "select * from public.seller_pending_file_cleanup()"),
    ).rejects.toThrow();
  });
  it("preserves shared photos and allows the owner to delete an admin-hidden listing", async () => {
    const first = await createListing(buyer);
    const second = (
      await asUser<{ id: string }>(buyer, "select public.save_marketplace_listing($1) id", [
        first.payload,
      ])
    ).rows[0].id;
    await operate(first.id, "pause");
    await purgeOwn(first.id);
    expect(
      (
        await db.query(
          "select object_path from pcx_private.deleted_product_files where object_path=$1",
          [first.payload.image_paths[0]],
        )
      ).rows,
    ).toHaveLength(0);
    await purgeOwn(second);
    expect(
      (
        await db.query(
          "select object_path from pcx_private.deleted_product_files where object_path=$1 and requested_by=$2",
          [first.payload.image_paths[0], buyer],
        )
      ).rows,
    ).toHaveLength(1);
  });
});

describe("product administration and free inspections", () => {
  async function purge(
    id: string,
    source = "seller",
    uid: string | null = admin,
    overrides: { confirmation?: string | null; stamp?: string } = {},
  ) {
    const table = source === "seller" ? "marketplace_listings" : "products";
    const row = (
      await db.query<{ reference_code: string; stamp: string }>(
        `select reference_code,updated_at::text stamp from public.${table} where id=$1`,
        [id],
      )
    ).rows[0];
    return asUser(uid, "select public.admin_delete_product($1,$2,$3,$4,$5)", [
      source,
      id,
      overrides.stamp || row.stamp,
      overrides.confirmation === undefined ? row.reference_code : overrides.confirmation,
      "Isolated deletion test",
    ]);
  }
  it("requires a refusal reason, exposes it to the seller, and reviews paused current evidence", async () => {
    const { id } = await createListing();
    let sid = await submit(id);
    await operate(id, "pause");
    await expect(
      asUser(admin, "select public.review_benchmark($1,'rejected','')", [sid]),
    ).rejects.toThrow(/reason/);
    await expect(
      asUser(admin, "select public.review_benchmark($1,'rejected',null)", [sid]),
    ).rejects.toThrow(/reason/);
    await asUser(
      admin,
      "select public.review_benchmark($1,'rejected','Missing benchmark settings and date')",
      [sid],
    );
    expect(
      (
        await asUser(
          seller,
          "select status,review_note from public.benchmark_submissions where id=$1",
          [sid],
        )
      ).rows[0],
    ).toEqual({ status: "rejected", review_note: "Missing benchmark settings and date" });
    await operate(id, "resume");
    sid = await submit(id);
    await operate(id, "delete");
    await expect(
      asUser(admin, "select public.review_benchmark($1,'approved','')", [sid]),
    ).rejects.toThrow(/reviewable/);
    await operate(id, "restore");
    await asUser(admin, "select public.review_benchmark($1,'approved','')", [sid]);
    expect(
      (await asUser(null, "select id from public.marketplace_catalog where id=$1", [id])).rows,
    ).toHaveLength(0);
    await operate(id, "resume");
    expect(
      (
        await asUser(null, "select benchmark_status from public.marketplace_catalog where id=$1", [
          id,
        ])
      ).rows[0].benchmark_status,
    ).toBe("benchmark_reviewed");
    const own = await createListing(admin),
      ownSid = await submit(own.id, admin);
    await expect(
      asUser(admin, "select public.review_benchmark($1,'approved','')", [ownSid]),
    ).rejects.toThrow(/own listing/);
  });
  it("will not resume a draft without photos or republish a sold listing", async () => {
    const { id, payload } = await createListing();
    let stamp = (
      await db.query<{ stamp: string }>(
        "select updated_at::text stamp from public.marketplace_listings where id=$1",
        [id],
      )
    ).rows[0].stamp;
    await asUser(seller, "select public.save_marketplace_listing($1)", [
      { ...payload, id, expected_updated_at: stamp, status: "draft", image_paths: [] },
    ]);
    await operate(id, "pause");
    await expect(operate(id, "resume")).rejects.toThrow(/photos/);
    stamp = (
      await db.query<{ stamp: string }>(
        "select updated_at::text stamp from public.marketplace_listings where id=$1",
        [id],
      )
    ).rows[0].stamp;
    await asUser(seller, "select public.save_marketplace_listing($1)", [
      { ...payload, id, expected_updated_at: stamp, status: "sold" },
    ]);
    await operate(id, "resume");
    expect(
      (await db.query("select status,hidden from public.marketplace_listings where id=$1", [id]))
        .rows[0],
    ).toEqual({ status: "sold", hidden: false });
  });
  it("permanently removes product dependencies and queues only its unused files with admin confirmation", async () => {
    const { id, payload } = await createListing();
    const sid = await submit(id),
      rid = await request(id);
    await schedule(rid);
    const report = await reportPayload(rid);
    await asUser(admin, "select public.publish_field_inspection($1)", [report]);
    await asUser(buyer, "select public.seller_contact($1)", [id]);
    for (const uid of [seller, buyer, unconfirmed, null])
      await expect(purge(id, "seller", uid)).rejects.toThrow();
    await expect(purge(id, "seller", admin, { confirmation: "PCX-0" })).rejects.toThrow(
      /exact product/,
    );
    await expect(purge(id, "seller", admin, { confirmation: null })).rejects.toThrow(
      /exact product/,
    );
    await expect(purge(id, "seller", admin, { stamp: "2000-01-01T00:00:00Z" })).rejects.toThrow(
      /changed/,
    );
    const pdf = (
      await db.query<{ object_path: string }>(
        "select object_path from public.benchmark_submissions where id=$1",
        [sid],
      )
    ).rows[0].object_path;
    await purge(id);
    for (const table of ["benchmark_submissions", "field_inspections", "inspection_requests"])
      expect(
        (await db.query(`select id from public.${table} where listing_id=$1`, [id])).rows,
      ).toHaveLength(0);
    expect(
      (await db.query("select id from public.marketplace_listings where id=$1", [id])).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query("select listing_id from pcx_private.contact_access where listing_id=$1", [
          id,
        ])
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query(
          "select report_id from pcx_private.inspected_device_identity where serial_number='PRIVATE-SERIAL-TEST'",
          [],
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query(
          "select action from public.audit_logs where entity_id=$1 and action='product.permanently_deleted'",
          [id],
        )
      ).rows,
    ).toHaveLength(1);
    const files = [payload.image_paths[0], report.photo_paths[0], pdf];
    const pending = (
      await asUser<{ object_path: string }>(
        admin,
        "select * from public.admin_pending_file_cleanup()",
      )
    ).rows.map((f) => f.object_path);
    expect(files.every((p) => pending.includes(p))).toBe(true);
    await asUser(admin, "select public.admin_finish_file_cleanup()");
    expect(
      (
        await db.query(
          "select object_path from pcx_private.deleted_product_files where object_path=any($1) and cleaned_at is null",
          [files],
        )
      ).rows,
    ).toHaveLength(3);
    await expect(asUser(seller, "select public.admin_pending_file_cleanup()")).rejects.toThrow(
      /Admin/,
    );
    await expect(asUser(seller, "select public.admin_finish_file_cleanup()")).rejects.toThrow(
      /Admin/,
    );
    await asUser(seller, "delete from storage.objects where name=any($1)", [files]);
    expect(
      (await db.query("select name from storage.objects where name=any($1)", [files])).rows,
    ).toHaveLength(3);
    await asUser(admin, "delete from storage.objects where name=any($1)", [files]);
    await asUser(admin, "select public.admin_finish_file_cleanup()");
    expect(
      (
        await db.query(
          "select object_path from pcx_private.deleted_product_files where object_path=any($1) and cleaned_at is not null",
          [files],
        )
      ).rows,
    ).toHaveLength(3);
    await db.query("insert into storage.objects(bucket_id,name) values('marketplace-images',$1)", [
      payload.image_paths[0],
    ]);
    await expect(
      asUser(seller, "select public.save_marketplace_listing($1)", [payload]),
    ).rejects.toThrow(/permanently deleted/);
  });
  it("preserves photos used by another listing when deleting a product", async () => {
    const first = await createListing();
    const second = (
      await asUser<{ id: string }>(seller, "select public.save_marketplace_listing($1) id", [
        first.payload,
      ])
    ).rows[0].id;
    await purge(first.id);
    expect(
      (
        await db.query(
          "select object_path from pcx_private.deleted_product_files where object_path=$1",
          [first.payload.image_paths[0]],
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (await asUser(null, "select id from public.marketplace_catalog where id=$1", [second])).rows,
    ).toHaveLength(1);
    await purge(second);
    expect(
      (
        await db.query(
          "select object_path from pcx_private.deleted_product_files where object_path=$1",
          [first.payload.image_paths[0]],
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("allows permanent removal of unused company stock but protects products with orders", async () => {
    const payload = {
      title: "Isolated stock for deletion",
      title_ar: "",
      category_slug: "graphics-cards",
      brand: "Test",
      model: "Fixture",
      description: "Isolated test stock, never commercial.",
      description_ar: "",
      condition: "B",
      price_piastres: 100000,
      purchase_cost_piastres: 50000,
      sku: `TEST-${crypto.randomUUID()}`,
      quantity: 2,
      warranty_months: 0,
      governorate: "Cairo",
      specifications: { VRAM: "8 GB" },
      image_paths: [],
      status: "listed",
    };
    const id = (
      await asUser<{ id: string }>(admin, "select public.save_inventory($1) id", [payload])
    ).rows[0].id;
    await purge(id, "company");
    expect(
      (await db.query("select product_id from public.inventory_items where product_id=$1", [id]))
        .rows,
    ).toHaveLength(0);
    const withOrder = (
      await asUser<{ id: string }>(admin, "select public.save_inventory($1) id", [
        { ...payload, sku: `TEST-${crypto.randomUUID()}` },
      ])
    ).rows[0].id;
    await asUser(buyer, "select public.place_order($1,'cash_on_pickup','01012345678',$2)", [
      [{ product_id: withOrder, quantity: 1 }],
      crypto.randomUUID(),
    ]);
    await expect(purge(withOrder, "company")).rejects.toThrow(/order history/);
    expect(
      (
        await db.query<{ reserved_quantity: number }>(
          "select reserved_quantity from public.inventory_items where product_id=$1",
          [withOrder],
        )
      ).rows[0].reserved_quantity,
    ).toBe(1);
  });
  it("keeps benchmark and physical applicants in separate queues with product-ID lookup", async () => {
    const benchmarkOnly = await createListing(),
      physicalOnly = await createListing();
    const sid = await submit(benchmarkOnly.id),
      rid = await request(physicalOnly.id);
    const reference = (
      await db.query<{ reference_code: string }>(
        "select reference_code from public.marketplace_listings where id=$1",
        [benchmarkOnly.id],
      )
    ).rows[0].reference_code;
    type Result = {
      result: {
        total: number;
        items: {
          id: string;
          product: { id: string; reference_code: string };
          applicant: { display_name: string; phone: string };
          application: { id: string; status: string };
        }[];
      };
    };
    const queue = async (kind: string, term: string, status = "all", page = 1) =>
      (
        await asUser<Result>(admin, "select public.admin_review_queue($1,$2,$3,$4) result", [
          kind,
          term,
          status,
          page,
        ])
      ).rows[0].result;
    const b = await queue("benchmark", ` ${reference.toLowerCase()} `);
    expect(b.total).toBe(1);
    expect(b.items[0].id).toBe(sid);
    expect(b.items[0].product.id).toBe(benchmarkOnly.id);
    expect(b.items[0].applicant).toMatchObject({
      display_name: "Isolated test user",
      phone: "01012345678",
    });
    expect((await queue("physical", reference)).total).toBe(0);
    expect((await queue("benchmark", physicalOnly.id)).total).toBe(0);
    expect((await queue("physical", physicalOnly.id, "active")).items[0].id).toBe(rid);
    await asUser(
      admin,
      "select public.review_benchmark($1,'approved','Isolated queue test review')",
      [sid],
    );
    expect((await queue("benchmark", reference, "pending")).total).toBe(0);
    expect((await queue("benchmark", reference, "approved")).total).toBe(1);
    await operate(benchmarkOnly.id, "revoke_benchmark");
    expect((await queue("benchmark", reference, "approved")).total).toBe(0);
    expect((await queue("benchmark", reference, "revoked")).total).toBe(1);
    await schedule(rid);
    expect((await queue("physical", physicalOnly.id, "requested")).total).toBe(0);
    expect((await queue("physical", physicalOnly.id, "scheduled")).total).toBe(1);
    await operate(physicalOnly.id, "delete");
    expect((await queue("physical", physicalOnly.id, "active")).total).toBe(0);
    expect((await queue("physical", physicalOnly.id, "cancelled")).total).toBe(1);
    for (const uid of [seller, buyer, unconfirmed])
      await expect(asUser(uid, "select public.admin_review_queue('physical')")).rejects.toThrow(
        /Admin|Confirmed/,
      );
    await expect(asUser(null, "select public.admin_review_queue('benchmark')")).rejects.toThrow(
      /permission/,
    );
    await expect(queue("physical", physicalOnly.id, "approved")).rejects.toThrow(/Invalid status/);
  });
  it("paginates filtered requests without mixing applications or losing history", async () => {
    const { id } = await createListing();
    await db.query(
      "insert into public.inspection_requests(listing_id,requester_id,revision,status,availability_note) select $1,$2,1,'cancelled','Historical isolated fixture' from generate_series(1,25)",
      [id, seller],
    );
    type Result = { result: { total: number; items: { id: string }[] } };
    const pages = [];
    for (const page of [1, 2])
      pages.push(
        (
          await asUser<Result>(
            admin,
            "select public.admin_review_queue('physical',$1,'cancelled',$2) result",
            [id, page],
          )
        ).rows[0].result,
      );
    expect(pages.map((p) => p.total)).toEqual([25, 25]);
    expect(pages.map((p) => p.items.length)).toEqual([20, 5]);
    expect(new Set(pages.flatMap((p) => p.items.map((i) => i.id))).size).toBe(25);
  });
  it("matches the server checklist for every hardware category", async () => {
    for (const c of categorySlugs)
      expect(
        (await db.query<{ keys: string[] }>("select public.inspection_checklist($1) keys", [c]))
          .rows[0].keys,
      ).toEqual(inspectionChecklist(c));
  });
  it("assigns permanent references and restricts exact ID searches and contacts to admins", async () => {
    const { id } = await createListing();
    const l = (
      await db.query<{ reference_code: string }>(
        "select reference_code from public.marketplace_listings where id=$1",
        [id],
      )
    ).rows[0];
    expect(l.reference_code).toMatch(/^PCX-\d+$/);
    for (const term of [id, l.reference_code.toLowerCase()]) {
      const r = await asUser<{ result: { total: number; items: { id: string }[] } }>(
        admin,
        "select public.admin_find_products($1) result",
        [term],
      );
      expect(r.rows[0].result.total).toBe(1);
      expect(r.rows[0].result.items[0].id).toBe(id);
    }
    await expect(asUser(seller, "select public.admin_find_products('')")).rejects.toThrow(/Admin/);
    await expect(asUser(null, "select public.admin_find_products('')")).rejects.toThrow(
      /permission/,
    );
    await expect(asUser(buyer, "select public.admin_product_contact($1)", [id])).rejects.toThrow(
      /Admin/,
    );
    await expect(
      db.query<Record<string, unknown>>(
        "update public.marketplace_listings set reference_number=1 where id=$1",
        [id],
      ),
    ).rejects.toThrow(/permanent/);
  });
  it("pauses, rejects stale mutations, deletes recoverably and blocks owner overrides", async () => {
    const { id, payload } = await createListing();
    const stamp = (
      await db.query<{ stamp: string }>(
        "select updated_at::text stamp from public.marketplace_listings where id=$1",
        [id],
      )
    ).rows[0].stamp;
    await expect(operate(id, "pause", "seller", seller)).rejects.toThrow(/Admin/);
    await operate(id, "pause");
    expect(
      (await asUser(null, "select id from public.all_catalog_products where id=$1", [id])).rows,
    ).toHaveLength(0);
    await expect(operate(id, "resume", "seller", admin, stamp)).rejects.toThrow(/changed/);
    let updated = (
      await db.query<{ stamp: string }>(
        "select updated_at::text stamp from public.marketplace_listings where id=$1",
        [id],
      )
    ).rows[0].stamp;
    await asUser(seller, "select public.save_marketplace_listing($1)", [
      { ...payload, id, expected_updated_at: updated },
    ]);
    expect(
      (await asUser(null, "select id from public.all_catalog_products where id=$1", [id])).rows,
    ).toHaveLength(0);
    await operate(id, "resume");
    await operate(id, "delete");
    updated = (
      await db.query<{ stamp: string }>(
        "select updated_at::text stamp from public.marketplace_listings where id=$1",
        [id],
      )
    ).rows[0].stamp;
    await expect(
      asUser(seller, "select public.save_marketplace_listing($1)", [
        { ...payload, id, expected_updated_at: updated },
      ]),
    ).rejects.toThrow(/Restore/);
    await expect(
      asUser(admin, "select public.moderate_listing($1,false,'Attempt legacy override')", [id]),
    ).rejects.toThrow(/Restore/);
    await operate(id, "restore");
    expect(
      (
        await db.query<Record<string, unknown>>(
          "select status,hidden,deleted_at from public.marketplace_listings where id=$1",
          [id],
        )
      ).rows[0],
    ).toEqual({ status: "draft", hidden: true, deleted_at: null });
    await operate(id, "resume");
    expect(
      (await db.query("select status,hidden from public.marketplace_listings where id=$1", [id]))
        .rows[0],
    ).toEqual({ status: "listed", hidden: false });
    expect(
      (
        await db.query<Record<string, unknown>>(
          "select action from public.audit_logs where entity_id=$1 and action='product.delete'",
          [id],
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("edits another seller as admin and invalidates a benchmark without changing the reference", async () => {
    const { id, payload } = await createListing();
    const sid = await submit(id);
    await asUser(
      admin,
      "select public.review_benchmark($1,'approved','Evidence reviewed for test')",
      [sid],
    );
    const l = (
      await db.query<{ stamp: string; reference_code: string }>(
        "select updated_at::text stamp,reference_code from public.marketplace_listings where id=$1",
        [id],
      )
    ).rows[0];
    await asUser(admin, "select public.save_marketplace_listing($1)", [
      { ...payload, id, expected_updated_at: l.stamp, model: "Edited by admin" },
    ]);
    const row = (
      await asUser(
        null,
        "select reference_code,benchmark_status from public.all_catalog_products where id=$1",
        [id],
      )
    ).rows[0];
    expect(row).toEqual({ reference_code: l.reference_code, benchmark_status: "not_reviewed" });
  });
  it("revokes benchmark approval permanently for that submission", async () => {
    const { id } = await createListing();
    const sid = await submit(id);
    await asUser(
      admin,
      "select public.review_benchmark($1,'approved','Evidence reviewed for test')",
      [sid],
    );
    await operate(id, "revoke_benchmark");
    expect(
      (
        await asUser(null, "select benchmark_status from public.all_catalog_products where id=$1", [
          id,
        ])
      ).rows[0].benchmark_status,
    ).toBe("not_reviewed");
    await expect(
      asUser(admin, "select public.review_benchmark($1,'approved','Reapprove old evidence')", [
        sid,
      ]),
    ).rejects.toThrow(/no longer/);
  });
  it("requires ownership, makes requests free and keeps scheduling details private", async () => {
    const { id } = await createListing();
    await expect(request(id, buyer)).rejects.toThrow(/ownership/);
    const rid = await request(id);
    await expect(request(id)).rejects.toThrow(/unique/);
    expect(
      (
        await asUser<{ fee_piastres: number }>(
          seller,
          "select fee_piastres from public.inspection_requests where id=$1",
          [rid],
        )
      ).rows[0].fee_piastres,
    ).toBe(0);
    expect(
      (await asUser(buyer, "select * from public.inspection_requests where id=$1", [rid])).rows,
    ).toHaveLength(0);
    await expect(asUser(null, "select * from public.inspection_requests")).rejects.toThrow(
      /permission/,
    );
    await expect(
      asUser(
        seller,
        "select public.manage_inspection_request($1,'scheduled','Attempt self approval',now()+interval '1 day')",
        [rid],
      ),
    ).rejects.toThrow(/Admin/);
    await schedule(rid);
    await asUser(
      seller,
      "select public.manage_inspection_request($1,'cancelled','Seller is no longer available')",
      [rid],
    );
    expect(
      (
        await db.query<Record<string, unknown>>(
          "select status from public.inspection_requests where id=$1",
          [rid],
        )
      ).rows[0].status,
    ).toBe("cancelled");
  });
  it("requires a documented visit, complete passing checklist and uploaded photos for a physical badge", async () => {
    const { id } = await createListing();
    const rid = await request(id);
    const payload = await reportPayload(rid);
    await expect(
      asUser(admin, "select public.publish_field_inspection($1)", [payload]),
    ).rejects.toThrow(/Scheduled/);
    await schedule(rid);
    await expect(
      asUser(seller, "select public.publish_field_inspection($1)", [payload]),
    ).rejects.toThrow(/Admin/);
    await expect(
      asUser(admin, "select public.publish_field_inspection($1)", [{ ...payload, attended: "no" }]),
    ).rejects.toThrow(/physical/);
    await expect(
      asUser(admin, "select public.publish_field_inspection($1)", [{ ...payload, checks: {} }]),
    ).rejects.toThrow(/Every check/);
    await expect(
      asUser(admin, "select public.publish_field_inspection($1)", [
        {
          ...payload,
          checks: {
            ...payload.checks,
            temperatures: { result: "not_tested", notes: "Not measured" },
          },
        },
      ]),
    ).rejects.toThrow(/must pass/);
    await expect(
      asUser(admin, "select public.publish_field_inspection($1)", [
        { ...payload, photo_paths: [] },
      ]),
    ).rejects.toThrow(/check constraint/);
    const report = (
      await asUser<{ id: string }>(admin, "select public.publish_field_inspection($1) id", [
        payload,
      ])
    ).rows[0].id;
    expect(
      (
        await asUser(
          null,
          "select verification_status from public.all_catalog_products where id=$1",
          [id],
        )
      ).rows[0].verification_status,
    ).toBe("platform_verified");
    const publicReport = (
      await asUser(null, "select * from public.public_field_inspections where id=$1", [report])
    ).rows[0];
    expect(JSON.stringify(publicReport)).not.toContain("PRIVATE-SERIAL-TEST");
    expect(publicReport.latest_report).toBe(true);
    await expect(
      asUser(buyer, "select * from pcx_private.inspected_device_identity"),
    ).rejects.toThrow(/permission/);
    await operate(id, "revoke_inspection");
    expect(
      (
        await asUser(
          null,
          "select verification_status from public.all_catalog_products where id=$1",
          [id],
        )
      ).rows[0].verification_status,
    ).toBe("verification_expired");
    expect(
      (
        await asUser(null, "select revoked_at from public.public_field_inspections where id=$1", [
          report,
        ])
      ).rows[0].revoked_at,
    ).toBeTruthy();
  });
  it("retains report access for admins after deletion, while denying public access", async () => {
    const { id } = await createListing();
    const rid = await request(id);
    await schedule(rid);
    const report = (
      await asUser<{ id: string }>(admin, "select public.publish_field_inspection($1) id", [
        await reportPayload(rid),
      ])
    ).rows[0].id;
    await operate(id, "delete");
    expect(
      (await asUser(null, "select id from public.public_field_inspections where id=$1", [report]))
        .rows,
    ).toHaveLength(0);
    expect(
      (await asUser(admin, "select id from public.public_field_inspections where id=$1", [report]))
        .rows,
    ).toHaveLength(1);
  });
  it("cancels pending inspections when hardware changes and disallows self inspection", async () => {
    const { id, payload } = await createListing();
    const rid = await request(id);
    await schedule(rid);
    const l = (
      await db.query<{ stamp: string }>(
        "select updated_at::text stamp from public.marketplace_listings where id=$1",
        [id],
      )
    ).rows[0];
    await asUser(seller, "select public.save_marketplace_listing($1)", [
      { ...payload, id, expected_updated_at: l.stamp, model: "Changed hardware" },
    ]);
    expect(
      (
        await db.query<Record<string, unknown>>(
          "select status from public.inspection_requests where id=$1",
          [rid],
        )
      ).rows[0].status,
    ).toBe("cancelled");
    await expect(
      asUser(admin, "select public.publish_field_inspection($1)", [await reportPayload(rid)]),
    ).rejects.toThrow(/Scheduled/);
    const own = await createListing(admin);
    const ownRequest = await request(own.id, admin);
    await schedule(ownRequest);
    await expect(
      asUser(admin, "select public.publish_field_inspection($1)", [
        await reportPayload(ownRequest),
      ]),
    ).rejects.toThrow(/own listing/);
  });
  it("pauses company checkout, preserves reserved orders and prevents inventory-save overrides", async () => {
    const payload = {
      title: "Isolated company fixture",
      title_ar: "",
      category_slug: "graphics-cards",
      brand: "Test",
      model: "Fixture",
      description: "Isolated test stock, never commercial.",
      description_ar: "",
      condition: "B",
      price_piastres: 100000,
      purchase_cost_piastres: 50000,
      sku: `TEST-${crypto.randomUUID()}`,
      quantity: 2,
      warranty_months: 0,
      governorate: "Cairo",
      specifications: { VRAM: "8 GB" },
      image_paths: [],
      status: "listed",
    };
    const id = (
      await asUser<{ id: string }>(admin, "select public.save_inventory($1) id", [payload])
    ).rows[0].id;
    const oid = (
      await asUser<{ id: string }>(
        buyer,
        "select public.place_order($1,'cash_on_pickup','01012345678',$2) id",
        [[{ product_id: id, quantity: 1 }], crypto.randomUUID()],
      )
    ).rows[0].id;
    await operate(id, "pause", "company");
    await expect(
      asUser(buyer, "select public.place_order($1,'cash_on_pickup','01012345678',$2)", [
        [{ product_id: id, quantity: 1 }],
        crypto.randomUUID(),
      ]),
    ).rejects.toThrow();
    const stamp = (
      await db.query<{ stamp: string }>(
        "select updated_at::text stamp from public.products where id=$1",
        [id],
      )
    ).rows[0].stamp;
    await asUser(admin, "select public.save_inventory($1)", [
      { ...payload, id, expected_updated_at: stamp },
    ]);
    expect(
      (await asUser(null, "select id from public.public_products where id=$1", [id])).rows,
    ).toHaveLength(0);
    await operate(id, "delete", "company");
    expect(
      (await db.query<Record<string, unknown>>("select id from public.orders where id=$1", [oid]))
        .rows,
    ).toHaveLength(1);
    await operate(id, "restore", "company");
    await operate(id, "resume", "company");
    expect(
      (
        await asUser(null, "select available_quantity from public.public_products where id=$1", [
          id,
        ])
      ).rows[0].available_quantity,
    ).toBe(1);
  });
});
