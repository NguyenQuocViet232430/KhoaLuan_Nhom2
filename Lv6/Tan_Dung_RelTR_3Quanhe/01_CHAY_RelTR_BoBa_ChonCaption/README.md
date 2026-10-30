# Level 6: tận dụng bộ ba quan hệ RelTR

## Notebook nên dùng

Mở **`CHAY_RelTR_BoBa_ChonCaption_Colab.ipynb`** trên Colab GPU. Đây là file chạy duy nhất của thư mục này. Notebook mặc định dùng `SEED=45`, `SPLIT='val'`, `BETA=0.2` và đường dẫn `/content/drive/MyDrive/DataKhoaLuan/Data`. Nếu Drive là `Data/Data`, sửa **một** dòng `DATA_ROOT`. Giữ các tệp mã Level 5A và kho caption hiện có trên Drive; notebook nhúng module Level 6 và kiểm tra SHA-256 mã Level 5A trước khi nạp.

Chạy **Run all** trên Val. Output đặt tại:

```text
<DATA_ROOT>/baseline_level6/Tan_Dung_RelTR_3Quanhe/
├── _baseline/seed45/val/<contract>/comparison.csv, comparison.json,
│   triplet_diagnostics.json, retrieval_reference/
├── triplet_relation/seed45/val/<contract>/predictions.json,
│   metrics_coco.json, summary.json, top5.npz
└── validation_selection/seed45.json
```

`comparison.csv` gồm hai dòng `full` và `triplet_relation`, đủ 8 chỉ số COCO ×100; `delta = triplet_relation − full`. Cần xem `triplet_diagnostics.json`: số ảnh có bộ ba, số ảnh có caption ứng viên khớp, số ảnh đổi bộ Top-5 và tối đa 10 ví dụ caption trước/sau. Nếu không có ứng viên nào khớp quan hệ, chương trình dừng trước khi chấm COCO.

Chỉ sau khi xem kết quả Val, nếu chủ động chấm Test, đổi `SPLIT='test'` và `ALLOW_TEST=True`. Test yêu cầu `validation_selection/seedXX.json` cùng checkpoint, beta, ngưỡng và mã; kết quả ghi vào `test/` riêng và tạo khóa Test trong thư mục Level 6 này. **Không xóa `test_once.json` và không chọn beta theo kết quả Test.** Mỗi seed phải có Val của chính seed đó trước Test. Muốn báo cáo đa seed, dùng bốn seed 43–46 và ghi rõ `n=4`; không cần chạy seed 42.

## Thay đổi so với Level 5A

Mã Level 5A đọc CSV RelTR nhưng chỉ dùng `subject` và `object` làm nhãn; `predicate` không vào `rerank_one`. Nhánh mới đọc đủ `(subject, predicate, object, confidence)`, giữ chiều S→P→O và so khớp có thứ tự với caption Top-50. Điểm mới trộn với relevance Level 5A để **chọn Top-5** bằng cùng MMR; điểm relevance cũ của caption được chọn vẫn đưa vào gate, nên can thiệp chỉ nằm ở lựa chọn token. Ảnh không có quan hệ hoặc không có caption ứng viên khớp giữ nguyên Top-5 của đối chứng. Decoder, năm CLIP-text embedding của caption, Beam Search `k=3`, `max_len=30` và Java COCO evaluator giữ nguyên. Không huấn luyện trong notebook.

So khớp là quy tắc từ vựng có thứ tự, không phải semantic parser hoàn chỉnh: câu bị động, diễn đạt vòng, đồng tham chiếu và một số vị ngữ không gian có thể bị bỏ sót. WordNet dùng cho biến thể vị ngữ; đầu ra RelTR có thể sai. Cần xem ví dụ định tính trên Val trước khi kết luận. Prototype cũ trong `../_luu_tru/` chỉ xếp hạng ứng viên JSONL và **không chấm caption**; giữ lại để tham khảo, không dùng nó làm kết quả COCO.

Các file trong `ma_nguon/` chỉ dùng để phát triển hoặc tạo lại notebook; **không chạy riêng trên Colab**. Kiểm tra cục bộ đã qua đối với parser CSV, thứ tự quan hệ, phủ định, fallback, MMR và đồng nhất `beta=0`. Chưa thể chạy end-to-end COCO trên máy này vì checkpoint/cache và Colab GPU ở Drive.
