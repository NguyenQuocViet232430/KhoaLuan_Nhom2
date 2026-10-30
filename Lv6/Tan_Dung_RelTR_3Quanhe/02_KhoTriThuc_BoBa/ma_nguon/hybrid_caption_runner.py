"""Paired L5A warm-start experiment: five captions versus 3 captions + 2 SPO.

Both arms receive the same maximum epoch budget and early-stop rule. Select checkpoints on Val
only, then evaluate each frozen arm once on Test. Never modifies L5 artifacts.
"""
import csv
import math
import tempfile
from pathlib import Path

import faiss
import numpy as np
import torch
import torch.nn.functional as F
from torch.nn.utils.rnn import pad_sequence
from tqdm.auto import tqdm

import level5a_pipeline as P
import level5_model as M
import storage
import hybrid_knowledge as H
import training_stop as T
from caption_ablation_runner import CaptionAblation, checked_metrics, METRICS

ARMS = ('caption_control', 'hybrid_3cap_2spo')
STUDY_SEEDS = (42, 44, 46)

# The verified L5 reader still calls these module-level functions while building
# LV6 caches and prediction chunks. Its original writers rename files on DriveFS.
# Keep its source files (and their L5 checkpoint hashes) unchanged, but route only
# this runtime's writes through the already verified, rename-free storage module.
P.write_json = storage.write_json
P.write_torch = storage.save_torch
P.save_cache = storage.save_cache
P.load_cache = storage.load_cache


def cache_hash(cache):
    return storage.payload_hash({k: cache[k] for k in ('image_ids', 'row_indices', 'scores')}, {})


def cpu_state(model):
    return {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}


def export_table(path, rows):
    path = Path(path)
    storage.write_json(path.with_suffix('.json'), rows)
    import io
    buffer = io.StringIO(newline='')
    writer = csv.DictWriter(buffer, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)
    storage.write_bytes(path.with_suffix('.csv'), buffer.getvalue().encode('utf-8-sig'))


