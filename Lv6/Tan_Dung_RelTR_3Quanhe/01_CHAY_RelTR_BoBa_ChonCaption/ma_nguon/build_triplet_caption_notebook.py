"""Embed the reviewed Level-5A reader and new triplet modules into a Colab notebook."""

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]  # lv6; ma_nguon/01_CHAY.../Tan_Dung.../lv6
STANDARD = ROOT/'Tach_ReRanking'/'Ablation_03_Bo_Diem_RelTR_Colab.ipynb'
OUT = HERE.parent/'CHAY_RelTR_BoBa_ChonCaption_Colab.ipynb'


def cell(kind, source):
    row = {'cell_type': kind, 'metadata': {}, 'source': source.splitlines(keepends=True)}
    if kind == 'code':
        row.update(execution_count=None, outputs=[])
    return row


standard = json.loads(STANDARD.read_text(encoding='utf-8'))
environment_setup = ''.join(standard['cells'][2]['source'])
verification = ''.join(standard['cells'][6]['source']).split('RUNNER_SOURCE = ', 1)[0]
modules = {
    'caption_ablation_runner.py': (ROOT/'_shared'/'caption_ablation_runner.py').read_text(encoding='utf-8'),
    'reltr_relation_reranking.py': (HERE/'reltr_relation_reranking.py').read_text(encoding='utf-8'),
    'triplet_caption_runner.py': (HERE/'triplet_caption_runner.py').read_text(encoding='utf-8'),
}
writer = [verification,
          "RUNTIME_DIR = Path('/content/lv6_triplet_runtime')\n",
          "RUNTIME_DIR.mkdir(parents=True, exist_ok=True)\n",
          'EMBEDDED_SOURCES = {\n']
for name, source in modules.items():
    writer.append(f'    {name!r}: {source!r},\n')
writer += ["}\n",
           "SOURCE_SHA256 = {name: hashlib.sha256(src.encode('utf-8')).hexdigest() for name, src in EMBEDDED_SOURCES.items()}\n",
           "for name, source in EMBEDDED_SOURCES.items():\n",
           "    path = RUNTIME_DIR/name\n",
           "    path.write_text(source, encoding='utf-8')\n",
           "    if hashlib.sha256(path.read_bytes()).hexdigest() != SOURCE_SHA256[name]:\n",
           "        raise RuntimeError('Mã runtime bị thay đổi: '+name)\n",
           "sys.path.insert(0, str(RUNTIME_DIR))\n",
           "for name in ['caption_ablation_runner', 'reltr_relation_reranking', 'triplet_caption_runner']:\n",
           "    sys.modules.pop(name, None)\n",
           "import reltr_relation_reranking as R\n",
           "from triplet_caption_runner import TripletCaptionExperiment\n",
           "R.configure_wordnet(True)\n",
           "print('Mã đã xác minh:', SOURCE_SHA256)\n"]

