# Kiểm chứng tích hợp Level 5A — 13/10/2026

- Python: **25 passed**, không skip; trên môi trường triển khai mới, 4,38 giây (một cảnh báo deprecation của TestClient).
- Frontend response validator: **2 passed**.
- `npm.cmd run build`: thành công (TypeScript + Vite 8.2.2).
- PowerShell parser: cả 4 script setup, setup RelTR, start và stop không có lỗi cú pháp. Danh tính PID/thời điểm khởi tạo của hai server đã đối chiếu khớp file state.
- npm audit: **0 vulnerabilities** sau khi cập nhật bản vá source-map-js.
- Downloader CLI `--help`: chạy thành công.

Test model so sánh trực tiếp logits và gate với mã huấn luyện local `lv6/_shared/l5a_source_review/baseline_level5/lv5_A/multiseed_5tokens_v1/level5_model.py`, cùng trọng số, input và chế độ eval; `rtol=0`, `atol=0`. Kiểm tra FAISS/MMR dùng ma trận tổng hợp 60 hàng và đối chiếu MMR với module gốc. HTTP test dùng FastAPI lifespan/TestClient, có upload PNG, chuyển RGB, schema 5 item, CORS và mã lỗi 400/413/422/503. Model và encoder tổng hợp chỉ xuất hiện trong test, không phải fallback của ứng dụng.

Môi trường triển khai/kiểm thử hiện tại: `.venv-level5`, Python 3.12.14, PyTorch 2.6.0+cu124, torchvision 0.21.0+cu124, FAISS 1.15.1, NumPy 2.5.2, FastAPI 0.143.0, pytest 9.1.1, httpx 0.28.1; GPU RTX 3050 Laptop 4 GB. Bộ test trước đó cũng đạt trên Python 3.9/torch CPU. Thư mục phụ thuộc kiểm thử tạm `.test-deps` đã được dọn theo yêu cầu người dùng; môi trường `.venv-level5` là môi trường thực sự chạy ứng dụng. Kiểm thử HTTP chạy ngoài sandbox vì Windows asyncio socketpair bị chặn trong sandbox.

Đã tải 4 tài nguyên thật từ Drive vào `models/level5/` cùng cấu hình và kết quả đánh giá gốc. Checkpoint nạp `strict=True`, xác nhận Seed 46, native 5-token, d_model=256, 3 lớp, 8 heads và vocab 16.214 từ. Hash tensor khớp bằng chứng huấn luyện/kết quả test; hash vocab, embedding, mapping khớp run manifest. Toàn bộ 566.747 embedding hợp lệ, được nạp vào IndexFlatIP và truy vấn trả đúng 5 caption (query kiểm tra lấy từ một embedding trong kho, chưa phải ảnh thật).

Kết quả lưu trên Drive: CIDEr 111,362042; BLEU-4 34,846706. Cấu hình được chọn trên validation: hybrid CLIP w=0,6; MMR lambda_param=0,7. Backend đã hỗ trợ đọc cấu hình này và kiểm tra hash tensor trước khi áp dụng. Chi tiết kiểm chứng: `models/level5/results/local_verification.json`; dữ liệu nguồn: `test_summary.json`, `final_config.json`, `run_manifest.json`, `five_seed_summary.json` cùng thư mục.

Đã xác nhận inference đầu-cuối trên ảnh thật `vg5.jpg`: HTTP 200, device cuda:0, 50 ứng viên → đúng 5 caption → beam search. Kiểm tra cả fallback CLIP + MMR và bản đầy đủ RelTR + WordNet. Bản đầy đủ phát hiện 9 nhãn thực thể, có semantic reranking, `fallback=false`, không có warning; cổng tri thức toàn ảnh khoảng 0,3738. Caption cuối: “a food truck is parked in a parking lot”. Lần gọi API đầu tiên của bản đầy đủ mất khoảng 3,83 giây; lần chạy qua dashboard sau khi warmup hiển thị 588 ms. Đây là thời gian của một ảnh, chưa phải benchmark latency.

Backend và frontend đã khởi động bằng script trên port 8000/5173. Trình duyệt xác nhận LIVE đã kết nối, upload ảnh và hiển thị caption thật, 9 nhãn RelTR, bảng truy hồi 5 caption và cổng chung cho ảnh. Attention/bounding box không được trả về nên các nút tương ứng bị vô hiệu hóa. Ảnh kiểm chứng được lưu trong `models/level5/results/dashboard_verified.jpg`; phản hồi API thật nằm trong `inference_smoke_test_full.json` cùng thư mục. Chưa chạy lại benchmark chất lượng trên toàn bộ COCO hoặc đo tốc độ CPU/GPU có tính thống kê.

Đã dọn theo phạm vi người dùng xác nhận: `.ppt_build`, `.codex-finalizer`, `word_tuan12_work`, `.test-deps` và cache Python của ứng dụng; 3.468 tệp, 89.990.112 byte. Junction trong `.ppt_build` được gỡ riêng trước khi xóa thư mục. File RelTR tải tạm 766.101.625 byte cũng đã dọn sau khi xuất bản inference giữ nguyên tensor model.
