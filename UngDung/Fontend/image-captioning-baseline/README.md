# AI Image Captioning – Baseline v1 & Research Platform

> **Research project:** Phát triển mô hình chú thích ảnh tăng cường truy hồi tri thức ngữ nghĩa  
> **Current phase:** Phase 2 – Evaluation & Diagnosis (No Knowledge Retrieval yet)

---

## Current Pipeline

```
Image (JPG/PNG)
    ↓
ImageProcessor        → validate format/size, open, convert to RGB, resize 224x224
    ↓
CaptionGenerator      → generate natural-language description
    │  ╭────────────────────────────────────────────────────────────╮
    │  │  ViTGPT2CaptionGenerator                                   │
    │  │  nlpconnect/vit-gpt2-image-captioning – pretrained MS-COCO │
    ╰──╰────────────────────────────────────────────────────────────╯
    ↓
Caption (returned to frontend)
```

## Batch Evaluation Pipeline

```
Dataset (MS COCO / Flickr30K / Custom)
    ↓
Iterate Samples & Load Images
    ↓
ViTGPT2 Inference
    ↓
Compute Corpus Metrics (BLEU, METEOR, ROUGE-L, CIDEr)
    ↓
Error Diagnosis (Repetition, Hallucination checks)
    ↓
Report Generation
```

---

## Datasets & Configuration

To run real batch evaluation, you need the actual dataset images and annotations. **Do NOT commit large datasets to this repository.**

### 1. MS COCO (2014)
- **Images:** Download `val2014` from [cocodataset.org](https://cocodataset.org/) and extract to `data/coco/val2014`.
- **Annotations:** Download standard annotations `captions_val2014.json` or the Karpathy split `dataset_coco.json` and place in `data/coco/annotations/`.
- Ensure directory structure matches `backend/evaluation/datasets.py` (`MSCOCOAdapter`).

### 2. Flickr30K
- **Images:** Download `flickr30k-images` and place in `data/flickr30k/flickr30k-images`.
- **Annotations:** Place `results_20130124.token` in `data/flickr30k/`.

### 3. Custom JSON
- Create a `test_dataset.json` in the root directory.
- Format: `[{"id": "img1", "path": "path/to/img.jpg", "references": ["ref1", "ref2"]}]`.

---

## Quick Start

### Step 1 – Create a virtual environment

This project's Python is managed by **uv** (detected on your machine):

```bash
uv venv .venv
.venv\Scripts\Activate.ps1
```

### Step 2 – Install dependencies

```bash
uv pip install fastapi "uvicorn[standard]" python-multipart pillow numpy httpx
uv pip install torch transformers
uv pip install nltk rouge-score pycocoevalcap
```

*Note: `pycocoevalcap` is required for CIDEr and METEOR metrics. `nltk` is required for BLEU. `rouge-score` is required for ROUGE-L.*

### Step 3 – Start the backend

```bash
.venv\Scripts\uvicorn.exe backend.main:app --port 8000
```

### Step 4 – Open the frontend

Open `frontend/index.html` directly in your browser.

---

## API Reference

### Evaluation Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/datasets` | `GET` | Returns configuration status for MS COCO, Flickr30K, and Custom datasets |
| `/api/evaluation/run` | `POST` | Start a background batch evaluation |
| `/api/evaluation/status` | `GET` | Get progress of a running evaluation job |
| `/api/evaluation/report` | `GET` | Get the final metrics report |
| `/api/evaluation/{id}/results` | `GET` | Get qualitative results (predictions vs ground truth) |
| `/api/evaluation/{id}/errors` | `GET` | Get error diagnosis analysis |

---

## Current Limitations

| Limitation | Status |
|---|---|
| Knowledge base | ⏳ Not built (Phase 3) |
| FAISS index | ⏳ Not built (Phase 3) |
| Fine-tuned decoder | ⏳ Not trained (Phase 3) |
| Caption quality | 📉 Limited to pretrained ViT-GPT2 weights |
| No fake/hard-coded results | ✅ Guaranteed – Missing ground truth results in `null` / `—` |

---
