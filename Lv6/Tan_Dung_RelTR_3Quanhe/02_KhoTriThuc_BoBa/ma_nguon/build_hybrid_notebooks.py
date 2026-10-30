"""Build the two hybrid-bank Colab notebooks from reviewed sources."""
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]  # lv6
OUT = HERE.parent
BASE = json.loads((ROOT/'Tach_ReRanking/Ablation_03_Bo_Diem_RelTR_Colab.ipynb').read_text(encoding='utf-8'))
SETUP = ''.join(BASE['cells'][2]['source'])
VERIFY = ''.join(BASE['cells'][6]['source']).split('RUNNER_SOURCE = ', 1)[0]
PARSER = ROOT/'Tan_Dung_RelTR_3Quanhe/01_CHAY_RelTR_BoBa_ChonCaption/ma_nguon/reltr_relation_reranking.py'


def cell(kind, text):
    result = dict(cell_type=kind, metadata={}, source=text.splitlines(keepends=True),
                  id=hashlib.sha256((kind+text).encode()).hexdigest()[:12])
    if kind == 'code':
        result.update(execution_count=None, outputs=[])
    return result


def runtime(training=False):
    modules = {'drive_io.py': (HERE/'drive_io.py').read_text(encoding='utf-8'),
               'reltr_relation_reranking.py': PARSER.read_text(encoding='utf-8'),
               'hybrid_knowledge.py': (HERE/'hybrid_knowledge.py').read_text(encoding='utf-8')}
    if training:
        modules.update({'caption_ablation_runner.py': (ROOT/'_shared/caption_ablation_runner.py').read_text(encoding='utf-8'),
                        'training_stop.py': (HERE/'training_stop.py').read_text(encoding='utf-8'),
                        'hybrid_caption_runner.py': (HERE/'hybrid_caption_runner.py').read_text(encoding='utf-8')})
    return (VERIFY if training else '') + 'EMBEDDED_SOURCES = '+repr(modules)+'''\nRUNTIME_DIR = Path('/content/lv6_hybrid_runtime')
RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
SOURCE_HASHES = {n: hashlib.sha256(s.encode('utf-8')).hexdigest() for n, s in EMBEDDED_SOURCES.items()}
for name, source in EMBEDDED_SOURCES.items():
    path = RUNTIME_DIR/name
    path.write_text(source, encoding='utf-8')
    assert hashlib.sha256(path.read_bytes()).hexdigest() == SOURCE_HASHES[name]
    sys.modules.pop(Path(name).stem, None)
sys.path.insert(0, str(RUNTIME_DIR))
print('Runtime modules verified:', list(EMBEDDED_SOURCES))
'''


def write(name, cells):
    nb = dict(cells=cells, metadata=dict(kernelspec=dict(display_name='Python 3', language='python', name='python3'),
        language_info=dict(name='python'), accelerator='GPU', colab=dict(provenance=[])), nbformat=4, nbformat_minor=5)
    (OUT/name).write_text(json.dumps(nb, ensure_ascii=False, indent=1)+'\n', encoding='utf-8')
    print(name)


