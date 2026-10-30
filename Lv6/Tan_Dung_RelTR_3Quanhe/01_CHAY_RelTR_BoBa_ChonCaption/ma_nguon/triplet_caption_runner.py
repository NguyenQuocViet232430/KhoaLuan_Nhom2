"""Paired Level-5A caption evaluation with ordered RelTR triplet reranking.

The decoder and five CLIP-text knowledge embeddings are unchanged. Only the
selection of five captions from the frozen Level-5A Top-50 pool changes.
"""

import csv
import json
import math
from pathlib import Path

import numpy as np

import caption_ablation_runner as A
import level5a_pipeline as P
import mmr_diversity as D
import reltr_relation_reranking as R


VARIANT = 'triplet_relation'
VARIANTS = ('full', VARIANT)


class TripletCaptionExperiment(A.CaptionAblation):
    def __init__(self, data_root, seed, output_root, base_runner_sha,
                 triplet_runner_sha, parser_sha, beta=0.2, min_confidence=0.5,
                 max_triplets=10, overrides=None, split='val'):
        if not 0 <= beta <= 1 or not math.isfinite(beta):
            raise ValueError('beta phải hữu hạn trong [0, 1]')
        if not 0 <= min_confidence <= 1 or not math.isfinite(min_confidence):
            raise ValueError('min_confidence phải hữu hạn trong [0, 1]')
        if not isinstance(max_triplets, int) or max_triplets < 1:
            raise ValueError('max_triplets phải là số nguyên dương')
        self.beta = float(beta)
        self.min_confidence = float(min_confidence)
        self.max_triplets = max_triplets
        super().__init__(data_root, seed, output_root, base_runner_sha,
                         overrides=overrides, split=split)
        self.reltr_csv = Path(self.cfg['reltr_dir'])/f'coco_{split}_reltr_detection.csv'
        self.triplets, self.triplet_stats = R.load_reltr_triplets(
            self.reltr_csv, min_conf=self.min_confidence)
        expected_ids = {str(i) for i in self.ids[split]}
        if set(self.triplets) != expected_ids:
            missing = len(expected_ids - set(self.triplets))
            extra = len(set(self.triplets) - expected_ids)
            raise ValueError(f'RelTR {split} lệch ID ảnh: thiếu {missing}, thừa {extra}')
        self.identity = dict(self.identity,
            protocol='l6-triplet-caption-inference-v1',
            triplet_runner_sha256=triplet_runner_sha,
            triplet_parser_sha256=parser_sha,
            triplet_csv_sha256=P.sha256_file(self.reltr_csv),
            beta=self.beta, min_confidence=self.min_confidence,
            max_triplets=self.max_triplets,
            relation_policy='ordered S-P-O lexical match; top-confidence triplets',
            intervention='Top-5 selection only; gate scores remain Level-5A full relevance')
        self.pre_reference_identity = dict(self.identity)
        self.contract_id = P.digest(self.identity)
        self.base_meta = self.identity
        self.common_dir = self.output_root/'_baseline'/f'seed{self.seed}'/split/self.contract_id[:20]
        self.common_dir.mkdir(parents=True, exist_ok=True)
        self.reference_dir = self.common_dir/'retrieval_reference'
        self.cache_root = self.common_dir/'cache'
        self.test_record_path = self.output_root/'_test_protocol'/f'seed{self.seed}'/'test_once.json'
        P.write_json(self.common_dir/'experiment_manifest.json', self.identity)
        self.selection_path = self.output_root/'validation_selection'/f'seed{self.seed}.json'
        if split == 'test':
            self.require_validation()

    def selection_contract(self):
        return dict(seed=self.seed, beta=self.beta,
                    min_confidence=self.min_confidence, max_triplets=self.max_triplets,
                    model_state_sha256=self.model_hash,
                    triplet_runner_sha256=self.identity['triplet_runner_sha256'],
                    triplet_parser_sha256=self.identity['triplet_parser_sha256'],
                    beam=3, max_len=30, alpha=0.6,
                    policy=self.identity['intervention'])

    def require_validation(self):
        if not self.selection_path.is_file():
            raise FileNotFoundError('Chạy pha Val cùng seed trước khi mở Test: '
                                    + str(self.selection_path))
        record = A.read_json(self.selection_path)
        if record.get('selection_contract') != self.selection_contract() or \
           record.get('split') != 'val' or record.get('n_images') != 5000:
            raise ValueError('Cấu hình Test khác cấu hình đã đánh giá trên Val')
        if not record.get('caption_metrics_computed'):
            raise ValueError('Chưa có điểm caption Val hoàn chỉnh')

    def register_test(self, reference_hash=None, completed=None, summary_path=None):
        if self.split != 'test':
            return
        if self.test_record_path.is_file():
            record = A.read_json(self.test_record_path)
            if record.get('identity') != self.pre_reference_identity:
                raise ValueError('Test đã khóa với checkpoint/cấu hình khác; giữ nguyên bản khóa')
        else:
            record = dict(identity=self.pre_reference_identity,
                          reference_sha256=None, completed_variants={},
                          registered_variants=list(VARIANTS))
        if reference_hash is not None:
            if record['reference_sha256'] not in (None, reference_hash):
                raise ValueError('Snapshot relevance Test đã đổi; cần khôi phục bản gốc')
            record['reference_sha256'] = reference_hash
        if completed is not None:
            if completed not in VARIANTS:
                raise ValueError(completed)
            checksum = P.sha256_file(summary_path)
            old = record['completed_variants'].get(completed)
            if old is not None and old != checksum:
                raise ValueError('Summary Test hoàn tất đã bị thay đổi')
            record['completed_variants'][completed] = checksum
        record['status'] = ('complete' if set(record['completed_variants']) == set(VARIANTS)
                            else 'in_progress')
        P.write_json(self.test_record_path, record)

    def make_triplet_cache(self, pool, reference):
        rows, gate_scores, fallback = [], [], []
        changed, signal, nonempty = 0, 0, 0
        matched_candidates, total_candidates = 0, 0
        examples = []
        for pos, iid_raw in enumerate(pool['image_ids']):
            iid = int(iid_raw)
            selected_pool_rows = pool['row_indices'][pos]
            base_relevance = np.asarray(reference['full_relevance'][pos], dtype=np.float64)
            triplets = sorted(self.triplets[str(iid)],
                              key=lambda t: (-t['confidence'], t['subject'],
                                             t['predicate'], t['object']))[:self.max_triplets]
            prepared = R.compile_triplets(triplets)
            nonempty += bool(prepared)
            relation = np.asarray([
                R.relation_score(self.kb_captions[int(row)], prepared)[0]
                for row in selected_pool_rows], dtype=np.float64)
            if not np.isfinite(relation).all() or np.any((relation < 0) | (relation > 1)):
                raise ValueError('Điểm quan hệ không hợp lệ')
            matched_candidates += int(np.count_nonzero(relation))
            total_candidates += len(relation)
            has_signal = bool(prepared) and bool(np.any(relation > 0))
            signal += has_signal
            # With zero relation evidence, preserve the full baseline exactly.
            blended = ((1 - self.beta)*base_relevance + self.beta*relation
                       if has_signal and self.beta else base_relevance)
            embeddings = np.asarray(self.kb[selected_pool_rows], dtype=np.float32)
            candidates = [dict(position=i, relevance=float(blended[i]), embedding=embeddings[i])
                          for i in range(len(blended))]
            chosen = D.mmr_select(candidates, k=5, lambda_param=self.lam)
            order = sorted((int(c['position']) for c in chosen),
                           key=lambda i: (-base_relevance[i], i))
            if len(order) != 5 or len(set(order)) != 5:
                raise ValueError('Triplet reranking phải trả đúng 5 caption khác nhau')
            row = selected_pool_rows[order]
            differs = set(map(int, row)) != set(map(int, reference['row_indices'][pos]))
            changed += differs
            if differs and len(examples) < 10:
                examples.append(dict(image_id=iid, triplets=triplets,
                    full_top5=[self.kb_captions[int(r)] for r in reference['row_indices'][pos]],
                    triplet_top5=[dict(caption=self.kb_captions[int(selected_pool_rows[j])],
                                       relation_score=float(relation[j])) for j in order]))
            rows.append(row)
            # Decoder gate sees the same original relevance scale for each chosen caption.
            gate_scores.append(base_relevance[order].astype(np.float32))
            fallback.append(not has_signal)
            if (pos + 1) % 500 == 0:
                print('Triplet reranking:', pos + 1, '/', len(pool['image_ids']))
        cache = dict(image_ids=pool['image_ids'].copy(),
                     row_indices=np.asarray(rows, dtype=np.int64),
                     scores=np.asarray(gate_scores, dtype=np.float32),
                     is_fallback=np.asarray(fallback, dtype=bool))
        P.validate_top5(cache, len(self.kb))
        diagnostics = dict(split=self.split, seed=self.seed, n_images=len(rows),
                           n_images_with_triplets=nonempty,
                           n_images_with_candidate_relation_match=signal,
                           changed_top5_image_count=changed,
                           matched_candidate_count=matched_candidates,
                           total_candidate_count=total_candidates,
                           reltr_csv_stats=self.triplet_stats,
                           changed_examples=examples)
        return cache, diagnostics

    def score(self, variant, cache):
        if variant == 'full':
            return super().score(variant, cache)
        if variant != VARIANT:
            raise ValueError(variant)
        self.work = self.output_root/'triplet_relation'/f'seed{self.seed}'/self.split/self.contract_id[:20]
        self.work.mkdir(parents=True, exist_ok=True)
        summary_path = self.work/'summary.json'
        if summary_path.is_file():
            summary = A.read_json(summary_path)
            metric = A.read_json(self.work/'metrics_coco.json')
            if (summary.get('identity') != self.identity or summary.get('variant') != VARIANT
                or summary.get('split') != self.split
                or summary.get('n_images') != len(self.ids[self.split])):
                raise ValueError('Summary triplet khác contract/split/ảnh')
            A.checked_metrics(summary['metrics_raw'])
            if not metric.get('complete') or metric.get('metrics') != summary['metrics_raw']:
                raise ValueError('Metrics triplet đã lưu không khớp summary')
            self.register_test(completed=VARIANT, summary_path=summary_path)
            print('Dùng kết quả triplet đã hoàn tất; không chấm lại:', self.split)
            return summary
        P.save_cache(self.work/'top5.npz', cache, self.meta(variant=VARIANT))
        predictions = self.predictions(self.split, cache, 'beam', self.model_hash, VARIANT)
        P.write_json(self.work/'predictions.json', predictions)
        metrics = A.checked_metrics(self.evaluate(predictions, self.split,
                                                 self.work/'metrics_coco.json'))
        summary = dict(identity=self.identity, variant=VARIANT, split=self.split,
                       n_images=len(predictions), metrics_raw=metrics,
                       metrics_x100={m: 100*value for m, value in metrics.items()},
                       caption_metrics_computed=True,
                       checkpoint=str(self.original/'best_model.pt'),
                       trained_during_experiment=False,
                       limitation='Inference-only triplet reranking; not a triplet knowledge base.',
                       fps_computed=False)
        P.write_json(summary_path, summary)
        self.register_test(completed=VARIANT, summary_path=summary_path)
        return summary

    def run_triplet(self):
        self.register_test()
        original = self.original_top5()
        pool = self.original_pool()
        reference = self.frozen_reference(pool, original)
        cache, diagnostics = self.make_triplet_cache(pool, reference)
        P.write_json(self.common_dir/'triplet_diagnostics.json', diagnostics)
        if self.beta > 0 and not diagnostics['n_images_with_candidate_relation_match']:
            raise RuntimeError('Không ứng viên nào khớp bộ ba; kiểm tra CSV/nhãn trước khi chấm COCO')
        full = self.score('full', reference)
        triplet = self.score(VARIANT, cache)
        rows = []
        for item in (full, triplet):
            row = dict(variant=item['variant'], **item['metrics_x100'])
            row.update({'delta_'+m: item['metrics_x100'][m]-full['metrics_x100'][m]
                        for m in A.METRICS})
            rows.append(row)
        path = self.common_dir/'comparison.csv'
        with path.open('w', encoding='utf-8-sig', newline='') as handle:
            writer = csv.DictWriter(handle,
                fieldnames=['variant']+A.METRICS+['delta_'+m for m in A.METRICS])
            writer.writeheader()
            writer.writerows(rows)
        P.write_json(self.common_dir/'comparison.json',
                     dict(identity=self.identity, rows=rows, diagnostics=diagnostics,
                          delta_definition='triplet_relation minus full; metric x100 points'))
        if self.split == 'val':
            selection = dict(selection_contract=self.selection_contract(), split='val',
                             n_images=len(self.ids['val']), caption_metrics_computed=True,
                             val_cider_full_x100=full['metrics_x100']['CIDEr'],
                             val_cider_triplet_x100=triplet['metrics_x100']['CIDEr'],
                             comparison_path=str(path))
            if self.selection_path.is_file():
                old = A.read_json(self.selection_path)
                if old['selection_contract'] != selection['selection_contract']:
                    raise ValueError('Val đã có beta/config khác; không ghi đè lựa chọn cũ')
            P.write_json(self.selection_path, selection)
        return rows, diagnostics
