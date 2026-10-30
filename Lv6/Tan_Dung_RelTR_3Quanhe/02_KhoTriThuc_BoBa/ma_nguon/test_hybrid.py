"""Local synthetic checks. NO scores from this file are COCO research results.

python test_hybrid.py             -> pure data/notebook tests
python test_hybrid.py --integration -> real CPU torch/FAISS + synthetic training loop
"""
import ast
import json
import sys
import tempfile
import types
import unittest
from pathlib import Path
from functools import partial

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(ROOT/'Tan_Dung_RelTR_3Quanhe/01_CHAY_RelTR_BoBa_ChonCaption/ma_nguon'))
import hybrid_knowledge as H
import training_stop as T


class KnowledgeTests(unittest.TestCase):
    def test_early_stop_decision(self):
        self.assertEqual(T.update(None, 0, .8, 1, 15, 4, 0), (True, 0, False, None))
        self.assertEqual(T.update(.8, 0, .8, 2, 15, 4, 0), (False, 1, False, None))
        self.assertEqual(T.update(.8, 1, .7, 3, 15, 4, 0), (False, 2, False, None))
        self.assertEqual(T.update(.8, 2, .7, 4, 15, 4, 0), (False, 3, False, None))
        self.assertEqual(T.update(.8, 3, .7, 5, 15, 4, 0),
                         (False, 4, True, 'early_stopping'))
        self.assertEqual(T.update(.8, 3, .9, 5, 15, 4, 0), (True, 0, False, None))
        self.assertEqual(T.update(.8, 0, .9, 15, 15, 4, 0), (True, 0, True, 'max_epochs'))
        with self.assertRaises(ValueError):
            T.update(.8, 0, float('nan'), 2, 15, 4, 0)

    def test_dedup_order_provenance(self):
        def t(s, p, o, c):
            return dict(subject=s, predicate=p, object=o, confidence=c)
        table = {'1': [t('dog', 'chasing', 'person', .9)],
                 '2': [t('dog', 'chasing', 'person', .7), t('person', 'chasing', 'dog', .8)], '3': []}
        rows = H.make_triplet_records(table, [1, 2, 3])
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]['source_image_ids'], [1, 2])
        self.assertEqual(H.valid_source(rows[0], 1), 2)
        self.assertIsNone(H.valid_source(rows[1], 2))
        with self.assertRaises(ValueError):
            H.make_triplet_records(table, [1, 2])

    def test_five_memory_tokens_and_fallback(self):
        for n in (0, 1, 2):
            rows, scores = H.combine_tokens([0, 1, 2, 3, 4], [1, .8, .7, .6, .5],
                                            list(range(n)), [1, .9][:n], 10)
            self.assertEqual(len(set(rows)), 5)
            self.assertEqual(sum(r >= 10 for r in rows), n)
            self.assertEqual(rows[:3], [0, 1, 2])
        with self.assertRaises(ValueError):
            H.combine_tokens([0, 0, 1, 2, 3], [1]*5, [], [], 10)

    def test_reltr_actual_csv_schema(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)/'reltr.csv'
            p.write_text('image,prediction,score\nCOCO_train2014_000000000001.jpg,person - riding - horse,0.9\n'
                         'COCO_train2014_000000000001.jpg,person - riding - horse,0.8\n'
                         'COCO_train2014_000000000002.jpg,no_relation,0.0\n', encoding='utf-8')
            table, stats = H.load_reltr_triplets(p)
            rows = H.make_triplet_records(table, [1, 2])
            self.assertEqual(rows[0]['text'], 'person riding horse')
            self.assertEqual(stats['duplicates'], 1)

    def test_corruption_and_config_guard(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)/'x.npy'
            H.save_array(p, np.eye(3))
            np.testing.assert_array_equal(H.checked_array(p), np.eye(3))
            with p.open('ab') as f:
                f.write(b'changed')
            with self.assertRaises(IOError):
                H.checked_array(p)
            H.guard(Path(d)/'contract.json', {'seed': 45})
            with self.assertRaises(ValueError):
                H.guard(Path(d)/'contract.json', {'seed': 46})

    def test_notebooks_and_embedded_source(self):
        notebooks = list(HERE.parent.glob('*.ipynb'))
        self.assertEqual(len(notebooks), 3)
        for path in notebooks:
            nb = H.read_json(path)
            self.assertEqual(nb['nbformat'], 4)
            self.assertEqual(len({c['id'] for c in nb['cells']}), len(nb['cells']))
            for c in nb['cells']:
                if c['cell_type'] != 'code':
                    continue
                self.assertFalse(c['outputs'])
                tree = ast.parse(''.join(c['source']))
                for node in tree.body:
                    if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'EMBEDDED_SOURCES' for t in node.targets):
                        sources = ast.literal_eval(node.value)
                        for name, source in sources.items():
                            if name.endswith('.py'):
                                ast.parse(source)
                            if name.startswith('hybrid_') or name in ('training_stop.py', 'drive_io.py'):
                                self.assertEqual(source, (HERE/name).read_text(encoding='utf-8'))
            source = '\n'.join(''.join(c['source']) for c in nb['cells'] if c['cell_type'] == 'code')
            if not path.name.startswith('03_'):
                self.assertIn("knowledge_base_level2", source)
                self.assertIn("reltr_triplet_bank_v1", source)
            if path.name.startswith('02_'):
                self.assertIn("baseline_level6/Dung_KhoTriThucLV2", source)
                self.assertIn("seeds=(42, 44, 46)", source)
                self.assertIn("early_stop_patience=EARLY_STOP_PATIENCE", source)
                self.assertIn("EPOCHS = 15", source)
                self.assertIn("EARLY_STOP_PATIENCE = 4", source)


