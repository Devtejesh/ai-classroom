ALTER TABLE saved_notes
ADD COLUMN is_shared BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE saved_notes
ADD COLUMN share_token TEXT;

ALTER TABLE saved_notes
ADD COLUMN shared_at TIMESTAMPTZ;

CREATE UNIQUE INDEX idx_saved_notes_share_token
ON saved_notes(share_token)
WHERE share_token IS NOT NULL;

ALTER TABLE saved_notes
ADD CONSTRAINT saved_notes_sharing_check
CHECK (
    (is_shared = TRUE AND share_token IS NOT NULL AND shared_at IS NOT NULL)
    OR
    (is_shared = FALSE AND share_token IS NULL AND shared_at IS NULL)
);