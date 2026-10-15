import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
const admin = "00000000-0000-4000-8000-000000000001",
  buyer = "00000000-0000-4000-8000-000000000002",
  inspector = "00000000-0000-4000-8000-000000000003",
  other = "00000000-0000-4000-8000-000000000004";
let db: PGlite;
async function asUser<T>(uid: string | null, sql: string, params: unknown[] = []) {
  await db.exec(`set role ${uid ? "authenticated" : "anon"}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid || ""]);
  try {
    return await db.query<T>(sql, params);
  } finally {
    await db.exec("reset role");
  }
}
async function inventory(quantity = 1, status = "listed") {
  const payload = {
    title: "Isolated test GPU",
    title_ar: "",
    category_slug: "graphics-cards",
    brand: "Test",
    model: "Fixture",
    description: "Explicitly isolated test inventory.",
    description_ar: "",
    condition: "B",
    price_piastres: 125005,
    purchase_cost_piastres: 100000,
    sku: `TEST-${crypto.randomUUID()}`,
    quantity,
    warranty_months: 0,
    governorate: "Cairo",
    specifications: { vram_gb: 8 },
    image_paths: [],
    status,
  };
  const result = await asUser<{ id: string }>(
    admin,
    "select public.save_inventory($1::jsonb) as id",
    [JSON.stringify(payload)],
  );
  return result.rows[0].id;
}
async function place(product_id: string, uid = buyer, key = crypto.randomUUID()) {
  return asUser<{ id: string }>(
    uid,
    "select public.place_order($1::jsonb,'cash_on_pickup','01012345678',$2::uuid) as id",
    [JSON.stringify([{ product_id, quantity: 1 }]), key],
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth,public to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`,
  );
  await db.exec(readFileSync("supabase/migrations/202610130001_foundation.sql", "utf8"));
  await db.exec(
    "create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text); alter table storage.objects enable row level security; grant usage on schema storage to anon,authenticated; grant select on storage.objects to anon; grant select,insert,update,delete on storage.objects to authenticated",
  );
  await db.exec(readFileSync("supabase/migrations/202610130002_storage.sql", "utf8"));
  for (const id of [admin, buyer, inspector, other])
    await db.query(
      'insert into auth.users(id,raw_user_meta_data) values($1,\'{"role":"super_administrator"}\')',
      [id],
    );
  await db.query(
    "insert into public.user_roles(user_id,role) values($1,'administrator'),($2,'hardware_inspector')",
    [admin, inspector],
  );
});
afterAll(async () => {
  await db?.close();
});
describe("PostgreSQL permissions and transactions", () => {
  it("restricts product photo writes to administrators and safe paths", async () => {
    const path = `products/${crypto.randomUUID()}/isolated-test.webp`;
    await expect(
      asUser(buyer, "insert into storage.objects(bucket_id,name) values('product-images',$1)", [
        path,
      ]),
    ).rejects.toThrow(/row-level security/);
    await asUser(admin, "insert into storage.objects(bucket_id,name) values('product-images',$1)", [
      path,
    ]);
    await expect(
      asUser(
        admin,
        "insert into storage.objects(bucket_id,name) values('product-images','unsafe.svg')",
      ),
    ).rejects.toThrow(/row-level security/);
  });
  it("does not make other storage buckets publicly readable", async () => {
    await db.exec(
      "insert into storage.buckets(id,name,public) values('private-test-evidence','private-test-evidence',false); insert into storage.objects(bucket_id,name) values('private-test-evidence','test-receipt.png')",
    );
    const result = await asUser(
      null,
      "select * from storage.objects where bucket_id='private-test-evidence'",
    );
    expect(result.rows).toEqual([]);
  });
  it("enables RLS on every application table", async () => {
    const result = await db.query<{ relname: string }>(
      "select relname from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='public' and relkind='r' and not relrowsecurity",
    );
    expect(result.rows).toEqual([]);
  });
  it("invalidates verification after hardware information changes", async () => {
    const id = await inventory();
    const report = {
      product_id: id,
      condition: "B",
      scope: "Full functional test",
      findings: "Required test completed successfully.",
      known_defects: "",
      tests: { stress_test: "passed" },
      outcome: "passed",
      valid_days: 30,
    };
    await asUser(inspector, "select public.publish_inspection($1::jsonb)", [
      JSON.stringify(report),
    ]);
    const row = await db.query<{ sku: string; updated_at: string }>(
      "select sku,p.updated_at from public.products p join public.inventory_items i on i.product_id=p.id where p.id=$1",
      [id],
    );
    const changed = {
      id,
      expected_updated_at: row.rows[0].updated_at,
      title: "Isolated test GPU",
      title_ar: "",
      category_slug: "graphics-cards",
      brand: "Test",
      model: "Changed model",
      description: "Explicitly isolated test inventory.",
      description_ar: "",
      condition: "B",
      price_piastres: 125005,
      purchase_cost_piastres: 100000,
      sku: row.rows[0].sku,
      quantity: 1,
      warranty_months: 0,
      governorate: "Cairo",
      specifications: { vram_gb: 8 },
      image_paths: [],
      status: "listed",
    };
    await asUser(admin, "select public.save_inventory($1::jsonb)", [JSON.stringify(changed)]);
    const result = await asUser<{ verification_status: string }>(
      null,
      "select verification_status from public.public_products where id=$1",
      [id],
    );
    expect(result.rows[0].verification_status).toBe("verification_expired");
    await expect(
      asUser(admin, "select public.save_inventory($1::jsonb)", [JSON.stringify(changed)]),
    ).rejects.toThrow(/changed/);
  });
  it("requires documented tests before passing an inspection", async () => {
    const id = await inventory();
    const report = {
      product_id: id,
      condition: "B",
      scope: "Full functional test",
      findings: "Attempt without recorded tests.",
      known_defects: "",
      tests: {},
      outcome: "passed",
      valid_days: 30,
    };
    await expect(
      asUser(inspector, "select public.publish_inspection($1::jsonb)", [JSON.stringify(report)]),
    ).rejects.toThrow(/check constraint/);
  });
  it("uses the inspector's condition grade without expiring the new report", async () => {
    const id = await inventory();
    const report = {
      product_id: id,
      condition: "A",
      scope: "Full functional test",
      findings: "Required tests and cosmetic inspection passed.",
      known_defects: "",
      tests: { stress_test: "passed" },
      outcome: "passed",
      valid_days: 30,
    };
    await asUser(inspector, "select public.publish_inspection($1::jsonb)", [
      JSON.stringify(report),
    ]);
    const result = await asUser<{ condition: string; verification_status: string }>(
      null,
      "select condition,verification_status from public.public_products where id=$1",
      [id],
    );
    expect(result.rows[0]).toEqual({ condition: "A", verification_status: "platform_verified" });
  });
  it("does not promote roles supplied in signup metadata", async () => {
    const result = await asUser<{ role: string }>(buyer, "select role from public.user_roles");
    expect(result.rows.map((r) => r.role)).toEqual(["customer"]);
    await expect(
      asUser(buyer, "insert into public.user_roles(user_id,role) values($1,'administrator')", [
        buyer,
      ]),
    ).rejects.toThrow(/permission denied/);
  });
  it("denies customer inventory mutations", async () => {
    await expect(asUser(buyer, "select public.save_inventory('{}')")).rejects.toThrow(/permission/);
  });
  it("hides drafts and private costs from guests", async () => {
    const id = await inventory(1, "draft");
    expect(
      (await asUser(null, "select * from public.public_products where id=$1", [id])).rows,
    ).toHaveLength(0);
    await expect(asUser(null, "select * from public.inventory_items")).rejects.toThrow(
      /permission denied/,
    );
    expect((await asUser(buyer, "select * from public.inventory_items")).rows).toHaveLength(0);
  });
  it("does not expose unauthenticated order access", async () => {
    await expect(asUser(null, "select * from public.orders")).rejects.toThrow(/permission denied/);
  });
  it("separates administrator and inspector privileges", async () => {
    const id = await inventory();
    const data = {
      product_id: id,
      condition: "B",
      scope: "Full functional test",
      findings: "All required tests passed.",
      known_defects: "Minor cosmetic marks",
      tests: { stress_test: "passed" },
      outcome: "passed",
      valid_days: 30,
    };
    await expect(
      asUser(admin, "select public.publish_inspection($1::jsonb)", [JSON.stringify(data)]),
    ).rejects.toThrow(/Inspector/);
    await asUser(inspector, "select public.publish_inspection($1::jsonb)", [JSON.stringify(data)]);
    const report = await asUser<{ verification_status: string }>(
      null,
      "select verification_status from public.public_products where id=$1",
      [id],
    );
    expect(report.rows[0].verification_status).toBe("platform_verified");
    await expect(
      asUser(buyer, "insert into public.inspection_reports(product_id) values($1)", [id]),
    ).rejects.toThrow(/permission denied/);
  });
  it("uses database prices, reserves stock and returns the same order for retries", async () => {
    const product_id = await inventory();
    const key = crypto.randomUUID();
    const first = await place(product_id, buyer, key),
      second = await place(product_id, buyer, key);
    expect(first.rows[0].id).toBe(second.rows[0].id);
    const order = await asUser<{ total_piastres: number | string }>(
      buyer,
      "select total_piastres from public.orders where id=$1",
      [first.rows[0].id],
    );
    expect(Number(order.rows[0].total_piastres)).toBe(125005);
    await expect(place(product_id, other)).rejects.toThrow(/insufficient stock/);
  });
  it("rejects injected price fields and duplicate cart entries", async () => {
    const product_id = await inventory(2);
    for (const items of [
      [{ product_id, quantity: 1, price: 1 }],
      [
        { product_id, quantity: 1 },
        { product_id, quantity: 1 },
      ],
    ]) {
      await expect(
        asUser(
          buyer,
          "select public.place_order($1::jsonb,'cash_on_pickup','01012345678',$2::uuid)",
          [JSON.stringify(items), crypto.randomUUID()],
        ),
      ).rejects.toThrow(/cart/i);
    }
  });
  it("does not accept unavailable payment methods", async () => {
    const id = await inventory();
    await expect(
      asUser(buyer, "select public.place_order($1::jsonb,'instapay','01012345678',$2::uuid)", [
        JSON.stringify([{ product_id: id, quantity: 1 }]),
        crypto.randomUUID(),
      ]),
    ).rejects.toThrow(/not enabled/);
  });
  it("hides another customer's orders and private order costs", async () => {
    const id = (await place(await inventory())).rows[0].id;
    expect(
      (await asUser(other, "select * from public.orders where id=$1", [id])).rows,
    ).toHaveLength(0);
    expect(
      (await asUser(buyer, "select * from public.order_items where order_id=$1", [id])).rows,
    ).toHaveLength(0);
    expect(
      (await asUser(buyer, "select * from public.customer_order_items where order_id=$1", [id]))
        .rows,
    ).toHaveLength(1);
  });
  it("requires authorized payment verification before completion", async () => {
    const id = (await place(await inventory())).rows[0].id;
    await expect(
      asUser(buyer, "select public.process_order($1,'verify_payment')", [id]),
    ).rejects.toThrow(/permission/);
    await asUser(admin, "select public.process_order($1,'confirm')", [id]);
    await asUser(admin, "select public.process_order($1,'ready')", [id]);
    await expect(asUser(admin, "select public.process_order($1,'complete')", [id])).rejects.toThrow(
      /verified/,
    );
    await asUser(admin, "select public.process_order($1,'verify_payment')", [id]);
    await asUser(admin, "select public.process_order($1,'complete')", [id]);
    const result = await asUser<{ status: string }>(
      buyer,
      "select status from public.orders where id=$1",
      [id],
    );
    expect(result.rows[0].status).toBe("completed");
  });
  it("restores reservations on unpaid cancellation", async () => {
    const product_id = await inventory(),
      id = (await place(product_id)).rows[0].id;
    await asUser(admin, "select public.process_order($1,'cancel')", [id]);
    const result = await asUser<{ available_quantity: number }>(
      null,
      "select available_quantity from public.public_products where id=$1",
      [product_id],
    );
    expect(result.rows[0].available_quantity).toBe(1);
  });
  it("does not allow stock adjustments below reservations", async () => {
    const pid = await inventory();
    await place(pid);
    const result = await db.query<{ updated_at: string }>(
      "select updated_at from public.products where id=$1",
      [pid],
    );
    await expect(
      asUser(admin, "select public.save_inventory($1::jsonb)", [
        JSON.stringify({
          id: pid,
          expected_updated_at: result.rows[0].updated_at,
          title: "Isolated test GPU",
          category_slug: "graphics-cards",
          brand: "Test",
          model: "Fixture",
          description: "Explicitly isolated test inventory.",
          condition: "B",
          price_piastres: 125005,
          warranty_months: 0,
          governorate: "Cairo",
          specifications: {},
          image_paths: [],
          status: "listed",
          sku: "TEST-ADJUST",
          purchase_cost_piastres: 100000,
          quantity: 0,
        }),
      ]),
    ).rejects.toThrow(/check constraint/);
  });
  it("keeps a transfer submission unpaid until staff verify it", async () => {
    await db.exec(
      "update public.platform_settings set value='[\"cash_on_pickup\",\"instapay\"]' where key='payment_methods'",
    );
    const pid = await inventory();
    const placed = await asUser<{ id: string }>(
      buyer,
      "select public.place_order($1::jsonb,'instapay','01012345678',$2::uuid) as id",
      [JSON.stringify([{ product_id: pid, quantity: 1 }]), crypto.randomUUID()],
    );
    const id = placed.rows[0].id;
    await asUser(buyer, "select public.submit_payment_reference($1,'TEST-REFERENCE')", [id]);
    const submitted = await asUser<{ payment_status: string }>(
      buyer,
      "select payment_status from public.orders where id=$1",
      [id],
    );
    expect(submitted.rows[0].payment_status).toBe("submitted");
    await expect(
      asUser(other, "select public.submit_payment_reference($1,'OTHER-REFERENCE')", [id]),
    ).rejects.toThrow(/cannot/);
    await asUser(admin, "select public.process_order($1,'verify_payment')", [id]);
    await expect(asUser(admin, "select public.process_order($1,'cancel')", [id])).rejects.toThrow(
      /refund/,
    );
  });
  it("rolls back the whole cart when any item is unavailable", async () => {
    const good = await inventory(2),
      draft = await inventory(1, "draft");
    await expect(
      asUser(
        buyer,
        "select public.place_order($1::jsonb,'cash_on_pickup','01012345678',$2::uuid)",
        [
          JSON.stringify([
            { product_id: good, quantity: 1 },
            { product_id: draft, quantity: 1 },
          ]),
          crypto.randomUUID(),
        ],
      ),
    ).rejects.toThrow(/unavailable/);
    const result = await asUser<{ available_quantity: number }>(
      null,
      "select available_quantity from public.public_products where id=$1",
      [good],
    );
    expect(result.rows[0].available_quantity).toBe(2);
  });
});
