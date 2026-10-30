from __future__ import annotations

import io
import logging
import warnings
from functools import lru_cache

from PIL import Image, ImageOps, UnidentifiedImageError
from backend.schemas.caption_schema import CaptionResponse

logger = logging.getLogger(__name__)
MAX_IMAGE_PIXELS = 25_000_000


class InvalidImageError(ValueError):
    pass


class CaptionService:
    def __init__(self, captioner=None):
        self.captioner = captioner
        self.load_error = None

    def load_model(self):
        if self.is_ready():
            return
        self.load_error = None
        try:
            # Health remains available when ML dependencies are missing.
            if self.captioner is None:
                from backend.models.level5_captioner import Level5Captioner
                self.captioner = Level5Captioner()
            self.captioner.load()
        except Exception as exc:
            self.load_error = f"{type(exc).__name__}: {exc}"
            logger.exception("Level 5A failed to load")

    def is_ready(self):
        return self.captioner is not None and self.captioner.is_loaded() and self.load_error is None

    def health(self):
        result = {"status": "online" if self.is_ready() else "offline",
                  "model_loaded": self.is_ready(), "model_name": "Level 5A RAG", "model_type": "rag_level5"}
        if self.is_ready():
            result.update(device=self.captioner.device, architecture=self.captioner.model_info,
                          reltr_available=self.captioner.reltr is not None, warnings=self.captioner.warnings)
        else:
            result["error"] = self.load_error or "Model has not finished loading"
        return result

    def analyze(self, image_bytes: bytes) -> CaptionResponse:
        if not self.is_ready():
            raise RuntimeError(self.load_error or "Level 5A is not loaded")
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("error", Image.DecompressionBombWarning)
                with Image.open(io.BytesIO(image_bytes)) as source:
                    if source.format not in {"JPEG", "PNG", "WEBP", "BMP"}:
                        raise InvalidImageError("Use JPEG, PNG, WebP or BMP")
                    if source.width * source.height > MAX_IMAGE_PIXELS:
                        raise InvalidImageError("Image exceeds 25 megapixels")
                    source.load()
                    image = ImageOps.exif_transpose(source).convert("RGB")
        except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
            raise InvalidImageError(f"Invalid image: {exc}") from exc
        try:
            result = self.captioner.generate_details(image)
            return CaptionResponse(success=True, caption=result["final_caption"], **result)
        finally:
            image.close()


@lru_cache(maxsize=1)
def get_caption_service() -> CaptionService:
    return CaptionService()
