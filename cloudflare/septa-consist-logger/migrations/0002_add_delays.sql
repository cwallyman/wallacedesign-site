-- Adds delay tracking to an existing trips table. schema.sql already includes
-- these columns for fresh databases; run this once against databases created
-- before delay tracking was added.
ALTER TABLE trips ADD COLUMN max_late INTEGER NOT NULL DEFAULT 0;
ALTER TABLE trips ADD COLUMN delay_start_stop TEXT;
ALTER TABLE trips ADD COLUMN delay_start_at TEXT;
