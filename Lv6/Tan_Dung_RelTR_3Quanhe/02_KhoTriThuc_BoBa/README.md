# Kho tri thức lai caption + bộ ba RelTR — ba notebook để chạy

| Thứ tự | File mở trên Colab | Việc thực hiện |
|---|---|---|
| 1 — chạy một lần | [01_Xay_KhoTriThuc_Lai_Colab.ipynb](01_Xay_KhoTriThuc_Lai_Colab.ipynb) | Xây ngân hàng bộ ba Train + Restval, mã hóa CLIP, kiểm tra tương thích với kho caption cũ. |
| 2 — chạy theo seed | [02_FineTune_SinhCaption_ChamDiem_KhoLai_Colab.ipynb](02_FineTune_SinhCaption_ChamDiem_KhoLai_Colab.ipynb) | Fine-tune hai nhánh, chọn checkpoint trên Val, sinh caption và chấm 8 chỉ số Test, xuất bảng so sánh. |
| 3 — chấm thêm CHAIR | [03_Cham_CHAIR_Rohrbach_Test_Colab.ipynb](03_Cham_CHAIR_Rohrbach_Test_Colab.ipynb) | Đọc lại caption Test Beam của hai nhánh, chấm CHAIR_s và CHAIR_i theo từ đồng nghĩa COCO của Rohrbach; không chạy lại mô hình. |

Chỉ cần tải **ba `.ipynb`** lên Colab. Mã mới được nhúng sẵn; `ma_nguon/` phục vụ đọc, bảo trì và kiểm thử trên máy. Mã gốc Level 5A, dữ liệu, cache, checkpoint và hồ sơ training vẫn cần ở Drive.

## Cách chạy

1. Chọn Colab GPU, mở notebook **01**, kiểm tra `DATA_ROOT`, chạy **Run all**. Chờ `BUILD COMPLETE` hoặc thông báo kho đã hoàn tất. Không cần chạy lại cho từng seed.
2. Mở notebook **02**. Giữ cùng `DATA_ROOT` và `BANK_DIR`; kết quả fine-tune ghi vào `baseline_level6/Dung_KhoTriThucLV2`. Chọn một trong ba seed `42`, `44`, `46`; mặc định 42 chỉ để thao tác, không phải seed tốt nhất trên Test.
3. Giữ recipe `EPOCHS=15` (trần), `EARLY_STOP_PATIENCE=4`, `EARLY_STOP_MIN_DELTA=0`, `BATCH_SIZE=64`, `LEARNING_RATE=5e-5`. Đây là cấu hình nhóm chọn để chạy, **chưa được xác nhận tối ưu**. Mỗi nhánh dừng sau bốn epoch liên tiếp không vượt Greedy Val CIDEr tốt nhất; khi có cải thiện, bộ đếm quay về 0. Checkpoint được chọn theo Val tốt nhất. Mặc định `RUN_TEST=True`: Run all đi hết Train → Val → Test. Nếu muốn thử/chọn recipe bằng Val trước, đặt False; quyết định recipe trước khi mở Test.
4. Xem bảng ở cuối notebook 02. Cả hai nhánh đều có BLEU-1/2/3/4, METEOR, ROUGE-L, CIDEr, SPICE ×100 và dòng chênh lệch. Notebook dùng Java 11/pycocoevalcap cho METEOR và SPICE.
5. Muốn tổng hợp đa seed thì lần lượt chạy notebook 02 cho 42,44,46. Cell cuối chỉ tổng hợp khi đủ ba seed cùng giao thức, dùng Std mẫu `ddof=1`. Không làm lại ba ablation đã hoàn tất.
6. Sau khi đã có `test_predictions.json` của cả hai nhánh cho ít nhất một seed, mở notebook **03** trên Colab CPU và chạy **Run all**. Notebook tự bỏ qua seed chưa hoàn tất, ghi CHAIR cho seed đã đủ cặp; khi đủ 42/44/46, ghi thêm mean ± Std mẫu và chênh lệch cặp. Không sinh caption hoặc chấm lại Test.

### Tiếp tục kho sau lỗi ngày 29/09

Trên Drive từng có **ba thư mục cùng tên** `knowledge_base_level2/reltr_triplet_bank_v1`, làm hợp đồng nguồn và các chunk embedding nằm ở hai nơi khác nhau. Đã gom `source_contract.json`, `encoder_contract.json`, `encoder_alignment.json` và `embedding_chunks/` về một thư mục kho; hai thư mục trống được **đổi tên để giữ lại**, không xóa. Kiểm tra Drive sau khi gom: có 38 chunk đã có sidecar SHA-256 và chunk `00004864` còn sidecar `.pending`. Đây là tiến độ xây kho, **chưa phải kho hoàn tất** vì chưa có `manifest.json`.

