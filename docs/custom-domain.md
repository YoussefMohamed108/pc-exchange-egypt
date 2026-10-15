# pc-ex.store connection

Checked 15 October 2026. Connection is **not live** yet.

## Current state

- Both `pc-ex.store` and `www.pc-ex.store` already belong to the owner's `pc-exchange-egypt` Vercel project (`prj_MUPBNvrAQLtl0hwo0ufiCBrXBGVB`). Vercel marks domain ownership verified, but DNS misconfigured. Ownership verification is not a working DNS connection.
- The apex has an existing 308 redirect to `www.pc-ex.store`.
- GoDaddy shows a paid one-year `.STORE` registration receipt for `pc-ex.store`, but the signed-in account's products, domain portfolio and DNS management contain no domains. Direct domain DNS navigation reports `No domains match 'pc-ex.store'`. Account notifications show no requested action.
- The owner needs GoDaddy to make the purchased domain available in this account before its DNS records can be edited. Do not repurchase, cancel, transfer or add paid services to resolve this visibility problem.
- On 15 October the owner supplied GoDaddy support's response: registry registration is still pending and the domain should appear after registration completes. This is the user's report of support's estimate, not independently confirmed completion. The owner deferred connection work while more games are added. A GoDaddy website-connection screenshot proposed `13.248.243.5` / `www → pc-ex.store`; those values do not match this Vercel project's current recommendations and were not applied.
- No DNS, nameserver or authentication configuration was changed. The existing Vercel alias and email confirmation origin remain in service.

## Vercel's current DNS recommendations

Re-read the project's domain configuration before applying: these are the API recommendations observed during the check, not records already installed.

| Type  | Host  | Target                                              |
| ----- | ----- | --------------------------------------------------- |
| A     | `@`   | `216.198.79.1` and `64.29.17.1` (rank-one IPv4 set) |
| CNAME | `www` | `5701be512e2d6e7c.vercel-dns-017.com.`              |

The API reported external nameservers `ns10.trs-dns.org`, `ns01.trs-dns.com`, `ns01.trs-dns.net`, and `ns10.trs-dns.info`. Inspect the authoritative DNS provider after provisioning; GoDaddy DNS records only take effect when its DNS hosts the domain. Preserve unrelated MX/TXT records and existing mail configuration. Prefer editing the website records at the authoritative provider over changing all nameservers.

## Remaining acceptance

1. Resolve the missing domain in GoDaddy and inspect the actual DNS zone and nameservers.
2. Apply Vercel's current recommendations, then confirm both project domain configurations report valid DNS.
3. Confirm HTTPS, the apex-to-www redirect, English/Arabic pages and the benchmark view.
4. Add exact custom-domain Supabase Auth callback URLs while retaining the original Vercel and localhost callback URLs. The existing `backend.mjs site` command replaces the allowlist, so adapt it to include these aliases before using it.
5. Only after HTTPS succeeds, change the canonical site origin to `https://www.pc-ex.store` and deploy the public frontend configuration. Test registration/verification, password recovery and sign-in redirects. Do not claim domain acceptance from a successful Vercel build alone.

References: [Vercel domain setup](https://vercel.com/docs/domains/working-with-domains/add-a-domain), [GoDaddy DNS management](https://dcc.godaddy.com/control/dnsmanagement).
