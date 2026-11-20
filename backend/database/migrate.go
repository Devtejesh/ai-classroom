package database

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

func RunMigrations(db *sql.DB) error {
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version BIGINT PRIMARY KEY,
			dirty BOOLEAN NOT NULL DEFAULT FALSE
		)
	`); err != nil {
		return fmt.Errorf("failed to create migration tracking table: %w", err)
	}

	files, err := filepath.Glob("../database/migrations/*.up.sql")
	if err != nil {
		return fmt.Errorf("failed to find migration files: %w", err)
	}

	sort.Strings(files)

	for _, file := range files {
		base := filepath.Base(file)
		versionText := strings.SplitN(base, "_", 2)[0]

		var version int64
		if _, err := fmt.Sscan(versionText, &version); err != nil {
			return fmt.Errorf("invalid migration filename: %s", base)
		}

		var exists bool
		err = db.QueryRow(
			"SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $1)",
			version,
		).Scan(&exists)
		if err != nil {
			return fmt.Errorf("failed to check migration version: %w", err)
		}
		if exists {
			continue
		}

		content, err := os.ReadFile(file)
		if err != nil {
			return fmt.Errorf("failed to read migration %s: %w", base, err)
		}

		tx, err := db.Begin()
		if err != nil {
			return fmt.Errorf("failed to start migration transaction: %w", err)
		}

		if _, err := tx.Exec(string(content)); err != nil {
			tx.Rollback()
			return fmt.Errorf("migration %s failed: %w", base, err)
		}

		if _, err := tx.Exec(
			"INSERT INTO schema_migrations (version) VALUES ($1)",
			version,
		); err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to record migration %s: %w", base, err)
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("failed to commit migration %s: %w", base, err)
		}
	}

	return nil
}
