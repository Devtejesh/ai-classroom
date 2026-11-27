import logging
import threading

import psycopg

from kafka.config import (
    DATABASE_URL,
    SCHEDULER_INTERVAL,
    DISPATCH_LEASE_SECONDS,
)

from kafka.producer import KafkaProducer


logger = logging.getLogger(__name__)


class JobScheduler:

    def __init__(self):

        self.producer = KafkaProducer()

        self.stop_event = threading.Event()

    def connect(self):

        return psycopg.connect(
            DATABASE_URL,
            connect_timeout=5,
        )

    # Fetch pending and retry-eligible jobs

    def fetch_due_jobs(self):

        with self.connect() as conn:

            with conn.cursor() as cur:

                cur.execute(
                    """
                    WITH due_jobs AS (

                        SELECT id

                        FROM ai_jobs

                        WHERE status IN (
                            'queued',
                            'processing',
                            'waiting_for_quota'
                        )

                        AND next_retry_at <= NOW()

                        AND dispatch_until <= NOW()

                        ORDER BY next_retry_at, id

                        LIMIT 20

                        FOR UPDATE SKIP LOCKED
                    )

                    UPDATE ai_jobs AS job

                    SET dispatch_until =
                        NOW() + (
                            %s * INTERVAL '1 second'
                        )

                    FROM due_jobs

                    WHERE job.id = due_jobs.id

                    RETURNING
                        job.id,
                        job.next_chunk
                    """,
                    (DISPATCH_LEASE_SECONDS,),
                )

                return cur.fetchall()

    # Release dispatch lease if publishing fails

    def release_job(self, job_id, chunk_index):

        with self.connect() as conn:

            with conn.cursor() as cur:

                cur.execute(
                    """
                    UPDATE ai_jobs

                    SET dispatch_until =
                        NOW() + INTERVAL '15 seconds'

                    WHERE id = %s

                    AND next_chunk = %s

                    AND status IN (
                        'queued',
                        'processing',
                        'waiting_for_quota'
                    )
                    """,
                    (job_id, chunk_index),
                )

    # Publish eligible jobs to Kafka

    def dispatch_jobs(self):

        jobs = self.fetch_due_jobs()

        for job_id, chunk_index in jobs:

            if self.stop_event.is_set():
                break

            success = self.producer.publish_job(
                job_id,
                chunk_index,
            )

            if success:

                logger.info(
                    "Job dispatched | job=%s | chunk=%s",
                    job_id,
                    chunk_index,
                )

            else:

                logger.warning(
                    "Dispatch failed | job=%s | chunk=%s",
                    job_id,
                    chunk_index,
                )

                self.release_job(
                    job_id,
                    chunk_index,
                )

    # Background scheduler loop

    def start(self):

        logger.info("AI Job Scheduler started")

        try:

            while not self.stop_event.is_set():

                try:

                    self.dispatch_jobs()

                except Exception:

                    logger.exception(
                        "Scheduler execution failed"
                    )

                self.stop_event.wait(
                    SCHEDULER_INTERVAL
                )

        finally:

            self.producer.close()

            logger.info("AI Job Scheduler stopped")

    # Graceful shutdown

    def stop(self):

        self.stop_event.set()