CREATE TABLE obcane.suggestion_replies (
 id uuid PRIMARY KEY,
 suggestion_id uuid NOT NULL REFERENCES obcane.suggestions(id) ON DELETE CASCADE,
 recipient text NOT NULL CHECK(length(recipient) BETWEEN 3 AND 254 AND recipient !~ E'[\r\n]'),
 title text NOT NULL,
 body text NOT NULL CHECK(length(body) BETWEEN 2 AND 8000),
 actor uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sending','sent','failed','superseded')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
 created_at timestamptz NOT NULL DEFAULT now(),
 sent_at timestamptz,
 retry_at timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz,
 last_error text
);
CREATE INDEX suggestion_replies_thread ON obcane.suggestion_replies(suggestion_id,created_at);
CREATE INDEX suggestion_replies_queue ON obcane.suggestion_replies(retry_at,created_at) WHERE status='queued';
ALTER TABLE obcane.suggestion_replies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON obcane.suggestion_replies FROM PUBLIC,anon,authenticated;
