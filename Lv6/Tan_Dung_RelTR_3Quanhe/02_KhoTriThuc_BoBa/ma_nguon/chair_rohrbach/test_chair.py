"""Small synthetic checks for the Rohrbach CHAIR port; not COCO results."""
import json
import re
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from chair_score import RohrbachCHAIR, annotation_dir, load_prediction_pair, digest
from pattern_singular import singularize


class CHAIRTests(unittest.TestCase):
    def setUp(self):
        self.here = Path(__file__).resolve().parent
        self.scorer = RohrbachCHAIR(self.here/'synonyms.txt',
            tokenizer=lambda s: re.findall(r"[A-Za-z]+|[^\w\s]", s))

    def test_original_singular_and_phrase_rules(self):
        self.assertEqual([singularize(w) for w in ('dogs', 'children', 'buses')],
                         ['dog', 'child', 'bus'])
        mentions = self.scorer.caption_to_words('Two dogs and a wine glass by a toilet seat.')
        self.assertEqual([m[1] for m in mentions], ['dog', 'wine glass', 'toilet'])
        self.assertEqual([m[1] for m in self.scorer.caption_to_words('A baby bird by a passenger train.')],
                         ['bird', 'train'])

    def test_union_of_instance_and_caption_ground_truth(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for split in ('train', 'val'):
                instances = {'categories': [{'id': 1, 'name': 'dog'}],
                             'annotations': ([{'image_id': 1, 'category_id': 1}] if split == 'val' else [])}
                captions = {'annotations': ([{'image_id': 1, 'caption': 'A cat sits nearby.'},
                                             {'image_id': 2, 'caption': 'A plane.'}]
                                            if split == 'val' else [])}
                (root/f'instances_{split}2014.json').write_text(json.dumps(instances), encoding='utf-8')
                (root/f'captions_{split}2014.json').write_text(json.dumps(captions), encoding='utf-8')
            self.assertEqual(annotation_dir(root), root)
            gt = self.scorer.ground_truth(root, {1, 2})
            self.assertEqual(gt, {1: {'dog', 'cat'}, 2: {'airplane'}})
            scored = self.scorer.score([
                {'image_id': 1, 'caption': 'A dog, a dog, and a cat.'},
                {'image_id': 2, 'caption': 'A plane and a horse.'}], gt)
            self.assertEqual(scored['captions'], 2)
            self.assertEqual(scored['object_mentions'], 5)
            self.assertEqual(scored['hallucinated_object_mentions'], 1)
            self.assertEqual(scored['CHAIR_s'], .5)
            self.assertEqual(scored['CHAIR_i'], .2)

    def test_only_frozen_beam_test_pair_is_accepted(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)/'runs/seed42'
            root.mkdir(parents=True)
            (root/'test_plan.json').write_text(json.dumps(dict(
                study='fixture', models={a: a for a in ('caption_control', 'hybrid_3cap_2spo')})),
                encoding='utf-8')
            predictions = [{'image_id': i, 'caption': 'A dog.'} for i in range(5000)]
            for arm in ('caption_control', 'hybrid_3cap_2spo'):
                branch = root/arm
                branch.mkdir()
                evaluation = dict(study='fixture', split='test', seed=42, arm=arm,
                                  model_state_sha256=arm, beam=3, max_len=30,
                                  alpha=.6, ids_sha256=digest(list(range(5000))))
                (branch/'test_once.json').write_text(json.dumps(evaluation), encoding='utf-8')
                summary = dict(evaluation=evaluation, complete=True)
                summary['summary_sha256'] = digest(summary)
                (branch/'test_summary.json').write_text(json.dumps(summary), encoding='utf-8')
                (branch/'test_predictions.json').write_text(json.dumps(predictions), encoding='utf-8')
            self.assertEqual(len(load_prediction_pair(Path(folder), 42)), 2)
            path = root/'hybrid_3cap_2spo/test_once.json'
            altered = json.loads(path.read_text(encoding='utf-8'))
            altered['beam'] = 1
            path.write_text(json.dumps(altered), encoding='utf-8')
            with self.assertRaises(ValueError):
                load_prediction_pair(Path(folder), 42)


if __name__ == '__main__':
    unittest.main()
