# Báo Cáo Sửa Lỗi Chế Độ Sáng/Tối (Dark/Light Mode) & Tràn Bố Cục (Responsive Overflow)

**Dự án:** RAIC (Retrieval-Augmented Image Captioning) Research Dashboard  
**Workspace:** `D:\Fontend\webapp`  
**Công nghệ:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React  
**Ngày hoàn thành:** 2026-10-12  

---

## 1. Nguyên Nhân Gốc Rễ Đã Xác Định (Root Causes)

### A. Vấn đề Chế độ Sáng / Tối (Dark/Light Mode)
1. **Thiếu cấu hình Selector cho Tailwind CSS v4:**  
   Trong Tailwind CSS v4, cấu hình biến thể `dark:` mặc định sử dụng Media Query hệ thống (`prefers-color-scheme`). Khi ứng dụng gán class `.dark` vào thẻ `<html>`, Tailwind v4 không kích hoạt các lớp `dark:` trừ khi được khai báo chỉ thị:
   ```css
   @custom-variant dark (&:where(.dark, .dark *));
   ```
   Do đó, khi người dùng click nút chuyển đổi chế độ, toàn bộ giao diện không phản hồi theo class `.dark`.
2. **Mã màu hex tối cố định (`dark:bg-[#101722]`, `dark:bg-[#090d15]`):**  
   Một số thành phần như `ModelArchitectureExplorer`, `ErrorAnalysisView`, `RetrievalInspector` sử dụng màu hex không đồng nhất hoặc gây xung đột độ tương phản.
3. **Nút bấm Theme Toggle chưa tối ưu:**  
   Thiếu nhãn `title` rõ ràng (Light Mode / Dark Mode), hiệu ứng tương tác chưa tinh tế, kích thước nút chưa đảm bảo touch target.

### B. Vấn đề Tràn Bố Cục Ngang (Horizontal Overflow)
1. **Header Navigation trên màn hình nhỏ/vừa (<1280px):**  
   Thanh điều hướng có tới 8 tab nghiên cứu cùng hàng loạt nút chức năng (`VI/EN`, `Defense Deck`, `API Mode`, `Reset`, `Theme Toggle`). Khi xem ở độ rộng 375px - 1024px, danh sách này làm vỡ bố cục hoặc ép co cụm nội dung.
2. **Thiếu `min-w-0` trong CSS Grid & Flex Children:**  
   Các thẻ lưới như `grid-cols-12` trong `ResultDashboard`, `RetrievalInspector`, `ErrorAnalysisView` không có thuộc tính `min-w-0`, khiến các chuỗi văn bản dài hoặc bảng dữ liệu đẩy bung kích thước container vượt quá viewport.
3. **Bảng Rerank trong `RetrievalInspector`:**  
   Bảng phân tích 20 ứng viên FAISS gồm 4 cột (Rerank #, Candidate Caption, Movement, Rerank Score) khi hiển thị trên mobile (375px - 768px) gây chật chội nếu không có vùng cuộn ngang cục bộ (`overflow-x-auto min-w-[480px]`).

---

## 2. Các Tệp Mã Nguồn Đã Chỉnh Sửa

| Tệp | Thay đổi chính |
| :--- | :--- |
| `src/index.css` | Thêm `@custom-variant dark (&:where(.dark, .dark *));`, cấu hình `html.dark`, thiết lập màu nền/màu chữ mặc định chuẩn mực cho cả Light (`#f8fafc` / `#0f172a`) và Dark Mode (`#090d15` / `#f8fafc`), tùy biến thanh cuộn mảnh tinh tế (`::-webkit-scrollbar`). |
| `src/App.tsx` | Đổi nền gốc sang `bg-slate-50 dark:bg-slate-950 transition-colors duration-200`, thêm `min-w-0` và padding co giãn `px-3 sm:px-6` cho `main` container. |
| `src/components/AppHeader.tsx` | Thiết kế lại Theme Toggle: Nút vuông bo tròn thanh lịch 32x32px với icon Mặt trời (Sun vàng amber) khi ở Dark mode và Mặt trăng (Moon xám slate) khi ở Light mode, có tooltip trực quan và accessible `aria-label`. Thêm thanh điều hướng phụ cuộn ngang mượt mà cho mobile/tablet (`lg:hidden`). |
| `src/components/ResultDashboard.tsx` | Bổ sung `min-w-0` cho các cột grid 5/7, bọc text với `break-words`, đảm bảo các token click và bảng FAISS không tràn màn hình. |
| `src/components/RetrievalInspector.tsx` | Thay thế màu cứng `#101722` bằng `slate-900`/`slate-850`, bọc bảng ứng viên trong container có cuộn ngang cục bộ `overflow-x-auto min-w-[480px]`. |
| `src/components/ModelArchitectureExplorer.tsx` | Chuẩn hóa các card về bảng màu `bg-white dark:bg-slate-900`, thêm `min-w-0` cho toàn bộ các khối sơ đồ kiến trúc và bảng đánh giá định lượng. |
| `src/components/ErrorAnalysisView.tsx` | Chuẩn hóa card về `dark:bg-slate-900`, thêm `min-w-0` cho danh sách case studies và viewer chi tiết. |
| `src/components/PresentationMode.tsx` | Chuẩn hóa nền modal thành `bg-slate-950`, bảo toàn tính responsive cho bảng so sánh chỉ số và 5 slide thuyết trình. |

---

## 3. Kiểm Thử Đa Độ Phân Giải (Responsive Viewports Tested)

Tất cả các độ phân giải đều được kiểm tra kỹ lưỡng:

- **375px (Mobile — iPhone / Small Screen):**
  - Header thu gọn logo và toolbar, hiển thị thanh tab cuộn ngang mềm mại bên dưới.
  - Không có hiện tượng thanh cuộn ngang toàn trang (no page-level horizontal scrollbar).
  - Vùng kéo thả ảnh, các thẻ so sánh Level 1 vs Level 4 hiển thị xếp dọc gọn gàng.
- **768px (Tablet — iPad / Medium Screen):**
  - Grid 2 cột tự cân chỉnh, các thẻ chỉ số và dải thông tin metadata hiển thị thoáng đãng.
- **1024px (Small Desktop):**
  - Thanh tab điều hướng hiển thị đầy đủ, bố cục cân đối giữa hình ảnh và vùng token attribution.
- **1440px (Desktop):**
  - Bố cục tối ưu, tận dụng tối đa `max-w-7xl` với lề cách đều chuẩn mực.
- **1920px (Large Desktop):**
  - Hiển thị sắc nét, căn giữa hoàn hảo, không bị vỡ tỷ lệ.

---

## 4. Xác Minh Chất Lượng (Quality Verification)

- **TypeScript compilation & Vite bundle build:**
  ```bash
  npm run build
  # Kết quả: Exit code 0, 1855 modules transformed, 0 errors.
  ```
- **Lint check:**
  ```bash
  npm run lint
  # Kết quả: Exit code 0, 0 warnings, 0 errors trên 29 files.
  ```
- **Hành vi Theme Switching:**
  - Nhấp vào nút Theme Toggle: Giao diện chuyển đổi tức thì giữa Light Mode (nền trắng sáng dịu, chữ xám đen dễ đọc) và Dark Mode (nền tối sâu thẳm, dịu mắt, độ tương phản cao).
  - Trạng thái theme được lưu bền vững trong `localStorage('raic_theme')` và không làm mất dữ liệu ảnh đã tải lên hay ngôn ngữ đã chọn.
