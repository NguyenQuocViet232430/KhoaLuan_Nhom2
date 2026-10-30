"""Train-only RelTR SPO bank. No caption references from Val/Test are embedded."""
import hashlib
import importlib.metadata
import json
import tempfile
from pathlib import Path

import numpy as np
import reltr_relation_reranking as R
from reltr_relation_reranking import load_reltr_triplets
import drive_io as IO

# Exact previous implementation reviewed for this storage-only migration.
# The encoder, inputs, order, thresholds and recipe must still match exactly.
LEGACY_STORAGE_CODE = 'd8ded22d3ddf094e2f39662bb613b06fba699cb9e2b9ecdab598b019f4f6340e'


def compatible_bank_code(saved, current=None):
    return saved in {current or sha(__file__), LEGACY_STORAGE_CODE}


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False,
                                    separators=(',', ':')).encode('utf-8')).hexdigest()


def sha(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for block in iter(lambda: f.read(8 * 1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def read_json(path):
    return IO.read_json(path)


def write_json(path, value):
    IO.write_json(path, value)


def guard(path, value):
    if IO.json_available(path):
        if read_json(path) != value:
            raise ValueError('Existing configuration differs; do not overwrite: ' + str(path))
    else:
        write_json(path, value)


def save_array(path, array):
    path = Path(path)
    with tempfile.TemporaryDirectory(prefix='lv6_array_') as folder:
        local = Path(folder)/'payload.npy'
        with local.open('wb') as f:
            np.save(f, array, allow_pickle=False)
        checksum = IO.publish(local, path)
    write_json(path.with_suffix('.sha256.json'), {'sha256': checksum})


def bank_source_contract(path, expected):
    """Preserve the original contract and chunks for the known I/O-only fix."""
    if not IO.json_available(path):
        write_json(path, expected)
        return expected
    old = read_json(path)
    if old == expected:
        return old
    candidate = dict(old, source_code=expected['source_code'])
    if old.get('source_code') != LEGACY_STORAGE_CODE or candidate != expected:
        raise ValueError('Bank inputs/recipe/code changed; preserving existing bank: ' + str(path))
    print('Resume bank from known pre-fix writer; all data/recipe hashes unchanged.')
    return old


def load_chunk(path):
    """None means an uncommitted batch; a checksum mismatch still stops the run."""
    path = Path(path)
    if not path.is_file():
        return None
    try:
        return checked_array(path)
    except (FileNotFoundError, UnicodeError, json.JSONDecodeError):
        print('Re-encode incomplete batch checksum:', path.name)
        return None


def checked_array(path):
    path = Path(path)
    if sha(path) != read_json(path.with_suffix('.sha256.json'))['sha256']:
        raise IOError('Array checksum failed: ' + str(path))
    return np.load(path, mmap_mode='r', allow_pickle=False)


def split_ids(root, annotations_dir=None):
    root = Path(root)
    candidates = ([Path(annotations_dir)] if annotations_dir else [
        root/'COCO_2014/annotations_trainval2014/annotations',
        root/'COCO_2014/annotations', root/'annotations', root])
    candidates = [p for p in candidates if (p/'dataset_coco.json').is_file() or
                  all((p/f'captions_karpathy_{s}.json').is_file() for s in ('train', 'val', 'test'))]
    if len(candidates) != 1:
        raise ValueError('Set ANNOTATIONS_DIR to the unique Karpathy source: ' + str(candidates))
    ann = candidates[0]
    ids = {s: set() for s in ('train', 'val', 'test')}
    if (ann/'dataset_coco.json').is_file():
        for row in read_json(ann/'dataset_coco.json')['images']:
            s = 'train' if row['split'] == 'restval' else row['split']
            iid = int(row['cocoid'])
            if s not in ids or iid in ids[s]:
                raise ValueError('Invalid split or duplicate image ID')
            ids[s].add(iid)
    else:
        for s in ids:
            obj = read_json(ann/f'captions_karpathy_{s}.json')
            ids[s] = ({int(r['image_id']) for r in obj['annotations']} if 'annotations' in obj
                      else {int(k) for k in obj})
    if {s: len(v) for s, v in ids.items()} != {'train': 113287, 'val': 5000, 'test': 5000}:
        raise ValueError('Wrong Karpathy split sizes')
    if ids['train'] & ids['val'] or ids['train'] & ids['test'] or ids['val'] & ids['test']:
        raise ValueError('Split leakage')
    return {s: sorted(v) for s, v in ids.items()}


def make_triplet_records(table, train_ids):
    """Dedup exact ordered SPO; preserve EVERY training source for self-exclusion."""
    train_ids = set(map(int, train_ids))
    if set(map(int, table)) != train_ids:
        raise ValueError('RelTR Train CSV must cover exactly Train+Restval, including no_relation rows')
    merged = {}
    for iid, triples in table.items():
        for t in triples:
            key = (t['subject'], t['predicate'], t['object'])
            merged.setdefault(key, {})[int(iid)] = float(t['confidence'])
    result = []
    for key in sorted(merged):
        sources = merged[key]
        result.append(dict(row_id=len(result), subject=key[0], predicate=key[1], object=key[2],
            text=' '.join(key), source_image_ids=sorted(sources),
            source_confidences=[sources[i] for i in sorted(sources)]))
    if not result:
        raise ValueError('No valid training triplets after filtering')
    return result


def valid_source(record, query_id):
    return next((i for i in record['source_image_ids'] if i != int(query_id)), None)


def combine_tokens(caption_rows, caption_scores, relation_rows, relation_scores, offset):
    """Exactly five unique memory rows; 3 caption + up to 2 SPO, then caption fallback."""
    if len(caption_rows) != 5 or len(set(map(int, caption_rows))) != 5:
        raise ValueError('Need five distinct caption rows')
    n = min(2, len(relation_rows))
    if len(set(map(int, relation_rows[:n]))) != n or len(relation_scores) < n:
        raise ValueError('Invalid triplet rows')
    rows = list(map(int, caption_rows[:3])) + [offset + int(r) for r in relation_rows[:n]]
    scores = list(map(float, caption_scores[:3])) + list(map(float, relation_scores[:n]))
    rows += list(map(int, caption_rows[3:5-n]))
    scores += list(map(float, caption_scores[3:5-n]))
    if len(rows) != 5 or len(set(rows)) != 5 or not np.isfinite(scores).all():
        raise ValueError('Invalid hybrid memory')
    if not all(0 <= s <= 1 for s in scores):
        raise ValueError('Memory confidence outside [0,1]')
    return rows, scores


def build_bank(root, out, min_confidence=.5, batch_size=128, annotations_dir=None, kb_dir=None):
    """Encode unique SPO with the SAME frozen CLIP text space as the existing KB."""
    import torch
    from transformers import CLIPModel, CLIPTokenizer
    from huggingface_hub import model_info
    from tqdm.auto import tqdm
    root, out = Path(root), Path(out)
    out.mkdir(parents=True, exist_ok=True)
    ids = split_ids(root, annotations_dir)
    train_set = set(ids['train'])
    if kb_dir is None:
        found = [p for p in [root/'knowledge_base_level1_karpathy', root/'knowledge_base']
                 if (p/'text_embeddings_train_restval.npy').is_file()]
        if len(found) != 1:
            raise ValueError('Set KB_DIR; ambiguous/missing caption bank')
        kb_dir = found[0]
    kb_dir = Path(kb_dir)
    caption_path, map_path = kb_dir/'text_embeddings_train_restval.npy', kb_dir/'text_embedding_mapping.jsonl'
    emb = np.load(caption_path, mmap_mode='r')
    captions, caption_ids = [], []
    with map_path.open(encoding='utf-8') as f:
        for i, line in enumerate(f):
            r = json.loads(line)
            if int(r.get('row_id', i)) != i or r['split'] not in ('train', 'restval') or int(r['image_id']) not in train_set:
                raise ValueError('Caption mapping contains invalid row or held-out source')
            captions.append(str(r['caption']).strip())
            caption_ids.append(int(r['image_id']))
    if emb.shape != (len(captions), 512) or set(caption_ids) != train_set or not all(captions):
        raise ValueError('Caption bank/mapping mismatch')
    for start in range(0, len(emb), 8192):
        x = emb[start:start+8192]
        if not np.isfinite(x).all() or not np.allclose(np.linalg.norm(x, axis=1), 1, atol=1e-3):
            raise ValueError('Caption bank must be finite, L2-normalized')
    csv_path = root/'reltr_inputs/coco_train_reltr_detection.csv'
    table, stats = load_reltr_triplets(csv_path, min_confidence)
    records = make_triplet_records(table, ids['train'])
    del table
    source_contract = dict(version='hybrid-spo-bank-v1', source_code=sha(__file__),
        parser_code=sha(R.__file__),
        split_sha256={s: digest(v) for s, v in ids.items()}, min_confidence=min_confidence,
        caption_embeddings_sha256=sha(caption_path), caption_mapping_sha256=sha(map_path),
        reltr_train_sha256=sha(csv_path), mapping_sha256=digest(records),
        caption_rows=len(emb), triplet_rows=len(records), template='subject predicate object',
        dedup='ordered_exact_spo_all_sources', embedding_dim=512, batch_size=batch_size)
    source_contract = bank_source_contract(out/'source_contract.json', source_contract)
    write_json(out/'io_implementation.json', dict(source_code=sha(__file__),
        drive_io_code=sha(IO.__file__), original_source_code=source_contract['source_code']))
    manifest_path = out/'manifest.json'
    if IO.json_available(manifest_path):
        manifest, _, _ = load_bank(out)
        if manifest['source'] != source_contract:
            raise ValueError('Existing bank has different sources')
        if not manifest_path.is_file():
            write_json(manifest_path, manifest)
        print('Bank already complete:', out)
        return manifest
    model_id = 'openai/clip-vit-base-patch32'
    encoder_path = out/'encoder_contract.json'
    revision = read_json(encoder_path)['revision'] if IO.json_available(encoder_path) else model_info(model_id).sha
    encoder = dict(model=model_id, revision=revision,
        transformers=importlib.metadata.version('transformers'), torch=torch.__version__,
        encode='text_model.pooler_output -> text_projection -> L2, float32', max_length=77)
    guard(encoder_path, encoder)
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    model = CLIPModel.from_pretrained(model_id, revision=revision).float().to(device).eval()
    tokenizer = CLIPTokenizer.from_pretrained(model_id, revision=revision)
    for p in model.parameters():
        p.requires_grad_(False)

    @torch.inference_mode()
    def encode(texts):
        inputs = tokenizer(texts, padding=True, truncation=True, max_length=77, return_tensors='pt').to(device)
        x = model.text_projection(model.text_model(**inputs).pooler_output)
        x = torch.nn.functional.normalize(x.float(), dim=-1).cpu().numpy()
        if x.shape != (len(texts), 512) or not np.isfinite(x).all():
            raise ValueError('CLIP returned invalid embeddings')
        return x.astype(np.float32)

    # Verify encoder identity empirically before mixing old and new embeddings.
    probe = np.linspace(0, len(captions)-1, 32, dtype=int)
    sim = np.sum(encode([captions[i] for i in probe]) * np.asarray(emb[probe]), axis=1)
    if float(sim.min()) < .999:
        raise ValueError(f'CLIP differs from caption KB: min cosine={sim.min():.6f}; do not mix spaces')
    write_json(out/'encoder_alignment.json', dict(rows=probe.tolist(), cosines=sim.tolist(), minimum=float(sim.min())))
    chunks = []
    for start in tqdm(range(0, len(records), batch_size), desc='CLIP training SPO'):
        path = out/'embedding_chunks'/f'{start:08d}.npy'
        # Uncommitted chunk is safe to re-encode: no model training or Test occurs here.
        x = load_chunk(path)
        if x is None:
            x = encode([r['text'] for r in records[start:start+batch_size]])
            save_array(path, x)
        if x.shape != (min(batch_size, len(records)-start), 512):
            raise ValueError('Bad embedding chunk')
        chunks.append(np.asarray(x))
    triplet_emb = np.concatenate(chunks)
    save_array(out/'triplet_embeddings.npy', triplet_emb)
    write_json(out/'triplet_mapping.json', records)
    manifest = dict(source=source_contract, encoder=encoder, stats=stats,
        alignment_min_cosine=float(sim.min()), complete=True,
        triplet_embeddings_sha256=sha(out/'triplet_embeddings.npy'),
        triplet_mapping_sha256=sha(out/'triplet_mapping.json'))
    manifest['bank_sha256'] = digest(manifest)
    write_json(manifest_path, manifest)
    print('BUILD COMPLETE:', len(records), 'unique ordered SPO;', len(emb), 'caption rows')
    return manifest


def load_bank(out):
    out = Path(out)
    manifest = read_json(out/'manifest.json')
    if not manifest.get('complete') or manifest['bank_sha256'] != digest({k: v for k, v in manifest.items() if k != 'bank_sha256'}):
        raise ValueError('Incomplete/changed bank manifest')
    for name, key in [('triplet_embeddings.npy', 'triplet_embeddings_sha256'),
                      ('triplet_mapping.json', 'triplet_mapping_sha256')]:
        if sha(out/name) != manifest[key]:
            raise ValueError('Bank payload checksum failed: ' + name)
    embeddings = np.load(out/'triplet_embeddings.npy', mmap_mode='r')
    mapping = read_json(out/'triplet_mapping.json')
    if embeddings.shape != (len(mapping), 512) or len(mapping) != manifest['source']['triplet_rows']:
        raise ValueError('Bank shape mismatch')
    if not np.isfinite(embeddings).all() or not np.allclose(np.linalg.norm(embeddings, axis=1), 1, atol=1e-3):
        raise ValueError('Invalid SPO vectors')
    keys = set()
    for i, r in enumerate(mapping):
        key = (r['subject'], r['predicate'], r['object'])
        if r['row_id'] != i or key in keys or not r['source_image_ids'] or r['text'] != ' '.join(key):
            raise ValueError('Invalid SPO mapping')
        keys.add(key)
    return manifest, embeddings, mapping