class HybridExperiment(CaptionAblation):
    def evaluate(self, records, split, out_path, only_cider=False):
        """Run the unmodified COCO scorer locally, then publish its outputs to Drive.

        The original subprocess uses os.replace for its result; that operation is
        reliable on Colab's local disk but may fail on a mounted Google Drive.
        """
        out_path = Path(out_path)
        ids = [r['image_id'] for r in records]
        request = {'predictions': records,
                   'references': {str(i): self.caps[split][i] for i in ids},
                   'only_cider': only_cider,
                   'evaluator': 'pycocoevalcap_official_java',
                   'pycocoevalcap_version': self.environment['pycocoevalcap'],
                   'code_sha256': self.code_hashes['coco_eval_worker.py']}
        request_id = P.digest(request)
        if H.IO.json_available(out_path):
            saved = H.IO.read_json(out_path)
            if saved.get('request_sha256') != request_id:
                raise RuntimeError('Existing COCO score belongs to a different request: ' + str(out_path))
            if saved.get('complete'):
                checked_metrics(saved['metrics']) if not only_cider else None
                if not out_path.is_file():
                    H.IO.write_json(out_path, saved)
                return saved['metrics']
        with tempfile.TemporaryDirectory(prefix='lv6_coco_eval_') as folder:
            local = Path(folder)/out_path.name
            try:
                metrics = P.Experiment.evaluate(self, records, split, local, only_cider=only_cider)
            finally:
                for suffix, remote in (
                    ('_eval_input.json', out_path.with_name(out_path.stem+'_eval_input.json')),
                    ('.log', out_path.with_suffix('.log')),
                    ('.json', out_path),
                ):
                    artifact = local.with_name(local.stem + suffix) if suffix.startswith('_') else local.with_suffix(suffix)
                    if artifact.is_file():
                        H.IO.write_bytes(remote, artifact.read_bytes())
        return metrics

    def __init__(self, data_root, seed, output_root, bank_dir, source_hashes,
                 epochs=15, batch_size=64, learning_rate=5e-5,
                 early_stop_patience=4, early_stop_min_delta=0.0, overrides=None):
        if (int(seed) not in STUDY_SEEDS or epochs < 1 or batch_size < 1 or
                not 0 < learning_rate < 1 or early_stop_patience < 1 or
                not math.isfinite(early_stop_min_delta) or early_stop_min_delta < 0):
            raise ValueError('Invalid training recipe')
        root = Path(data_root).resolve()
        expected_output = (root/'baseline_level6/Dung_KhoTriThucLV2').resolve()
        expected_bank = (root/'knowledge_base_level2/reltr_triplet_bank_v1').resolve()
        if Path(output_root).resolve() != expected_output or Path(bank_dir).resolve() != expected_bank:
            raise ValueError('Output/bank must be in Dung_KhoTriThucLV2 and knowledge_base_level2/reltr_triplet_bank_v1')
        if not expected_output.is_dir() or not (expected_bank/'manifest.json').is_file():
            raise FileNotFoundError('Create Dung_KhoTriThucLV2 and finish notebook 01 before training')
        # Reuse the already-reviewed strict L5 checkpoint/data reader only.
        super().__init__(data_root, seed, Path(output_root)/'_l5_reader',
                         source_hashes['caption_ablation_runner.py'], overrides, split='val')
        if self.device.type != 'cuda':
            raise RuntimeError('Use a Colab GPU for the complete study')
        self.study_root = Path(output_root)
        self.bank_manifest, self.triplet_vectors, self.triplets = H.load_bank(bank_dir)
        source = self.bank_manifest['source']
        if not H.compatible_bank_code(source['source_code'], source_hashes['hybrid_knowledge.py']) or source['parser_code'] != source_hashes['reltr_relation_reranking.py']:
            raise ValueError('Bank was built with different source modules')
        if source['split_sha256'] != {s: H.digest(self.ids[s]) for s in self.ids}:
            raise ValueError('Bank and L5 use different Karpathy splits')
        for filename, key in [('text_embeddings_train_restval.npy', 'caption_embeddings_sha256'),
                              ('text_embedding_mapping.jsonl', 'caption_mapping_sha256'),
                              ('coco_train_reltr_detection.csv', 'reltr_train_sha256')]:
            matches = [v for p, v in self.input_hashes.items() if Path(p).name == filename]
            if matches != [source[key]]:
                raise ValueError('Bank and L5 source differ: ' + filename)
        train_set = set(self.ids['train'])
        if any(not set(r['source_image_ids']) <= train_set for r in self.triplets):
            raise ValueError('Triplet bank contains non-training sources')
        self.triplet_index = faiss.IndexFlatIP(512)
        self.triplet_index.add(np.array(self.triplet_vectors, dtype=np.float32))
        self.initial_state = cpu_state(self.model)
        self.initial_hash = self.model_hash
        self.recipe = dict(epochs=int(epochs), batch_size=int(batch_size), learning_rate=float(learning_rate),
            weight_decay=1e-4, cosine_eta_min=1e-6, gradient_clip=1.0,
            checkpoint_selection='greedy_val_CIDEr', early_stopping=True,
            early_stop_patience=int(early_stop_patience), early_stop_min_delta=float(early_stop_min_delta),
            trainable='all_L5_captioner_parameters; CLIP_and_RelTR_frozen',
            save_every_batches=250, beam=3, max_len=30, alpha=.6)
        identity = {k: v for k, v in self.identity.items()
                    if k not in ('protocol', 'split', 'evaluation_ids_sha256', 'device', 'gpu')}
        identity.update(protocol='l6-hybrid-kb-paired-finetune-v1', recipe=self.recipe,
            modules=source_hashes, bank_sha256=self.bank_manifest['bank_sha256'],
            arms=list(ARMS), initial_model_sha256=self.initial_hash,
            memory='5 caption OR 3 caption + 2 ordered SPO; shared Linear(512,256)',
            relation_retrieval='image CLIP -> train SPO CLIP; exact IP; top50 eligible -> top2',
            relation_score='minmax cosine within eligible top50, ties->1',
            fallback='fill missing SPO slots with remaining distinct caption top5',
            self_exclusion='caption source != query; SPO must have another train source')
        self.base_meta = identity
        self.contract_id = P.digest(identity)
        self.seed_dir = self.study_root/'runs'/f'seed{self.seed}'
        # Fixed seed folder prevents quietly opening new Test configurations.
        H.guard(self.seed_dir/'study_contract.json', identity)
        self.cache_root = self.seed_dir/'retrieval_cache'
        storage.write_json(self.seed_dir/'runtime_last_session.json', dict(device=str(self.device),
            gpu=torch.cuda.get_device_name(0), environment=self.environment))
        self.arm_caches = {}

    def top50(self, split):
        old = self.split
        try:
            self.split = split
            return self.original_pool()
        except FileNotFoundError:
            return P.Experiment.top50(self, split)
        finally:
            self.split = old

    def caption_cache(self, split):
        target = self.cache_root/'caption_snapshot'/f'{split}.npz'
        expected = self.meta(stage='caption_snapshot', split=split)
        if storage.cache_available(target):
            cache, _ = storage.load_cache(target, expected)
        else:
            old = self.split
            try:
                self.split = split
                try:
                    cache = self.original_top5()
                except FileNotFoundError:
                    print('Computing missing caption cache at final Val lambda:', split, self.lam)
                    cache = P.Experiment.cache(self, split, self.w, self.lam)
            finally:
                self.split = old
            storage.save_cache(target, cache, expected)
        P.validate_top5(cache, len(self.kb))
        if not np.array_equal(cache['image_ids'], self.ids[split]):
            raise ValueError('Caption snapshot has wrong IDs')
        if np.any(self.kb_ids[cache['row_indices']] == cache['image_ids'][:, None]):
            raise ValueError('Caption snapshot leaks own image')
        return cache

    def retrieve_relations(self, queries, image_ids):
        """Expand FAISS search if own-source exclusion leaves too few candidates."""
        queries = np.array(queries, dtype=np.float32, copy=True)
        if not np.isfinite(queries).all() or (np.linalg.norm(queries, axis=1) <= 0).any():
            raise ValueError('Invalid image queries')
        faiss.normalize_L2(queries)
        size = min(64, len(self.triplets))
        distances, positions = self.triplet_index.search(queries, size)
        results = []
        for qi, iid in enumerate(image_ids):
            rows, sims = positions[qi], distances[qi]
            current = size
            while True:
                keep = [(int(r), float(s)) for r, s in zip(rows, sims)
                        if r >= 0 and H.valid_source(self.triplets[int(r)], iid) is not None]
                if len(keep) >= 50 or current == len(self.triplets):
                    break
                current = min(len(self.triplets), current * 2)
                dd, rr = self.triplet_index.search(queries[qi:qi+1], current)
                rows, sims = rr[0], dd[0]
            keep = sorted(keep, key=lambda x: (-x[1], x[0]))[:50]
            scores = P.normalize_scores_per_image([s for _, s in keep]) if keep else []
            picked = keep[:2]
            results.append(([r for r, _ in picked], list(scores[:2]),
                            [H.valid_source(self.triplets[r], iid) for r, _ in picked]))
        return results

    def hybrid_cache(self, split, caption):
        expected = self.meta(stage='hybrid_memory', split=split, caption_cache_sha256=cache_hash(caption))
        target = self.cache_root/'hybrid_memory'/f'{split}.npz'
        if storage.cache_available(target):
            cache, _ = storage.load_cache(target, expected)
        else:
            chunks = []
            for start in tqdm(range(0, len(self.ids[split]), 256), desc=f'Hybrid retrieval {split}'):
                ids = self.ids[split][start:start+256]
                path = target.parent/split/f'{start:06d}.npz'
                cm = dict(expected, start=start, image_ids_sha256=P.digest(ids))
                if storage.cache_available(path):
                    chunk, _ = storage.load_cache(path, cm)
                else:
                    q = self.features[split][[self.fmap[split][i] for i in ids]]
                    rr = self.retrieve_relations(q, ids)
                    rows, scores, counts, provenance = [], [], [], []
                    for j, (relations, rs, sources) in enumerate(rr):
                        row, sc = H.combine_tokens(caption['row_indices'][start+j], caption['scores'][start+j],
                                                   relations, rs, len(self.kb))
                        rows.append(row); scores.append(sc); counts.append(len(relations))
                        provenance.append(sources + [-1] * (2-len(sources)))
                    chunk = dict(image_ids=np.asarray(ids, dtype=np.int64),
                        row_indices=np.asarray(rows, dtype=np.int64), scores=np.asarray(scores, dtype=np.float32),
                        relation_count=np.asarray(counts, dtype=np.int64),
                        relation_source_ids=np.asarray(provenance, dtype=np.int64))
                    storage.save_cache(path, chunk, cm)
                chunks.append(chunk)
            cache = {k: np.concatenate([c[k] for c in chunks]) for k in chunks[0]}
            storage.save_cache(target, cache, expected)
        rows, scores = cache['row_indices'], cache['scores']
        if rows.shape != scores.shape or rows.shape != (len(self.ids[split]), 5):
            raise ValueError('Hybrid memory must be [N,5]')
        if not np.issubdtype(rows.dtype, np.integer) or not ((rows >= 0) & (rows < len(self.kb)+len(self.triplets))).all():
            raise ValueError('Invalid hybrid row indices')
        if not np.isfinite(scores).all() or not ((scores >= 0) & (scores <= 1)).all():
            raise ValueError('Invalid hybrid confidence')
        if any(len(set(r.tolist())) != 5 for r in rows):
            raise ValueError('Duplicate memory rows')
        if not np.array_equal(cache['image_ids'], self.ids[split]):
            raise ValueError('Hybrid cache has wrong IDs')
        for pos, iid in enumerate(cache['image_ids']):
            rows = cache['row_indices'][pos]
            cap_rows = rows[rows < len(self.kb)]
            if np.any(self.kb_ids[cap_rows] == iid):
                raise ValueError('Hybrid caption leakage')
            rel_rows = rows[rows >= len(self.kb)] - len(self.kb)
            if len(rel_rows) != cache['relation_count'][pos]:
                raise ValueError('Relation count mismatch')
            for j, row in enumerate(rel_rows):
                sid = int(cache['relation_source_ids'][pos, j])
                if sid == iid or sid not in self.triplets[int(row)]['source_image_ids']:
                    raise ValueError('Hybrid triplet provenance/leakage error')
        storage.write_json(target.with_suffix('.coverage.json'), dict(images=len(cache['image_ids']),
            two_spo=int((cache['relation_count']==2).sum()), one_spo=int((cache['relation_count']==1).sum()),
            zero_spo=int((cache['relation_count']==0).sum()), cache_sha256=cache_hash(cache)))
        return cache

    def prepare(self, split):
        if split not in self.arm_caches:
            caption = self.caption_cache(split)
            self.arm_caches[split] = {ARMS[0]: caption, ARMS[1]: self.hybrid_cache(split, caption)}
        return self.arm_caches[split]

    def tensors(self, split, cache, positions):
        ids = cache['image_ids'][positions]
        rows = cache['row_indices'][positions]
        knowledge = np.empty((*rows.shape, 512), dtype=np.float32)
        mask = rows < len(self.kb)
        knowledge[mask] = self.kb[rows[mask]]
        knowledge[~mask] = self.triplet_vectors[rows[~mask]-len(self.kb)]
        features = np.array(self.features[split][[self.fmap[split][int(i)] for i in ids]], dtype=np.float32)
        scores = np.array(cache['scores'][positions], dtype=np.float32)
        return tuple(torch.from_numpy(x).to(self.device) for x in (features, knowledge, scores))

    def train_arm(self, arm):
        if arm not in ARMS:
            raise ValueError(arm)
        self.work = self.seed_dir/arm
        train_cache, val_cache = self.prepare('train')[arm], self.prepare('val')[arm]
        contract = dict(study=self.contract_id, arm=arm, recipe=self.recipe,
            initial_sha256=self.initial_hash, train_cache_sha256=cache_hash(train_cache),
            val_cache_sha256=cache_hash(val_cache))
        H.guard(self.work/'training_contract.json', contract)
        journal = storage.Journal(self.work, contract)
        saved = journal.latest()
        if saved is None and any((self.work/n).exists() for n in ('best_model.pt', 'training_log.json', 'test_once.json')):
            raise RuntimeError('Missing resume journal despite training evidence; do not reset')
        self.model.load_state_dict(self.initial_state, strict=True)
        P.set_seed(self.seed)
        optimizer = torch.optim.AdamW(self.model.parameters(), lr=self.recipe['learning_rate'], weight_decay=1e-4)
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=self.recipe['epochs'], eta_min=1e-6)
        if saved is None:
            cursor = dict(next_epoch=0, next_batch=0, optimizer_steps=0, history=[],
                loss_sum_total=0., token_total=0, best_val_cider=None, best_epoch=None,
                best_model_state_dict=None, epochs_without_improvement=0,
                training_complete=False, stop_reason=None)
        else:
            self.model.load_state_dict(saved['model_state_dict'], strict=True)
            optimizer.load_state_dict(saved['optimizer_state_dict'])
            for state in optimizer.state.values():
                for k, v in state.items():
                    if torch.is_tensor(v) and k != 'step':
                        state[k] = v.to(self.device)
            scheduler.load_state_dict(saved['scheduler_state_dict'])
            if saved['optimizer_steps']:
                optimizer._opt_called = True
            P.restore_rng(saved['rng'])
            cursor = {k: v for k, v in saved.items() if k not in (
                'model_state_dict', 'optimizer_state_dict', 'scheduler_state_dict', 'rng', 'generation', 'contract')}
            del saved
        samples = [(pos, text) for pos, iid in enumerate(train_cache['image_ids']) for text in self.caps['train'][int(iid)]]
        batch_size = self.recipe['batch_size']
        batches = math.ceil(len(samples)/batch_size)
        if not (cursor['next_epoch'] == len(cursor['history']) <= self.recipe['epochs'] and 0 <= cursor['next_batch'] <= batches):
            raise ValueError('Invalid training resume cursor')
        if cursor['training_complete'] and cursor['stop_reason'] not in ('early_stopping', 'max_epochs'):
            raise ValueError('Completed training is missing its stop reason')
        if (self.work/'test_once.json').exists() and not cursor['training_complete']:
            raise RuntimeError('Cannot continue training after opening Test')

        def persist():
            journal.save(dict(cursor, model_state_dict=self.model.state_dict(),
                optimizer_state_dict=optimizer.state_dict(), scheduler_state_dict=scheduler.state_dict(), rng=P.rng_state()))

        if journal.generation < 0:
            persist()
        for epoch in range(cursor['next_epoch'], self.recipe['epochs']):
            if cursor['training_complete']:
                break
            self.model.train()
            permutation = np.random.default_rng(self.seed+epoch).permutation(len(samples))
            bar = tqdm(range(cursor['next_batch'], batches), initial=cursor['next_batch'], total=batches,
                       desc=f'{arm} seed{self.seed} epoch {epoch+1}')
            for b in bar:
                chosen = [samples[i] for i in permutation[b*batch_size:(b+1)*batch_size]]
                visual, knowledge, scores = self.tensors('train', train_cache, np.asarray([r[0] for r in chosen]))
                tokens = pad_sequence([self.encode(r[1]) for r in chosen], batch_first=True,
                                      padding_value=self.stoi['<PAD>']).to(self.device)
                optimizer.zero_grad(set_to_none=True)
                logits, gate = self.model(visual, knowledge, scores, tokens[:, :-1])
                targets = tokens[:, 1:].contiguous()
                total = F.cross_entropy(logits.reshape(-1, len(self.stoi)), targets.reshape(-1),
                                        ignore_index=self.stoi['<PAD>'], reduction='sum')
                count = targets.ne(self.stoi['<PAD>']).sum()
                loss = total/count.clamp_min(1)
                if not torch.isfinite(loss):
                    raise FloatingPointError('Non-finite loss; preserving last valid journal')
                loss.backward()
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1., error_if_nonfinite=True)
                optimizer.step()
                cursor['optimizer_steps'] += 1
                cursor['next_batch'] = b+1
                cursor['loss_sum_total'] += float(total.item())
                cursor['token_total'] += int(count.item())
                bar.set_postfix(loss=cursor['loss_sum_total']/max(1, cursor['token_total']))
                if (b+1) % self.recipe['save_every_batches'] == 0 or b+1 == batches:
                    persist()
            model_hash = M.state_dict_sha256(self.model.state_dict())
            preds = self.predictions('val', val_cache, 'greedy', model_hash, f'epoch{epoch+1:02d}')
            metrics = self.evaluate(preds, 'val', self.work/'epoch_metrics'/f'epoch{epoch+1:02d}.json', only_cider=True)
            cider = float(metrics['CIDEr'])
            if not math.isfinite(cider):
                raise FloatingPointError('Invalid Val CIDEr')
            improved, stale, complete, stop_reason = T.update(
                cursor['best_val_cider'], cursor['epochs_without_improvement'], cider,
                epoch+1, self.recipe['epochs'], self.recipe['early_stop_patience'],
                self.recipe['early_stop_min_delta'])
            if improved:
                cursor.update(best_val_cider=cider, best_epoch=epoch+1, best_model_state_dict=cpu_state(self.model))
            cursor['epochs_without_improvement'] = stale
            cursor['history'].append(dict(epoch=epoch+1, val_CIDEr_x100=cider*100,
                train_loss=cursor['loss_sum_total']/max(1, cursor['token_total']),
                lr=optimizer.param_groups[0]['lr'], improved=improved))
            scheduler.step()
            cursor.update(next_epoch=epoch+1, next_batch=0, loss_sum_total=0., token_total=0,
                          training_complete=complete, stop_reason=stop_reason)
            persist()
            storage.write_json(self.work/'training_log.json', {k: v for k, v in cursor.items() if k != 'best_model_state_dict'})
            if complete:
                break
        if not cursor['training_complete'] or cursor['optimizer_steps'] <= 0 or cursor['best_model_state_dict'] is None:
            raise ValueError('Training has not completed')
        self.model.load_state_dict(cursor['best_model_state_dict'], strict=True)
        model_hash = M.state_dict_sha256(self.model.state_dict())
        if model_hash == self.initial_hash:
            raise ValueError('Weights did not change from L5')
        best = dict(model_state_dict=cursor['best_model_state_dict'], contract=contract,
            model_state_sha256=model_hash, best_epoch=cursor['best_epoch'],
            optimizer_steps=cursor['optimizer_steps'], completed_epochs=len(cursor['history']),
            training_complete=True, stop_reason=cursor['stop_reason'])
        best_path = self.work/'best_model.pt'
        if best_path.exists():
            old = storage.load_torch(best_path)
            if old['contract'] != contract or M.state_dict_sha256(old['model_state_dict']) != model_hash:
                raise ValueError('Existing best model differs from completed training journal')
        else:
            storage.save_torch(best_path, best)
        storage.write_json(self.work/'training_log.json', {k: v for k, v in cursor.items() if k != 'best_model_state_dict'})
        print('TRAIN COMPLETE:', arm, '; epochs run', len(cursor['history']),
              '; selected epoch', cursor['best_epoch'], '; reason', cursor['stop_reason'])
        return model_hash

    def score_arm(self, arm, split):
        if arm not in ARMS or split not in ('val', 'test'):
            raise ValueError('Invalid arm/split')
        self.work = self.seed_dir/arm
        best = storage.load_torch(self.work/'best_model.pt')
        if best['contract']['study'] != self.contract_id or best['contract']['arm'] != arm:
            raise ValueError('Wrong best checkpoint')
        self.model.load_state_dict(best['model_state_dict'], strict=True)
        model_hash = M.state_dict_sha256(self.model.state_dict())
        if (model_hash != best['model_state_sha256'] or best.get('training_complete') is not True or
                not 1 <= best['best_epoch'] <= best['completed_epochs'] <= self.recipe['epochs'] or
                best.get('stop_reason') not in ('early_stopping', 'max_epochs')):
            raise ValueError('Invalid training evidence')
        if split == 'test':
            plan = dict(study=self.contract_id, models={})
            for branch in ARMS:
                selected = storage.load_torch(self.seed_dir/branch/'best_model.pt')
                validation = storage.read_json(self.seed_dir/branch/'val_summary.json')
                sh = M.state_dict_sha256(selected['model_state_dict'])
                if (selected['contract']['study'] != self.contract_id or
                    selected.get('training_complete') is not True or
                    not 1 <= selected['best_epoch'] <= selected['completed_epochs'] <= self.recipe['epochs'] or
                    selected.get('stop_reason') not in ('early_stopping', 'max_epochs') or
                    validation['evaluation']['study'] != self.contract_id or
                    validation['evaluation']['model_state_sha256'] != sh or not validation['complete']):
                    raise ValueError('Both arms must finish train/Val before Test')
                plan['models'][branch] = sh
                del selected
            H.guard(self.seed_dir/'test_plan.json', plan)
        cache = self.prepare(split)[arm]
        evaluation = dict(study=self.contract_id, arm=arm, split=split, seed=self.seed,
            model_state_sha256=model_hash, cache_sha256=cache_hash(cache),
            ids_sha256=P.digest(self.ids[split]), beam=3, max_len=30, alpha=.6)
        if split == 'test':
            val = storage.read_json(self.work/'val_summary.json')
            if val['evaluation']['model_state_sha256'] != model_hash or val['evaluation']['study'] != self.contract_id:
                raise ValueError('Must complete Val with the same frozen model before Test')
            H.guard(self.work/'test_once.json', evaluation)
        path = self.work/f'{split}_summary.json'
        if path.exists():
            summary = storage.read_json(path)
            if summary['evaluation'] != evaluation or not summary.get('complete'):
                raise ValueError('Existing summary has a different evaluation contract')
            if summary['summary_sha256'] != P.digest({k: v for k, v in summary.items() if k != 'summary_sha256'}):
                raise ValueError('Summary payload changed')
            checked_metrics(summary['metrics_raw'])
            return summary
        predictions = self.predictions(split, cache, 'beam', model_hash, f'final_{split}')
        storage.write_json(self.work/f'{split}_predictions.json', predictions)
        metrics = checked_metrics(self.evaluate(predictions, split, self.work/'metrics'/f'{split}.json'))
        summary = dict(evaluation=evaluation, complete=True, metrics_raw=metrics,
                        metrics_x100={k: v*100 for k, v in metrics.items()},
                        selected_epoch=best['best_epoch'], completed_epochs=best['completed_epochs'],
                        stop_reason=best['stop_reason'])
        summary['summary_sha256'] = P.digest(summary)
        storage.write_json(path, summary)
        return summary

    def compare(self, split):
        summaries = [storage.read_json(self.seed_dir/a/f'{split}_summary.json') for a in ARMS]
        rows = []
        for arm, summary in zip(ARMS, summaries):
            e = summary['evaluation']
            if e['study'] != self.contract_id or e['arm'] != arm or e['split'] != split:
                raise ValueError('Cannot combine different studies')
            metrics = checked_metrics(summary['metrics_raw'])
            rows.append(dict(arm=arm, seed=self.seed, split=split,
                completed_epochs=summary['completed_epochs'], selected_epoch=summary['selected_epoch'],
                stop_reason=summary['stop_reason'], **{k: metrics[k]*100 for k in METRICS}))
        rows.append(dict(arm='delta_hybrid_minus_caption', seed=self.seed, split=split,
                         completed_epochs='', selected_epoch='', stop_reason='',
                          **{k: rows[1][k]-rows[0][k] for k in METRICS}))
        export_table(self.seed_dir/f'{split}_comparison', rows)
        return rows

    def run(self, run_test=True):
        # Both branches are trained and validated before any new Test score is opened.
        self.prepare('train'); self.prepare('val')
        for arm in ARMS:
            self.train_arm(arm)
            self.score_arm(arm, 'val')
        result = {'val': self.compare('val')}
        if run_test:
            for arm in ARMS:
                self.score_arm(arm, 'test')
            result['test'] = self.compare('test')
        return result


