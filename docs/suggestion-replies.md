# Replies to citizen suggestions

Managers/editors can reply from the suggestion detail. Recipient is read from the original suggestion on the server; the client cannot override it. Anonymous suggestions, missing names, explicitly anonymous names and missing/invalid email addresses cannot receive replies. Private history records message, recipient, actor, creation, SMTP acceptance and retry status. Internal notes remain separate. Reply IDs make a repeated submit idempotent.

The existing project-scoped Seznam SMTP configuration must be enabled in **E-maily redakce** before a reply can be queued. No new credentials, global Auth configuration or access roles are introduced. Replies use the same existing dispatch cron after two advertiser messages (at most one reply per invocation). The SMTP Message-ID remains stable on retry. Acceptance is not an inbox/read receipt. Incoming email responses continue in the redaction mailbox; this feature does not read IMAP.

New private table: `obcane.suggestion_replies`, RLS enabled, no anon/authenticated grants. Foreign key to suggestions; no historical email backfill or automatic answers. No email sent to a real citizen during implementation.

Validation: boundary and anonymous/recipient-change tests, queue idempotency, immutable request payload, disabled SMTP, simulated SMTP success/failure/retry cap, migration rollback/history persistence, RLS grants, public endpoint 401, UI submit/history with synthetic example.com contacts.

The screenshot is a local preview with invented sample contacts and simulated delivery; it is not a live citizen conversation.