if '--integration' in sys.argv:
    sys.argv.remove('--integration')
    import torch
    import faiss
    # These tests use frozen/synthetic caption caches; avoid downloading WordNet.
    semantic = types.ModuleType('semantic_expansion')
    semantic.expand_labels = lambda x: set(x)
    semantic.jaccard_semantic = lambda x, y: 0.
    sys.modules['semantic_expansion'] = semantic
    sys.path[:0] = [str(ROOT/'_shared'), str(ROOT/'_shared/l5a_source_review/baseline_level5/lv5_A/multiseed_5tokens_v1'),
                   str(ROOT/'_shared/l5a_source_review/baseline_level5/shared_modules')]
    import hybrid_caption_runner as C
    import level5_model as M
    import level5a_pipeline as P
    import storage
    torch.set_num_threads(2)
    STOI = {w: i for i, w in enumerate(['<PAD>', '<BOS>', '<EOS>', '<UNK>', 'a', 'person', 'rides', 'horse'])}

    class Tiny(torch.nn.Module):
        def __init__(self):
            super().__init__()
            self.embedding = torch.nn.Embedding(8, 8)
            self.knowledge = torch.nn.Linear(512, 8)
            self.dropout = torch.nn.Dropout(.1)
            self.output = torch.nn.Linear(8, 8)
        def forward(self, v, k, s, tokens):
            x = self.embedding(tokens)+self.knowledge(k.mean(1)).unsqueeze(1)
            return self.output(self.dropout(x)), torch.sigmoid(s.mean(1, keepdim=True))

    def fixture(folder):
        e = C.HybridExperiment.__new__(C.HybridExperiment)
        e.seed, e.device, e.stoi = 42, torch.device('cpu'), STOI
        e.ids = {'train': [10, 11], 'val': [20, 21], 'test': [30, 31]}
        e.caps = {s: {i: ['a person rides horse', 'a horse'] for i in ids} for s, ids in e.ids.items()}
        rng = np.random.default_rng(7)
        def vectors(n):
            x = rng.normal(size=(n, 512)).astype(np.float32)
            return x/np.linalg.norm(x, axis=1, keepdims=True)
        e.kb, e.triplet_vectors = vectors(6), vectors(3)
        e.kb_ids = np.asarray([99]*6)
        e.triplets = [dict(source_image_ids=ids) for ids in ([10], [10, 11], [11])]
        e.triplet_index = faiss.IndexFlatIP(512); e.triplet_index.add(e.triplet_vectors)
        e.features = {s: vectors(2) for s in e.ids}
        e.fmap = {s: {iid: j for j, iid in enumerate(ids)} for s, ids in e.ids.items()}
        e.seed_dir = Path(folder); e.cache_root = e.seed_dir/'cache'
        e.recipe = dict(epochs=15, batch_size=2, learning_rate=.001, save_every_batches=1,
                        early_stop_patience=4, early_stop_min_delta=0.0)
        e.base_meta = dict(protocol='SYNTHETIC_TEST_ONLY', recipe=e.recipe)
        e.contract_id = P.digest(e.base_meta)
        e.arm_caches = {}
        for s, ids in e.ids.items():
            cap = dict(image_ids=np.asarray(ids), row_indices=np.asarray([[0, 1, 2, 3, 4]]*2),
                       scores=np.asarray([[1, .8, .6, .4, .2]]*2, dtype=np.float32), is_fallback=np.zeros(2, dtype=bool))
            e.arm_caches[s] = {C.ARMS[0]: cap, C.ARMS[1]: e.hybrid_cache(s, cap)}
        P.set_seed(111)
        e.model = Tiny()
        e.initial_state = C.cpu_state(e.model)
        e.initial_hash = M.state_dict_sha256(e.initial_state)
        _, greedy, beam = M.create_level5(STOI, 'cpu')
        e.greedy = partial(greedy, max_len=5)
        e.beam = partial(beam, beam_size=3, max_len=5)
        # Synthetic evaluator isolates orchestration from COCO; never exported outside tempdir.
        e.evaluate = lambda records, split, path, only_cider=False: ({'CIDEr': .1} if only_cider else {m: .1 for m in C.METRICS})
        return e

    class IntegrationTests(unittest.TestCase):
        def test_early_stop_persists_and_does_not_resume_training(self):
            with tempfile.TemporaryDirectory() as d:
                e = fixture(d)
                first_hash = e.train_arm(C.ARMS[0])
                log = H.read_json(e.seed_dir/C.ARMS[0]/'training_log.json')
                self.assertTrue(log['training_complete'])
                self.assertEqual(log['stop_reason'], 'early_stopping')
                self.assertEqual(len(log['history']), 5)
                self.assertEqual(log['best_epoch'], 1)
                self.assertEqual(log['epochs_without_improvement'], 4)
                self.assertEqual(e.train_arm(C.ARMS[0]), first_hash)
                self.assertEqual(e.score_arm(C.ARMS[0], 'val')['completed_epochs'], 5)

        def test_native_model_accepts_hybrid_and_backward(self):
            model, greedy, beam = M.create_level5(STOI, 'cpu')
            v, k, s = torch.randn(2, 512), torch.randn(2, 5, 512), torch.rand(2, 5)
            logits, gate = model(v, k, s, torch.tensor([[1, 4, 5], [1, 4, 7]]))
            self.assertEqual(tuple(model.build_knowledge_memory(k).shape), (2, 5, 256))
            loss = torch.nn.functional.cross_entropy(logits.reshape(-1, 8), torch.tensor([4, 5, 2, 4, 7, 2]))
            loss.backward()
            self.assertGreater(float(model.knowledge_proj.weight.grad.abs().sum()), 0.)
            self.assertTrue(isinstance(beam(model, v[0], k[0], s[0], max_len=5), str))

        def test_retrieval_self_exclusion_and_tensor_routing(self):
            with tempfile.TemporaryDirectory() as d:
                e = fixture(d)
                results = e.retrieve_relations(e.triplet_vectors[:1], [10])
                self.assertNotIn(0, results[0][0])
                self.assertTrue(all(s != 10 for s in results[0][2]))
                cache = e.prepare('train')[C.ARMS[1]]
                v, k, s = e.tensors('train', cache, np.asarray([0, 1]))
                self.assertEqual(tuple(k.shape), (2, 5, 512))
                for i, row in enumerate(cache['row_indices'][0]):
                    expected = e.kb[row] if row < len(e.kb) else e.triplet_vectors[row-len(e.kb)]
                    np.testing.assert_array_equal(k[0, i].numpy(), expected)

        def test_resume_pair_and_test_lock(self):
            with tempfile.TemporaryDirectory() as d:
                uninterrupted = fixture(Path(d)/'uninterrupted')
                expected_hash = uninterrupted.train_arm(C.ARMS[0])
                interrupted = fixture(Path(d)/'resumed')
                interrupted.evaluate = lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError('SIMULATED INTERRUPTION'))
                with self.assertRaisesRegex(RuntimeError, 'SIMULATED'):
                    interrupted.train_arm(C.ARMS[0])
                resumed = fixture(Path(d)/'resumed')
                self.assertEqual(resumed.train_arm(C.ARMS[0]), expected_hash)
                self.assertEqual(resumed.train_arm(C.ARMS[0]), expected_hash)
                # The exact production two-arm ordering, decoding, summary, and lock code.
                results = resumed.run(run_test=True)
                self.assertEqual(len(results['test']), 3)
                self.assertTrue((resumed.seed_dir/'test_plan.json').is_file())
                self.assertNotEqual(M.state_dict_sha256(storage.load_torch(resumed.seed_dir/C.ARMS[1]/'best_model.pt')['model_state_dict']), expected_hash)
                self.assertEqual(resumed.score_arm(C.ARMS[0], 'test')['metrics_x100']['CIDEr'], 10.)
                p = resumed.seed_dir/C.ARMS[0]/'test_once.json'
                bad = H.read_json(p); bad['max_len'] = 20; H.write_json(p, bad)
                with self.assertRaises(ValueError):
                    resumed.score_arm(C.ARMS[0], 'test')


if __name__ == '__main__':
    unittest.main(verbosity=2)
