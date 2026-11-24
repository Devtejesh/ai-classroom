
CREATE TABLE IF NOT EXISTS saved_notes (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    session_id BIGINT NOT NULL
        REFERENCES learning_sessions(id) ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,

    content TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saved_notes_user_id
ON saved_notes(user_id);

CREATE INDEX idx_saved_notes_session_id
ON saved_notes(session_id);

CREATE INDEX idx_saved_notes_created_at
ON saved_notes(created_at DESC);
