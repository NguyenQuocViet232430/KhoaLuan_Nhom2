# Phạm vi kiểm thử phần mềm — cập nhật 29/09/2026

**Sáu kiểm thử dữ liệu/notebook, bảy kiểm thử ghi Drive và ba kiểm thử CHAIR tổng hợp đã PASS. Kiểm thử tích hợp PyTorch/FAISS chưa chạy lại sau thay đổi. Không phải điểm thực nghiệm COCO.**

| Kiểm thử | Phạm vi đã chạy |
|---|---|
| Mô hình native L5A | PyTorch CPU thật: forward/backward với `[B,5,512]`, memory `[B,5,256]`, gradient qua knowledge projection, gọi Beam Search. |
| Khôi phục và hai nhánh | Đã PASS ở bản trước: mô hình nhỏ có dropout, AdamW, scheduler, hai epoch, resume có cùng SHA trọng số, khóa Test. Bản mới bổ sung dừng sớm cần chạy lại kiểm thử tích hợp. |
| Quy tắc dừng sớm | Kiểm thử thuần xác nhận patience = 4: bốn epoch liên tiếp không tăng Greedy Val CIDEr thì dừng; có cải thiện thì đặt lại bộ đếm; chạm trần 15 epoch thì dừng với lý do riêng. |
| Truy hồi và tensor | FAISS thật trên vector tổng hợp: loại nguồn cùng ảnh, giữ bộ ba có nguồn khác, ánh xạ đúng token caption/triplet vào tensor. |
| Toàn vẹn lưu trữ | Phát hiện NPY đổi checksum; từ chối ghi đè hợp đồng bằng seed khác. |
| Dedup/provenance | Bộ ba đảo S/O được giữ riêng; cùng bộ ba từ nhiều ảnh giữ đầy đủ nguồn; từ chối tập ID sai. |
| Notebook và đường dẫn | Ba notebook nbformat 4 hợp lệ, các cell code parse được, không có output điền sẵn, ID cell duy nhất, mã nhúng khớp module hiện hành; kiểm tra `knowledge_base_level2`, `Dung_KhoTriThucLV2`, seed 42/44/46 và tham số dừng sớm. Đường dẫn dữ liệu thật trên Drive đã được đối chiếu trực tiếp. |
| Lưu trữ DriveFS | Bảy unit test gây lỗi giả lập PASS: không cần rename trên Drive, thử lại lỗi I/O tạm, bắt sai checksum, đọc sidecar `.pending` sau ngắt, không ghi đè hợp đồng khác và tiếp tục hợp đồng bản mã cũ đã biết. Một test gọi chính hàm đánh giá của notebook 02 với worker giả lập chỉ cho phép rename trên đĩa cục bộ, rồi kiểm tra kết quả/input/log được chép về thư mục đích. |
| CSV thực tế | Đọc schema `image,prediction,score`, tên ảnh COCO, `no_relation`, khử dòng quan hệ lặp. |
| Số memory token | Các tình huống 0/1/2 triplet đều đủ năm token riêng biệt, fallback đúng caption còn lại. |
| CHAIR Rohrbach Python 3 | Ba unit test tổng hợp PASS: quy tắc singularize/cụm từ, hợp instance labels + caption refs, CHAIR_s và CHAIR_i đếm theo lượt nhắc (kể cả lặp), từ chối cặp Test khác hợp đồng Beam. Notebook 03 đã parse cú pháp; 80 dòng `synonyms.txt` nguồn gốc Rohrbach được nhúng. Chưa chấm COCO thật hoặc so sánh số học với runtime Python 2 gốc. |

Kiểm thử tích hợp cũ dùng Python 3.12, PyTorch CPU và FAISS trong thư mục tạm riêng. Ở lần kiểm tra bản mới, runtime tạm thiếu Transformers/FAISS; vì vậy không coi kết quả tích hợp cũ là bằng chứng rằng vòng train/dừng sớm mới đã PASS. Các kiểm thử thuần ở trên đã chạy lại ngày 29/09.

Kiểm tra Drive thật: `DataKhoaLuan/Data/knowledge_base_level2` ban đầu có ba thư mục cùng tên. Đã gom hợp đồng nguồn, hợp đồng encoder, kết quả căn chỉnh encoder và 78 file chunk về một thư mục; hai thư mục cũ sau khi trống được đổi tên, không xóa. Trong 78 file có 38 cặp `.npy` + `.sha256.json` hoàn chỉnh, một `.npy` + sidecar `.pending`. Chưa có `manifest.json`. Cũng xác nhận `reltr_inputs/coco_train_reltr_detection.csv`, kho caption L1, các checkpoint L5A seed 42/44/46, thư mục đầu ra LV6 và bốn annotation COCO 2014 đúng đường dẫn. Chưa kiểm tra checksum nội dung toàn bộ file Drive từ Colab sau khi gom; notebook 01 sẽ làm việc đó khi chạy tiếp.

Trong kiểm thử điều phối training, bộ chấm được thay bằng **fixture tổng hợp chỉ nằm trong thư mục tạm**, để kiểm tra chọn checkpoint, resume, xuất bảng và khóa Test. Module WordNet được thay bằng stub vì các thử nghiệm này dùng caption cache có sẵn. Không dùng fixture/stub trong các notebook Colab. Không có số đo fixture được lưu vào bảng nghiên cứu.

**Chưa xác minh end-to-end trên dữ liệu thật:** tải trọng số CLIP và so khớp encoder với ngân hàng caption thực tế; xây toàn bộ ngân hàng bộ ba; đọc checkpoint/hồ sơ thật từ Drive trong nhánh mới; full fine-tuning trên Colab; chấm 5.000 ảnh bằng Java COCO; chấm CHAIR với bốn annotation COCO 2014. Các bước đó sẽ do ba notebook thực thi và kiểm tra đầu vào. Vì vậy chưa có kết luận kho lai cải thiện CIDEr, CHAIR hay bất kỳ metric nào.

Mã kiểm thử: `ma_nguon/test_hybrid.py`. Chạy từ môi trường có NumPy:

```text
python ma_nguon/test_hybrid.py
python ma_nguon/test_drive_io.py
```

Thêm PyTorch, FAISS, NLTK và tqdm để chạy tích hợp:

```text
python ma_nguon/test_hybrid.py --integration
```

Kiểm tra CHAIR độc lập trên dữ liệu tổng hợp:

```text
python -m unittest discover -s ma_nguon/chair_rohrbach -p test_chair.py -v
```

Không cần chạy các lệnh này trên Colab để lấy điểm. Người dùng chạy notebook 01 → 02 → 03 theo README.