def aggregate(output_root, seeds=STUDY_SEEDS, split='test'):
    """Require the declared three paired seeds; never silently aggregate fewer."""
    root = Path(output_root)
    if tuple(seeds) != STUDY_SEEDS or split not in ('val', 'test'):
        raise ValueError('Aggregate requires seeds 42,44,46 and a val/test split')
    records, signatures = {}, []
    missing = [str(root/'runs'/f'seed{s}'/a/f'{split}_summary.json') for s in seeds for a in ARMS
               if not (root/'runs'/f'seed{s}'/a/f'{split}_summary.json').is_file()]
    if missing:
        print('Aggregate chưa đủ các seed đã khai báo:', ', '.join(map(str, seeds)))
        return None
    for seed in seeds:
        folder = root/'runs'/f'seed{seed}'
        contract = storage.read_json(folder/'study_contract.json')
        signatures.append({k: contract[k] for k in ('protocol', 'recipe', 'modules', 'bank_sha256', 'memory', 'relation_retrieval', 'relation_score', 'fallback', 'self_exclusion', 'environment')})
        records[seed] = {}
        for arm in ARMS:
            s = storage.read_json(folder/arm/f'{split}_summary.json')
            if not s['complete'] or s['evaluation']['study'] != P.digest(contract) or s['evaluation']['seed'] != seed or s['evaluation']['arm'] != arm or s['evaluation']['split'] != split:
                raise ValueError('Invalid aggregate summary')
            if s['summary_sha256'] != P.digest({k: v for k, v in s.items() if k != 'summary_sha256'}):
                raise ValueError('Aggregate summary checksum failed')
            records[seed][arm] = checked_metrics(s['metrics_raw'])
    if any(s != signatures[0] for s in signatures[1:]):
        raise ValueError('Different bank/recipe/software across seeds; cannot pool results')
    rows = []
    for metric in METRICS:
        old = np.asarray([records[s][ARMS[0]][metric]*100 for s in seeds])
        new = np.asarray([records[s][ARMS[1]][metric]*100 for s in seeds])
        delta = new-old
        rows.append(dict(metric=metric, n=len(seeds), caption_mean=float(old.mean()), caption_std=float(old.std(ddof=1)),
            hybrid_mean=float(new.mean()), hybrid_std=float(new.std(ddof=1)),
            paired_delta_mean=float(delta.mean()), paired_delta_std=float(delta.std(ddof=1))))
    export_table(root/f'{split}_{len(seeds)}seed_summary', rows)
    return rows
