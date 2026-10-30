# RAIC Phase 1 Artifact: Premium Research Dashboard & Studio

## 1. Executive Summary & Objective

This artifact documents the comprehensive architectural transformation of the **Retrieval-Augmented Image Captioning (RAIC)** web application into a **production-grade, research-caliber AI dashboard**.

The application demonstrates how visual representations from a CLIP vision backbone can be augmented with external knowledge retrieved from a dual-source knowledge base (FAISS training captions + ConceptNet 5.8 semantic triples) and dynamically fused via a Gated Cross-Attention Transformer Decoder.

All UI components adhere strictly to scientific research standards:
- Clear visual hierarchy with dark/light mode tokens.
- Explicit labeling of simulated vs. empirical benchmark data.
- Strict token-level explainability linking raw gate scalars ($\gamma$) to visual attention and semantic triples.
- Complete 8-configuration ablation study and hallucination reduction analysis (CHAIR-s / CHAIR-i).

---

## 2. Component Architecture & File Directory

```text
D:\Fontend\webapp/
├── src/
│   ├── types/
│   │   └── index.ts                 # Complete research data contracts (AnalysisResult, ModelEvaluation, etc.)
│   ├── services/
│   │   ├── mock_api.ts              # Scientific mock generator (sample benchmark images & Karpathy outputs)
│   │   ├── apiClient.ts            # Dynamic API client with instant Mock/FastAPI backend toggle
│   │   ├── historyService.ts       # LocalStorage persistence for analysis audit log
│   │   └── exportService.ts        # Research export utilities (JSON, CSV, Clipboard)
│   ├── components/
│   │   ├── AppHeader.tsx            # Sticky navigation bar with tabs, theme switcher & API mode toggle
│   │   ├── ImageUploader.tsx        # Drag & drop upload, validation, and sample benchmark image selector
│   │   ├── ProcessingPipeline.tsx   # Real-time multi-stage pipeline state visualizer (6 stages)
│   │   ├── ImageViewer.tsx          # Multi-mode image stage (Original, Attention Heatmap, Entity Bounding Boxes)
│   │   ├── ResultDashboard.tsx      # Split-screen result analyzer, clickable token flow & baseline comparison
│   │   ├── ExplainabilityPanel.tsx  # Dual visual/knowledge gauge, gate scalar & ConceptNet attribution
│   │   ├── RetrievalInspector.tsx   # Dual tabbed FAISS captions + ConceptNet triples + Dynamic filter diagnostics
│   │   ├── ModelEvaluation.tsx      # Research benchmark comparison (BLEU, ROUGE, METEOR, CIDEr, SPICE, CLIPScore, CHAIR)
│   │   ├── AblationStudyDashboard.tsx # 8-configuration ablation matrix with metric selector & baseline diff
│   │   ├── AnalysisHistoryView.tsx  # Persisted inference history with search and deletion
│   │   └── SettingsPanel.tsx        # Hyperparameter sliders (threshold tau, top-k) & backend endpoint config
│   ├── App.tsx                      # Root coordinator with route tab state & theme persistence
│   ├── index.css                    # Tailwind CSS v4 design token styling
│   └── main.tsx                     # React 19 application entry point
├── runs/
│   └── web_phase0_artifact.md       # Implementation and verification report
└── package.json                     # Scripts and dependencies
```

---

## 3. Implemented Capabilities & Highlights

### A. Navigation & Shell Experience
- **Tabbed Workspace:** Seamless switching between `Workspace`, `Explainability`, `Evaluation`, `Ablation`, `History`, and `Settings`.
- **Theme Token System:** Native Dark Mode (`#090D15`) and Light Mode (`#F7F9FC`) with instant toggle and localStorage persistence.
- **API Mode Switcher:** Dedicated button in header allowing live switching between offline `Mock Mode` and live `FastAPI Backend`.

### B. Image Ingestion & Input Verification
- **Drag-and-Drop & File Selection:** Supports `JPG`, `JPEG`, `PNG`, and `WEBP` up to 15MB.
- **Benchmark Presets:** Includes 3 pre-configured sample images (e.g. canine catching frisbee, astronaut on lunar surface, vintage library) for quick one-click demonstrations.
- **Client-Side Validation:** Clear error banners for unsupported MIME types or oversized files.

### C. 6-Stage Real-Time Pipeline Visualizer
Sequentially visualizes the core RAIC pipeline stages with animated progress indicators:
1. `Image Encoding` (CLIP ViT-B/32 dense feature extraction)
2. `Object Detection` (Salient bounding box and entity groundings)
3. `Caption Retrieval` (FAISS cosine vector search over training set)
4. `Commonsense Retrieval` (ConceptNet 5.8 semantic relation triples)
5. `Dynamic Filtering` (Cosine similarity cut-off filter $\tau = 0.75$)
6. `Caption Generation` (Gated Multi-Modal Cross-Attention decoding)

### D. Multi-Mode Interactive Image Stage
- **Original View:** High-resolution display of input image with zoom controls (75% to 250%), reset, and fullscreen modal.
- **Attention Map Mode:** Dynamic radial/grid overlay synchronizing with the currently selected token.
- **Entity Detection Mode:** Clickable bounding boxes with label and confidence percentages.

