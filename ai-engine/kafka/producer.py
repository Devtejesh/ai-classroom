import json
import logging

from confluent_kafka import Producer

from kafka.config import (
    PRODUCER_CONFIG,
    KAFKA_TOPIC,
)

logger = logging.getLogger(__name__)


class KafkaProducer:

    def __init__(self):

        self.producer = Producer(
            PRODUCER_CONFIG
        )

    def publish_job(
        self,
        job_id: int,
        chunk_index: int,
    ) -> bool:

        event = {
            "id": job_id,
            "chunk": chunk_index,
        }

        errors = []

        delivered = []

        def delivery_report(error, message):

            if error:

                errors.append(error)

                logger.error(
                    "Kafka delivery failed: %s",
                    error,
                )

            else:

                delivered.append(True)

                logger.info(
                    "Message published | "
                    "job=%s | chunk=%s | "
                    "partition=%s | offset=%s",
                    job_id,
                    chunk_index,
                    message.partition(),
                    message.offset(),
                )

        try:

            self.producer.produce(
                topic=KAFKA_TOPIC,
                key=str(job_id),
                value=json.dumps(event),
                on_delivery=delivery_report,
            )

            pending = self.producer.flush(35)

            if pending or errors or not delivered:
                return False

            return True

        except Exception:

            logger.exception(
                "Failed to publish job %s",
                job_id,
            )

            return False

    def close(self):

        self.producer.flush(35)