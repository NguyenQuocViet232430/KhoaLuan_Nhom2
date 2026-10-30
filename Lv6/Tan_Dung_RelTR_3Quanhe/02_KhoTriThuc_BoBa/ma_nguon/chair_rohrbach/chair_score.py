"""Python 3 CHAIR scorer matching LisaAnne/Hallucination/utils/chair.py.

Uses the unmodified upstream data/synonyms.txt and Pattern's singularize rules.
Ground truth is the union of COCO 2014 instances and reference-caption objects.
Only generated COCO-object mentions enter CHAIR_i; CHAIR_s counts captions.
"""
import csv
import hashlib
import json
import io
from pathlib import Path
from drive_io import read_json, write_json, write_bytes

from pattern_singular import singularize

ARMS = ('caption_control', 'hybrid_3cap_2spo')
SEEDS = (42, 44, 46)
ANNOTATION_NAMES = tuple(f'{kind}_{split}2014.json'
                         for kind in ('instances', 'captions') for split in ('train', 'val'))
DOUBLE_WORDS = ['motor bike', 'motor cycle', 'air plane', 'traffic light', 'street light',
                'traffic signal', 'stop light', 'fire hydrant', 'stop sign', 'parking meter',
                'suit case', 'sports ball', 'baseball bat', 'baseball glove', 'tennis racket',
                'wine glass', 'hot dog', 'cell phone', 'mobile phone', 'teddy bear',
                'hair drier', 'potted plant', 'bow tie', 'laptop computer', 'stove top oven',
                'hot dog', 'teddy bear', 'home plate', 'train track']
ANIMALS = ['bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear',
           'zebra', 'giraffe', 'animal', 'cub']
VEHICLES = ['jet', 'train']


def digest(value):
    body = json.dumps(value, ensure_ascii=False, sort_keys=True,
                      separators=(',', ':'), allow_nan=False).encode('utf-8')
    return hashlib.sha256(body).hexdigest()


