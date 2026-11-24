
CREATE TABLE IF NOT EXISTS saved_questions (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    session_id BIGINT NOT NULL
        REFERENCES learning_sessions(id) ON DELETE CASCADE,

    question TEXT NOT NULL,

    answer TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saved_questions_user_id
ON saved_questions(user_id);

CREATE INDEX idx_saved_questions_session_id
ON saved_questions(session_id);

CREATE INDEX idx_saved_questions_created_at
ON saved_questions(created_at DESC);
