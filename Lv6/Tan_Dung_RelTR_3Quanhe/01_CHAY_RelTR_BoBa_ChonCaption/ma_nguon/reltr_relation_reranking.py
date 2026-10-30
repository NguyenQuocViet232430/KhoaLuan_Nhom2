"""Lv6 prototype: ordered lexical relation matching, not a scene-graph parser."""
import csv
import hashlib
import json
import math
import re
from collections import defaultdict
from pathlib import Path

_WN = None
_LEMMATIZER = None
_ALIASES = {
    'man': 'person', 'woman': 'person', 'boy': 'person', 'girl': 'person',
    'child': 'person', 'people': 'person', 'men': 'person', 'women': 'person',
    'children': 'person', 'bike': 'bicycle', 'bikes': 'bicycle',
    'bicycles': 'bicycle', 'dogs': 'dog', 'cats': 'cat', 'horses': 'horse',
    'riding': 'ride', 'rides': 'ride', 'ridden': 'ride', 'rode': 'ride',
    'chasing': 'chase', 'chases': 'chase', 'chased': 'chase',
    'holding': 'hold', 'holds': 'hold', 'held': 'hold',
    'wearing': 'wear', 'wears': 'wear', 'wore': 'wear',
    'sitting': 'sit', 'sits': 'sit', 'sat': 'sit',
    'standing': 'stand', 'stands': 'stand', 'stood': 'stand',
    'playing': 'play', 'plays': 'play', 'played': 'play',
    'eating': 'eat', 'eats': 'eat', 'ate': 'eat',
    'carrying': 'carry', 'carries': 'carry', 'carried': 'carry',
}
_PHRASE_ALIASES = {
    'next to': ('beside', 'alongside'),
    'above': ('over',), 'below': ('under', 'beneath'),
}


def configure_wordnet(enabled=True):
    """Fail explicitly when requested WordNet data are unavailable."""
    global _WN, _LEMMATIZER
    if not enabled:
        _WN, _LEMMATIZER = None, None
        return
    from nltk.corpus import wordnet
    from nltk.stem import WordNetLemmatizer
    wordnet.ensure_loaded()
    _WN, _LEMMATIZER = wordnet, WordNetLemmatizer()


def canonical_image_id(value):
    text = str(value).strip().replace('\\', '/').rsplit('/', 1)[-1]
    if re.fullmatch(r'\d+', text):
        return str(int(text))
    match = re.fullmatch(r'COCO_(?:train|val|test)2014_(\d+)\.jpg', text, re.I)
    if match:
        return str(int(match.group(1)))
    raise ValueError(f'image_id/filename COCO không hợp lệ: {value!r}')


def words(text):
    result = []
    for token in re.findall(r"[a-z]+(?:'[a-z]+)?", str(text).lower().replace('_', ' ')):
        token = _ALIASES.get(token, token)
        if _LEMMATIZER is not None:
            token = _LEMMATIZER.lemmatize(token, pos='v')
            token = _LEMMATIZER.lemmatize(token, pos='n')
        result.append(_ALIASES.get(token, token))
    return tuple(result)


def load_reltr_triplets(csv_path, min_conf=0.5):
    """Accept real image/prediction/score CSV and split-column CSV; retain empty images."""
    if not 0 <= min_conf <= 1:
        raise ValueError('min_conf phải nằm trong [0,1]')
    table, seen = {}, defaultdict(set)
    stats = {'rows': 0, 'no_relation': 0, 'below_threshold': 0, 'duplicates': 0}
    with Path(csv_path).open(encoding='utf-8-sig', newline='') as handle:
        reader = csv.DictReader(handle)
        names = {name.strip().lower(): name for name in (reader.fieldnames or [])}
        def pick(*options):
            return next((names[name] for name in options if name in names), None)
        image_col = pick('image_id', 'image', 'file_name')
        pred_col = pick('prediction')
        sub_col, rel_col, obj_col = pick('subject', 's'), pick('predicate', 'relation', 'rel', 'p'), pick('object', 'o')
        score_col = pick('score', 'confidence', 'conf', 'reltr_score')
        if not image_col or not score_col or not (pred_col or (sub_col and rel_col and obj_col)):
            raise ValueError(f'CSV thiếu schema RelTR hỗ trợ: {reader.fieldnames}')
        for row_number, row in enumerate(reader, 2):
            try:
                image_id = canonical_image_id(row[image_col])
                table.setdefault(image_id, [])
                stats['rows'] += 1
                score = float(row[score_col])
                if not math.isfinite(score) or not 0 <= score <= 1:
                    raise ValueError('confidence phải hữu hạn và thuộc [0,1]')
                if pred_col:
                    prediction = row[pred_col].strip()
                    if prediction.lower() == 'no_relation':
                        stats['no_relation'] += 1
                        continue
                    parts = re.split(r'\s+-\s+', prediction, maxsplit=2)
                    if len(parts) != 3:
                        raise ValueError('prediction phải có dạng subject - relation - object')
                    subject, predicate, obj = parts
                else:
                    subject, predicate, obj = row[sub_col], row[rel_col], row[obj_col]
                key = tuple(' '.join(x.lower().replace('_', ' ').split()) for x in (subject, predicate, obj))
                if not all(key):
                    raise ValueError('bộ ba có thành phần rỗng')
                if score < min_conf:
                    stats['below_threshold'] += 1
                    continue
                if key in seen[image_id]:
                    stats['duplicates'] += 1
                    old = next(t for t in table[image_id] if (t['subject'], t['predicate'], t['object']) == key)
                    old['confidence'] = max(old['confidence'], score)
                    continue
                seen[image_id].add(key)
                table[image_id].append(dict(zip(('subject', 'predicate', 'object'), key), confidence=score))
            except (ValueError, TypeError, KeyError, AttributeError) as exc:
                raise ValueError(f'{csv_path}, dòng {row_number}: {exc}') from exc
    stats['images'] = len(table)
    stats['triplets'] = sum(map(len, table.values()))
    return table, stats


