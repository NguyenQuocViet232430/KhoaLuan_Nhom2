# Hai hướng sử dụng bộ ba quan hệ RelTR

| Thư mục | Mục đích | Trạng thái |
|---|---|---|
| `01_CHAY_RelTR_BoBa_ChonCaption/` | Dùng bộ ba RelTR để **chọn lại 5 caption** từ kho caption Level 5A, sinh caption và chấm 8 chỉ số COCO. | **Có notebook để chạy trên Colab**; không train lại. |
| `02_KhoTriThuc_BoBa/` | **Kho lai caption + bộ ba**, dùng 3 caption token + 2 triplet token. | **Có 2 notebook: xây kho; fine-tune hai nhánh và chấm Val/Test.** |
| `_luu_tru/` | Prototype cũ chỉ xếp hạng danh sách ứng viên JSONL. | Không dùng để lấy điểm COCO chính thức. |

**File duy nhất cần mở trên Colab để thử hướng 01:**
[`01_CHAY_RelTR_BoBa_ChonCaption/CHAY_RelTR_BoBa_ChonCaption_Colab.ipynb`](01_CHAY_RelTR_BoBa_ChonCaption/CHAY_RelTR_BoBa_ChonCaption_Colab.ipynb).
Notebook đã nhúng mã mới, nên không cần tải riêng các tệp `.py` trong `ma_nguon/` lên Colab. Vẫn cần dữ liệu, mã gốc, cache và checkpoint Level 5A trên Drive như hướng dẫn trong [README của hướng 01](01_CHAY_RelTR_BoBa_ChonCaption/README.md).

**Để thử kho tri thức lai, chạy hai file trong hướng 02 theo thứ tự:**

1. [01_Xay_KhoTriThuc_Lai_Colab.ipynb](02_KhoTriThuc_BoBa/01_Xay_KhoTriThuc_Lai_Colab.ipynb): xây kho một lần từ Train + Restval.
2. [02_FineTune_SinhCaption_ChamDiem_KhoLai_Colab.ipynb](02_KhoTriThuc_BoBa/02_FineTune_SinhCaption_ChamDiem_KhoLai_Colab.ipynb): chạy theo seed, fine-tune đối chứng caption và kho lai từ cùng L5A, chấm đủ 8 COCO metrics. Mặc định đi tới Test.

[Hướng dẫn hướng 02](02_KhoTriThuc_BoBa/README.md) giải thích checkpoint, token, chi phí train và đầu ra. Mã đã được tạo, **chưa có điểm COCO thật của kho lai**. Điểm hướng 01 vẫn chỉ là thí nghiệm chọn caption từ kho cũ.
