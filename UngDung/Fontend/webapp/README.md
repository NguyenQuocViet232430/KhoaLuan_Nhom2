# RAIC — Chú thích ảnh

Frontend React + TypeScript + Vite. Giao diện gọi backend hiện có; không chứa model suy luận.

## Chạy trong Visual Studio Code

1. Mở thư mục webapp này bằng **File → Open Folder**.
2. Mở **Terminal → New Terminal**, chạy:

~~~powershell
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1 --port 5173
~~~

3. Mở http://127.0.0.1:5173. Backend FastAPI của dự án cần chạy ở port 8000.
4. Nếu frontend đang chạy, chỉ cần tải lại trang để nhận giao diện mới.

## Chạy từ Windows PowerShell

Mở PowerShell tại thư mục webapp rồi chạy cùng các lệnh bên trên.
Hướng dẫn khởi chạy cả backend và frontend vẫn nằm trong tài liệu chạy dự án ở thư mục UngDung.

## Chỉnh giao diện

- src/styles/tokens.css: màu sáng/tối, font, cỡ chữ, bo góc và khoảng cách.
- src/index.css: bố cục responsive và các thành phần dùng chung.
- src/components/AppHeader.tsx: sidebar hai nhóm, menu điện thoại, nút sáng/tối.
- src/components/ImageUploader.tsx: chọn hoặc kéo thả ảnh.
- src/components/ResultDashboard.tsx: ảnh, chú thích, năm caption tri thức và mục Chi tiết.
- src/components/ModelArchitectureExplorer.tsx: pipeline và công thức cổng.
- src/components/BenchmarkTable.tsx: bảng benchmark dùng chung với trang Đánh giá.

Đổi --color-accent và --color-accent-hover để đổi màu nhấn. Chỉnh --color-selected cùng tông.
Khi đổi màu, giữ tương phản chữ thường tối thiểu 4.5:1. Các biến màu của chế độ tối nằm trong :root.dark.
Chế độ mặc định là sáng; lựa chọn sáng/tối được ghi nhớ trong trình duyệt.

Giao diện dùng system-ui nếu máy chưa có Inter, không tải font từ dịch vụ bên ngoài.
Caption, điểm truy hồi, thời gian, giá trị cổng và JSON xuất ra lấy từ dữ liệu hiện có.
Điểm CLIP trong danh sách là cosine similarity (−1 đến 1), không đổi thành xác suất.
Các chỉ số benchmark lấy từ src/services/level5Research.ts; không dùng làm điểm cho ảnh upload.

## Kiểm tra mã

~~~powershell
npm.cmd run lint
npm.cmd run build
node --test tests/responseValidator.test.mjs
~~~

