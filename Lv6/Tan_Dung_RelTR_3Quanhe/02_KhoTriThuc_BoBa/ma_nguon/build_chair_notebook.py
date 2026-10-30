"""Build a self-contained Colab notebook that scores saved Beam Test captions."""
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent/'03_Cham_CHAIR_Rohrbach_Test_Colab.ipynb'
CHAIR = HERE/'chair_rohrbach'


def cell(kind, source):
    result = dict(cell_type=kind, metadata={}, source=source.splitlines(keepends=True),
                  id=hashlib.sha256((kind+source).encode('utf-8')).hexdigest()[:12])
    if kind == 'code':
        result.update(execution_count=None, outputs=[])
    return result


sources = {name: (CHAIR/name).read_text(encoding='utf-8')
           for name in ('chair_score.py', 'pattern_singular.py', 'synonyms.txt',
                        'LICENSE_PATTERN.txt')}
sources['drive_io.py'] = (HERE/'drive_io.py').read_text(encoding='utf-8')
source_hashes = {name: hashlib.sha256(body.encode('utf-8')).hexdigest()
                 for name, body in sources.items()}
cells = [
    cell('markdown', '''# 03 — CHAIR trên caption Test của hai kho tri thức

**Chạy sau notebook 02** khi đã có `test_predictions.json` cho hai nhánh của ít nhất một seed. Notebook này chỉ **đọc caption đã sinh bằng Beam Search** và bốn file annotation COCO 2014 gốc; không train, không chạy lại mô hình, không dùng GPU. Có thể chạy lại sau khi hoàn tất thêm seed.

CHAIR dùng đúng 80 dòng từ đồng nghĩa trong [`LisaAnne/Hallucination/data/synonyms.txt`](https://github.com/LisaAnne/Hallucination/blob/master/data/synonyms.txt), cách tách từ và singularize theo mã gốc. CHAIR_s là tỷ lệ caption có ít nhất một vật thể COCO không được xác nhận; CHAIR_i là tỷ lệ lượt nhắc vật thể COCO sai trên tổng lượt nhắc vật thể COCO. **Cả hai càng thấp càng tốt.** Vật thể đúng được lấy từ hợp của COCO instance labels và các caption tham chiếu, như [`utils/chair.py`](https://github.com/LisaAnne/Hallucination/blob/master/utils/chair.py). Đây là bản chuyển Python 3 của phép chấm, không dùng một danh sách `coco_synonyms` tự viết.

Lưu ý: CHAIR chỉ đo ảo giác **vật thể thuộc 80 lớp COCO**, không bao phủ sai quan hệ, thuộc tính hay vật thể ngoài bộ từ này. CHAIR_i là tỷ số trên toàn bộ lượt nhắc, không phải trung bình CHAIR_i theo ảnh.
'''),
    cell('markdown', '## 1. Gắn Drive và cài bộ đọc COCO / NLTK\n'),
    cell('code', '''import sys, json, hashlib, subprocess
from pathlib import Path
from google.colab import drive
drive.mount('/content/drive')
subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', 'nltk==3.9.1', 'ijson>=3.3,<4'], check=True)
import nltk
for package in ('punkt', 'punkt_tab'):
    if not nltk.download(package, quiet=True):
        raise RuntimeError('Không tải được NLTK ' + package)
assert nltk.word_tokenize('A man rides a horse.') == ['A', 'man', 'rides', 'a', 'horse', '.']
'''),
    cell('markdown', '## 2. Đường dẫn và seed\nCần `instances_train2014.json`, `instances_val2014.json`, `captions_train2014.json`, `captions_val2014.json` trong cùng thư mục annotation. Dữ liệu Karpathy `dataset_coco.json` một mình không đủ cho CHAIR gốc.\n'),
    cell('code', '''DATA_ROOT = Path('/content/drive/MyDrive/DataKhoaLuan/Data')
OUTPUT_ROOT = DATA_ROOT/'baseline_level6/Dung_KhoTriThucLV2'
ANNOTATIONS_DIR = None  # Nếu 4 annotation COCO 2014 nằm chỗ khác, điền Path('...') ở đây.
SEEDS = (42, 44, 46)
if not OUTPUT_ROOT.is_dir():
    raise FileNotFoundError('Không thấy thư mục kết quả Dung_KhoTriThucLV2 trên Drive')
print('Đọc dự đoán:', OUTPUT_ROOT/'runs')
print('Lưu CHAIR riêng:', OUTPUT_ROOT/'chair_rohrbach')
'''),
    cell('markdown', '## 3. Nạp mã chấm và `synonyms.txt` gốc đã nhúng\nMã tính CHAIR chuyển cú pháp sang Python 3 nhưng giữ công thức, quy tắc cụm từ và phép singularize của bản gốc. Mỗi file được đối chiếu SHA-256 trước khi chạy.\n'),
    cell('code', '''EMBEDDED_SOURCES = ''' + repr(sources) + '''
EXPECTED_HASHES = ''' + repr(source_hashes) + '''
RUNTIME_DIR = Path('/content/lv6_chair_rohrbach')
RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
for name, content in EMBEDDED_SOURCES.items():
    target = RUNTIME_DIR/name
    target.write_text(content, encoding='utf-8')
    actual = hashlib.sha256(target.read_bytes()).hexdigest()
    if actual != EXPECTED_HASHES[name]:
        raise RuntimeError('Mã hoặc từ điển CHAIR không khớp: ' + name)
sys.path.insert(0, str(RUNTIME_DIR))
for name in ('drive_io', 'chair_score', 'pattern_singular'):
    sys.modules.pop(name, None)
from chair_score import annotation_dir, run
from drive_io import check_output
source_dir = annotation_dir(DATA_ROOT, ANNOTATIONS_DIR)
check_output(OUTPUT_ROOT/'chair_rohrbach')
print('COCO annotations:', source_dir)
print('Rohrbach synonyms SHA-256:', EXPECTED_HASHES['synonyms.txt'])
'''),
    cell('markdown', '## 4. Chấm CHAIR Test Beam trên các seed đã hoàn tất\nChỉ đọc `test_predictions.json` đã khóa của notebook 02. Nếu một seed chưa hoàn tất cả hai nhánh, notebook bỏ qua seed đó. Khi đủ ba seed, xuất thêm mean ± sample std.\n'),
    cell('code', '''rows = run(DATA_ROOT, OUTPUT_ROOT, RUNTIME_DIR/'synonyms.txt',
           annotations_override=ANNOTATIONS_DIR, seeds=SEEDS)
import pandas as pd
from IPython.display import display
display(pd.DataFrame(rows).round(4))
print('Bảng theo seed:', OUTPUT_ROOT/'chair_rohrbach/test_chair_by_seed.csv')
if (OUTPUT_ROOT/'chair_rohrbach/test_chair_3seed_summary.json').is_file():
    display(pd.DataFrame(json.loads((OUTPUT_ROOT/'chair_rohrbach/test_chair_3seed_summary.json').read_text(encoding='utf-8'))).round(4))
'''),
    cell('markdown', '## 5. Đặt CHAIR cạnh 8 chỉ số COCO Test\nTất cả là điểm Test của cùng caption Beam. CHAIR thấp hơn là tốt hơn; 8 chỉ số chất lượng cao hơn thường là tốt hơn. Không chọn lại checkpoint hay siêu tham số dựa trên bảng Test này.\n'),
    cell('code', '''comparison = []
for row in rows:
    seed, arm = row['seed'], row['arm']
    old = json.loads((OUTPUT_ROOT/'runs'/f'seed{seed}'/arm/'test_summary.json').read_text(encoding='utf-8'))
    comparison.append({'seed': seed, 'arm': arm,
        **{k: v*100 for k, v in old['metrics_raw'].items()},
        'CHAIR_s': row['CHAIR_s'], 'CHAIR_i': row['CHAIR_i']})
display(pd.DataFrame(comparison).round(4))
print('Kết quả chi tiết mỗi nhánh:', OUTPUT_ROOT/'chair_rohrbach')
'''),
]
notebook = dict(cells=cells, metadata=dict(
    kernelspec=dict(display_name='Python 3', language='python', name='python3'),
    language_info=dict(name='python'), colab=dict(provenance=[])),
    nbformat=4, nbformat_minor=5)
OUT.write_text(json.dumps(notebook, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(OUT.name)
