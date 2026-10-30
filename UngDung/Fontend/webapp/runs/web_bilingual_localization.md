# Báo Cáo Triển Khai Đa Ngôn Ngữ Song Ngữ (Bilingual Localization VI / EN)
**Dự án:** RAIC (Retrieval-Augmented Image Captioning) Research Dashboard  
**Workspace:** `D:\Fontend\webapp`  
**Ngày hoàn thành:** 2026-10-12  

---

## 1. Mục Tiêu & Kiến Trúc Quốc Tế Hóa (i18n)

Hệ thống đã được tích hợp kiến trúc bản địa hóa song ngữ hoàn chỉnh (**Tiếng Việt (VI)** và **English (EN)**) dựa trên nền tảng `i18next` và `react-i18next`:
- **Thư mục cấu hình:** `src/i18n/`
  - `src/i18n/index.ts`: Khởi tạo i18next instance, đồng bộ ngôn ngữ mặc định từ `localStorage.getItem('raic_lang') || 'vi'`. Cung cấp helper `changeAppLanguage(lang: 'vi' | 'en')`.
  - `src/i18n/locales/vi.ts`: Bộ từ điển dịch tiếng Việt đầy đủ cho mọi module.
  - `src/i18n/locales/en.ts`: Bộ từ điển tiếng Anh học thuật chuẩn mực tương ứng.
- **Mặc định:** Giao diện tự động tải **Tiếng Việt (`vi`)** cho người dùng lần đầu, và ghi nhớ lựa chọn vào `localStorage`.

---

## 2. Bảo Toàn Thuật Ngữ Học Thuật & Tính Toàn Vẹn AI

1. **Bảo tồn thuật ngữ AI cốt lõi:**
   - Các từ khóa học thuật được giữ nguyên dạng chuẩn: `CLIP`, `FAISS`, `Transformer`, `CIDEr`, `BLEU`, `ROUGE-L`, `METEOR`, `SPICE`, `CHAIR`, `RAG`, `Confidence-aware Gated Fusion`, `Cosine Similarity`, `IoU`.
   - Phần giải thích bên cạnh được dịch tự nhiên, chuẩn phong cách báo cáo học thuật đồ án tốt nghiệp.
2. **Tách biệt Ngôn ngữ Giao diện & Caption sinh từ Model:**
   - Model AI được huấn luyện trên tập dữ liệu học thuật **MS COCO**, do đó các chuỗi caption sinh ra (Level 1 Baseline, Level 2 RAG, Level 3 Rerank, Level 4 Proposed RAIC) giữ nguyên tiếng Anh gốc chuẩn xác.
   - Toàn bộ nhãn so sánh, chỉ số metric, tiêu đề, hướng dẫn tương tác, thanh công cụ và ghi chú giải thích được chuyển đổi mượt mà theo ngôn ngữ UI được chọn.

---

## 3. Các Thành Phần Giao Diện Đã Bản Địa Hóa

| Thành phần | Đường dẫn | Trạng thái |
| :--- | :--- | :--- |
| **Header Toolbar & Language Switcher** | `src/components/AppHeader.tsx` | Nút chuyển đổi VI / EN dạng pill gọn gàng, dịch tất cả 8 tab điều hướng, Phase badge, Defense Deck, New Analysis, API Mode |
| **Workspace & Image Uploader** | `src/components/ImageUploader.tsx` | Hero title, subtitle, drag-and-drop, browse button, validation alerts, sample images |
| **Processing Pipeline** | `src/components/ProcessingPipeline.tsx` | Tiêu đề pipeline, trạng thái (Running, Completed, Cancelled), 5 giai đoạn xử lý |
| **Result Dashboard** | `src/components/ResultDashboard.tsx` | Experiment ID, latency, export JSON/CSV, thẻ Level 1 vs Level 4, visual groundings, token selection prompt |
| **Baseline vs RAIC Comparison** | `src/components/BaselineComparisonView.tsx` | Tiêu đề so sánh, toggle "Level 1 vs Level 4" / "All 4 Levels Progression", bằng chứng FAISS, chú thích 4 cấp độ |
| **Architecture Explorer** | `src/components/ModelArchitectureExplorer.tsx` | Tiêu đề, subtitle, cấu trúc 4 cấp độ, công thức toán học, điểm mạnh & hạn chế |
| **Retrieval Inspector** | `src/components/RetrievalInspector.tsx` | Thống kê Top-20 / Admitted Top-K, bộ lọc All/Admitted/Pruned, tìm kiếm candidate, bảng so sánh rank movement |
| **Explainability Panel** | `src/components/ExplainabilityPanel.tsx` | Trọng số cổng gate scalar (&gamma;), tỷ lệ phân bổ đặc trưng thị giác vs tri thức văn bản, thẻ context grounding |
| **Model Evaluation** | `src/components/ModelEvaluation.tsx` | Tiêu đề corpus evaluation, nút import JSON, metadata ribbon (Dataset, Split, Versions), bảng metric consensus |
| **Ablation Study Dashboard** | `src/components/AblationStudyDashboard.tsx` | Tiêu đề nghiên cứu ablation 4 level, mô tả mục tiêu metric, thẻ chi tiết cấu hình |
| **Qualitative Case Studies** | `src/components/ErrorAnalysisView.tsx` | Tiêu đề case studies, bộ lọc categories (All, Specificity, Distractor, Rerank) |
| **Defense Deck (Presentation)** | `src/components/PresentationMode.tsx` | Tiêu đề slide deck, chỉ số slide, nút Exit, Previous, Next, phím tắt điều hướng |
| **Analysis History** | `src/components/AnalysisHistoryView.tsx` | Tiêu đề audit lịch sử, nút xóa lịch sử, ô tìm kiếm, empty state |
| **Settings Panel** | `src/components/SettingsPanel.tsx` | Tiêu đề cấu hình, ping status, mock vs real description, FAISS hyperparameters slider |

---

## 4. Kiểm Thử & Xác Nhận Chất Lượng

- **Kiểm thử biên dịch TypeScript & Vite:**
  - Lệnh: `npm run build`
  - Kết quả: **Thành công 100% (0 errors)**, tạo bundle `dist/` tối ưu.
- **Tính thẩm mỹ & Tương thích giao diện:**
  - Không bị tràn layout (no overflow) với các chuỗi tiếng Việt dài hơn.
  - Hoạt động mượt mà ở cả 2 chế độ **Dark Theme** và **Light Theme**.
  - Lưu trữ trạng thái ngôn ngữ bền vững (`localStorage`).
