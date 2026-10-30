"""Fault-injection tests for the DriveFS publication fix; no Drive data touched."""
import ast
import errno
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import numpy as np
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1]/'01_CHAY_RelTR_BoBa_ChonCaption/ma_nguon'))
sys.path.insert(0, str(HERE/'chair_rohrbach'))
import drive_io as IO
import hybrid_knowledge as H
import chair_score as C


class DriveIOTests(unittest.TestCase):
    def test_coco_worker_uses_local_rename_and_publishes_to_drive(self):
        """Exercise the actual notebook-02 override without importing GPU packages."""
        source = (HERE/'hybrid_caption_runner.py').read_text(encoding='utf-8')
        cls = next(n for n in ast.parse(source).body
                   if isinstance(n, ast.ClassDef) and n.name == 'HybridExperiment')
        method = next(n for n in cls.body
                      if isinstance(n, ast.FunctionDef) and n.name == 'evaluate')

        class FakeBase:
            def evaluate(self, records, split, path, only_cider=False):
                path.parent.mkdir(parents=True, exist_ok=True)
                path.with_name(path.stem+'_eval_input.json').write_text('input', encoding='utf-8')
                path.with_suffix('.log').write_text('worker log', encoding='utf-8')
                pending = path.with_suffix('.tmp')
                pending.write_text(json.dumps({'request_sha256': 'request', 'complete': True,
                                               'metrics': {'CIDEr': 1.0}}), encoding='utf-8')
                os.replace(pending, path)
                return {'CIDEr': 1.0}

        namespace = {'Path': Path, 'tempfile': tempfile,
                     'P': SimpleNamespace(Experiment=FakeBase, digest=lambda _: 'request'),
                     'H': H, 'checked_metrics': lambda x: x}
        exec('class Probe:\n' + '\n'.join('    '+line for line in ast.unparse(method).splitlines()), namespace)
        probe = namespace['Probe']()
        probe.caps = {'test': {1: ['a cat']}}
        probe.environment = {'pycocoevalcap': '1.2'}
        probe.code_hashes = {'coco_eval_worker.py': 'hash'}
        records = [{'image_id': 1, 'caption': 'cat'}]
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder)/'drive'/'test.json'
            real_replace = os.replace
            def local_only(src, dst):
                self.assertFalse(str(dst).startswith(str(target.parent)))
                return real_replace(src, dst)
            with patch('os.replace', side_effect=local_only):
                self.assertEqual(probe.evaluate(records, 'test', target, only_cider=True), {'CIDEr': 1.0})
            self.assertTrue(target.is_file())
            self.assertTrue(target.with_name('test_eval_input.json').is_file())
            self.assertTrue(target.with_suffix('.log').is_file())
            self.assertEqual(probe.evaluate(records, 'test', target, only_cider=True), {'CIDEr': 1.0})

    def test_all_writers_work_when_drive_rename_is_unavailable(self):
        with tempfile.TemporaryDirectory() as d, patch('os.replace', side_effect=FileNotFoundError), \
                patch.object(Path, 'replace', side_effect=FileNotFoundError):
            root = Path(d)
            H.write_json(root/'bank.json', {'text': 'bộ ba'})
            H.guard(root/'contract.json', {'seed': 42})
            H.save_array(root/'00004864.npy', np.eye(3, dtype=np.float32))
            C.write_json(root/'chair.json', {'CHAIR_s': .1})
            np.testing.assert_array_equal(H.checked_array(root/'00004864.npy'), np.eye(3))
            self.assertEqual(H.read_json(root/'bank.json')['text'], 'bộ ba')
            self.assertEqual(C.read_json(root/'chair.json')['CHAIR_s'], .1)

    def test_retry_transient_open_but_not_permission_error(self):
        with tempfile.TemporaryDirectory() as d:
            target, source = Path(d)/'remote', Path(d)/'local'
            source.write_bytes(b'complete payload')
            real_open = Path.open
            attempts = []
            def flaky(path, *args, **kwargs):
                if path == target and args and args[0] == 'r+b':
                    attempts.append(1)
                    if len(attempts) == 1:
                        raise OSError(errno.EIO, 'DriveFS transient')
                return real_open(path, *args, **kwargs)
            with patch.object(Path, 'open', flaky), patch.object(IO.time, 'sleep'):
                IO.publish(source, target)
            self.assertEqual(target.read_bytes(), source.read_bytes())
            self.assertEqual(len(attempts), 2)
            with patch.object(Path, 'mkdir', side_effect=PermissionError(errno.EACCES, 'denied')), \
                    patch.object(IO.time, 'sleep') as sleep:
                with self.assertRaises(OSError):
                    IO.publish(source, target)
                sleep.assert_not_called()

    def test_checksum_mismatch_retries_and_never_reports_success(self):
        with tempfile.TemporaryDirectory() as d:
            source, target = Path(d)/'local', Path(d)/'remote'
            source.write_bytes(b'payload')
            real_sha = IO.sha
            with patch.object(IO, 'sha', side_effect=lambda p: 'bad' if Path(p) == target else real_sha(p)), \
                    patch.object(IO.time, 'sleep'):
                with self.assertRaises(OSError):
                    IO.publish(source, target, attempts=2)

    def test_interrupted_json_recovers_pending_and_protects_contract(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d)/'contract.json'
            path.write_text('{', encoding='utf-8')
            path.with_name(path.name+'.pending').write_text('{"seed":42}', encoding='utf-8')
            H.guard(path, {'seed': 42})
            with self.assertRaises(ValueError):
                H.guard(path, {'seed': 44})

    def test_interrupted_chunk_sidecar_reuses_pending_or_reencodes(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d)/'00004864.npy'
            array = np.eye(3, dtype=np.float32)
            H.save_array(path, array)
            side = path.with_suffix('.sha256.json')
            side.unlink()  # Synthetic interruption; production data never deleted.
            np.testing.assert_array_equal(H.load_chunk(path), array)
            side.with_name(side.name+'.pending').unlink()
            self.assertIsNone(H.load_chunk(path))
            H.save_array(path, array)
            with path.open('ab') as f:
                f.write(b'corrupt')
            with self.assertRaises(IOError):
                H.load_chunk(path)

    def test_known_storage_migration_preserves_original_contract(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d)/'source_contract.json'
            old = dict(source_code=H.LEGACY_STORAGE_CODE, parser_code='parser',
                       min_confidence=.5, caption_embeddings_sha256='captions')
            H.write_json(path, old)
            new = dict(old, source_code=H.sha(H.__file__))
            self.assertEqual(H.bank_source_contract(path, new), old)
            self.assertEqual(H.read_json(path), old)
            self.assertTrue(H.compatible_bank_code(old['source_code']))
            self.assertFalse(H.compatible_bank_code('unknown'))
            for changed in ({'min_confidence': .6}, {'parser_code': 'changed'},
                            {'caption_embeddings_sha256': 'changed'}):
                with self.assertRaises(ValueError):
                    H.bank_source_contract(path, dict(new, **changed))
            H.write_json(path, dict(old, source_code='unknown'))
            with self.assertRaises(ValueError):
                H.bank_source_contract(path, new)


if __name__ == '__main__':
    unittest.main(verbosity=2)
