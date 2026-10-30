"""
image_processor.py
==================
Handles all image loading, validation, and preprocessing before
the image is passed to the encoder.

Keeping preprocessing separate from the API endpoint ensures:
  - Easy unit testing.
  - Ability to swap preprocessing pipelines (e.g. CLIP vs. ViT norms).
  - Clean separation of concerns.
"""

import io
import logging
from PIL import Image, UnidentifiedImageError

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {"jpg", "jpeg", "png"}
MAX_FILE_SIZE_MB = 10.0


class ImageProcessor:
    """Validates, loads, and preprocesses images for the encoder.

    Args:
        target_size: (width, height) to resize images to. Defaults to (224, 224).
    """

    def __init__(self, target_size: tuple = (224, 224)):
        self.target_size = target_size

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def validate_format(self, filename: str) -> bool:
        """Check that the file extension is in the supported set.

        Args:
            filename: Original filename from the upload.

        Returns:
            True if the extension is supported, False otherwise.
        """
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        return ext in SUPPORTED_EXTENSIONS

    def validate_size(self, image_bytes: bytes, max_mb: float = MAX_FILE_SIZE_MB) -> bool:
        """Check that the file does not exceed the size limit.

        Args:
            image_bytes: Raw bytes of the uploaded file.
            max_mb: Maximum allowed size in megabytes.

        Returns:
            True if within limit, False otherwise.
        """
        size_mb = len(image_bytes) / (1024 * 1024)
        return size_mb <= max_mb

    # ------------------------------------------------------------------
    # Loading
    # ------------------------------------------------------------------

    def load_from_bytes(self, image_bytes: bytes) -> Image.Image:
        """Open image bytes and convert to RGB PIL Image.

        Args:
            image_bytes: Raw bytes of the image file.

        Returns:
            RGB PIL.Image.Image object.

        Raises:
            ValueError: If the bytes do not represent a valid image.
        """
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            return image
        except UnidentifiedImageError as e:
            raise ValueError(
                "The uploaded file could not be identified as a valid image."
            ) from e

    # ------------------------------------------------------------------
    # Preprocessing
    # ------------------------------------------------------------------

    def preprocess(self, image: Image.Image) -> Image.Image:
        """Apply standard preprocessing: resize to target_size.

        Note: Pixel normalization (mean/std) is intentionally left to
        each model's own processor (e.g. ViTImageProcessor) to avoid
        double-normalization. This step only handles spatial resizing.

        Args:
            image: Input PIL.Image.Image (RGB).

        Returns:
            Resized PIL.Image.Image ready for the encoder.
        """
        resized = image.resize(self.target_size, Image.LANCZOS)
        logger.debug(f"Image resized to {self.target_size}.")
        return resized

    # ------------------------------------------------------------------
    # Convenience: run the full pipeline
    # ------------------------------------------------------------------

    def process(self, image_bytes: bytes, filename: str) -> Image.Image:
        """Validate and preprocess in a single call.

        Args:
            image_bytes: Raw uploaded bytes.
            filename: Original filename (for extension validation).

        Returns:
            Preprocessed PIL.Image.Image.

        Raises:
            ValueError: On format/size/content validation failure.
        """
        if not self.validate_format(filename):
            raise ValueError(
                f"Unsupported file format. Allowed: {', '.join(SUPPORTED_EXTENSIONS).upper()}."
            )
        if not self.validate_size(image_bytes):
            raise ValueError(
                f"File size exceeds the {MAX_FILE_SIZE_MB:.0f} MB limit."
            )
        image = self.load_from_bytes(image_bytes)
        return self.preprocess(image)