def expand_predicate(predicate, max_synonyms=4):
    """Sorted same-synset lemmas of first verb sense; no troponym-as-synonym expansion."""
    base = words(predicate)
    variants = {base}
    variants.update(words(p) for p in _PHRASE_ALIASES.get(' '.join(base), ()))
    if _WN is not None and len(base) == 1:
        synsets = _WN.synsets(base[0], pos=_WN.VERB)
        if synsets:
            variants.update(words(name) for name in synsets[0].lemma_names())
    variants.discard(())
    return (base,) + tuple(sorted(variants - {base})[:max_synonyms])


def phrase_spans(tokens, phrase):
    size = len(phrase)
    return [(i, i + size) for i in range(len(tokens) - size + 1)
            if size and tokens[i:i + size] == phrase]


def compile_triplets(triplets):
    return [dict(t, subject_tokens=words(t['subject']), object_tokens=words(t['object']),
                 predicate_variants=expand_predicate(t['predicate'])) for t in triplets]


def relation_score(text, prepared_triplets, max_gap=12):
    """Ordered S -> P -> O lexical evidence, restricted to one clause. Not full parsing."""
    matched, total = [], 0.0
    clauses = re.split(r'[.!?;]|\b(?:and|but|while|whereas)\b', text.lower())
    clauses = [words(clause) for clause in clauses]
    for triplet in prepared_triplets:
        conf = triplet['confidence']
        total += conf
        hit = False
        for tokens in clauses:
            if any(t in {'not', 'never', 'without', 'no'} or t.endswith("n't") for t in tokens):
                continue
            ss = phrase_spans(tokens, triplet['subject_tokens'])
            oo = phrase_spans(tokens, triplet['object_tokens'])
            pp = [span for variant in triplet['predicate_variants'] for span in phrase_spans(tokens, variant)]
            hit = any(s1 <= p0 and p1 <= o0 and p0-s1 <= max_gap and o0-p1 <= max_gap
                      for s0, s1 in ss for p0, p1 in pp for o0, o1 in oo)
            if hit:
                break
        if hit:
            matched.append(triplet)
    return (sum(t['confidence'] for t in matched) / total if total else 0.0), [
        [t['subject'], t['predicate'], t['object']] for t in matched]


def rerank_candidates(candidates, triplets_by_image, alpha=0.2):
    """Use original normalized L5A baseline_score; alpha=0 preserves scores and stable ranks."""
    if not 0 <= alpha <= 1:
        raise ValueError('alpha phải nằm trong [0,1]')
    groups, seen = defaultdict(list), set()
    prepared = {}
    for raw in candidates:
        item = dict(raw)
        image_id = canonical_image_id(item['image_id'])
        caption_id = str(item['caption_id'])
        if (image_id, caption_id) in seen:
            raise ValueError(f'Caption trùng ID trong cùng ảnh: {image_id}/{caption_id}')
        seen.add((image_id, caption_id))
        if not isinstance(item['text'], str) or not item['text'].strip():
            raise ValueError('Caption rỗng/không phải chuỗi')
        base = float(item['baseline_score'])
        if not math.isfinite(base) or not 0 <= base <= 1:
            raise ValueError('baseline_score phải là điểm L5A đã chuẩn hóa trong [0,1]')
        if item.get('source_image_id') is not None and canonical_image_id(item['source_image_id']) == image_id:
            raise ValueError('Ứng viên có cùng source_image_id với ảnh truy vấn')
        if image_id not in triplets_by_image:
            raise ValueError(f'Thiếu bản ghi RelTR cho ảnh {image_id}; kiểm tra split/image_id')
        if image_id not in prepared:
            prepared[image_id] = compile_triplets(triplets_by_image[image_id]) if alpha else []
        score, matches = relation_score(item['text'], prepared[image_id]) if alpha else (0.0, [])
        final = base if alpha == 0 or not prepared[image_id] else (1-alpha)*base + alpha*score
        item.update(image_id=image_id, baseline_score=base, relation_score=score,
                    final_score=final, matched_triplets=matches)
        groups[image_id].append(item)
    for items in groups.values():
        items.sort(key=lambda item: -item['final_score'])
    return dict(groups)


def file_sha256(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()