cells = [
    cell('markdown', """# Level 6 — Tận dụng bộ ba quan hệ RelTR trong sinh chú thích ảnh

Notebook này nối trực tiếp RelTR `(subject, predicate, object)` vào **xếp hạng Top-50 → Top-5** của Level 5A, rồi dùng cùng checkpoint, năm embedding chú thích, Beam Search `k=3`, `max_len=30` và bộ chấm COCO Java. Biến thể thay **lựa chọn caption**; điểm đưa vào gate vẫn là relevance Level 5A. Không train/fine-tune trong notebook này.

**Chạy Validation trước.** Mặc định `SPLIT='val'`, `BETA=0.2` cố định từ prototype. Chỉ đổi sang Test sau khi Val cùng seed hoàn tất và được xem xét; Test có khóa riêng, không xóa khóa. Các ảnh không có quan hệ hoặc không có caption ứng viên khớp quan hệ sẽ giữ nguyên Top-5 đối chứng. Điểm quan hệ là khớp từ vựng có thứ tự S→P→O, chưa phải bộ phân tích cú pháp đầy đủ.

Đây **chưa phải kho tri thức bằng bộ ba**: kho và năm token vẫn là caption embedding cũ. Kết quả Val/Test mới chỉ đo tác dụng của bộ ba ở bước chọn caption.
"""),
    cell('markdown', '## 1. Môi trường Colab và Google Drive\n'),
    cell('code', environment_setup),
    cell('markdown', '## 2. Cấu hình thí nghiệm\nSửa `DATA_ROOT` nếu Drive là `/content/drive/MyDrive/Data/Data`. Chọn một seed đã có checkpoint Level 5A.\n'),
    cell('code', """DATA_ROOT = Path('/content/drive/MyDrive/DataKhoaLuan/Data')
SEED = 45
SPLIT = 'val'       # Sau khi xem kết quả Val, mới chủ động đổi thành 'test'.
ALLOW_TEST = False   # Đổi True cùng lúc với SPLIT='test'; không tự chạy Test khi Run all.
BETA = 0.2           # Tỷ trọng điểm quan hệ trong bước chọn Top-5.
MIN_CONFIDENCE = 0.5
MAX_TRIPLETS = 10
OUTPUT_ROOT = DATA_ROOT/'baseline_level6'/'Tan_Dung_RelTR_3Quanhe'
OVERRIDES = {'vocab_path': None, 'annotations_dir': None,
             'feature_dir': None, 'kb_dir': None}
if SPLIT not in ('val', 'test') or (SPLIT == 'test' and not ALLOW_TEST):
    raise ValueError('Mặc định chỉ chạy Val. Để chấm Test, đặt SPLIT=test và ALLOW_TEST=True.')
print('Split:', SPLIT, '| seed:', SEED, '| beta:', BETA)
print('Checkpoint:', DATA_ROOT/'baseline_level5/lv5_A/trained_5tokens_v1'/f'seed{SEED}/best_model.pt')
"""),
    cell('markdown', '## 3. Xác minh mã Level 5A và nạp module bộ ba\nCác module được nhúng trong notebook, xác minh SHA-256 trước khi chạy; không ghi đè mã Level 5A trên Drive.\n'),
    cell('code', ''.join(writer)),
    cell('markdown', '## 4. Nạp checkpoint và dữ liệu đúng split\nBước này kiểm tra hồ sơ train 15 epochs, checkpoint, feature, caption KB, RelTR CSV và ID của 5.000 ảnh.\n'),
    cell('code', """experiment = TripletCaptionExperiment(
    DATA_ROOT, SEED, OUTPUT_ROOT,
    SOURCE_SHA256['caption_ablation_runner.py'],
    SOURCE_SHA256['triplet_caption_runner.py'],
    SOURCE_SHA256['reltr_relation_reranking.py'],
    beta=BETA, min_confidence=MIN_CONFIDENCE,
    max_triplets=MAX_TRIPLETS, overrides=OVERRIDES, split=SPLIT)
print('Model SHA-256:', experiment.model_hash)
print('RelTR CSV:', experiment.reltr_csv)
print('Triplets sau lọc:', experiment.triplet_stats)
"""),
    cell('markdown', '## 5. Chọn Top-5 theo quan hệ, sinh caption và chấm 8 chỉ số COCO\nĐối chứng `full` và biến thể dùng cùng checkpoint/split/Top-50. Có resume theo chunk và lưu riêng khỏi ba ablation đã chạy.\n'),
    cell('code', """import fcntl
lock_path = Path('/tmp')/('lv6-triplet-seed'+str(SEED)+'-'+SPLIT+'.lock')
with lock_path.open('w') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    try:
        comparison_rows, triplet_diagnostics = experiment.run_triplet()
    finally:
        fcntl.flock(lock, fcntl.LOCK_UN)
"""),
    cell('markdown', '## 6. Xem kết quả và vị trí lưu\nMetric ×100; delta = `triplet_relation − full`. Đây là kết quả của **một seed**.\n'),
    cell('code', """import pandas as pd
from IPython.display import display
display(pd.DataFrame(comparison_rows).round(4))
print('Ảnh có triplet:', triplet_diagnostics['n_images_with_triplets'])
print('Ảnh có caption khớp quan hệ:', triplet_diagnostics['n_images_with_candidate_relation_match'])
print('Ảnh đổi bộ Top-5:', triplet_diagnostics['changed_top5_image_count'])
print('Comparison:', experiment.common_dir/'comparison.json')
print('Predictions/metrics:', experiment.output_root/'triplet_relation'/f'seed{SEED}'/SPLIT/experiment.contract_id[:20])
if SPLIT == 'val':
    print('Cấu hình Val cho Test:', experiment.selection_path)
"""),
]
notebook = {'cells': cells, 'metadata': {'kernelspec': {'display_name': 'Python 3',
    'language': 'python', 'name': 'python3'}, 'language_info': {'name': 'python'}},
    'nbformat': 4, 'nbformat_minor': 5}
OUT.write_text(json.dumps(notebook, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(OUT.name)
