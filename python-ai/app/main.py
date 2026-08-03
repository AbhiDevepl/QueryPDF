import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .redis_client import run_subscriber


@asynccontextmanager
async def lifespan(_app: FastAPI):
    task = asyncio.create_task(run_subscriber())
    yield
    task.cancel()


app = FastAPI(lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok"}
