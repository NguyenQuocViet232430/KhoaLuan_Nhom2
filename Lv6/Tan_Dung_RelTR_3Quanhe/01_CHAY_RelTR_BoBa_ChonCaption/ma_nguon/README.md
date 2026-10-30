# Mã nguồn của notebook nhánh 01

Các tệp ở đây **không phải ba notebook cần chạy riêng**:

- `reltr_relation_reranking.py`: đọc CSV RelTR, chuẩn hóa bộ ba và kiểm tra quan hệ trong caption ứng viên.
- `triplet_caption_runner.py`: nối điểm quan hệ vào chọn Top-5, dùng checkpoint Level 5A để sinh/chấm caption.
- `build_triplet_caption_notebook.py`: nhúng hai module trên cùng mã reader Level 5A vào `../CHAY_RelTR_BoBa_ChonCaption_Colab.ipynb` khi phát triển.

Người chạy Colab chỉ cần mở notebook ở thư mục cha; mã nguồn này đã được nhúng trong đó.