write('01_Xay_KhoTriThuc_Lai_Colab.ipynb', [
cell('markdown', '''# 01 — Xây kho tri thức lai: caption + bộ ba RelTR

**Chạy notebook này một lần**, sau đó dùng notebook **02** để fine-tune và chấm điểm.
Kho lai giữ nguyên ngân hàng caption L5A, thêm ngân hàng các bộ ba có thứ tự `(subject, predicate, object)` từ **RelTR Train + Restval**. Không đưa caption hoặc quan hệ Val/Test vào ngân hàng.

Mỗi bộ ba được viết thành chuỗi, ví dụ `person riding horse`, rồi mã hóa thành **một vector CLIP 512 chiều**. Notebook kiểm tra encoder bằng cách mã hóa lại 32 caption cũ, yêu cầu cosine ≥ 0.999, rồi mới trộn hai không gian. Không có train decoder trong notebook 01; không tạo điểm COCO.

Mã mới đã nhúng trong notebook. Cần dữ liệu Karpathy, kho caption cũ và CSV RelTR Train trên Drive. Chọn Colab GPU → sửa đường dẫn nếu cần → Run all. Không mở hai phiên xây cùng kho.
'''),
cell('markdown', '## 1. Google Drive và môi trường xây kho\n'),
cell('code', '''import os, sys, json, hashlib, subprocess
from pathlib import Path
from google.colab import drive
sys.dont_write_bytecode = True
drive.mount('/content/drive')
_bank_dir = Path('/content/drive/MyDrive/DataKhoaLuan/Data/knowledge_base_level2/reltr_triplet_bank_v1')
_encoder_contract = _bank_dir/'encoder_contract.json'
_transformers_spec = 'transformers>=4.45,<5'
if _encoder_contract.is_file():
    _saved_encoder = json.loads(_encoder_contract.read_text(encoding='utf-8'))
    _transformers_spec = 'transformers==' + _saved_encoder['transformers']
    print('Tiếp tục kho cũ với Transformers:', _saved_encoder['transformers'])
subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', _transformers_spec, 'huggingface_hub', 'tqdm'], check=True)
import torch
if not torch.cuda.is_available():
    raise RuntimeError('Chọn Runtime > Change runtime type > GPU để mã hóa kho.')
if _encoder_contract.is_file() and torch.__version__ != _saved_encoder['torch']:
    raise RuntimeError('Torch của runtime khác encoder_contract.json (' +
        str(torch.__version__) + ' != ' + str(_saved_encoder['torch']) +
        '). Chưa ghi thêm vào kho; cần runtime/phiên bản Torch khớp để tiếp tục.')
'''),
cell('markdown', '## 2. Đường dẫn và ngưỡng lọc\nKho mới nằm trong `knowledge_base_level2/reltr_triplet_bank_v1`; cả hai notebook phải dùng cùng `BANK_DIR`. Ngưỡng 0.5 là cấu hình khởi đầu, chưa được chứng minh tối ưu; không đổi sau khi đã mở Test.\n'),
cell('code', '''DATA_ROOT = Path('/content/drive/MyDrive/DataKhoaLuan/Data')
BANK_PARENT = DATA_ROOT/'knowledge_base_level2'
BANK_DIR = BANK_PARENT/'reltr_triplet_bank_v1'
MIN_CONFIDENCE = 0.5
ENCODE_BATCH_SIZE = 128
ANNOTATIONS_DIR = None  # Chỉ điền khi loader báo có nhiều nguồn Karpathy.
KB_DIR = None           # Mặc định knowledge_base_level1_karpathy.
if not DATA_ROOT.is_dir() or not BANK_PARENT.is_dir():
    raise FileNotFoundError('Kiểm tra Drive: cần DataKhoaLuan/Data/knowledge_base_level2 trước khi xây kho.')
print('Đầu vào RelTR:', DATA_ROOT/'reltr_inputs/coco_train_reltr_detection.csv')
print('Kho sẽ lưu:', BANK_DIR)
'''),
cell('markdown', '## 3. Nạp mã xây kho đã nhúng\n'), cell('code', runtime()),
cell('markdown', '## 4. Xây kho — có resume theo từng batch embedding\nBản sửa 29/09: lưu từ đĩa cục bộ, sao chép và đối chiếu SHA-256; không đổi tên file trên DriveFS. Giữ nguyên BANK_DIR, ngưỡng, batch và phiên bản encoder khi chạy tiếp. Khi có encoder_contract.json, cell cài thư viện tự ghim Transformers theo phiên bản đã lưu và kiểm tra Torch trước khi xây. Batch có checksum hợp lệ được dùng lại; batch chưa ghi xong checksum được mã hóa lại. Chỉ chấp nhận bản mã cũ đã biết với cùng toàn bộ dữ liệu/cấu hình; không bỏ kiểm tra checksum. Không chạy cùng kho ở hai Colab.\n'),
cell('code', '''import fcntl
import hybrid_knowledge as H
H.IO.check_output(BANK_DIR)
with Path('/tmp/lv6_build_hybrid_bank.lock').open('w') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    try:
        bank_manifest = H.build_bank(DATA_ROOT, BANK_DIR, min_confidence=MIN_CONFIDENCE,
            batch_size=ENCODE_BATCH_SIZE, annotations_dir=ANNOTATIONS_DIR, kb_dir=KB_DIR)
    finally:
        fcntl.flock(lock, fcntl.LOCK_UN)
# fcntl chỉ khóa runtime hiện tại; mỗi kho chỉ giao một người xây.
'''),
cell('markdown', '## 5. Kiểm tra kho và chuyển sang notebook 02\nSố caption lấy từ dữ liệu thật, không tự ép theo số ước lượng trong mô tả. Loader L5A hiện tại kiểm tra 566.747 hàng; mọi sai khác phải được xác minh.\n'),
cell('code', '''manifest, vectors, mapping = H.load_bank(BANK_DIR)
print('Caption rows:', manifest['source']['caption_rows'])
print('Triplet rows:', len(mapping), '| shape:', vectors.shape)
print('CLIP alignment minimum:', manifest['alignment_min_cosine'])
print('Bank SHA256:', manifest['bank_sha256'])
print('Thống kê CSV:', manifest['stats'])
for row in mapping[:5]:
    print(row['text'], '| số ảnh nguồn:', len(row['source_image_ids']))
print('Xong. Mở 02_FineTune_SinhCaption_ChamDiem_KhoLai_Colab.ipynb.')
'''),
])

