"""Verified publication for Colab DriveFS; never depends on remote rename.

Stage bytes on local disk, copy/read back a recovery copy, then the destination.
This is NOT an atomic transaction or a lock across Colab machines. One writer
per bank/seed is required. Training checkpoints keep their existing journal.
"""
import errno
import hashlib
import json
import os
import tempfile
import time
from pathlib import Path


def sha(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(8 * 1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def publish(source, target, attempts=4):
    """Copy from stable local source; retry transient I/O, verify every byte."""
    source, target = Path(source), Path(target)
    expected = sha(source)
    for attempt in range(attempts):
        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            try:
                dest = target.open('r+b')
            except FileNotFoundError:
                dest = target.open('xb')
            with source.open('rb') as inp, dest:
                dest.seek(0)
                for block in iter(lambda: inp.read(8 * 1024 * 1024), b''):
                    dest.write(block)
                dest.truncate()
                dest.flush()
                try:
                    os.fsync(dest.fileno())
                except OSError as exc:
                    if exc.errno not in {errno.EINVAL, errno.ENOTSUP, errno.ENOSYS}:
                        raise
            if sha(target) != expected:
                raise OSError(errno.EIO, 'Read-back checksum mismatch', str(target))
            return expected
        except OSError as exc:
            if exc.errno not in {errno.ENOENT, errno.EIO, errno.EAGAIN, errno.EEXIST,
                                 errno.EBUSY, errno.ETIMEDOUT} or attempt == attempts - 1:
                raise OSError(f'Could not publish/verify {target}. Check Drive mount, '
                              'free space and other writers; keep existing outputs.') from exc
            time.sleep(.5 * (attempt + 1))


def write_bytes(path, data):
    path = Path(path)
    with tempfile.TemporaryDirectory(prefix='lv6_publish_') as folder:
        local = Path(folder)/'payload'
        local.write_bytes(data)
        publish(local, path.with_name(path.name + '.pending'))
        publish(local, path)


def write_json(path, value):
    raw = json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False).encode('utf-8')
    write_bytes(path, raw)


def read_json(path):
    path = Path(path)
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (FileNotFoundError, UnicodeError, json.JSONDecodeError) as original:
        # Read-only fallback: a later verified write can republish the final file.
        for suffix in ('.pending', '.tmp'):
            try:
                return json.loads(path.with_name(path.name + suffix).read_text(encoding='utf-8'))
            except (FileNotFoundError, UnicodeError, json.JSONDecodeError):
                pass
        raise original


def json_available(path):
    path = Path(path)
    return any(path.with_name(path.name + s).is_file() for s in ('', '.pending', '.tmp'))


def check_output(folder):
    """Small actual write/read check before expensive Colab work; keep a receipt."""
    import uuid
    folder = Path(folder)
    receipt = folder/'_io_checks'/(uuid.uuid4().hex + '.json')
    value = {'method': 'local_stage_copy_sha256_v1', 'folder': str(folder)}
    write_json(receipt, value)
    if read_json(receipt) != value:
        raise IOError('Output preflight failed: ' + str(folder))
    print('Drive write/read OK:', folder)
