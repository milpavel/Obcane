# Pro Rtyni: private suggestion mail notifications

Prepared for activation; not yet sending. Recipient: `mil.pavel@icloud.com`.

The Worker accepts only HMAC authenticated POSTs with a five-minute freshness window. Its `send_email` binding must restrict the destination to the owner's verified email. The plain-text email includes the complete citizen request, optional reply-to contact and the private admin link. No request content or secrets are logged. Sender: `podnety@prortyni.cz`.

`supabase/suggestion-mail.sql` prepares an isolated outbox in the `obcane` schema, RLS with no public access, a transactional insert trigger and a once-per-minute dispatcher. Failed sends retry at five-minute intervals, at most five attempts. A stable Message-ID helps clients recognize repeated attempts after uncertain network responses. A database record is marked sent only after HTTP 200; this means acceptance by the mail service, not confirmed inbox delivery.

The SQL creates two scoped Vault entries: `obcane_suggestion_mail_secret` and `obcane_suggestion_mail_enabled`. The latter defaults to `false`. Copy the new HMAC secret directly into the Worker's `NOTIFICATION_SECRET` secret binding without exposing it in source or logs. Do not reuse another project's tokens.

Before activation, obtain the owner's explicit approval to enable Cloudflare Email Routing on `prortyni.cz`; automatic review rejected enabling domain mail DNS without that approval. At inspection, `prortyni.cz` had no MX records. The Cloudflare preview proposes three MX records (`route1`, `route2`, `route3.mx.cloudflare.net`), a DKIM TXT record and an SPF TXT record. Do not alter any other zone or any shared Supabase Auth setting as part of email delivery.

Deployment order after approval: apply the SQL, deploy `worker.mjs` and `notification.mjs` with a `send_email` binding named `EMAIL` and the fixed destination, enable its workers.dev URL `prortyni-suggestion-mail.mil-pavel.workers.dev`, enable approved domain Email Routing DNS, run a real authorized delivery test, then activate the scoped Vault switch. Check HTTP responses and outbox state before claiming emails were sent. Four unresolved citizen requests are eligible for backfill; technical checks with closed status are excluded.

Password recovery is a separate issue: the client already passes `https://prortyni.cz/admin/` explicitly. The shared project's allowlist and email template require inspection. Preserve its existing Site URL and other apps' redirects. The connected Supabase tools do not expose auth configuration, and the browser dashboard is not signed in.

Validation: `node scripts/test_suggestion_mail.mjs`.
