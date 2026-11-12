-- Lower the classifieds description minimum without changing the upper limit.
ALTER TABLE obcane.classifieds DROP CONSTRAINT classifieds_description_check;
ALTER TABLE obcane.classifieds ADD CONSTRAINT classifieds_description_check CHECK (length(description) BETWEEN 10 AND 4000);
