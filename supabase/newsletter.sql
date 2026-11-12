CREATE TABLE obcane.newsletter_subscribers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE NOT NULL CHECK(email=lower(email) AND length(email)<=254),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','unsubscribed')),
 topics text[] NOT NULL DEFAULT '{}', frequency text NOT NULL DEFAULT 'weekly' CHECK(frequency IN ('daily','weekly')),
 pending_preferences jsonb, confirm_hash text, confirm_expires timestamptz,
 token_version integer NOT NULL DEFAULT 1, confirmed_at timestamptz, requested_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), next_digest_at timestamptz,
 CHECK(topics <@ ARRAY['hlavni','zpravy','akce','sport','omezeni','inzerce']::text[])
);
CREATE TABLE obcane.newsletter_requests(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,client_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX newsletter_requests_rate ON obcane.newsletter_requests(client_hash,created_at);
CREATE TABLE obcane.newsletter_items (
 key text PRIMARY KEY,title text NOT NULL,url text NOT NULL,summary text NOT NULL DEFAULT '',topics text[] NOT NULL,source text NOT NULL,
 published_at timestamptz,event_date date,event_time text,ends_at date,first_seen_at timestamptz NOT NULL DEFAULT now(),active boolean NOT NULL DEFAULT true,seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE obcane.newsletter_mail (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),subscriber_id uuid NOT NULL REFERENCES obcane.newsletter_subscribers(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('confirm','digest')),snapshot jsonb NOT NULL,period_key text,
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sending','sent','failed','cancelled')),
 attempts integer NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now(),sent_at timestamptz,retry_at timestamptz NOT NULL DEFAULT now(),lease_until timestamptz,last_error text,
 UNIQUE(subscriber_id,kind,period_key)
);
CREATE TABLE obcane.newsletter_deliveries (
 subscriber_id uuid NOT NULL REFERENCES obcane.newsletter_subscribers(id) ON DELETE CASCADE,
 item_key text NOT NULL REFERENCES obcane.newsletter_items(key),mail_id uuid NOT NULL REFERENCES obcane.newsletter_mail(id) ON DELETE CASCADE,
 PRIMARY KEY(subscriber_id,item_key)
);
CREATE TABLE obcane.newsletter_settings(id boolean PRIMARY KEY DEFAULT true CHECK(id),last_sync_at timestamptz,last_error text);
INSERT INTO obcane.newsletter_settings(id) VALUES(true);
CREATE INDEX newsletter_mail_queue ON obcane.newsletter_mail(retry_at,created_at) WHERE status='queued';
CREATE INDEX newsletter_subscriber_due ON obcane.newsletter_subscribers(next_digest_at) WHERE status='active';
CREATE OR REPLACE FUNCTION obcane.newsletter_next_send(freq text) RETURNS timestamptz LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE local_now timestamp:=now() AT TIME ZONE 'Europe/Prague'; target timestamp;
BEGIN
 target:=CASE WHEN freq='weekly' THEN date_trunc('week',local_now)+interval '4 days 18 hours' ELSE date_trunc('day',local_now)+interval '18 hours' END;
 IF target<=local_now THEN target:=target+CASE WHEN freq='weekly' THEN interval '7 days' ELSE interval '1 day' END; END IF;
 RETURN target AT TIME ZONE 'Europe/Prague';
END $$;
REVOKE ALL ON FUNCTION obcane.newsletter_next_send(text) FROM PUBLIC,anon,authenticated;
ALTER TABLE obcane.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE obcane.newsletter_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE obcane.newsletter_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE obcane.newsletter_mail ENABLE ROW LEVEL SECURITY;
ALTER TABLE obcane.newsletter_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE obcane.newsletter_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON obcane.newsletter_subscribers,obcane.newsletter_requests,obcane.newsletter_items,obcane.newsletter_mail,obcane.newsletter_deliveries,obcane.newsletter_settings FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE obcane.newsletter_requests_id_seq FROM PUBLIC,anon,authenticated;
