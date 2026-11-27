package handlers

import (
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
)

type AIJobHandler struct {
	DB *sql.DB
}

func NewAIJobHandler(db *sql.DB) *AIJobHandler {
	return &AIJobHandler{DB: db}
}

type aiSegment struct {
	Start float64 `json:"start"`
	End   float64 `json:"end"`
	Text  string  `json:"text"`
}

type aiRequest struct {
	SessionID int64       `json:"session_id"`
	Kind      string      `json:"kind"`
	Source    string      `json:"source_language"`
	Target    string      `json:"target_language"`
	Segments  []aiSegment `json:"segments"`
}

func (h *AIJobHandler) Create(c *gin.Context) {

	uid, ok := getLearningUserID(c)

	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	c.Request.Body = http.MaxBytesReader(
		c.Writer,
		c.Request.Body,
		8<<20,
	)

	var req aiRequest

	if c.ShouldBindJSON(&req) != nil ||
		req.SessionID <= 0 ||
		(req.Kind != "notes" && req.Kind != "translation") ||
		(req.Target != "en" && req.Target != "hi" && req.Target != "te") ||
		req.Source == "" ||
		len(req.Source) > 32 ||
		len(req.Segments) == 0 ||
		len(req.Segments) > 20000 {

		c.JSON(400, gin.H{"error": "invalid job request"})
		return
	}

	chunks := make([][]aiSegment, 0)
	batch := make([]aiSegment, 0)

	size := 0

	for _, segment := range req.Segments {

		if strings.TrimSpace(segment.Text) == "" {
			continue
		}

		n := utf8.RuneCountInString(segment.Text)

		if n > 3000 ||
			segment.Start < 0 ||
			segment.End < segment.Start {

			c.JSON(400, gin.H{
				"error": "invalid or oversized transcript segment",
			})
			return
		}

		if req.Kind == "translation" {
			chunks = append(chunks, []aiSegment{segment})
			continue
		}

		if size+n > 3000 || len(batch) >= 40 {

			chunks = append(chunks, batch)

			batch = make([]aiSegment, 0)
			size = 0
		}

		batch = append(batch, segment)
		size += n
	}

	if len(batch) > 0 {
		chunks = append(chunks, batch)
	}

	if len(chunks) == 0 {
		c.JSON(400, gin.H{"error": "empty transcript"})
		return
	}

	raw, _ := json.Marshal(chunks)

	hashInput, _ := json.Marshal(req)

	hash := fmt.Sprintf(
		"%x",
		sha256.Sum256(hashInput),
	)

	var id int64

	err := h.DB.QueryRowContext(
		c.Request.Context(),
		`
		INSERT INTO ai_jobs (
			user_id,
			session_id,
			kind,
			source_language,
			target_language,
			input_hash,
			chunks
		)
		SELECT $1, id, $3, $4, $5, $6, $7::jsonb
		FROM learning_sessions
		WHERE id = $2 AND user_id = $1

		ON CONFLICT (
			user_id,
			session_id,
			kind,
			target_language,
			input_hash
		)
		DO UPDATE SET input_hash = EXCLUDED.input_hash

		RETURNING id
		`,
		uid,
		req.SessionID,
		req.Kind,
		req.Source,
		req.Target,
		hash,
		string(raw),
	).Scan(&id)

	if err == sql.ErrNoRows {
		c.JSON(404, gin.H{"error": "session not found"})
		return
	}

	if err != nil {
		c.JSON(500, gin.H{"error": "could not create job"})
		return
	}

	c.JSON(202, gin.H{"id": id})
}

const jobFields = `
	id,
	session_id,
	kind,
	status,
	next_chunk,
	jsonb_array_length(chunks),
	next_retry_at,
	error,
	note_id,
	updated_at
`

func scanAIJob(
	row interface{ Scan(...any) error },
) (gin.H, error) {

	var id, session int64
	var kind, status string
	var done, total int
	var retry, updated any

	var message sql.NullString
	var note sql.NullInt64

	err := row.Scan(
		&id,
		&session,
		&kind,
		&status,
		&done,
		&total,
		&retry,
		&message,
		&note,
		&updated,
	)

	return gin.H{
		"id":               id,
		"session_id":       session,
		"kind":             kind,
		"status":           status,
		"completed_chunks": done,
		"total_chunks":     total,
		"next_retry_at":    retry,
		"error":            message.String,
		"note_id":          note.Int64,
		"updated_at":       updated,
	}, err
}

func (h *AIJobHandler) List(c *gin.Context) {

	uid, ok := getLearningUserID(c)

	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	rows, err := h.DB.QueryContext(
		c.Request.Context(),
		`SELECT `+jobFields+`
		FROM ai_jobs
		WHERE user_id = $1
		ORDER BY id DESC
		LIMIT 100`,
		uid,
	)

	if err != nil {
		c.JSON(500, gin.H{"error": "could not list jobs"})
		return
	}

	defer rows.Close()

	jobs := make([]gin.H, 0)

	for rows.Next() {

		job, err := scanAIJob(rows)

		if err != nil {
			c.JSON(500, gin.H{"error": "could not read job"})
			return
		}

		jobs = append(jobs, job)
	}

	if rows.Err() != nil {
		c.JSON(500, gin.H{"error": "could not read jobs"})
		return
	}

	c.JSON(200, gin.H{"jobs": jobs})
}

func (h *AIJobHandler) Get(c *gin.Context) {

	uid, ok := getLearningUserID(c)

	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	id, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil || id <= 0 {
		c.JSON(400, gin.H{"error": "invalid job ID"})
		return
	}

	job, err := scanAIJob(
		h.DB.QueryRowContext(
			c.Request.Context(),
			`SELECT `+jobFields+`
			FROM ai_jobs
			WHERE id = $1 AND user_id = $2`,
			id,
			uid,
		),
	)

	if err == sql.ErrNoRows {
		c.JSON(404, gin.H{"error": "job not found"})
		return
	}

	if err != nil {
		c.JSON(500, gin.H{"error": "could not read job"})
		return
	}

	if job["status"] == "completed" {

		var raw []byte

		err = h.DB.QueryRowContext(
			c.Request.Context(),
			`SELECT results
			FROM ai_jobs
			WHERE id = $1 AND user_id = $2`,
			id,
			uid,
		).Scan(&raw)

		if err != nil {
			c.JSON(500, gin.H{"error": "could not read result"})
			return
		}

		job["results"] = json.RawMessage(raw)
	}

	c.JSON(200, job)
}
