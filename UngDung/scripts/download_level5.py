"""Download the four aligned training assets with gdown (IDs or Drive URLs).

Example: python scripts/download_level5.py --manifest scripts/level5_drive.example.json
Never commits partially downloaded files; existing files require --overwrite to replace.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ASSETS = {
    "checkpoint": "best_model.pt", "vocab": "vocab.json",
    "embeddings": "text_embeddings_train_restval.npy", "mapping": "text_embedding_mapping.jsonl",
}
DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "models" / "level5"


def drive_id(value):
    value = value.strip()
    if value.startswith(("https://", "http://")):
        parsed = urlparse(value)
        if parsed.hostname not in ("drive.google.com", "docs.google.com"):
            raise ValueError("Expected a Google Drive file URL")
        match = re.search(r"/file/d/([\w-]+)", parsed.path)
        value = match.group(1) if match else parse_qs(parsed.query).get("id", [""])[0]
    if not re.fullmatch(r"[A-Za-z0-9_-]{10,}", value) or value.startswith("PASTE_"):
        raise ValueError("Replace each PASTE_* placeholder with a Drive File ID (not a folder ID)")
    return value


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def validate_file(path, key):
    if path.stat().st_size == 0:
        raise ValueError("Downloaded file is empty")
    with path.open("rb") as stream:
        prefix = stream.read(512).lstrip().lower()
    if prefix.startswith((b"<!doctype html", b"<html")):
        raise ValueError("Drive returned an HTML error page; check link permissions/quota")
    if key == "vocab":
        data = json.loads(path.read_text(encoding="utf-8-sig"))
        if not isinstance(data, dict) or "<BOS>" not in data.get("stoi", data):
            raise ValueError("This is not the training vocabulary")
    elif key == "embeddings":
        import numpy as np
        data = np.load(path, mmap_mode="r", allow_pickle=False)
        if data.ndim != 2 or data.shape[1] != 512 or len(data) < 50:
            raise ValueError("Expected [N>=50,512] caption embeddings")
        del data
    elif key == "mapping":
        count = 0
        with path.open(encoding="utf-8-sig") as stream:
            for i, line in enumerate(stream):
                row = json.loads(line)
                if not row.get("caption") or row.get("split") not in ("train", "restval") or int(row.get("row_id", i)) != i:
                    raise ValueError(f"Invalid training caption mapping at row {i}")
                count += 1
        if count < 50:
            raise ValueError("Knowledge mapping has fewer than 50 captions")


def download_assets(entries, output_dir, overwrite=False):
    import gdown
    output_dir.mkdir(parents=True, exist_ok=True)
    parsed = {}
    for key in ASSETS:
        entry = entries.get(key)
        if not entry:
            raise ValueError(f"Missing Drive ID: {key}")
        entry = {"id": entry} if isinstance(entry, str) else entry
        parsed[key] = (drive_id(entry.get("id") or entry.get("url", "")), entry.get("sha256"))
    records = {}
    for key, filename in ASSETS.items():
        file_id, expected_hash = parsed[key]
        destination = output_dir / filename
        if destination.exists() and not overwrite:
            validate_file(destination, key)
            digest = sha256(destination)
            if expected_hash and digest.lower() != expected_hash.lower():
                raise ValueError(f"Existing {filename} has a different SHA-256; inspect it before using --overwrite")
            print(f"Keeping {destination}; use --overwrite to download again")
            records[key] = {"file": filename, "sha256": digest, "downloaded_this_run": False}
            continue
        temporary = destination.with_name(filename + ".part")
        # Do not resume unknown partial files that might belong to a different File ID.
        result = gdown.download(id=file_id, output=str(temporary), quiet=False, resume=False)
        if not result:
            raise RuntimeError(f"Could not download {filename}; check Drive access/quota")
        validate_file(temporary, key)
        digest = sha256(temporary)
        if expected_hash and digest.lower() != expected_hash.lower():
            raise ValueError(f"SHA-256 mismatch for {filename}; original file was preserved")
        os.replace(temporary, destination)
        records[key] = {"file": filename, "drive_id": file_id, "sha256": digest, "downloaded_this_run": True}
    receipt = output_dir / "download_receipt.json"
    receipt.write_text(json.dumps(records, indent=2), encoding="utf-8")
    print(f"Assets ready in {output_dir}. Startup will strictly verify Seed 46 and tensor shapes.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--overwrite", action="store_true")
    for key in ASSETS:
        parser.add_argument(f"--{key}-id")
    args = parser.parse_args()
    entries = json.loads(args.manifest.read_text(encoding="utf-8-sig")) if args.manifest else {}
    for key in ASSETS:
        value = getattr(args, key + "_id")
        if value:
            entries[key] = value
    try:
        download_assets(entries, args.output_dir.resolve(), args.overwrite)
    except (ValueError, RuntimeError, OSError) as exc:
        parser.exit(1, f"Download failed: {exc}\n")


if __name__ == "__main__":
    main()
