"""Run from image-captioning-baseline: python -m uvicorn backend.main:app --port 8000."""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.api.caption import router as caption_router
from backend.api.evaluation import router as evaluation_router
from backend.services.caption_service import get_caption_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    await run_in_threadpool(get_caption_service().load_model)
    yield


app = FastAPI(title="HUIT Group 02 - Level 5A Image Captioning", lifespan=lifespan)
app.add_middleware(CORSMiddleware,
                   allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["*"])
app.include_router(caption_router, prefix="/api")
app.include_router(evaluation_router, prefix="/api")


@app.get("/api/health")
async def health_check():
    # 200 allows the dashboard to display the offline diagnostic message.
    return get_caption_service().health()


frontend_path = Path(__file__).resolve().parents[1] / "frontend"
if frontend_path.is_dir():
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="legacy_frontend")
