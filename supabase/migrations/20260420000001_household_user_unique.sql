-- Add unique constraint on households.user_id to prevent duplicate household rows
-- per user (required for ON CONFLICT upsert logic in Phase 3 tRPC procedures).
ALTER TABLE households ADD CONSTRAINT households_user_id_key UNIQUE (user_id);
