import { describe, expect, it } from "vitest";
import { confirmationDestination } from "@/lib/auth-redirect";

describe("confirmation destinations", () => {
  it("shows confirmation before continuing to a safe destination", () => {
    expect(confirmationDestination("signup", "en", "/en/cart")).toBe(
      "/en/auth/verified?next=%2Fen%2Fcart",
    );
    expect(confirmationDestination("email", "ar")).toBe("/ar/auth/verified?next=%2Far%2Faccount");
  });
  it("keeps recovery on password reset and prevents external redirects", () => {
    expect(confirmationDestination("recovery", "en", "/en/admin")).toBe("/en/auth?mode=update");
    expect(confirmationDestination("signup", "en", "https://example.org")).toBe(
      "/en/auth/verified?next=%2Fen%2Faccount",
    );
    expect(confirmationDestination("signup", "en", "/en/auth/verified")).toBe("/en/auth/verified");
  });
});
