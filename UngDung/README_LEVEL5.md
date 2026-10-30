# Level 5A — HUIT, Nhóm 02

Ứng dụng sử dụng checkpoint **Seed 46, native 5-token**. Mã đã được nối vào backend hiện có ở `Fontend/image-captioning-baseline`; frontend là `Fontend/webapp`.

**Cập nhật 13/10/2026:** đã tải checkpoint, vocab, embedding và bảng caption từ Drive vào `models/level5/` (khoảng 1,48 GB). Đã xác minh hash với dữ liệu huấn luyện, nạp checkpoint bằng `strict=True`, dựng FAISS đủ 566.747 dòng. Đã cài `.venv-level5` Python 3.12, torch 2.6.0+cu124; backend 8000 và frontend 5173 chạy trên máy RTX 3050. Đã kiểm thử ảnh thật qua API với CLIP, RelTR, WordNet, hybrid/MMR và beam search; `fallback=false`, trả đúng 5 caption tri thức. Kết quả gốc và kiểm chứng local nằm trong `models/level5/results/`.

Để khởi động lại trên máy hiện tại, chỉ cần chạy trong `UngDung`:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\stop-level5.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-level5.ps1 -Device cuda:0
```

Mở `http://localhost:5173`. Không cần cài lại hoặc tải lại model cho mỗi lần chạy. Hướng dẫn cài mới bên dưới dành cho máy khác; môi trường Python hiện tại dựa trên runtime Python 3.12 của Codex và cần tạo lại nếu chuyển thư mục sang máy khác.

## 1. Kiến trúc đã xác nhận

Notebook `lv5/Binh/Moi/Buoi10_Level5A_5Tokens_Train5Seeds_46.ipynb` gọi mã `multiseed_5tokens_v1`. Bản mã huấn luyện có trong dự án tại `lv6/_shared/l5a_source_review/baseline_level5/lv5_A/multiseed_5tokens_v1/level5_model.py` xác nhận:

| Thành phần | Cấu hình dùng trong ứng dụng |
|---|---|
| Encoder | OpenAI CLIP ViT-B/32 đóng băng, đặc trưng 512 chiều, chuẩn hóa L2 |
| Tri thức | 566.747 caption COCO train/restval, không nối thêm chuỗi SPO |
| Truy hồi | FAISS IndexFlatIP, top 50 |
| Tái xếp hạng | 0,6 × CLIP + 0,4 × Jaccard với nhãn mở rộng WordNet |
| Chuẩn hóa điểm | Min–max trên 50 ứng viên; điểm đồng nhất được đặt bằng 1, theo mã train |
| MMR | 0,7 × relevance − 0,3 × độ tương đồng lớn nhất với các câu đã chọn; theo `results/final_config.json` của Seed 46 |
| Bộ nhớ | Đúng 5 caption → 5 token; `Linear(512,256)` |
| Decoder | **3 layers, 8 heads, d_model=256, FFN=1024**, positional embedding dài 30 |
| Cổng | Một scalar chung cho ảnh, `sigmoid(Linear(1025,1))`; pooling 5 embedding theo softmax điểm |
| Dung hợp | Trong từng lớp: `context = (1-g)*context_visual + g*context_knowledge` |
| Giải mã demo | Beam size 3, length penalty 0,6, tối đa 30 token (đồng bộ hoàn toàn với cấu hình benchmark) |

**Người dùng đã chọn giữ nguyên kiến trúc checkpoint.** Vì vậy không thay thành decoder 512 chiều/4 lớp: trọng số đã huấn luyện không tương thích với kiến trúc đó. `metadata.gate_score` là trọng số **nhánh tri thức**, được lặp lại ở 5 item vì cổng có phạm vi toàn ảnh; không phải 5 cổng riêng hay attention từng từ.

`initial_caption` là beam search với `g=0` trên **cùng checkpoint Level 5A**. Nó không phải kết quả của một checkpoint baseline Level 1 độc lập. `final_caption` dùng cổng học được; `caption` bằng `final_caption`.

