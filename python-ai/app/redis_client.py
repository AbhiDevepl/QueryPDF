import os

import redis.asyncio as aioredis

CHANNELS = ("process_pdf", "ask_question", "delete_pdf_vectors")


async def run_subscriber() -> None:
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    client = aioredis.from_url(redis_url)
    pubsub = client.pubsub()
    await pubsub.subscribe(*CHANNELS)
    print(f"[redis] subscribed to channels: {', '.join(CHANNELS)}")
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                channel = message["channel"].decode()
                data = message["data"].decode()
                print(f"[redis:{channel}] {data}")
    finally:
        await pubsub.aclose()
        await client.aclose()
