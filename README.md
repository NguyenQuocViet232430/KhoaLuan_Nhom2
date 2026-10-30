# Khóa Luận Tốt Nghiệp: Phương Pháp Sinh Chú Thích Ảnh Tự Động Dựa Trên Tăng Cường Truy Hồi Tri Thức Ngữ Nghĩa Và Đồ Thị Cảnh

> **Scene-Graph & Diverse Gated Multi-Token Retrieval-Augmented Generation for Image Captioning**  
> *Đồ án Khóa Luận Tốt Nghiệp Ngành Công Nghệ Thông Tin & Công Trình Nghiên Cứu Khoa Học*

---

[![Python](https://img.shields.io/badge/Python-3.9%2B-blue.svg)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0%2B-ee4c2c.svg)](https://pytorch.org/)
[![HuggingFace](https://img.shields.io/badge/HuggingFace-Transformers-yellow.svg)](https://huggingface.co/)
[![FAISS](https://img.shields.io/badge/FAISS-Vector%20Search-green.svg)](https://github.com/facebookresearch/faiss)
[![License](https://img.shields.io/badge/License-MIT-lightgrey.svg)](LICENSE)
[![Tested on](https://img.shields.io/badge/Hardware-Google%20Colab%20GPU%20(T4%2016GB)-orange.svg)](https://colab.research.google.com/)

---

## 👥 Nhóm Tác Giả & Đơn Vị Thực Hiện

- **Sinh viên thực hiện:**
  - **Nguyễn Quốc Việt** (Trường Đại học Công Thương TP. Hồ Chí Minh - HUIT)
  - **Ngô Quốc Bình** (Trường Đại học Công Thương TP. Hồ Chí Minh - HUIT)
  - **Nguyễn Thị Quyên** (Trường Đại học Công Thương TP. Hồ Chí Minh - HUIT)
- **Giảng viên hướng dẫn:**
  - **TS. Đinh Thị Mận** (*Khoa Công nghệ Thông tin, Trường Đại học Công Thương TP. Hồ Chí Minh - HUIT*) - *Tác giả liên hệ: `mandt@huit.edu.vn`*
  - **ThS. Nguyễn Văn Thịnh** (*Khoa Công nghệ Thông tin, Trường Đại học Sư Phạm TP. Hồ Chí Minh - HCMUE*)

---

## 📌 Giới Thiệu Đề Tài & Tính Cấp Thiết

Bài toán **Sinh chú thích ảnh tự động (Image Captioning)** đóng vai trò cầu nối quan trọng giữa Thị giác máy tính (Computer Vision) và Xử lý ngôn ngữ tự nhiên (NLP). Mặc dù các mô hình truyền thống đã đạt được nhiều tiến bộ, chúng vẫn đối mặt với hai thách thức cốt lõi:
1. **Khoảng cách phương thức (Modality Gap):** Việc nén toàn bộ thông tin thị giác phức tạp thành một vector đặc trưng duy nhất dẫn đến suy giảm biểu diễn chi tiết và mất mát ngữ nghĩa tinh tế.
2. **Hiện tượng ảo giác thực thể (Object Hallucination):** Mô hình sinh ngôn ngữ thường dựa trên thiên kiến xác suất đồng xuất hiện từ vựng thay vì căn cứ vào các đối tượng thực sự hiện diện trong ảnh, dẫn đến việc mô tả sai đối tượng hoặc quan hệ không gian.

### 💡 Giải Pháp Đề Xuất (Full Proposed RAG)
Nhóm nghiên cứu đề xuất mô hình **Full Proposed RAG: Scene-Graph & Diverse Gated Multi-Token RAG** với 4 đóng góp kỹ thuật chính:
- **Trích xuất Đồ thị cảnh (RelTR) & Mở rộng ngữ nghĩa (WordNet):** Phát hiện các bộ ba quan hệ thực thể Chủ thể – Quan hệ – Vị ngữ $(\text{Subject} - \text{Predicate} - \text{Object})$ và mở rộng tập từ vựng đồng nghĩa để neo giữ chính xác ngữ cảnh thị giác.
- **Tái xếp hạng lai ghép & Chọn lọc đa dạng hóa MMR:** Kết hợp độ tương đồng vector CLIP và hệ số tương đồng Jaccard ngữ nghĩa đồ thị cảnh, áp dụng thuật toán *Maximal Marginal Relevance (MMR)* để loại bỏ tri thức dư thừa, trùng lặp.
- **Cơ chế Cổng kiểm soát độ tin cậy (Learnable Confidence Gate):** Tự động điều tiết tỷ trọng đóng góp giữa đặc trưng thị giác và từng câu tri thức truy hồi theo thời gian thực.
- **Hợp nhất đa token độc lập (Multi-Token Memory Representation):** Tích hợp mỗi câu tri thức truy hồi thành một token bộ nhớ riêng biệt trong không gian khóa-giá trị (Key-Value) của Transformer Decoder, giúp bảo toàn cấu trúc cú pháp nguyên bản.

---

## 🏛️ Sơ Đồ Kiến Trúc Hệ Thống (Pipeline Architecture)

![Kiến trúc Pipeline đề xuất](pipeline_architecture.png)

> **File sơ đồ vector gốc:** [`Mô hình đề xuất.pdf`](Mô%20hình%20đề%20xuất.pdf)  
> *Sơ đồ mô tả quy trình 4 giai đoạn:*
> 1. **Khối A - Mã hóa đầu vào:** Trích xuất đặc trưng thị giác thông qua CLIP ViT-B/32 và trích xuất đồ thị cảnh qua RelTR.
> 2. **Khối B - Truy xuất & Chọn lọc tri thức:** Truy hồi Top-$N$ ứng viên từ kho ngữ nghĩa bằng FAISS, mở rộng từ vựng WordNet, tính điểm lai ghép và chọn Top-$K$ đa dạng qua MMR.
> 3. **Khối C - Quy trình xây dựng kho tri thức offline:** Trích xuất vector ngữ nghĩa từ 414.113 câu mô tả huấn luyện và lập chỉ mục `IndexFlatIP`.
> 4. **Khối D - Hợp nhất có cổng & Sinh chú thích:** Điều tiết tỷ trọng qua cổng học được và giải mã chuỗi từ bằng Transformer Decoder 4 tầng với Beam Search ($B=3$).

---

## 📂 Cấu Trúc Mã Nguồn & Bằng Chứng Thực Nghiệm

Toàn bộ mã nguồn, dữ liệu thực nghiệm và sổ tay Jupyter Notebook trong kho lưu trữ này được tổ chức theo tiến trình nghiên cứu khoa học bài bản, từ mô hình đường cơ sở (baseline) đến mô hình hoàn chỉnh và các bài thực nghiệm bóc tách:

```text
KhoaLuan_Nhom2/
│
├── README.md                                   # Tài liệu hướng dẫn và bằng chứng thực nghiệm tổng thể
├── .gitignore                                  # Cấu hình bỏ qua tệp tạm, checkpoint nặng của Git
├── Mô hình đề xuất.pdf                         # Sơ đồ vector độ phân giải cao của kiến trúc đề xuất
├── pipeline_architecture.png                   # Hình ảnh trực quan hóa kiến trúc hệ thống
│
├── Kho tri thức/                               # Giai đoạn Offline: Xây dựng kho tri thức ngữ nghĩa
│   └── Buoi06_Lam_lai_kho_tri_thuc_2.ipynb     # Pipeline trích xuất CLIP ViT-B/32 & lập chỉ mục FAISS IndexFlatIP
│
├── Lv1/                                        # [Nấc 1 - Baseline] Mô hình thuần thị giác (Vision-only)
│   ├── Baseline_Level_1_COCO2014_MultiSeed_BeamSearch_k3_Seed42.ipynb  # Lượt chạy seed 42
│   ├── Baseline_Level_1_COCO2014_MultiSeed_BeamSearch_k3_Seed44.ipynb  # Lượt chạy seed 44
│   └── Baseline_Level_1_COCO2014_MultiSeed_BeamSearch_k3_Seed46.ipynb  # Lượt chạy seed 46
│
├── Lv2/                                        # [Nấc 2] Single Cross-Attention RAG (Truy hồi đơn token)
│   ├── Level_2_COCO2014_MultiSeed_BeamSearch_seed42.ipynb              # Lượt chạy seed 42
│   └── Level_2_COCO2014_MultiSeed_BeamSearch_seed44.ipynb              # Lượt chạy seed 44
│
├── Lv3/                                        # [Nấc 3] Multi-Token Memory RAG (Hợp nhất đa token độc lập)
│   ├── KetQua_Chayseed44.json                  # Tệp lưu trữ chỉ số đánh giá chi tiết seed 44
│   ├── Level_3_COCO2014_MultiSeed_BeamSearch_seed42.ipynb              # Lượt chạy seed 42
│   └── Level_3_COCO2014_MultiSeed_BeamSearch_seed46.ipynb              # Lượt chạy seed 46
│
├── Lv4/                                        # [Nấc 4] Multi-Token + Scene-Graph (RelTR) & WordNet Reranking
│   ├── Level_4_COCO2014_3Seeds_BeamSearch_k3_Reevaluate_seed42.ipynb  # Đánh giá chuẩn hóa seed 42
│   ├── Level_4_COCO2014_3Seeds_BeamSearch_k3_Reevaluate_seed44.ipynb  # Đánh giá chuẩn hóa seed 44
│   └── Level_4_COCO2014_3Seeds_BeamSearch_k3_Reevaluate_seed46.ipynb  # Đánh giá chuẩn hóa seed 46
│
├── Lv5/                                        # [Nấc 5 - Mô hình Đề xuất Hoàn chỉnh] Full Proposed RAG
│   │                                           # (RelTR + WordNet + MMR Diversity + Gated Multi-Token)
│   ├── Level_5A_COCO2014_3Seeds_BeamSearch_k3_Reevaluate_seed42.ipynb # Chạy chuẩn hóa seed 42 (MS COCO)
│   ├── Level_5A_COCO2014_3Seeds_BeamSearch_k3_Reevaluate_seed44.ipynb # Chạy chuẩn hóa seed 44 (MS COCO)
│   └── Level_5A_COCO2014_3Seeds_BeamSearch_k3_Reevaluate_seed46.ipynb # Chạy chuẩn hóa seed 46 (MS COCO)
│
├── BoSungThemBoDataFlick30k/                   # Thực nghiệm trên tập dữ liệu Flickr30k (Direct Training)
│   ├── PA_B_02_Train_DanhGia_Level2_Flickr30k_Final.ipynb              # Level 2 trên Flickr30k
│   ├── PA_B_02_Train_DanhGia_Level3_Flickr30k_Final.ipynb              # Level 3 trên Flickr30k
│   ├── PA_B_02_Train_DanhGia_Level4_Flickr30k_Final.ipynb              # Level 4 trên Flickr30k
│   └── pa_b_04_toi_uu_suy_luan_lv5_flickr30k_Final2.ipynb             # Full Proposed RAG trên Flickr30k
│
├── UngDung/                                    # Ứng dụng Demo Nghiên cứu (RAIC Research Dashboard)
│   ├── Fontend/                                # Mã nguồn giao diện Web (Vite + React) & FastAPI Backend
│   │   ├── webapp/                             # Dashboard nghiên cứu giao diện đồ họa tương tác
│   │   ├── image-captioning-demo/              # Demo ứng dụng sinh chú thích ảnh trực quan
│   │   └── image-captioning-baseline/          # Dịch vụ backend API suy luận và kiểm thử
│   ├── scripts/                                # Kịch bản khởi động / dừng hệ thống trên Windows (PowerShell)
│   ├── README_LEVEL5.md                        # Hướng dẫn chi tiết triển khai ứng dụng cục bộ
│   └── LEVEL5_VERIFICATION.md                  # Biên bản xác thực mô hình & kiểm định API
│
└── Lv6/                                        # [Nấc 6] Nghiên cứu Bóc tách (Ablation Studies) & Đánh giá Ảo giác
    ├── Tach_Dimersity/                         # Phân tích bóc tách: Loại bỏ đa dạng hóa MMR
    │   ├── Ablation_01_Bo_MMR_Diversity_Colab_43.ipynb
    │   ├── Ablation_01_Bo_MMR_Diversity_Colab_44.ipynb
    │   ├── Ablation_01_Bo_MMR_Diversity_Colab_46.ipynb
    │   └── Ablation_01_Bo_MMR_Diversity_Colab_seed45.ipynb
    │
    ├── Tach_Sematic/                           # Phân tích bóc tách: Loại bỏ mở rộng ngữ nghĩa WordNet
    │   ├── Ablation_02_Bo_Semantic_Expansion_Colab_43.ipynb
    │   ├── Ablation_02_Bo_Semantic_Expansion_Colab_44.ipynb
    │   ├── Ablation_02_Bo_Semantic_Expansion_Colab_46.ipynb
    │   └── Ablation_02_Bo_Semantic_Expansion_Colab_Seed45.ipynb
    │
    ├── Tach_ReRanking/                         # Phân tích bóc tách: Loại bỏ điểm quan hệ đồ thị cảnh RelTR
    │   ├── Ablation_03_Bo_Diem_RelTR_Colab_43.ipynb
    │   ├── Ablation_03_Bo_Diem_RelTR_Colab_44.ipynb
    │   ├── Ablation_03_Bo_Diem_RelTR_Colab_46.ipynb
    │   └── Ablation_03_Bo_Diem_RelTR_Colab_KetQua.ipynb
    │
    ├── Thay_Doi_TopK/                          # Khảo sát độ nhạy tham số số lượng câu truy hồi K in {1, 3, 5, 7, 10}
    │   ├── Buoi11_Thay_Doi_Top_K-seed43.ipynb
    │   ├── Buoi11_Thay_Doi_Top_K-seed44.ipynb
    │   ├── Buoi11_Thay_Doi_Top_K-seed45.ipynb
    │   └── Buoi11_Thay_Doi_Top_K-seed46.ipynb
    │
    ├── Chi_Dung_TriThuc/                       # Bóc tách: Đánh giá mô hình chỉ khai thác tri thức đồ thị cảnh
    │   ├── Level6_SEED42.ipynb ... Level6_SEED46.ipynb
    │   └── KetQua_seed42.ipynb
    │
    └── Tan_Dung_RelTR_3Quanhe/                 # Khảo sát mở rộng bộ ba quan hệ & Đánh giá ảo giác thực thể CHAIR
        ├── 01_CHAY_RelTR_BoBa_ChonCaption/     # Hướng 1: Tận dụng bộ ba RelTR để chọn lọc caption
        └── 02_KhoTriThuc_BoBa/                 # Hướng 2: Kho tri thức lai (Caption + Triplet) & Đo đạc CHAIR
            ├── 01_Xay_KhoTriThuc_Lai_Colab.ipynb
            ├── 02_FineTune_SinhCaption_ChamDiem_KhoLai_Colab.ipynb
            ├── 03_Cham_CHAIR_Rohrbach_Test_Colab.ipynb  # Đo đạc chỉ số ảo giác CHAIRs / CHAIRi
            └── ma_nguon/chair_rohrbach/                 # Module tính điểm CHAIR theo chuẩn Rohrbach et al.
```

---

## 📊 Bảng Kết Quả Thực Nghiệm Cốt Lõi

Toàn bộ các kết quả dưới đây đều được trích xuất trực tiếp từ nhật ký thực nghiệm (execution logs) trong các notebook:

### 1. Đối sánh trên tập dữ liệu chuẩn MS COCO 2014 (Karpathy Test Split)

| Mô hình | Cơ chế & Huấn luyện | Số tham số | BLEU-4 | METEOR | ROUGE-L | CIDEr | SPICE |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **RA-Transformer XE** *(CBMI 2022)* | kNN-Augmented | 18,4M | 38,90 | 28,90 | 58,50 | 124,50 | 22,10 |
| **COS-Net XE** *(CVPR 2022)* | Semantic Transformer | 24,5M | 39,20 | 29,70 | 58,90 | 127,40 | 22,70 |
| **SmallCap** *(CVPR 2023)* | GPT-2 Base + Prompt RAG | 117M | 37,00 | 27,90 | — | 119,70 | 21,30 |
| **EXTRA** *(EACL 2023)* | GPT-2 + LXMERT Cross-Attn | 125M | 37,50 | 28,50 | — | 120,90 | 21,70 |
| **Re-ViLM** *(EMNLP 2023)* | CLIP ViT-B/32 + RETRO | 158M | 37,80 | — | — | 129,10 | — |
| **DFCap** *(IEEE Access 2026)* | Dynamic Fusion + GPT-2 | 117M | 30,40 | 27,00 | — | 108,00 | 20,70 |
| **Vision-Only Baseline** *(Nhóm - Lv1)* | Transformer Decoder (Beam=3) | **10,2M** | 33,68 ± 0,14 | 26,77 ± 0,10 | 54,99 ± 0,13 | 107,15 ± 0,74 | 19,73 ± 0,10 |
| **Gated Multi-Token RAG** *(Nhóm - Lv3)* | Multi-Token Gated (Beam=3) | **11,6M** | 34,25 ± 0,24 | 27,54 ± 0,07 | 55,85 ± 0,12 | 110,97 ± 0,82 | 20,30 ± 0,10 |
| **Full Proposed RAG** *(Nhóm - Lv5)* | **RelTR + WordNet + MMR + Gate** | **11,6M** | **34,35 ± 0,20** | **27,51 ± 0,05** | **55,88 ± 0,12** | **111,63 ± 0,25** | **20,35 ± 0,05** |

> *Ghi chú: Mô hình đề xuất của nhóm đạt hiệu năng cao với quy mô tham số cực kỳ gọn nhẹ (**11,6M tham số khả huấn**), chỉ bằng $\approx 1/10$ so với các mô hình dựa trên GPT-2 (117M–125M).*

### 2. Kết quả 3 lượt chạy độc lập (Multi-Seed Evaluation) của Full Proposed RAG (MS COCO)

| Lượt chạy (Seed) | BLEU-1 | BLEU-2 | BLEU-3 | BLEU-4 | METEOR | ROUGE-L | CIDEr | SPICE |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Seed 42** | 74,42 | 58,07 | 44,59 | 34,24 | 27,46 | 55,82 | 111,51 | 20,35 |
| **Seed 44** | 74,33 | 58,04 | 44,58 | 34,22 | 27,52 | 55,80 | 111,46 | 20,30 |
| **Seed 46** | 74,79 | 58,50 | 44,97 | 34,57 | 27,55 | 56,01 | 111,92 | 20,40 |
| **Trung bình (Mean ± SD)** | **74,52 ± 0,24** | **58,20 ± 0,26** | **44,72 ± 0,22** | **34,35 ± 0,20** | **27,51 ± 0,05** | **55,88 ± 0,12** | **111,63 ± 0,25** | **20,35 ± 0,05** |

### 3. Đánh giá tính tổng quát hóa trên tập dữ liệu Flickr30k (Direct Training)

| Mô hình / Nấc cấu hình | BLEU-1 | BLEU-4 | METEOR | ROUGE-L | CIDEr | SPICE |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Level 2 (Single Cross-Attention)** | 66,20 ± 0,22 | 23,80 ± 0,15 | 21,30 ± 0,11 | 47,80 ± 0,14 | 60,80 ± 0,35 | 15,10 ± 0,08 |
| **Level 3 (Multi-Token RAG)** | 67,40 ± 0,18 | 24,90 ± 0,12 | 22,10 ± 0,09 | 48,90 ± 0,11 | 63,50 ± 0,28 | 15,80 ± 0,07 |
| **Level 4 (Scene-Graph Rerank)** | 67,80 ± 0,15 | 25,20 ± 0,10 | 22,30 ± 0,08 | 49,20 ± 0,10 | 64,20 ± 0,25 | 16,00 ± 0,06 |
| **Level 5 (Full Proposed RAG)** | **68,10 ± 0,16** | **25,50 ± 0,11** | **22,60 ± 0,07** | **49,60 ± 0,09** | **65,10 ± 0,22** | **16,30 ± 0,05** |

### 4. Đánh giá mức độ giảm ảo giác thực thể (Object Hallucination - CHAIR Metric)

| Tập dữ liệu | Mô hình cơ sở (Baseline) | Mô hình đề xuất (Full Proposed RAG) | Độ giảm ảo giác cấp độ câu ($\text{CHAIR}_s \downarrow$) |
|:---|:---:|:---:|:---:|
| **MS COCO** | 12,20% | **10,85%** | **Giảm 1,35%** (Tương đối: -11,07%) |
| **Flickr30k** | 13,40% | **10,97%** | **Giảm 2,43%** (Tương đối: -18,13%) |

### 5. Kết quả bóc tách các thành phần suy luận (Ablation Study)

| Cấu hình bóc tách | Cơ chế bị loại bỏ | BLEU-4 | METEOR | CIDEr | SPICE |
|:---|:---|:---:|:---:|:---:|:---:|
| **Full Proposed RAG** | Đầy đủ mọi khối đề xuất | **34,70** | **27,15** | **111,03** | **19,82** |
| **w/o MMR Diversity** | Loại bỏ bước đa dạng hóa MMR | 34,70 | 27,15 | 111,02 | 19,82 |
| **w/o WordNet Expansion** | Không tra cứu từ đồng nghĩa WordNet | 34,68 | 27,12 | 110,99 | 19,79 |
| **w/o Scene-Graph RelTR** | Loại bỏ quan hệ đồ thị cảnh (Jaccard = 0) | 34,58 | 27,10 | 110,23 | 19,65 |
| **w/o Gated Multi-Token** | Hợp nhất tuyến tính cố định không cổng | 33,10 | 26,65 | 107,15 | 19,10 |

---

## 🛠️ Yêu Cầu Môi Trường & Cài Đặt (Prerequisites)

Mô hình được thiết kế để huấn luyện và suy luận mượt mà trên môi trường điện toán đám mây **Google Colab** (chỉ cần GPU miễn phí NVIDIA Tesla T4 16GB VRAM) hoặc máy cục bộ có cấu hình tương đương.

### Các thư viện Python chính:
```bash
pip install torch torchvision --extra-index-url https://download.pytorch.org/whl/cu118
pip install transformers open_clip_torch faiss-gpu nltk pycocotools pycocoevalcap
```

Tải dữ liệu từ vựng WordNet phục vụ mở rộng ngữ nghĩa:
```python
import nltk
nltk.download('wordnet')
nltk.download('omw-1.4')
```

---

## 🚀 Hướng Dẫn Tái Lập Kết Quả Thực Nghiệm (Quickstart)

### Bước 1: Xây dựng kho tri thức ngoại sinh offline
Mở và thực thi sổ tay [`Kho tri thức/Buoi06_Lam_lai_kho_tri_thuc_2.ipynb`](Kho%20tri%20thức/Buoi06_Lam_lai_kho_tri_thuc_2.ipynb) trên Google Colab:
- Nạp 414.113 câu caption huấn luyện từ MS COCO 2014.
- Trích xuất đặc trưng bằng OpenCLIP `ViT-B/32`.
- Lập chỉ mục không gian vector với `faiss.IndexFlatIP(512)` và lưu thành file `faiss_coco_train_restval.index`.

### Bước 2: Huấn luyện và Đánh giá Mô hình Đề xuất Hoàn chỉnh (Level 5A)
Mở một trong các sổ tay trong thư mục [`Lv5/`](Lv5/):
- Ví dụ: [`Level_5A_COCO2014_3Seeds_BeamSearch_k3_Reevaluate_seed42.ipynb`](Lv5/Level_5A_COCO2014_3Seeds_BeamSearch_k3_Reevaluate_seed42.ipynb).
- Quá trình chạy gồm 15 epoch huấn luyện hàm mất mát Cross-Entropy (XE) với bộ tối ưu AdamW (learning rate = $1 \times 10^{-4}$, warmup 2.000 bước).
- Pha suy luận sử dụng giải thuật Beam Search ($B=3$) trên 5.000 ảnh kiểm thử Karpathy Test. Kết quả 8 độ đo COCO tự động được tính toán và in ra chi tiết.

### Bước 3: Đánh giá Tỷ lệ Ảo giác Thực thể (CHAIR)
Mở sổ tay [`Lv6/Tan_Dung_RelTR_3Quanhe/02_KhoTriThuc_BoBa/03_Cham_CHAIR_Rohrbach_Test_Colab.ipynb`](Lv6/Tan_Dung_RelTR_3Quanhe/02_KhoTriThuc_BoBa/03_Cham_CHAIR_Rohrbach_Test_Colab.ipynb):
- Chạy module đánh giá chuẩn hóa Rohrbach để đo lường $\text{CHAIR}_s$ (tỷ lệ câu có chứa đối tượng ảo giác) và $\text{CHAIR}_i$ (tỷ lệ cá thể đối tượng ảo giác).

---

## 📜 Trích Dẫn (Citation)

Nếu bạn sử dụng mã nguồn, dữ liệu hoặc kiến trúc mô hình trong đồ án này cho mục đích nghiên cứu học thuật, vui lòng trích dẫn theo định dạng:

```bibtex
@misc{nhom02_rag_image_captioning_2026,
  author       = {Nguyễn Quốc Việt and Ngô Quốc Bình and Nguyễn Thị Quyên and Đinh Thị Mận and Nguyễn Văn Thịnh},
  title        = {Phương pháp sinh chú thích ảnh tự động dựa trên tăng cường truy hồi tri thức ngữ nghĩa và đồ thị cảnh},
  year         = {2026},
  school       = {Khoa Công nghệ Thông tin, Trường Đại học Công Thương TP. Hồ Chí Minh (HUIT)},
  note         = {Khóa luận Tốt nghiệp Đại học ngành Công nghệ Thông tin}
}
```

---
*© 2026 Nhóm 02 - Khoa Công nghệ Thông tin, Trường Đại học Công Thương TP. Hồ Chí Minh (HUIT).*
