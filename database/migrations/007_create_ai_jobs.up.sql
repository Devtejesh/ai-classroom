CREATE TABLE ai_jobs (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    session_id BIGINT NOT NULL
        REFERENCES learning_sessions(id) ON DELETE CASCADE,

    kind TEXT NOT NULL
        CHECK (kind IN ('notes', 'translation')),

    source_language TEXT NOT NULL,
    target_language TEXT NOT NULL,

    input_hash TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN (
            'queued',
            'processing',
            'waiting_for_quota',
            'completed',
            'failed'
        )),

    chunks JSONB NOT NULL,
    results JSONB NOT NULL DEFAULT '[]'::jsonb,

    next_chunk INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 0,

    next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dispatch_until TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    error TEXT,

    note_id BIGINT
        REFERENCES saved_notes(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (
        user_id,
        session_id,
        kind,
        target_language,
        input_hash
    )
);

CREATE INDEX ai_jobs_due_idx
ON ai_jobs(next_retry_at, dispatch_until)
WHERE status IN (
    'queued',
    'processing',
    'waiting_for_quota'
);

CREATE TABLE ai_provider_cooldowns (
    provider TEXT PRIMARY KEY,
    retry_at TIMESTAMPTZ NOT NULL
);