write('02_FineTune_SinhCaption_ChamDiem_KhoLai_Colab.ipynb', [
cell('markdown', '''# 02 — Fine-tune, sinh caption và so sánh kho caption với kho lai

**Chạy sau notebook 01.** Một lần Run all cho một seed sẽ thực hiện cả hai nhánh:

| Nhánh | 5 token bộ nhớ | Khởi tạo | Fine-tune thêm |
|---|---|---|---|
| `caption_control` — đối chứng | 5 caption | L5A cùng seed | Tối đa 15 epochs, dừng sớm |
| `hybrid_3cap_2spo` — kho lai | 3 caption + 2 bộ ba | Cùng checkpoint L5A | Tối đa 15 epochs, dừng sớm |

15 epochs là trần huấn luyện, không bắt buộc chạy hết. Cả hai nhánh dùng cùng quy tắc early stopping: dừng sau 4 epoch **liên tiếp** không vượt Greedy Val CIDEr tốt nhất trước đó; nếu cải thiện, bộ đếm quay về 0. Lưu checkpoint của epoch Val tốt nhất. Vì dừng sớm, số epoch thực chạy của hai nhánh có thể khác nhau; bảng kết quả ghi rõ. Cả hai nhánh học toàn bộ captioner L5A; CLIP và RelTR đóng băng. Không thêm tham số hay tăng số token. Mỗi token tri thức là một embedding 512 chiều được chiếu qua `Linear(512,256)` hiện có. Khi không đủ bộ ba hợp lệ, lấy thêm caption còn lại để luôn đủ 5 token.

Truy hồi bộ ba: **CLIP ảnh → FAISS của các chuỗi S–P–O Train**, lấy 2 quan hệ hợp lệ; không biến quan hệ riêng của ảnh truy vấn thành mục kho. Caption vẫn dùng Semantic + MMR L5A với lambda đã chọn trên Val của seed. Bộ ba không qua MMR; phương án này kiểm tra toàn bộ cấu hình kho lai, chưa tách riêng đóng góp của từng thay đổi truy hồi.

Chọn best epoch bằng **Greedy Val CIDEr**. Sau khi cả hai nhánh train/Val xong, mặc định chấm **Karpathy Test 5.000 ảnh**, Beam=3, max_len=30, alpha=0.6, đủ 8 COCO metrics ×100. METEOR/SPICE qua Java 11. Không dùng Test để chọn kho/checkpoint, không tự xóa khóa Test.

Chạy đúng ba seed **42,44,46** khi cần bảng Mean ± Std; mặc định seed42 chỉ để tiện thao tác. Chỉ một runtime chạy một seed; khóa `/tmp` không khóa xuyên máy Colab.
'''),
cell('markdown', '## 1. Colab GPU, Google Drive và bộ chấm COCO\n'), cell('code', SETUP),
cell('markdown', '## 2. Chọn seed và recipe trước khi chạy\nĐể chạy thăm dò trên Val, đặt `RUN_TEST=False` trước Run all. Mặc định True đáp ứng chạy đến bảng điểm Test. Hai nhánh mất thời gian train thật; đây không phải notebook ablation chỉ suy luận. Đường dẫn ghi kết quả được kiểm tra trước khi tạo thí nghiệm.\n'),
cell('code', '''DATA_ROOT = Path('/content/drive/MyDrive/DataKhoaLuan/Data')
SEED = 42  # Chạy đúng 42 / 44 / 46; dùng checkpoint L5A đã train của chính seed.
EPOCHS = 15  # Số epoch tối đa, không bắt buộc chạy hết.
EARLY_STOP_PATIENCE = 4  # Dừng nếu 4 epoch liên tiếp không cải thiện Greedy Val CIDEr.
EARLY_STOP_MIN_DELTA = 0.0
BATCH_SIZE = 64
LEARNING_RATE = 5e-5
RUN_TEST = True
OUTPUT_ROOT = DATA_ROOT/'baseline_level6/Dung_KhoTriThucLV2'
BANK_DIR = DATA_ROOT/'knowledge_base_level2/reltr_triplet_bank_v1'
OVERRIDES = {'vocab_path': None, 'annotations_dir': None, 'feature_dir': None, 'kb_dir': None}
if SEED not in (42, 44, 46):
    raise ValueError('Thí nghiệm này chỉ tổng hợp seed 42, 44, 46.')
if not DATA_ROOT.is_dir() or not OUTPUT_ROOT.is_dir():
    raise FileNotFoundError('Kiểm tra Drive: cần DataKhoaLuan/Data/baseline_level6/Dung_KhoTriThucLV2.')
if not (BANK_DIR/'manifest.json').is_file():
    raise FileNotFoundError('Chưa thấy kho bộ ba. Chạy notebook 01 với cùng BANK_DIR trước.')
print('Warm start:', DATA_ROOT/'baseline_level5/lv5_A/trained_5tokens_v1'/f'seed{SEED}/best_model.pt')
print('Kho bộ ba:', BANK_DIR)
print('Kết quả:', OUTPUT_ROOT/'runs'/f'seed{SEED}')
print('Chấm Test sau train/Val:', RUN_TEST)
'''),
cell('markdown', '## 3. Xác minh mã L5A và nạp mã mới\nNotebook tự chứa các module mới; các module L5A gốc vẫn đọc từ Drive và đối chiếu SHA-256. Không ghi đè L5.\n'),
cell('code', runtime(training=True)),
cell('markdown', '## 4. Kiểm tra checkpoint, kho và nguồn dữ liệu\nCheckpoint bắt buộc có hồ sơ hoàn tất 15 epochs L5A. Kho mới phải khớp caption bank, RelTR Train và các split đang dùng.\n'),
cell('code', '''from hybrid_caption_runner import HybridExperiment, aggregate
from drive_io import check_output
from training_stop import update as early_stop_update
check_output(OUTPUT_ROOT)
assert early_stop_update(0.8, 3, 0.7, 5, 15, 4, 0.0) == (False, 4, True, 'early_stopping')
experiment = HybridExperiment(DATA_ROOT, SEED, OUTPUT_ROOT, BANK_DIR, SOURCE_HASHES,
    epochs=EPOCHS, batch_size=BATCH_SIZE, learning_rate=LEARNING_RATE,
    early_stop_patience=EARLY_STOP_PATIENCE, early_stop_min_delta=EARLY_STOP_MIN_DELTA,
    overrides=OVERRIDES)
print('Study:', experiment.contract_id)
print('Initial L5 state:', experiment.initial_hash)
print('Bank:', experiment.bank_manifest['bank_sha256'])
'''),
cell('markdown', '## 5. Chạy hai nhánh: Train → Val → Test\nMỗi nhánh dừng sau 4 epoch liên tiếp không tăng Greedy Val CIDEr tốt nhất hoặc khi đạt trần 15 epoch; dùng checkpoint Val tốt nhất. Tự lưu hai bản checkpoint luân phiên mỗi 250 batch và cuối epoch; khôi phục optimizer, scheduler, RNG và vị trí batch. Chạy lại cùng cấu hình để tiếp tục. Kết quả đã hoàn tất được dùng lại. Không đổi seed/recipe để vượt lỗi checksum.\n'),
cell('code', '''import fcntl
with Path('/tmp') .joinpath(f'lv6-hybrid-seed{SEED}.lock').open('w') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    try:
        results = experiment.run(run_test=RUN_TEST)
    finally:
        fcntl.flock(lock, fcntl.LOCK_UN)
'''),
cell('markdown', '## 6. Bảng 8 chỉ số và mức chênh lệch\n`delta = kho lai − kho caption được fine-tune cùng ngân sách`. Số dương là tăng; chưa đủ căn cứ kết luận ý nghĩa thống kê từ một seed. Không ghép trực tiếp với điểm L4/ablation khác giao thức.\n'),
cell('code', '''import pandas as pd
from IPython.display import display
for split, rows in results.items():
    print(split.upper(), '| metric ×100')
    display(pd.DataFrame(rows).round(4))
    print('CSV:', experiment.seed_dir/f'{split}_comparison.csv')
for arm in ('caption_control', 'hybrid_3cap_2spo'):
    print(arm, '→', experiment.seed_dir/arm)
'''),
cell('markdown', '## 7. Xem ví dụ tri thức và caption đã sinh\nĐây là dữ liệu của lần chạy thật; các quan hệ là dự đoán RelTR, có thể sai.\n'),
cell('code', '''import storage
split = 'test' if RUN_TEST else 'val'
hybrid = experiment.prepare(split)['hybrid_3cap_2spo']
predictions = storage.read_json(experiment.seed_dir/'hybrid_3cap_2spo'/f'{split}_predictions.json')
old_predictions = storage.read_json(experiment.seed_dir/'caption_control'/f'{split}_predictions.json')
for pos in range(min(3, len(predictions))):
    print('\nẢnh:', predictions[pos]['image_id'])
    for row in hybrid['row_indices'][pos]:
        if row < len(experiment.kb):
            print('  CAP:', experiment.kb_captions[row])
        else:
            print('  SPO:', experiment.triplets[int(row)-len(experiment.kb)]['text'])
    print('Caption cũ:', old_predictions[pos]['caption'])
    print('Kho lai:', predictions[pos]['caption'])
'''.replace("print('\nẢnh:", "print('\\nẢnh:")),
cell('markdown', '## 8. Tổng hợp 3 seed khi đã đủ kết quả\nCell này tự thông báo nếu chưa đủ 42,44,46; không làm hỏng lượt chạy cá nhân. Std dùng ddof=1, có cả chênh lệch theo cặp seed.\n'),
cell('code', '''summary = aggregate(OUTPUT_ROOT, seeds=(42, 44, 46), split='test' if RUN_TEST else 'val')
if summary is not None:
    display(pd.DataFrame(summary).round(4))
'''),
])
