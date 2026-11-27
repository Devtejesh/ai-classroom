from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

import re
import logging

from app.config import (
    AI_PROVIDER,
    GEMINI_API_KEY,
    GROQ_API_KEY,
)

from app.services.llm import (
    generate_with_gemini,
    generate_with_groq,
)

logger = logging.getLogger(__name__)


class WaitForQuota(Exception):

    def __init__(self, retry_at):
        self.retry_at = retry_at
        super().__init__("Waiting for provider quota")


class PermanentError(Exception):
    pass


def now():
    return datetime.now(timezone.utc)


def retry_time(exc):

    response = getattr(exc, "response", None)

    headers = getattr(response, "headers", {}) or {}

    candidates = []

    keys = (
        "retry-after",
        "x-ratelimit-reset-requests",
        "x-ratelimit-reset-tokens",
    )

    for key in keys:

        value = headers.get(key)

        if not value:
            continue

        try:
            candidates.append(float(value))
            continue

        except ValueError:
            pass

        try:
            seconds = (
                parsedate_to_datetime(value) - now()
            ).total_seconds()

            candidates.append(seconds)
            continue

        except (ValueError, TypeError):
            pass

        parts = re.findall(
            r"(\d+(?:\.\d+)?)(ms|h|m|s)",
            value,
        )

        if parts:

            units = {
                "ms": 0.001,
                "s": 1,
                "m": 60,
                "h": 3600,
            }

            candidates.append(
                sum(
                    float(number) * units[unit]
                    for number, unit in parts
                )
            )

    match = re.search(
        r'retry(?: in|Delay["\s:]+)\s*(\d+(?:\.\d+)?)s',
        str(exc),
        re.IGNORECASE,
    )

    if match:
        candidates.append(float(match.group(1)))

    return now() + timedelta(
        seconds=max([60, *candidates])
    )


def generate_for_job(conn, prompt):

    providers = {
        "gemini": (
            GEMINI_API_KEY,
            generate_with_gemini,
        ),
        "groq": (
            GROQ_API_KEY,
            generate_with_groq,
        ),
    }

    provider_order = list(
        dict.fromkeys([
            AI_PROVIDER,
            "gemini",
            "groq",
        ])
    )

    waits = []
    transient_error = False

    for provider in provider_order:

        api_key, generate = providers[provider]

        if not api_key:
            continue

        with conn.cursor() as cur:

            cur.execute(
                """
                SELECT retry_at
                FROM ai_provider_cooldowns
                WHERE provider = %s
                """,
                (provider,),
            )

            row = cur.fetchone()

        if row and row[0] > now():

            waits.append(row[0])

            logger.info(
                "%s is in cooldown",
                provider,
            )

            continue

        try:

            logger.info(
                "Processing chunk using %s",
                provider,
            )

            return generate(prompt)

        except Exception as exc:

            code = (
                getattr(exc, "status_code", None)
                or getattr(exc, "code", None)
            )

            rate_limited = (
                str(code) == "429"
                or "RESOURCE_EXHAUSTED" in str(exc)
            )

            if rate_limited:

                retry_at = retry_time(exc)

                waits.append(retry_at)

                with conn.cursor() as cur:

                    cur.execute(
                        """
                        INSERT INTO ai_provider_cooldowns (
                            provider,
                            retry_at
                        )
                        VALUES (%s, %s)

                        ON CONFLICT(provider)
                        DO UPDATE SET retry_at = GREATEST(
                            ai_provider_cooldowns.retry_at,
                            EXCLUDED.retry_at
                        )
                        """,
                        (provider, retry_at),
                    )

                logger.warning(
                    "%s quota exceeded. Retry at %s",
                    provider,
                    retry_at,
                )

            elif str(code) in (
                "400", "401", "403",
                "404", "413", "422",
            ):

                logger.warning(
                    "%s rejected the request",
                    provider,
                )

            else:

                transient_error = True

                logger.warning(
                    "Temporary failure from %s",
                    provider,
                )

    if waits:
        raise WaitForQuota(min(waits))

    if transient_error:
        raise RuntimeError("Temporary LLM failure")

    raise PermanentError(
        "No usable LLM provider or invalid request"
    )