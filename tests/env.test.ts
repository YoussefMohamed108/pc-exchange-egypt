import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseConfig } from "@/lib/env";
afterEach(() => vi.unstubAllEnvs());
describe("public credentials boundary", () => {
  it("allows an unconfigured storefront", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(getSupabaseConfig()).toBeNull();
  });
  it("rejects partial configuration and new secret keys", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(() => getSupabaseConfig()).toThrow();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_secret_" + "isolated_test_fixture");
    expect(() => getSupabaseConfig()).toThrow();
  });
  it("rejects legacy service-role keys", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    const header = Buffer.from('{"alg":"HS256"}').toString("base64url"),
      payload = Buffer.from('{"role":"service_role"}').toString("base64url");
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      `${header}.${payload}.isolated-test-signature`,
    );
    expect(() => getSupabaseConfig()).toThrow(/anon key/);
  });
});
