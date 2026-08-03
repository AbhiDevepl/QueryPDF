import asyncio
import json
import os

import redis.asyncio as aioredis

from .services.pdf_processor import process_pdf
from .services.vectorstore import delete_document_vectors

CHANNELS = ("process_pdf", "ask_question", "delete_pdf_vectors")


async def _handle_process_pdf(pub: aioredis.Redis, payload: dict) -> None:
    try:
        page_count = await asyncio.to_thread(
            process_pdf, payload["documentId"], payload["filePath"]
        )
        await pub.publish(
            "document_status",
            json.dumps(
                {
                    "documentId": payload["documentId"],
                    "status": "ready",
                    "pageCount": page_count,
                }
            ),
        )
    except Exception as error:
        await pub.publish(
            "document_status",
            json.dumps(
                {
                    "documentId": payload["documentId"],
                    "status": "failed",
                    "error": str(error),
                }
            ),
        )


async def _handle_delete_pdf_vectors(payload: dict) -> None:
    await asyncio.to_thread(delete_document_vectors, payload["documentId"])


async def run_subscriber() -> None:
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    client = aioredis.from_url(redis_url)
    pub = aioredis.from_url(redis_url)
    pubsub = client.pubsub()
    await pubsub.subscribe(*CHANNELS)
    print(f"[redis] subscribed to channels: {', '.join(CHANNELS)}")
    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            channel = message["channel"].decode()
            try:
                payload = json.loads(message["data"])
                if channel == "process_pdf":
                    await _handle_process_pdf(pub, payload)
                elif channel == "delete_pdf_vectors":
                    await _handle_delete_pdf_vectors(payload)
            except Exception as error:
                print(f"[redis:{channel}] handler error: {error}")
    finally:
        await pubsub.aclose()
        await client.aclose()
        await pub.aclose()
