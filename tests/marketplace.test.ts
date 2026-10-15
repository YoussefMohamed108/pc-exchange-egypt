import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { contactSchema, listingSchema, pcFields, laptopFields } from "@/lib/marketplace-validation";
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
describe("marketplace boundaries", () => {
  it("uses user/admin roles without promoting former inspectors", async () => {
    expect(
      (await asUser<{ role: string }>(inspector, "select role from public.account_roles")).rows,
    ).toEqual([{ role: "user" }]);
    expect(
      (await asUser<{ role: string }>(admin, "select role from public.account_roles")).rows,
    ).toEqual([{ role: "admin" }]);
    await expect(asUser(seller, "update public.account_roles set role='admin'")).rejects.toThrow(
      /permission/,
    );
    await expect(asUser(seller, "select * from public.user_roles")).rejects.toThrow(/permission/);
  });
  it("requires confirmation and at least one valid contact channel", async () => {
    await expect(
      asUser(unconfirmed, "select public.save_contact($1)", [
        { display_name: "Test", governorate: "Cairo", phone: "01012345678", social_url: "" },
      ]),
    ).rejects.toThrow(/Confirmed/);
    expect(
      contactSchema.safeParse({
        display_name: "Test",
        governorate: "Cairo",
        phone: "",
        social_url: "",
      }).success,
    ).toBe(false);
    expect(
      contactSchema.safeParse({
        display_name: "Test",
        governorate: "Cairo",
        phone: "",
        social_url: "https://evil.example/",
      }).success,
    ).toBe(false);
  });
  it("publishes immediately without a benchmark badge; checkout rejects marketplace IDs", async () => {
    const { id } = await createListing();
    expect(
      (
        await asUser<{ benchmark_status: string }>(
          null,
          "select benchmark_status from public.marketplace_catalog where id=$1",
          [id],
        )
      ).rows[0].benchmark_status,
    ).toBe("not_reviewed");
    await expect(
      asUser(buyer, "select public.place_order($1,'cash_on_pickup','01012345678',$2)", [
        [{ product_id: id, quantity: 1 }],
        crypto.randomUUID(),
      ]),
    ).rejects.toThrow(/unavailable/);
  });
  it("discloses contacts only through authenticated published-listing access", async () => {
    const { id } = await createListing();
    await expect(asUser(null, "select * from public.seller_contact($1)", [id])).rejects.toThrow(
      /permission/,
    );
    expect(
      (await asUser(buyer, "select * from public.profile_contacts where user_id=$1", [seller]))
        .rows,
    ).toHaveLength(0);
    expect(
      (await asUser(buyer, "select * from public.seller_contact($1)", [id])).rows,
    ).toHaveLength(1);
  });
  it("denies cross-owner edits and caller-supplied approval fields", async () => {
    const { id, payload } = await createListing();
    const old = (
      await db.query<{ updated_at: string }>(
        "select updated_at from public.marketplace_listings where id=$1",
        [id],
      )
    ).rows[0];
    await expect(
      asUser(buyer, "select public.save_marketplace_listing($1)", [
        { ...payload, id, expected_updated_at: old.updated_at },
      ]),
    ).rejects.toThrow(/ownership/);
    await expect(
      asUser(seller, "select public.save_marketplace_listing($1)", [
        { ...payload, benchmark_status: "benchmark_reviewed" },
      ]),
    ).rejects.toThrow(/Unexpected/);
  });
  it("requires full-PC components in SQL and validation", async () => {
    const { payload } = await createListing();
    await expect(
      asUser(seller, "select public.save_marketplace_listing($1)", [
        { ...payload, category_slug: "pc-builds" },
      ]),
    ).rejects.toThrow(/check constraint/);
    const { price_piastres: _, ...fields } = payload;
    void _;
    expect(
      listingSchema.safeParse({
        ...fields,
        price: "1000",
        category_slug: "pc-builds",
        specifications: Object.fromEntries(pcFields.map((k) => [k, "Fixture"])),
      }).success,
    ).toBe(true);
  });
  it("shares pending evidence with signed-in users, never anonymously", async () => {
    const { id } = await createListing();
    const sid = await submit(id);
    await expect(
      asUser(null, "select * from public.benchmark_submissions where id=$1", [sid]),
    ).rejects.toThrow(/permission/);
    expect(
      (await asUser(buyer, "select * from public.benchmark_submissions where id=$1", [sid])).rows,
    ).toHaveLength(1);
    expect(
      (await asUser(buyer, "select * from storage.objects where bucket_id='benchmark-evidence'"))
        .rows.length,
    ).toBeGreaterThan(0);
    expect(
      (await asUser(null, "select * from storage.objects where bucket_id='benchmark-evidence'"))
        .rows,
    ).toHaveLength(0);
    await expect(
      asUser(
        seller,
        "insert into storage.objects(bucket_id,name) values('benchmark-evidence','unsafe.pdf')",
      ),
    ).rejects.toThrow(/row-level/);
    await expect(
      asUser(seller, "select public.submit_benchmark($1,$2,1,'unsafe.pdf',1)", [seller, id]),
    ).rejects.toThrow(/permission/);
  });
  it("requires laptop disclosures in SQL and server validation, allowing explicit untested condition", async () => {
    const { payload } = await createListing();
    const specifications = Object.fromEntries(laptopFields.map((k) => [k, "Not tested — fixture"]));
    const laptop = { ...payload, category_slug: "laptops", specifications };
    const { price_piastres: amount, ...fields } = laptop;
    const form = { ...fields, price: String(amount / 100) };
    expect(listingSchema.safeParse(form).success).toBe(true);
    for (const key of laptopFields) {
      const missing = { ...specifications };
      delete missing[key];
      expect(listingSchema.safeParse({ ...form, specifications: missing }).success).toBe(false);
      await expect(
        asUser(seller, "select public.save_marketplace_listing($1)", [
          { ...laptop, specifications: missing },
        ]),
      ).rejects.toThrow(/marketplace_laptop_details/);
    }
    for (const invalid of ["  ", false, 90, "x".repeat(501)]) {
      const specs = { ...specifications, "Battery condition": invalid };
      expect(listingSchema.safeParse({ ...form, specifications: specs }).success).toBe(false);
      await expect(
        asUser(seller, "select public.save_marketplace_listing($1)", [
          { ...laptop, specifications: specs },
        ]),
      ).rejects.toThrow(/check constraint/);
    }
    const saved = await asUser<{ id: string }>(
      seller,
      "select public.save_marketplace_listing($1) id",
      [laptop],
    );
    const id = saved.rows[0].id;
    expect(
      (
        await asUser(
          null,
          "select category_slug, benchmark_status from public.all_catalog_products where id=$1",
          [id],
        )
      ).rows,
    ).toEqual([{ category_slug: "laptops", benchmark_status: "not_reviewed" }]);
    const sid = await submit(id);
    await asUser(
      admin,
      "select public.review_benchmark($1,'approved','Isolated laptop evidence review')",
      [sid],
    );
    const old = (
      await db.query<{ updated_at: string }>(
        "select updated_at from public.marketplace_listings where id=$1",
        [id],
      )
    ).rows[0];
    await asUser(seller, "select public.save_marketplace_listing($1)", [
      {
        ...laptop,
        id,
        expected_updated_at: old.updated_at,
        specifications: { ...specifications, "Battery condition": "Changed battery — fixture" },
      },
    ]);
    expect(
      (
        await asUser(null, "select benchmark_status from public.marketplace_catalog where id=$1", [
          id,
        ])
      ).rows,
    ).toEqual([{ benchmark_status: "not_reviewed" }]);
    expect(
      (await asUser(buyer, "select id from public.benchmark_submissions where id=$1", [sid])).rows,
    ).toHaveLength(0);
  });
  it("only admin approval adds watermark and cannot approve own listing", async () => {
    const { id } = await createListing();
    const sid = await submit(id);
    await expect(
      asUser(seller, "select public.review_benchmark($1,'approved','Fixture review passed')", [
        sid,
      ]),
    ).rejects.toThrow(/Admin/);
    await asUser(admin, "select public.review_benchmark($1,'approved','Fixture review passed')", [
      sid,
    ]);
    expect(
      (
        await asUser(null, "select benchmark_status from public.marketplace_catalog where id=$1", [
          id,
        ])
      ).rows[0].benchmark_status,
    ).toBe("benchmark_reviewed");
    const own = await createListing(admin);
    const ownSid = await submit(own.id, admin);
    await expect(
      asUser(admin, "select public.review_benchmark($1,'approved','Fixture review passed')", [
        ownSid,
      ]),
    ).rejects.toThrow(/own listing/);
  });
  it("invalidates approval on hardware changes and hides old evidence from buyers", async () => {
    const { id, payload } = await createListing();
    const sid = await submit(id);
    await asUser(admin, "select public.review_benchmark($1,'approved','Fixture review passed')", [
      sid,
    ]);
    const old = (
      await db.query<{ updated_at: string }>(
        "select updated_at from public.marketplace_listings where id=$1",
        [id],
      )
    ).rows[0];
    await asUser(seller, "select public.save_marketplace_listing($1)", [
      { ...payload, id, expected_updated_at: old.updated_at, model: "Changed hardware" },
    ]);
    expect(
      (
        await asUser(null, "select benchmark_status from public.marketplace_catalog where id=$1", [
          id,
        ])
      ).rows[0].benchmark_status,
    ).toBe("not_reviewed");
    expect(
      (await asUser(buyer, "select id from public.benchmark_submissions where id=$1", [sid])).rows,
    ).toHaveLength(0);
    expect(
      (await asUser(seller, "select id from public.benchmark_submissions where id=$1", [sid])).rows,
    ).toHaveLength(1);
  });
  it("rejects stale review and hides moderated listings, contacts and evidence", async () => {
    const { id } = await createListing();
    const sid = await submit(id);
    const latest = await submit(id);
    await expect(
      asUser(admin, "select public.review_benchmark($1,'approved','Fixture review passed')", [sid]),
    ).rejects.toThrow(/latest/);
    await asUser(admin, "select public.moderate_listing($1,true,'Isolated moderation test')", [id]);
    expect(
      (await asUser(null, "select id from public.marketplace_catalog where id=$1", [id])).rows,
    ).toHaveLength(0);
    expect(
      (await asUser(buyer, "select id from public.benchmark_submissions where id=$1", [latest]))
        .rows,
    ).toHaveLength(0);
    await expect(asUser(buyer, "select * from public.seller_contact($1)", [id])).rejects.toThrow(
      /unavailable/,
    );
  });
});
