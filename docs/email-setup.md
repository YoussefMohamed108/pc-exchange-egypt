# Real verification email setup

The PC-backed Auth service originally sent to Mailpit at http://127.0.0.1:54324. Those messages do not reach external inboxes. Email confirmation remains enabled.

**Accepted on 14 October 2026:** Brevo sender verified, standard SMTP credential configured privately, current PC egress address authorized with SMTP IP blocking retained. TLS/login passed. Brevo recorded the owner's confirmation email as Delivered at 22:10 Africa/Cairo, and Auth subsequently recorded the account as email-confirmed. The key expires on 14 October 2027, or after 90 days of inactivity under Brevo's displayed policy. No paid plan or domain was purchased.

## Without a domain: Brevo development setup

1. Create a Brevo account at https://onboarding.brevo.com and complete its account verification.
2. In Settings → Senders, add **PC Exchange Egypt** with an email address you control, and verify it using the message Brevo sends. Without an authenticated domain Brevo may replace the sending domain with `brevosend.com`.
3. Enable transactional email if the account requires activation. Open SMTP & API → SMTP and generate an **SMTP key** (not an API key).
4. Fill the private, Git-ignored `infrastructure/backend/.env.smtp` file. Copy the exact SMTP login shown by Brevo; it may differ from your account email. Do not send the key in chat.
5. If SMTP IP restrictions are enabled, authorize the PC's current egress address in Brevo. Run `node scripts/backend.mjs mail`, `node scripts/check-smtp.mjs`, then `npm run deploy:vercel`. The SMTP check authenticates over TLS without sending mail.
6. On the site's sign-in page, select **Resend confirmation**, enter the email used to register, and follow the new link received in that inbox. Verify both receipt and the Account verified page; configuration alone is not delivery acceptance.

The private file uses these keys:

```dotenv
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_ADMIN_EMAIL=
SMTP_SENDER_NAME=PC Exchange Egypt
```

Credentials stay in the PC's backend environment and are never uploaded to Vercel. The frontend receives only the delivery-mode label. Keep the PC, Docker and tunnel running.

A home IP change may block SMTP until the new address is authorized. Keep IP restrictions enabled. The Mailpit-only `check-backend.mjs` and `check-confirmation.mjs` scripts refuse to run with external SMTP, preventing test-address mail. `check-marketplace.mjs` uses disposable confirmed fixtures through internal Auth administration and sends no email.

For a public launch, use a domain you own and configure the provider's authentication records. Resend is another supported SMTP option after obtaining a domain. No domain purchase or paid plan is required by this setup script.

Sources: [Brevo SMTP](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP), [sender verification](https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email), [sender-domain replacement](https://help.brevo.com/hc/en-us/articles/16045394674066-Troubleshooting-Domain-authentication), [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