Mở **bản notebook 01 mới trong thư mục này** trên Colab, giữ nguyên `DATA_ROOT`, `MIN_CONFIDENCE=0.5`, `ENCODE_BATCH_SIZE=128`, rồi **Run all**. Bản mới không dùng `Path.replace()` trên Drive; nó tự ghim phiên bản Transformers theo `encoder_contract.json`, yêu cầu Torch khớp bản đã lưu, kiểm tra checksum và dùng lại chunk hợp lệ. Chunk `00004864` sẽ được dùng nếu kiểm tra được sidecar `.pending`, nếu không sẽ mã hóa lại. Không xóa chunk hay hợp đồng cũ. Chỉ chuyển sang notebook 02 khi notebook 01 in `BUILD COMPLETE` (hoặc `Bank already complete`) và cell kiểm tra kho chạy xong. Tab Colab đã mở notebook 01 bản cũ vẫn chứa mã cũ; cần mở/tải **file `.ipynb` đã cập nhật**.

Notebook 02 cũng đã được cập nhật: các lần ghi cache/dự đoán qua mã đọc L5A không còn dùng phép rename trên Drive, còn worker COCO dùng rename **trên đĩa cục bộ** rồi chép kết quả/input/log đã xác minh về `Dung_KhoTriThucLV2`. Notebook 03 dùng cùng cơ chế ghi Drive an toàn cho bảng CHAIR. Vì vậy hãy dùng **cả ba notebook bản mới** khi chạy tiếp, không dùng tab chứa mã cũ.

Greedy được dùng **mỗi epoch trên Val** để chọn checkpoint nhanh hơn. Bước chấm COCO cuối của notebook 02 dùng **Beam=3 trên cả Val và Test**; hiện không có bảng Test Greedy thứ hai. Notebook 03 đo CHAIR trên đúng `test_predictions.json` Beam đó, để CHAIR và 8 chỉ số COCO cùng dựa trên một bộ caption.

## CHAIR theo Rohrbach và dữ liệu cần có

