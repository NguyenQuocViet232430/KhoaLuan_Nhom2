# RAIC — Vietnamese Typography, Tokenization & i18n Fix Report

## 1. Root Cause Analysis
1. **Untranslated i18n Keys:**
   - Keys such as `dashboard.fullComparison`, `dashboard.clickToInspect`, `dashboard.selected`, `dashboard.salientEntities`, `dashboard.groundings`, `dashboard.tokenSelection`, `dashboard.baselineTitle`, `dashboard.raicTitle`, `dashboard.inferenceLatency`, `dashboard.vsBaseline`, `dashboard.exportJson`, `dashboard.exportCsv`, `dashboard.copied`, and `dashboard.copyCaption` were defined under mismatched names in `src/i18n/locales/vi.ts` and `en.ts` (e.g., `btnExportJson` vs `exportJson`, `tokenSelected` vs `selected`).
   - Similarly, in `ExplainabilityPanel`, keys `explainability.clickTokenPrompt`, `explainability.token`, `explainability.visualDominant`, `explainability.knowledgeDominant`, `explainability.balanced`, `explainability.gateValue`, `explainability.visualFeatures`, `explainability.candidateText`, and `explainability.activeKnowledge` were missing.

2. **Vietnamese Caption Typography & Diacritics:**
   - The caption cards and interactive token container utilized `font-serif` on Windows browsers, which triggered system serif fallbacks (Times New Roman / Batang) with poor OpenType composite diacritic metrics for Vietnamese vowels (`ở`, `ượ`, `ệ`, `ắ`), resulting in broken spacing, clipping, and irregular kerning.
   - The original AI model evaluates on MS COCO and outputs English captions with autoregressive token gates $\gamma_t$. Attempting to map English token indices directly onto Vietnamese words caused misaligned token gates.

## 2. Solutions Implemented
1. **Full Localization Synchronization (`vi.ts` & `en.ts`):**
   - Added all missing keys across `dashboard` and `explainability` dictionaries in both Vietnamese and English locales.
   - Guaranteed 100% key parity with zero untranslated `dashboard.*` or `explainability.*` strings displayed to the user.

2. **Accurate Bilingual Caption & Token Architecture:**
   - Added `baseline_caption_vi`, `level2_caption_vi`, `level3_caption_vi`, and `raic_caption_vi` to `AnalysisResult` and mock samples (`SAMPLE_1_DATA`, `SAMPLE_2_DATA`, `SAMPLE_3_DATA`).
   - All Vietnamese sentences are normalized with Unicode NFC and checked for natural phrasing.
   - When the user switches to Vietnamese mode:
     - The caption cards display the clean, fluent Vietnamese caption, along with a secondary badge indicating the original English model output.
     - The Token Selection & Gated Attribution panel renders the original model token flow with an explicit academic notice explaining that the gate scalars $\gamma_t$ reflect the Transformer decoder activations evaluated on MS COCO.

3. **Typography & Styling Refinements:**
   - Replaced `font-serif` with modern `font-sans` (`Inter` / system-ui sans-serif), `font-medium`, and `leading-relaxed` across `ResultDashboard.tsx`, `ExplainabilityPanel.tsx`, and `BaselineComparisonView.tsx`.
   - Token pills feature clean pill borders, comfortable padding, and crisp diacritic rendering.

## 3. Verification & Quality Assurance
- **TypeScript build:** `tsc -b && vite build` completed in 455ms with 0 errors.
- **Linter check:** `oxlint` completed on 29 files with 0 warnings and 0 errors.
