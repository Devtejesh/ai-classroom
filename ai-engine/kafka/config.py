import os

from pathlib import Path
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


# Kafka Configuration

KAFKA_BOOTSTRAP_SERVERS = os.getenv(
    "KAFKA_BOOTSTRAP_SERVERS",
    "localhost:9092",
)

KAFKA_TOPIC = os.getenv(
    "KAFKA_TOPIC",
    "ai.chunks.process",
)

KAFKA_CONSUMER_GROUP = os.getenv(
    "KAFKA_CONSUMER_GROUP",
    "ai-classroom-worker",
)


# Database Configuration

DATABASE_URL = os.getenv("AI_JOBS_DATABASE_URL")


# Producer Configuration

PRODUCER_CONFIG = {
    "bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS,
    "enable.idempotence": True,
    "acks": "all",
    "retries": 5,
    "delivery.timeout.ms": 30000,
}


# Consumer Configuration

CONSUMER_CONFIG = {
    "bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS,
    "group.id": KAFKA_CONSUMER_GROUP,
    "auto.offset.reset": "earliest",
    "enable.auto.commit": False,
    "max.poll.interval.ms": 900000,
    "session.timeout.ms": 45000,
}


# Scheduler Configuration

SCHEDULER_INTERVAL = 3

DISPATCH_LEASE_SECONDS = 600

MAX_RETRIES = 5