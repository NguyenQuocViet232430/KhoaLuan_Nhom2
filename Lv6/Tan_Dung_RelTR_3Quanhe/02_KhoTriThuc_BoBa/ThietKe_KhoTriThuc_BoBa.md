# Đề xuất kho tri thức dựa trên bộ ba RelTR

**Cập nhật triển khai:** Đã có ba notebook trong thư mục này; xem [README](README.md). Bản đầu triển khai kho lai **3 caption + 2 triplet**, truy vấn bằng CLIP ảnh vào ngân hàng chuỗi bộ ba Train, giữ phép chiếu/gate/decoder L5A. Fine-tune cả đối chứng caption-only lẫn hybrid từ cùng checkpoint cho ba seed 42/44/46, với trần 15 epochs và cùng quy tắc dừng sớm patience = 4, rồi chọn Val/chấm Test; notebook thứ ba chấm thêm CHAIR. Kho bộ ba lưu trong `knowledge_base_level2/reltr_triplet_bank_v1`; kết quả học lưu trong `baseline_level6/Dung_KhoTriThucLV2`. Phương án dùng quan hệ của ảnh làm query và nhánh triplet-only trong mô tả dưới đây vẫn là hướng mở rộng, chưa được triển khai. Chưa có kết quả thực nghiệm.

## Phân biệt hai thay đổi

**Bước A — dùng bộ ba để chọn caption:** Notebook trong `../01_CHAY_RelTR_BoBa_ChonCaption/` vẫn truy hồi Top-50 caption từ kho Level 5A và vẫn đưa năm CLIP-text embedding caption vào decoder. Bộ ba chỉ xếp lại ứng viên. Vì hình dạng và ý nghĩa đầu vào decoder không đổi, **không cần train/fine-tune** cho phép thử này. Đánh giá Val trước, rồi một lượt Test cho cấu hình được giữ cố định.

**Bước B — kho tri thức thực sự chứa bộ ba:** Tạo bản ghi `(source_image_id, subject, predicate, object, confidence, split)` từ **Train + Restval**, chuẩn hóa và khử trùng; không đưa quan hệ từ Val/Test vào kho. Với truy vấn Train, loại chính `source_image_id` của ảnh truy vấn để tránh tự truy hồi. Truy vấn Val/Test chỉ lấy bộ ba của ảnh đầu vào làm **query**, còn mục được trả về luôn đến từ Train + Restval. Khi mã hóa chuỗi bộ ba bằng CLIP text, chuẩn hóa L2 cả query và kho nếu dùng FAISS `IndexFlatIP` theo cosine; lưu ánh xạ hàng FAISS về bản ghi và ảnh nguồn. Kiểm tra độ phủ, nhiễu detector, độ trùng và tính đúng split trước khi huấn luyện.

Nếu thay năm caption embedding bằng năm embedding bộ ba, kích thước 512 chiều có thể vẫn khớp `Linear(512, 256)`, nhưng **phân phối và ý nghĩa của token tri thức đã đổi**. Chạy checkpoint Level 5A trực tiếp chỉ là thử nghiệm zero-shot; không nên coi đó là mô hình đã thích nghi. Để có kết quả chính thức, khởi tạo từ `best_model.pt` Level 5A đúng seed, đóng băng CLIP và RelTR, rồi fine-tune ít nhất phần chiếu tri thức, gate và decoder với cache truy hồi bộ ba Train; chọn checkpoint/số epoch theo Val. Trần 15 epoch là ngân sách tối đa, không yêu cầu chạy đủ 15; dừng sau bốn epoch liên tiếp không cải thiện Greedy Val CIDEr. Áp dụng cùng quy tắc cho đối chứng và kho lai, ghi số epoch thực chạy để đối sánh công bằng. Sau khi khóa cấu hình, chấm Test một lần.

Phương án ít rủi ro hơn việc bỏ toàn bộ caption là **kho lai**: giữ một phần token caption và thêm token bộ ba sao cho tổng vẫn là năm token, rồi fine-tune để decoder học cách dùng hai nguồn. Cần báo cáo riêng đối chứng caption-only, triplet-only và hybrid nếu triển khai đủ; không suy ra kết quả của kho bộ ba từ thí nghiệm xếp hạng caption ở Bước A.

## Điều kiện để kết luận

- Chọn ngưỡng confidence, số bộ ba, trọng số truy hồi và checkpoint trên Val; không dùng Test để điều chỉnh.
- So sánh cùng seed, Karpathy split, Beam Search `k=3`, `max_len=30` và tám chỉ số COCO ×100. Không ghép điểm của giao thức khác.
- Báo cáo chất lượng quan hệ RelTR và ví dụ đảo vai trò/chú thích sai, vì kho bộ ba có thể lan truyền lỗi detector. Các bộ ba do RelTR suy ra từ ảnh là **tri thức có cấu trúc trích xuất từ ảnh**, không mặc nhiên là tri thức ngoại sinh độc lập.

## Tài liệu kỹ thuật

- Cong và cộng sự, [RelTR: Relation Transformer for Scene Graph Generation](https://arxiv.org/abs/2201.11460): RelTR dự đoán các bộ ba chủ ngữ–vị ngữ–đối tượng.
- [FAISS MetricType and distances](https://github.com/facebookresearch/faiss/wiki/MetricType-and-distances): muốn dùng inner product để so sánh cosine thì chuẩn hóa L2 vector trước khi thêm vào index và trước khi truy vấn.
