import logging

from fastapi import APIRouter, UploadFile, File, Depends
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from backend.services.caption_service import CaptionService, InvalidImageError, get_caption_service
from backend.schemas.caption_schema import CaptionResponse

router = APIRouter()
logger = logging.getLogger(__name__)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


@router.post("/caption", response_model=CaptionResponse)
@router.post("/analyze", response_model=CaptionResponse)
async def analyze_endpoint(image: UploadFile = File(...), service: CaptionService = Depends(get_caption_service)):
    try:
        if not service.is_ready():
            return JSONResponse(status_code=503, content={"success": False, "error": service.load_error or "Model not loaded"})
        image_bytes = await image.read(MAX_UPLOAD_BYTES + 1)
        if len(image_bytes) > MAX_UPLOAD_BYTES:
            return JSONResponse(status_code=413, content={"success": False, "error": "Image exceeds 10 MiB"})
        return await run_in_threadpool(service.analyze, image_bytes)
    except InvalidImageError as exc:
        return JSONResponse(status_code=400, content={"success": False, "error": str(exc)})
    except Exception:
        logger.exception("Caption inference failed")
        return JSONResponse(status_code=500, content={"success": False, "error": "Level 5A inference failed; see backend log"})
    finally:
        await image.close()