Tệp `results/test_summary.json` tải từ [thư mục Seed 46 trên Drive](https://drive.google.com/drive/folders/1Ays7jb7w1tcg6J2fzq5XpMLcAMb39DFI) ghi **CIDEr 111,3620 / BLEU-4 34,8467**, hơi khác con số 111,40 / 34,83 được cung cấp ban đầu. Đây là điểm benchmark đã lưu, không phải điểm tính cho ảnh upload. `final_config.json` ghi trọng số hybrid CLIP `w=0.6` và MMR `lambda_param=0.7`, được chọn trên validation. Backend kiểm tra cấu hình thuộc đúng seed, kiến trúc và hash tensor checkpoint rồi sử dụng các giá trị này; khi không có tệp cấu hình mới dùng mặc định 0,6/0,6 của yêu cầu ban đầu.

Mã demo sử dụng `max_len=30` (gồm BOS và 29 token sinh ra) đồng bộ hoàn toàn với mã đánh giá benchmark gốc. Tập synonym được cắt theo thứ tự ổn định để tránh phụ thuộc hash seed của Python; có thể khác cách cắt từ `set` trong mã cũ.

## 2. Bốn tệp cần tải từ Drive

| Khóa trong manifest | Tệp local | Nguồn trong DataKhoaLuan/Data |
|---|---|---|
| `checkpoint` | `best_model.pt` | `baseline_level5/lv5_A/trained_5tokens_v1/seed46/best_model.pt` |
| `vocab` | `vocab.json` | `baseline_level1/vocab.json` hoặc bản vocab được notebook sử dụng |
| `embeddings` | `text_embeddings_train_restval.npy` | `knowledge_base_level1_karpathy/` |
| `mapping` | `text_embedding_mapping.jsonl` | Cùng thư mục và cùng lần tạo với embeddings |

Kho tri thức cần **cả embedding và bảng caption**; một file chỉ chứa câu văn hoặc chỉ chứa FAISS index là chưa đủ. Backend dựng lại IndexFlatIP từ ma trận embedding để bảo đảm thứ tự hàng nhất quán, không phải tải thêm index cũ. Embedding cần `(566747,512)`, L2-normalized. Mỗi dòng JSONL có dạng:

```json
{"row_id": 0, "image_id": 123, "split": "train", "caption": "a person riding a surfboard on a wave"}
```

`row_id` phải trùng số thứ tự dòng, bắt đầu từ 0; `split` chỉ là `train` hoặc `restval`. Dùng đúng vocab huấn luyện (`{"stoi":{"<PAD>":0,"<BOS>":1,...}}`); không tự tạo lại vocab dù số lượng từ giống nhau.

Lấy File ID: mở từng **tệp** trên Drive → Share/Chia sẻ → Copy link/Sao chép đường liên kết. Ví dụ `https://drive.google.com/file/d/ABC123xyz/view?usp=sharing` thì ID là phần `ABC123xyz` giữa `/d/` và `/view`. Với link `...open?id=ABC123xyz`, lấy giá trị sau `id=`. Script nhận cả ID và URL.

`gdown` tải tệp Drive có quyền truy cập qua link; với tệp của bạn có thể chọn “Anyone with the link / Bất kỳ ai có đường liên kết — Viewer”. Nếu muốn giữ Drive ở chế độ riêng tư, tải thủ công bằng trình duyệt đã đăng nhập rồi đặt đúng 4 tên vào `models/level5/`. Không dùng ID thư mục. Cách dùng `gdown.download(id=...)` dựa trên [tài liệu gdown](https://github.com/wkentaro/gdown).

Manifest `scripts/level5_drive.json` đã được điền đúng 4 ID và SHA-256 của bộ đã tải. Ba hash vocab/embedding/mapping khớp `run_manifest.json`; hash tensor checkpoint khớp bằng chứng huấn luyện và kết quả đánh giá. Hash toàn bộ file `.pt` trong manifest tải xuống khác hash tensor vì chúng kiểm tra hai đối tượng khác nhau. Bản `.example.json` được giữ làm mẫu khi chuyển sang bộ khác. Script tải vào `.part`, kiểm tra định dạng/checksum nếu có rồi mới đổi tên; tệp hiện có được giữ nguyên trừ khi thêm `--overwrite`. `download_receipt.json` ghi SHA-256 local.

## 3. Cài đặt trên Windows PowerShell

Cần Python **3.11 hoặc 3.12**, Git và Node.js phù hợp với Vite đang dùng. Kiểm tra `py -0p`, `git --version`, `node --version`. Nếu chưa có Python, cài từ [Python for Windows](https://www.python.org/downloads/windows/), sau đó mở PowerShell mới.

Thư mục `.venv` cũ trong backend trỏ tới máy `C:\Users\Quyen\...`; không dùng lại môi trường được chép từ máy khác. Script tạo riêng `UngDung/.venv-level5`.

```powershell
Set-Location 'D:\Bài tập\KhoaLuanTotNghiep\Về vấn đề Tổng quan về đồ án\UngDung'

# Lấy đúng interpreter Python 3.12 đã cài trên máy bạn.
$level5Python = py -3.12 -c "import sys; print(sys.executable)"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-level5.ps1 -PythonExe $level5Python -TorchBuild cpu
```

Nếu dùng GPU NVIDIA tương thích CUDA 12.4, thay `-TorchBuild cpu` bằng `-TorchBuild cu124`. Cặp phiên bản cài đặt là torch 2.6.0 / torchvision 0.21.0 theo [lệnh chính thức PyTorch cho Windows](https://docs.pytorch.org/get-started/previous-versions/). Không cần cài FAISS GPU; `faiss-cpu` đảm nhiệm truy hồi ngay cả khi decoder chạy CUDA.

Các lệnh cài đặt chính mà script thực hiện (có thể chạy thủ công):

```powershell
& $level5Python -m venv .venv-level5
& .\.venv-level5\Scripts\python.exe -m pip install --upgrade pip setuptools wheel
& .\.venv-level5\Scripts\python.exe -m pip install torch==2.6.0 torchvision==0.21.0 --index-url https://download.pytorch.org/whl/cpu
& .\.venv-level5\Scripts\python.exe -m pip install -r .\Fontend\image-captioning-baseline\requirements-level5.txt
& .\.venv-level5\Scripts\python.exe -m nltk.downloader -d .\models\level5\nltk_data wordnet omw-1.4
Push-Location .\Fontend\webapp
npm.cmd ci
Pop-Location
```

CLIP được cài từ [repository OpenAI CLIP](https://github.com/openai/CLIP), đúng backbone dùng trong huấn luyện. Lần nạp đầu tải trọng số CLIP vào `models/level5/clip_cache`; các lần sau dùng cache. Nếu máy offline, chuẩn bị cache ViT-B-32.pt trước. Kho embedding khoảng 1,16 GB (float32); FAISS giữ thêm khoảng 1,16 GB trong RAM, cộng model và bảng caption. Chỉ chạy một backend worker.

## 4. Tải model

Bộ hiện tại đã có đủ 4 tệp, không cần tải lại. Lệnh dưới đây kiểm tra và giữ nguyên tệp hiện có; tải những tệp còn thiếu theo manifest đã điền:

```powershell
& .\.venv-level5\Scripts\python.exe .\scripts\download_level5.py --manifest .\scripts\level5_drive.json
```

Các tệp `results/final_config.json`, `test_summary.json`, `run_manifest.json` và `five_seed_summary.json` cũng đã tải qua kết nối Drive. Script gdown chỉ quản lý 4 tài nguyên model trong manifest; hãy giữ thư mục `results/` để dùng lại cấu hình MMR đã tinh chỉnh.

Hoặc dùng tham số trực tiếp:

```powershell
& .\.venv-level5\Scripts\python.exe .\scripts\download_level5.py `
  --checkpoint-id 'ID_BEST_MODEL_SEED46' `
  --vocab-id 'ID_VOCAB' `
  --embeddings-id 'ID_TEXT_EMBEDDINGS' `
  --mapping-id 'ID_MAPPING_JSONL'
```

Backend yêu cầu export `best_model.pt` có `model_state_dict`, `contract` và `evidence` như `multiseed.py::load_best()`. Nó kiểm tra Seed 46, bằng chứng đã train, native 5-token và nạp `strict=True`. Không sử dụng `strict=False`, model khởi tạo ngẫu nhiên hoặc tự thay bằng ViT-GPT2. `weights_only=True` chỉ bổ sung safe-global `TorchVersion` vì metadata của mã train chứa `torch.__version__`.

## 5. Khởi chạy đồng thời hai server

```powershell
# Dừng server cũ bằng Ctrl+C trong terminal đang chạy trước nếu port bị chiếm.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-level5.ps1 -Device auto

# Đợi nạp checkpoint, kho tri thức và CLIP lần đầu, sau đó:
Invoke-RestMethod 'http://localhost:8000/api/health' | ConvertTo-Json -Depth 8
```

Script mở backend 8000 và frontend 5173 ở nền, ghi log và danh tính process trong `UngDung/logs`. Dừng bằng `scripts/stop-level5.ps1`; script kiểm tra PID và thời điểm khởi tạo, rồi dừng cả process con của hai server. Script start từ chối port đang dùng. `-Device cpu` buộc CPU; `-Device cuda:0` yêu cầu GPU và sẽ báo lỗi nếu CUDA không dùng được. `auto` chọn CUDA khi có, ngược lại CPU.

Mở [dashboard](http://localhost:5173) và upload ảnh ở chế độ Real. Script truyền `VITE_API_MODE=real`, không cần sửa mã giao diện. Khi thay biến Vite, phải restart Vite. `VITE_API_BASE_URL` không chứa `/api`.

Nếu muốn xem log trực tiếp, dùng **hai cửa sổ PowerShell**, cùng bắt đầu trong thư mục UngDung:

Backend:

```powershell
$env:LEVEL5_MODEL_DIR = (Resolve-Path .\models\level5).Path
$env:NLTK_DATA = Join-Path $env:LEVEL5_MODEL_DIR 'nltk_data'
$env:LEVEL5_DEVICE = 'auto'
$level5Exe = (Resolve-Path .\.venv-level5\Scripts\python.exe).Path
Set-Location .\Fontend\image-captioning-baseline
& $level5Exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 1
```

Frontend:

```powershell
$env:VITE_API_MODE = 'real'
$env:VITE_API_BASE_URL = 'http://localhost:8000'
Set-Location .\Fontend\webapp
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Không dùng `--reload` cho buổi demo vì việc reload sẽ nạp lại toàn bộ model và index.

## 6. RelTR và fallback

Máy hiện tại đã có RelTR trong `models/reltr/`, được backend tự nạp. Trọng số gốc từ link Visual Genome của [tác giả RelTR](https://github.com/yrcong/RelTR) có optimizer và metadata huấn luyện; bản dùng cho inference giữ nguyên 748 tensor model (khoảng 256 MB), đã nạp strict. Nguồn, commit code và hash được lưu tại `models/reltr/provenance.json`. Bản tải tạm 766 MB đã được xóa sau khi chuyển đổi.

Trên máy mới, có thể cài nhánh RelTR bằng:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-reltr.ps1
```

Script ghim source commit, kiểm tra SHA-256 checkpoint gốc, chỉ cho phép `argparse.Namespace` chuẩn trong scoped safe-globals, xuất tensor model riêng và dọn file tải tạm. Backend không tải RelTR trong startup/request.

Mặc định backend vẫn chạy nếu chưa cài RelTR: truy vấn CLIP → chuẩn hóa điểm → MMR → 5 caption → decoder đúng checkpoint. Khi đó `pipeline.fallback=true`, `reltr_status=unavailable` và `semantic_reranking=false`. Không lấy thực thể từ caption sinh ra để giả làm phát hiện RelTR. Nếu RelTR có nhưng không phát hiện gì, trạng thái là `no_detections`. Nếu thiếu WordNet, chỉ dùng nhãn thật + alias và ghi cảnh báo. Không tải corpus NLTK trong request.

Để bật RelTR, chuẩn bị repository [yrcong/RelTR](https://github.com/yrcong/RelTR) và checkpoint Visual Genome của nhóm. Adapter theo cấu hình checkpoint 151 lớp đối tượng / 51 quan hệ, threshold 0,25, tối đa 10 triplet; chỉ đưa nhãn subject/object vào WordNet. Trọng số RelTR có thể là state_dict thuần hoặc dictionary chứa `model` (tensor-only; legacy pickle có đối tượng tùy ý cần được xuất lại ở môi trường gốc).

```powershell
& .\.venv-level5\Scripts\python.exe -m pip install scipy
$env:RELTR_REPO = 'D:\duong-dan\RelTR'
$env:RELTR_CHECKPOINT = 'D:\duong-dan\checkpoint0149.pth'
# Tùy chọn: bắt buộc RelTR thành công, không cho fallback khi detector thiếu/lỗi.
$env:LEVEL5_REQUIRE_RELTR = '1'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-level5.ps1
```

RelTR là code cũ, có thể cần môi trường torchvision phù hợp. Adapter không tự vá repository của bạn. Xem `pipeline.warnings`/log để biết lỗi cụ thể; bỏ biến `LEVEL5_REQUIRE_RELTR` hoặc đặt bằng `0` nếu muốn chạy demo fallback.

## 7. API và kiểm thử

`POST /api/caption`: multipart field **`image`**. Trả tất cả trường đã yêu cầu: `success`, `caption`, `initial_caption`, `final_caption`, `caption_keywords`, `model_type`, `model_name`, `device`, `processing_time`, ba cờ knowledge, `retrieval` chứa đúng 5 item và `metadata.gate_score`. Có thêm `pipeline` để công khai kiến trúc, fallback, nhãn, tham số beam/MMR. `score` là hybrid relevance đã chuẩn hóa, không phải xác suất; điểm CLIP gốc nằm ở `metadata.clip_score`.

```powershell
curl.exe -X POST 'http://localhost:8000/api/caption' -F 'image=@D:\duong-dan\anh.jpg'
```

`GET /api/health` khi sẵn sàng gồm `{"status":"online","model_loaded":true,"model_name":"Level 5A RAG"}` cùng device/kiến trúc/cảnh báo. Khi thiếu tài nguyên, trả `status=offline`, `model_loaded=false`, `error` cụ thể. HTTP health vẫn là 200 để dashboard đọc lý do; caption trả 503. Ảnh hỏng trả 400, quá 10 MiB trả 413, thiếu field trả 422, lỗi inference trả 500. Giới hạn ảnh giải mã 25 megapixel. Inference chạy trong threadpool và tuần tự hóa quyền dùng model; health không bị chặn bởi tác vụ suy luận.

Frontend mặc định gọi API thật; chế độ Mock có thể chọn thủ công. Màn hình kiến trúc và trình chiếu dùng kiến trúc cùng benchmark Seed 46 đã xác minh. Bảng truy hồi hiển thị các caption API trả về, điểm CLIP/relevance và cổng chung cho ảnh. Phần attention/bounding box không có dữ liệu bị vô hiệu hóa. Nhãn RelTR được hiển thị riêng. Màn hình tình huống cũ có nhãn rõ là nội dung minh họa chưa được đo bằng Seed 46. Khi đang gọi API thật, giao diện chờ kết quả thay vì giả lập hoàn thành từng bước; nút hủy dùng AbortController và bỏ qua phản hồi cũ.

Chạy test (trong UngDung):

```powershell
& .\.venv-level5\Scripts\python.exe -m pip install pytest httpx
& .\.venv-level5\Scripts\python.exe -m pytest .\Fontend\image-captioning-baseline\tests\test_level5.py -q
Push-Location .\Fontend\webapp
node --test tests/responseValidator.test.mjs
npm.cmd run build
Pop-Location
```

Test offline dùng trọng số tổng hợp riêng trong thư mục tạm: kiểm tra khớp forward với source train, strict loading và từ chối checkpoint sai, FAISS/MMR (0,6 và 0,7), giới hạn beam/EOS, fallback, startup, schema upload và lỗi HTTP. Đã đạt 25 test Python trên môi trường triển khai mới, 2 test frontend, build Vite thành công và npm audit không còn cảnh báo. Kiểm chứng với tài nguyên thật xác nhận checkpoint Seed 46 nạp strict, vocab 16.214 từ và FAISS đủ 566.747 dòng. Smoke test ảnh `vg5.jpg` nhận HTTP 200 cả khi thiếu RelTR và khi bật RelTR + WordNet; bản đầy đủ có `fallback=false`. Chi tiết tại `models/level5/results/local_verification.json`, `inference_smoke_test.json`, `inference_smoke_test_full.json`. Chưa chạy lại benchmark toàn tập hoặc đo tốc độ có tính thống kê; thời gian của một ảnh demo không đại diện cho cả bộ test.
