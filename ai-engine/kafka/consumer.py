import json
import logging

from confluent_kafka import Consumer

from kafka.config import (
    CONSUMER_CONFIG,
    KAFKA_TOPIC,
)

logger = logging.getLogger(__name__)


class KafkaConsumer:

    def __init__(self):

        self.consumer = Consumer(
            CONSUMER_CONFIG
        )

        self.consumer.subscribe([
            KAFKA_TOPIC
        ])

    def consume(self, process_job):

        logger.info(
            "Kafka consumer started | topic=%s",
            KAFKA_TOPIC,
        )

        try:

            while True:

                message = self.consumer.poll(1.0)

                if message is None:
                    continue

                if message.error():

                    logger.error(
                        "Consumer error: %s",
                        message.error(),
                    )

                    if message.error().fatal():
                        raise RuntimeError(
                            str(message.error())
                        )

                    continue

                try:

                    event = json.loads(
                        message.value().decode("utf-8")
                    )

                    logger.info(
                        "Message received | "
                        "job=%s | chunk=%s | "
                        "partition=%s | offset=%s",
                        event["id"],
                        event["chunk"],
                        message.partition(),
                        message.offset(),
                    )

                    # Execute AI job processing

                    process_job(event)

                    # Commit only after database
                    # transaction succeeds

                    self.consumer.commit(
                        message=message,
                        asynchronous=False,
                    )

                    logger.info(
                        "Offset committed | "
                        "partition=%s | offset=%s",
                        message.partition(),
                        message.offset() + 1,
                    )

                except Exception:

                    logger.exception(
                        "Job processing failed. "
                        "Offset not committed."
                    )

                    # Stop consumption to avoid
                    # committing past failed messages

                    raise

        except KeyboardInterrupt:

            logger.info(
                "Kafka consumer stopped"
            )

        finally:

            self.close()

    def close(self):

        self.consumer.close()

        logger.info(
            "Kafka consumer connection closed"
        )