def file_sha256(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(8 * 1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def iter_items(path, prefix):
    """Stream the large official COCO annotation JSON where ijson is available."""
    try:
        import ijson
    except ImportError:
        for item in read_json(path)[prefix]:
            yield item
    else:
        with Path(path).open('rb') as stream:
            yield from ijson.items(stream, prefix + '.item')


def annotation_dir(data_root, override=None):
    root = Path(data_root)
    candidates = ([Path(override)] if override is not None else [
        root/'COCO_2014/annotations_trainval2014/annotations',
        root/'COCO_2014/annotations', root/'annotations', root])
    matches = [p for p in candidates if all((p/name).is_file() for name in ANNOTATION_NAMES)]
    if len(matches) != 1:
        raise FileNotFoundError('CHAIR cần đúng 4 file COCO 2014 gốc: ' +
            ', '.join(ANNOTATION_NAMES) + '. Đặt ANNOTATIONS_DIR nếu chúng ở nơi khác.')
    return matches[0]


class RohrbachCHAIR:
    def __init__(self, synonyms_path, tokenizer=None):
        if tokenizer is None:
            import nltk
            tokenizer = nltk.word_tokenize
        self.tokenizer = tokenizer
        lines = Path(synonyms_path).read_text(encoding='utf-8').splitlines()
        if len(lines) != 80:
            raise ValueError('Expected 80 original COCO synonym rows')
        # Preserve the upstream comma-space split, including its duplicate entries.
        synonyms = [line.strip().split(', ') for line in lines]
        self.mscoco_objects = set(word for row in synonyms for word in row)
        self.inverse_synonym_dict = {word: row[0] for row in synonyms for word in row}
        self.double_word_dict = {word: word for word in DOUBLE_WORDS}
        for animal in ANIMALS:
            self.double_word_dict['baby ' + animal] = animal
            self.double_word_dict['adult ' + animal] = animal
        for vehicle in VEHICLES:
            self.double_word_dict['passenger ' + vehicle] = vehicle
        self.double_word_dict.update({'bow tie': 'tie', 'toilet seat': 'toilet',
                                      'wine glas': 'wine glass'})
        self.synonyms_sha256 = file_sha256(synonyms_path)

    def caption_to_words(self, caption):
        # Original order: NLTK tokenizer, Pattern singularize, then COCO phrase rules.
        words = [singularize(word) for word in self.tokenizer(caption.lower())]
        collapsed, positions = [], []
        i = 0
        while i < len(words):
            positions.append(i)
            phrase = ' '.join(words[i:i+2])
            if phrase in self.double_word_dict:
                collapsed.append(self.double_word_dict[phrase])
                i += 2
            else:
                collapsed.append(words[i])
                i += 1
        if 'toilet' in collapsed and 'seat' in collapsed:
            collapsed = [word for word in collapsed if word != 'seat']
        # Original implementation indexes positions after the toilet-seat filter.
        selected = [(word, positions[j]) for j, word in enumerate(collapsed)
                    if word in self.mscoco_objects]
        return [(word, self.inverse_synonym_dict[word], index)
                for word, index in selected]

    def ground_truth(self, ann_dir, image_ids):
        ids = set(image_ids)
        objects = {iid: set() for iid in ids}
        # Rohrbach first reads segmentation categories, then reference captions.
        for split in ('val', 'train'):
            path = Path(ann_dir)/f'instances_{split}2014.json'
            categories = {int(row['id']): row['name'] for row in iter_items(path, 'categories')}
            for row in iter_items(path, 'annotations'):
                iid = int(row['image_id'])
                if iid in ids:
                    name = categories[int(row['category_id'])]
                    if name not in self.inverse_synonym_dict:
                        raise ValueError('COCO category absent from official synonyms: ' + name)
                    objects[iid].add(self.inverse_synonym_dict[name])
        for split in ('val', 'train'):
            path = Path(ann_dir)/f'captions_{split}2014.json'
            for row in iter_items(path, 'annotations'):
                iid = int(row['image_id'])
                if iid in ids:
                    objects[iid].update(node for _, node, _ in
                                        self.caption_to_words(row['caption']))
        return objects

    def score(self, predictions, objects):
        if not predictions:
            raise ValueError('Empty prediction set')
        image_ids = [row['image_id'] for row in predictions]
        if len(set(image_ids)) != len(image_ids) or set(image_ids) != set(objects):
            raise ValueError('Prediction image IDs mismatch ground-truth image IDs')
        count_mentions = count_hallucinated = count_sentences = 0
        examples = []
        for row in predictions:
            mentions = self.caption_to_words(row['caption'])
            wrong = [(word, node, idx) for word, node, idx in mentions
                     if node not in objects[row['image_id']]]
            count_mentions += len(mentions)
            count_hallucinated += len(wrong)
            count_sentences += bool(wrong)
            if wrong and len(examples) < 50:
                examples.append(dict(image_id=row['image_id'], caption=row['caption'],
                                     hallucinated_objects=[node for _, node, _ in wrong],
                                     gt_objects=sorted(objects[row['image_id']])))
        if count_mentions == 0:
            raise ValueError('No generated COCO object mentions: CHAIR_i undefined')
        return dict(CHAIR_s=count_sentences/len(predictions),
                    CHAIR_i=count_hallucinated/count_mentions,
                    captions=len(predictions), hallucinated_captions=count_sentences,
                    object_mentions=count_mentions,
                    hallucinated_object_mentions=count_hallucinated,
                    examples=examples)


def load_prediction_pair(output_root, seed):
    root = Path(output_root)/'runs'/f'seed{seed}'
    if not (root/'test_plan.json').is_file():
        raise FileNotFoundError(f'Incomplete Test plan for seed {seed}')
    plan = read_json(root/'test_plan.json')
    if set(plan.get('models', {})) != set(ARMS):
        raise ValueError(f'Incomplete frozen Test models for seed {seed}')
    rows = {}
    for arm in ARMS:
        folder = root/arm
        summary = read_json(folder/'test_summary.json')
        evaluation = summary['evaluation']
        if (not summary.get('complete') or evaluation.get('split') != 'test' or
                evaluation.get('seed') != seed or evaluation.get('arm') != arm or
                evaluation.get('study') != plan.get('study') or
                evaluation.get('model_state_sha256') != plan['models'][arm] or
                evaluation.get('beam') != 3 or evaluation.get('max_len') != 30 or
                evaluation.get('alpha') != 0.6 or
                read_json(folder/'test_once.json') != evaluation):
            raise ValueError(f'Test Beam contract mismatch: seed {seed}, {arm}')
        if summary.get('summary_sha256') != digest({k: v for k, v in summary.items()
                                                    if k != 'summary_sha256'}):
            raise ValueError(f'Test summary checksum mismatch: seed {seed}, {arm}')
        preds = read_json(folder/'test_predictions.json')
        ids = [r['image_id'] for r in preds]
        if (len(ids) != 5000 or len(set(ids)) != 5000 or
                any(type(i) is not int or type(r.get('caption')) is not str for i, r in zip(ids, preds)) or
                digest(ids) != evaluation['ids_sha256']):
            raise ValueError(f'Invalid Karpathy Test predictions: seed {seed}, {arm}')
        rows[arm] = (preds, summary, file_sha256(folder/'test_predictions.json'))
    if [r['image_id'] for r in rows[ARMS[0]][0]] != [r['image_id'] for r in rows[ARMS[1]][0]]:
        raise ValueError('Paired Test image order differs')
    return rows


def run(data_root, output_root, synonyms_path, annotations_override=None, seeds=SEEDS):
    ann = annotation_dir(data_root, annotations_override)
    scorer = RohrbachCHAIR(synonyms_path)
    available = {}
    for seed in seeds:
        try:
            available[seed] = load_prediction_pair(output_root, seed)
        except FileNotFoundError as exc:
            print('Chưa chấm seed', seed, ':', exc)
    if not available:
        raise FileNotFoundError('Chưa có cặp Test Beam hoàn tất ở bất kỳ seed nào')
    all_ids = {r['image_id'] for pair in available.values() for arm in ARMS for r in pair[arm][0]}
    gt = scorer.ground_truth(ann, all_ids)
    annotation_hashes = {name: file_sha256(ann/name) for name in ANNOTATION_NAMES}
    source_hashes = {name: file_sha256(Path(__file__).with_name(name))
                     for name in ('chair_score.py', 'pattern_singular.py')}
    out = Path(output_root)/'chair_rohrbach'
    rows = []
    for seed, pair in available.items():
        for arm in ARMS:
            predictions, summary, pred_sha = pair[arm]
            result = scorer.score(predictions, gt)
            identity = dict(source_repo='https://github.com/LisaAnne/Hallucination',
                source_file='utils/chair.py', synonyms_file='data/synonyms.txt',
                synonyms_sha256=scorer.synonyms_sha256, predictions_sha256=pred_sha,
                test_summary_sha256=file_sha256(Path(output_root)/'runs'/f'seed{seed}'/arm/'test_summary.json'),
                annotation_paths={name: str(ann/name) for name in ANNOTATION_NAMES},
                annotation_sha256=annotation_hashes, scorer_source_sha256=source_hashes,
                normalization='nltk.word_tokenize + clips/pattern singularize + original CHAIR phrase rules',
                ground_truth='COCO 2014 instances union reference captions',
                decoding='Beam search, beam=3, max_len=30, alpha=0.6')
            destination = out/f'seed{seed}'/arm/'chair_summary.json'
            payload = dict(seed=seed, arm=arm, identity=identity, **result)
            if destination.is_file() and read_json(destination)['identity'] != identity:
                raise ValueError('Existing CHAIR output has different inputs: ' + str(destination))
            write_json(destination, payload)
            rows.append(dict(seed=seed, arm=arm, CHAIR_s=result['CHAIR_s']*100,
                             CHAIR_i=result['CHAIR_i']*100,
                             hallucinated_captions=result['hallucinated_captions'],
                             hallucinated_object_mentions=result['hallucinated_object_mentions'],
                             object_mentions=result['object_mentions']))
    out.mkdir(parents=True, exist_ok=True)
    csv_path = out/'test_chair_by_seed.csv'
    stream = io.StringIO(newline='')
    writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
    writer.writeheader(); writer.writerows(rows)
    write_bytes(csv_path, stream.getvalue().encode('utf-8-sig'))
    if set(available) == set(SEEDS):
        import statistics
        aggregate = []
        for arm in ARMS:
            subset = [r for r in rows if r['arm'] == arm]
            aggregate.append(dict(arm=arm, seeds=list(SEEDS),
                CHAIR_s_mean=statistics.mean(r['CHAIR_s'] for r in subset),
                CHAIR_s_std=statistics.stdev(r['CHAIR_s'] for r in subset),
                CHAIR_i_mean=statistics.mean(r['CHAIR_i'] for r in subset),
                CHAIR_i_std=statistics.stdev(r['CHAIR_i'] for r in subset)))
        deltas = [{metric: next(r[metric] for r in rows if r['seed'] == seed and r['arm'] == ARMS[1]) -
                           next(r[metric] for r in rows if r['seed'] == seed and r['arm'] == ARMS[0])
                   for metric in ('CHAIR_s', 'CHAIR_i')} for seed in SEEDS]
        aggregate.append(dict(arm='delta_hybrid_minus_control', seeds=list(SEEDS),
            CHAIR_s_mean=statistics.mean(r['CHAIR_s'] for r in deltas),
            CHAIR_s_std=statistics.stdev(r['CHAIR_s'] for r in deltas),
            CHAIR_i_mean=statistics.mean(r['CHAIR_i'] for r in deltas),
            CHAIR_i_std=statistics.stdev(r['CHAIR_i'] for r in deltas)))
        write_json(out/'test_chair_3seed_summary.json', aggregate)
    return rows
