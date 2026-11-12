ALTER TABLE obcane.suggestion_replies ADD COLUMN kind text NOT NULL DEFAULT 'reply' CHECK(kind IN ('reply','forward'));