### E. Gated Token-Level Explainability
- Each word in the generated caption is an interactive token.
- Clicking a token dynamically updates the **Gated Fusion Ratio**:
  - Raw gate scalar $\gamma$ displayed with dual visual/knowledge colored gauge.
  - Directional logic: Gate $\gamma > 0.65$ indicates Visual Dominance; $\gamma < 0.35$ indicates Knowledge Dominance; intermediate values indicate Dual Balance.
  - Linked ConceptNet triples filtered specifically for the active token.

### F. Dual-Knowledge Retrieval Inspector
- **Visual Captions Tab:** Displays Top-K captions retrieved from FAISS with similarity score bar, rank, and source dataset index.
- **Commonsense Triples Tab:** Displays ConceptNet relation triples (`entity -> relation -> target`) with status tags (`Accepted` vs `Filtered`) and confidence.
- **Dynamic Filtering Diagnostics:** Quantitative summary of total candidates, admitted triples, and pruned distractor count.

### G. Quantitative Model Evaluation Dashboard
- **Standard Metrics:** BLEU-4, ROUGE-L, METEOR, CIDEr, SPICE, CLIPScore comparing Baseline vs. Proposed RAIC model.
- **Hallucination Resistance:** Explicit sentence-level (`CHAIR-s`) and instance-level (`CHAIR-i`) hallucination reduction metrics (labeled as *Lower is better*).
- **Academic Transparency:** Disclaimer badge explicitly distinguishing mock demonstration numbers from verified peer-reviewed publications.

### H. 8-Configuration Ablation Study Matrix
Interactive dashboard covering all 8 ablation configurations:
1. `Baseline` (Vanilla CLIP + Transformer)
2. `+ Retrieval Type A` (Caption Retrieval via FAISS)
3. `+ Retrieval Type A + B` (Captions + ConceptNet Commonsense Triples)
4. `+ Dynamic Thresholding` (Cosine threshold $\tau=0.75$)
5. `+ Gated Fusion Mechanism` (Sigmoid cross-attention gating)
6. `+ Gated Fusion + L_CHAIR` (Full proposed RAIC with Hallucination Penalty)
7. `Full Model + Wrong Top-K` (Stress test with adversarial/noisy knowledge)
8. `Latency Benchmark Profile` (Runtime overhead breakdown)
- Allows selecting metrics (`CIDEr`, `BLEU-4`, `SPICE`, `CLIPScore`, `CHAIR-s`, `Latency`) to dynamically recalculate relative performance bars and $\Delta$ from baseline.

### I. Analysis History & Audit Log
- Persists previous inference runs in `localStorage` without bloat (storing metadata and metrics).
- Supports real-time text search and one-click deletion or clearing.

### J. Scientific Export Utilities
- **Copy Text:** Formatted caption copied directly to clipboard.
- **JSON Export:** Downloads a complete analysis payload conforming to the RAIC schema.
- **CSV Export:** Generates a structured table of metrics, baseline comparisons, and directional indicators.

---

## 4. API Contract & Backend Integration Guide

The frontend communicates through `src/services/apiClient.ts`. To connect a real backend:

1. Launch your Python server (FastAPI, Flask, etc.) at `http://localhost:8000`.
2. Ensure the server implements `POST /api/v1/caption` accepting `multipart/form-data` with `file: UploadFile`.
3. The server response must return a JSON object conforming to `AnalysisResult`:
   ```json
   {
     "id": "raic-exp-12345",
     "timestamp": "2026-10-12T14:00:00Z",
     "image_url": "https://storage.url/image.jpg",
     "image_name": "sample.jpg",
     "caption": "A golden retriever leaps to catch a flying red disc in a grassy open park.",
     "baseline_caption": "A dog jumping in the park with a toy.",
     "tokens": [
       {
         "index": 0,
         "text": "A",
         "gate": 0.88,
         "visual_attention": 0.72,
         "knowledge_attention": 0.15,
         "token_confidence": 0.99
       }
     ],
     "detected_objects": [
       {
         "id": "o1",
         "label": "dog",
         "confidence": 0.96,
         "bbox": { "x": 0.25, "y": 0.28, "width": 0.38, "height": 0.48 }
       }
     ],
     "retrieved_captions": [
       { "id": "c1", "rank": 1, "caption": "...", "similarity": 0.924, "source": "COCO" }
     ],
     "commonsense_knowledge": [
       {
         "id": "k1",
         "entity": "dog",
         "relation": "CapableOf",
         "target": "catch objects",
         "confidence": 0.94,
         "source": "ConceptNet",
         "status": "accepted"
       }
     ],
     "filtering_config": {
       "threshold": 0.75,
       "total_candidates": 12,
       "accepted_count": 3,
       "rejected_count": 9
     },
     "evaluation": { ... },
     "metadata": { ... }
   }
   ```
4. In the Web UI, open the **Settings** tab and toggle the mode to **FastAPI Backend**, or configure `VITE_API_MODE=real` in `.env`.

---

## 5. Verification & Test Execution

- **Build Verification:**
  ```bash
  npm run build
  ```
  *Result:* Passed with zero compilation errors (`tsc -b && vite build` completed in ~438ms).
- **Linter Verification:**
  ```bash
  npm run lint
  ```
  *Result:* Passed with 0 errors across all 19 project files.
- **Bundle Outputs:**
  - `dist/index.html`: 0.45 kB
  - `dist/assets/index-BFRjtmE_.css`: 49.12 kB (Tailwind CSS v4 tokens)
  - `dist/assets/index-CBajBuPd.js`: 290.76 kB (Full React application)