Notebook 03 dùng nguyên 80 dòng [`data/synonyms.txt` của LisaAnne/Hallucination](https://github.com/LisaAnne/Hallucination/blob/master/data/synonyms.txt). Trong mã gốc tên file là `synonyms.txt`; không có file chính thức tên `coco_synonyms`. Mã chấm là bản chuyển Python 3 của [`utils/chair.py`](https://github.com/LisaAnne/Hallucination/blob/master/utils/chair.py), giữ các quy tắc cụm từ, NLTK tokenization và `Pattern.singularize` (phần quy tắc Pattern được nhúng cùng giấy phép). Để tái lập, đầu ra ghi SHA-256 của bộ từ đồng nghĩa, mã chấm, dự đoán và bốn file annotation. Bản chuyển này chưa được đối chiếu số học trực tiếp với môi trường Python 2 cũ của repo trên toàn bộ COCO.

Cần **bốn file annotation COCO 2014 gốc** trong cùng một thư mục: `instances_train2014.json`, `instances_val2014.json`, `captions_train2014.json`, `captions_val2014.json`. Mặc định tìm trong `DataKhoaLuan/Data/COCO_2014/annotations_trainval2014/annotations`; nếu khác, điền `ANNOTATIONS_DIR` ở notebook 03. File Karpathy `dataset_coco.json` không thay thế được instance labels. CHAIR đối chiếu vật thể trong caption sinh với **hợp** của instance labels và vật thể trong caption tham chiếu. Việc đọc tham chiếu Test ở đây chỉ phục vụ **chấm điểm sau khi checkpoint đã khóa**, không đưa vào kho truy hồi hay train.

`CHAIR_s` = số caption có ít nhất một lượt nhắc vật thể COCO sai / số caption; `CHAIR_i` = số lượt nhắc vật thể COCO sai / tổng lượt nhắc vật thể COCO. Hai chỉ số là tỷ lệ, xuất ra bảng theo **%**, càng thấp càng tốt. Chúng không đo sai quan hệ, thuộc tính hoặc vật thể ngoài danh sách 80 lớp COCO. Vì tuân theo bước singularize gốc, một số từ đơn lẻ có thể được xử lý không trực giác; không tự sửa danh sách để tránh thay đổi giao thức.

## Token là gì, và vì sao cần fine-tune hai nhánh?

Một token tri thức là **một vector CLIP text 512 chiều của cả caption hoặc cả chuỗi bộ ba**, qua phép chiếu `Linear(512,256)` đang có. Ví dụ `person riding horse` tạo một token, không tách thành ba token. Chuỗi vẫn giữ thứ tự chủ ngữ–quan hệ–đối tượng. Đây là biểu diễn văn bản của quan hệ, chưa phải graph encoder hay một mạng học quan hệ mới.

| Điều kiện | Đối chứng kho caption | Kho lai đề xuất |
|---|---|---|
| Bộ nhớ | 5 caption embeddings | 3 caption + 2 triplet embeddings |
| Tổng số memory token | 5 | 5 |
| Warm-start | L5A `seedXX/best_model.pt` | Cùng checkpoint của seed XX |
| Học thêm | Tối đa 15 epochs, patience = 4 | Cùng quy tắc dừng sớm |
| Tham số học | Toàn bộ captioner L5A | Cùng kiến trúc, cùng tập tham số |
| CLIP, RelTR | Đóng băng | Đóng băng |
| Chọn checkpoint | Greedy Val CIDEr | Greedy Val CIDEr |
| Chấm cuối | Beam=3, max_len=30, alpha=0.6 | Giống đối chứng |

Phần caption giữ Semantic + MMR với lambda đã chọn trên Val của seed L5A; cache caption được đóng băng và dùng chung cho hai nhánh. Nếu thiếu cache Train tại lambda cuối, notebook tính cache mới **trong thư mục LV6**, không sửa cache L5.

Phần bộ ba dùng vector CLIP ảnh truy vấn FAISS `IndexFlatIP` của các bộ ba Train. Vector được chuẩn hóa L2; lấy Top-50 hợp lệ rồi Top-2. Điểm cho gate là min–max cosine trong Top-50 bộ ba hợp lệ (tất cả bằng nhau thì bằng 1), tách biệt với chuẩn hóa relevance caption L5. Hai loại điểm đều ở [0,1], nhưng **không được coi là xác suất đã hiệu chỉnh tương đương**. Phép thử đo toàn bộ cấu hình kho lai và cách chọn token này, không tách riêng hiệu quả của lưu trữ, tỉ lệ 3+2 hay cách tính score.

Đối chứng cũng được fine-tune để không lẫn tác dụng của **học thêm** với tác dụng của **đổi kho**. Hai nhánh có cùng *trần epoch và quy tắc dừng sớm*; số epoch thực chạy có thể khác nhau và được ghi trong `training_log.json`, `best_model.pt`, `val_summary.json`, `test_summary.json` và bảng so sánh từng seed. Bảng mới so sánh hai mô hình theo cùng giao thức; không trực tiếp dùng điểm L5 cũ làm đối chứng chính. Sự thay đổi phân phối memory là lý do fine-tune; không có khẳng định rằng kho lai chắc chắn làm điểm tăng.

## Dữ liệu và kiểm tra

- Giữ nguyên ngân hàng caption cũ; thêm `triplet_embeddings.npy` và `triplet_mapping.json` cùng manifest. Không cần chép lại ngân hàng caption hơn 1 GB.
- CSV `reltr_inputs/coco_train_reltr_detection.csv` phải có đầy đủ ID Train + Restval; ảnh không có quan hệ vẫn phải có dòng `no_relation`. Ngưỡng confidence mặc định 0.5.
- Khử trùng theo bộ ba có thứ tự, giữ tất cả ảnh nguồn. Khi truy vấn Train, caption phải đến từ ảnh khác; bộ ba phải có ít nhất một nguồn khác ảnh truy vấn, và lưu nguồn thực sự được dùng.
- Không index caption hay bộ ba Val/Test. Val/Test dùng ảnh đầu vào để truy vấn; tham chiếu chỉ phục vụ chấm điểm, Val phục vụ chọn checkpoint.
- Mã hóa lại 32 caption cũ bằng đúng CLIP ViT-B/32; nếu cosine thấp hơn 0.999 thì dừng để kiểm tra encoder, không trộn hai không gian không khớp. Revision CLIP và phiên bản thư viện được lưu trong hợp đồng xây kho.
- Nếu không đủ 2 bộ ba hợp lệ, lấy thêm các caption còn lại trong Top-5. Cache ghi độ phủ 0/1/2 triplet và nguồn của từng quan hệ.
- **Số caption cần chú ý:** mã L5A được xuất từ lần chạy hiện kiểm tra 566.747 hàng, khác số 566.435 trong mô tả ban đầu. Notebook 01 đọc số hàng thực tế; notebook 02 giữ nguyên kiểm tra của L5A. Không tự sửa nguồn hoặc số liệu lịch sử để ép khớp mô tả.

## Đầu ra trên Drive

Hai gốc mặc định, đúng các thư mục Drive của nhóm:

- Kho bộ ba: `/content/drive/MyDrive/DataKhoaLuan/Data/knowledge_base_level2/reltr_triplet_bank_v1/`.
- Checkpoint, cache truy hồi và kết quả: `/content/drive/MyDrive/DataKhoaLuan/Data/baseline_level6/Dung_KhoTriThucLV2/`.

Notebook 01 yêu cầu `knowledge_base_level2` tồn tại; notebook 02 yêu cầu `Dung_KhoTriThucLV2` và manifest kho tồn tại trước khi train. Các kiểm tra này chặn việc âm thầm tạo kết quả ở đường dẫn sai. Ngân hàng caption Level 1 vẫn được **đọc** từ vị trí cũ; checkpoint L5A cũng chỉ được **đọc**.

```text
knowledge_base_level2/reltr_triplet_bank_v1/
  manifest.json                 # checksum, nguồn, encoder, thống kê
  triplet_embeddings.npy        # vector CLIP bộ ba
  triplet_mapping.json          # S, P, O và mọi ảnh nguồn
  encoder_alignment.json        # kiểm tra không gian CLIP
  embedding_chunks/             # tiếp tục xây kho khi ngắt
baseline_level6/Dung_KhoTriThucLV2/
  _l5_reader/                   # cache đọc đối chứng L5 trong chính thư mục kết quả
  runs/seed42/                  # tương tự seed44/46
    study_contract.json
    test_plan.json              # khóa cả hai checkpoint trước Test
    retrieval_cache/            # caption snapshot + hybrid memory
    caption_control/
      best_model.pt
      training_log.json
      last_model.slot0.pt       # 2 checkpoint resume luân phiên
      last_model.slot1.pt
      val_predictions.json
      test_predictions.json
      val_summary.json
      test_summary.json
      test_once.json
      metrics/                  # kết quả COCO raw và Java log
    hybrid_3cap_2spo/           # các file tương tự đối chứng
    val_comparison.csv
    test_comparison.csv         # 2 nhánh + delta
    test_comparison.json
  test_3seed_summary.csv        # chỉ có khi đủ 3 seed
  chair_rohrbach/
    seed42/caption_control/chair_summary.json
    seed42/hybrid_3cap_2spo/chair_summary.json
    test_chair_by_seed.csv       # CHAIR_s và CHAIR_i (%) từng nhánh/seed
    test_chair_3seed_summary.json # khi đủ 3 seed, gồm chênh lệch cặp
```

## Ngắt phiên và chạy lại

Notebook 02 lưu model/optimizer/scheduler/RNG/cursor mỗi 250 batch và cuối epoch, gồm cả số epoch liên tiếp không cải thiện. Chạy lại **cùng seed, recipe và phiên bản mã/thư viện** để tiếp tục; một nhánh đã dừng sớm sẽ không train thêm khi mở lại notebook. GPU có thể đổi L4/T4 nếu phần mềm không đổi; GPU được ghi log, không phải lý do tự mở lại Test. Không cam kết kết quả bitwise giống nhau giữa GPU khác loại.

Không chạy hai runtime cho cùng seed hoặc cùng kho. Khóa `fcntl` chỉ hoạt động trong máy Colab hiện tại. Không xóa `test_once.json`, `test_plan.json` hay đổi thư mục để thử cấu hình mới rồi chọn theo điểm Test. Nếu checksum hoặc hợp đồng khác, kiểm tra nguyên nhân và khôi phục đúng file.

## Tình trạng xác minh

Notebook được tạo từ mã nguồn có kiểm tra cú pháp và tính nhất quán của mã nhúng. Kiểm thử phần mềm dùng dữ liệu nhỏ; chúng không phải số liệu COCO. **Kho thật mới xây một phần, chưa có `manifest.json`; chưa fine-tune trên Colab, chưa chấm CHAIR trên COCO thật và chưa có điểm thực nghiệm kho lai.** File [KIEM_THU.md](KIEM_THU.md) ghi phạm vi kiểm thử thực tế.

Tài liệu API: [Hugging Face CLIP](https://huggingface.co/docs/transformers/model_doc/clip), [FAISS cosine/inner product](https://github.com/facebookresearch/faiss/wiki/MetricType-and-distances). Xem thêm [bản thiết kế nghiên cứu](ThietKe_KhoTriThuc_BoBa.md).
