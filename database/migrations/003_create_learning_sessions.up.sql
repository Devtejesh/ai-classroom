
CREATE TABLE IF NOT EXISTS learning_sessions (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    video_id VARCHAR(50) NOT NULL,

    video_title TEXT NOT NULL,

    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_learning_sessions_user_id
ON learning_sessions(user_id);

CREATE INDEX idx_learning_sessions_video_id
ON learning_sessions(user_id, video_id);

CREATE INDEX idx_learning_sessions_started_at
ON learning_sessions(started_at DESC);
