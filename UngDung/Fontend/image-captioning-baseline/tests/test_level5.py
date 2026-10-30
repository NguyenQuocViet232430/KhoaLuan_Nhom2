"""Offline contract/algorithm tests; no production weights or CLIP downloads required."""
import importlib.util
import io
import json
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import numpy as np
import pytest
import torch
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from backend.models.level5_captioner import (ARCHITECTURE_ID, NativeFiveTokenModel, KnowledgeBase,
    Level5Captioner, SemanticExpansion, beam_search, load_checkpoint)
from backend.services.caption_service import CaptionService

STOI = {"<PAD>": 0, "<BOS>": 1, "<EOS>": 2, "<UNK>": 3, "a": 4, "cat": 5, "dog": 6}
torch.set_num_threads(2)


def import_file(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def checkpoint_files(tmp_path):
    torch.manual_seed(46)
    model = NativeFiveTokenModel(len(STOI), 0).eval()
    payload = {"model_state_dict": model.state_dict(), "contract": {"seed": 46,
               "architecture": ARCHITECTURE_ID, "environment": {"torch": torch.__version__},
               "memory_contract": {"knowledge_memory_tokens": 5, "tokens_per_caption": 1}},
               "evidence": {"training_seed": 46, "trained": True, "optimizer_steps": 10}}
    checkpoint = tmp_path / "best_model.pt"
    vocab = tmp_path / "vocab.json"
    torch.save(payload, checkpoint)
    vocab.write_text(json.dumps({"stoi": STOI}), encoding="utf-8")
    return checkpoint, vocab, payload


def test_exact_forward_parity_with_training_source():
    source = ROOT.parents[2] / 'lv6/_shared/l5a_source_review/baseline_level5/lv5_A/multiseed_5tokens_v1/level5_model.py'
    if not source.exists():
        pytest.skip("Original training source is outside the app distribution")
    reference = import_file(source, "reference_level5")
    original, _, _ = reference.create_level5(STOI, "cpu")
    original.eval()
    model = NativeFiveTokenModel(len(STOI), 0).eval()
    model.load_state_dict(original.state_dict(), strict=True)
    torch.manual_seed(7)
    v, k, s = torch.randn(2, 512), torch.randn(2, 5, 512), torch.rand(2, 5)
    ids = torch.tensor([[1, 4, 5], [1, 5, 0]])
    with torch.inference_mode():
        expected_logits, expected_gate = original(v, k, s, ids)
        logits, gate = model(v, k, s, ids)
    torch.testing.assert_close(logits, expected_logits, rtol=0, atol=0)
    torch.testing.assert_close(gate, expected_gate, rtol=0, atol=0)
    assert model.knowledge_proj(k).shape == (2, 5, 256)


def test_strict_seed46_load(checkpoint_files):
    checkpoint, vocab, _ = checkpoint_files
    model, stoi, info = load_checkpoint(checkpoint, vocab, "cpu")
    assert stoi == STOI and info["seed"] == 46 and not model.training
    assert not any(p.requires_grad for p in model.parameters())


@pytest.mark.parametrize("failure", ["seed", "missing_seed", "architecture", "shape", "nan", "vocab", "memory", "untrained"])
def test_reject_invalid_checkpoint(checkpoint_files, failure):
    checkpoint, vocab, payload = checkpoint_files
    if failure == "seed": payload["evidence"]["training_seed"] = 42
    if failure == "missing_seed":
        del payload["evidence"]["training_seed"]
        del payload["contract"]["seed"]
    if failure == "architecture": payload["contract"]["architecture"] = "512x4"
    if failure == "shape": payload["model_state_dict"]["knowledge_proj.weight"] = torch.zeros(512, 512)
    if failure == "nan": payload["model_state_dict"]["visual_proj.bias"][0] = float("nan")
    if failure == "memory": payload["contract"]["memory_contract"]["knowledge_memory_tokens"] = 15
    if failure == "untrained": payload["evidence"]["trained"] = False
    if failure == "vocab": vocab.write_text(json.dumps({"stoi": {"<BOS>": 0}}), encoding="utf-8")
    torch.save(payload, checkpoint)
    with pytest.raises((ValueError, RuntimeError)):
        load_checkpoint(checkpoint, vocab, "cpu")


@pytest.fixture
def kb_files(tmp_path):
    rng = np.random.default_rng(46)
    embeddings = rng.normal(size=(60, 512)).astype(np.float32)
    embeddings /= np.linalg.norm(embeddings, axis=1, keepdims=True)
    np.save(tmp_path / "text_embeddings_train_restval.npy", embeddings)
    rows = [{"row_id": i, "image_id": i, "caption": f"a {'cat' if i % 2 else 'dog'} near object {i}", "split": "train"} for i in range(60)]
    (tmp_path / "text_embedding_mapping.jsonl").write_text("\n".join(map(json.dumps, rows)), encoding="utf-8")
    return tmp_path, embeddings, rows


@pytest.mark.parametrize("mmr_weight", [0.6, 0.7])
def test_real_faiss_and_mmr_match_training_reference(kb_files, mmr_weight):
    directory, embeddings, rows = kb_files
    kb = KnowledgeBase(directory)
    k, scores, items = kb.retrieve(embeddings[:1], {"cat"}, mmr_weight=mmr_weight)
    assert len(items) == len(set(i["id"] for i in items)) == 5
    assert k.shape == (5, 512) and np.all(np.diff(scores) <= 0)
    for vector, item in zip(k, items):
        np.testing.assert_array_equal(vector, embeddings[item["metadata"]["row_id"]])
        assert item["content"] == rows[item["metadata"]["row_id"]]["caption"]
    source = ROOT.parents[2] / 'lv6/_shared/l5a_source_review/baseline_level5/shared_modules/mmr_diversity.py'
    if source.exists():
        ref = import_file(source, "reference_mmr")
        sims, indices = kb.index.search(embeddings[:1], 50)
        candidates = []
        raw = np.array([0.6 * float(score) + 0.4 * (1/3 if row % 2 else 0)
                        for score, row in zip(sims[0], indices[0])])
        relevance = (raw - raw.min()) / np.ptp(raw)
        for pos, row in enumerate(indices[0]):
            candidates.append({"position": pos, "embedding": embeddings[row], "relevance": relevance[pos]})
        chosen = sorted(ref.mmr_select(candidates, k=5, lambda_param=mmr_weight), key=lambda c: (-c["relevance"], c["position"]))
        assert [item["metadata"]["row_id"] for item in items] == [int(indices[0][c["position"]]) for c in chosen]
        np.testing.assert_allclose(scores, [c["relevance"] for c in chosen], atol=1e-6)


@pytest.mark.parametrize("failure", ["split", "order", "spo", "nan", "norm", "count"])
def test_reject_invalid_kb(kb_files, failure):
    directory, embeddings, rows = kb_files
    if failure == "split": rows[0]["split"] = "test"
    if failure == "order": rows[0]["row_id"] = 5
    if failure == "spo": rows[0]["type"] = "spo"
    if failure == "nan": embeddings[0, 0] = np.nan
    if failure == "norm": embeddings[0] *= 2
    if failure == "count": rows.pop()
    np.save(directory / "text_embeddings_train_restval.npy", embeddings)
    (directory / "text_embedding_mapping.jsonl").write_text("\n".join(map(json.dumps, rows)), encoding="utf-8")
    with pytest.raises(ValueError): KnowledgeBase(directory)


def test_beam_search_keeps_finished_hypothesis_and_stops():
    class Decoder:
        def __call__(self, v, k, s, ids, **kwargs):
            logits = torch.full((1, ids.shape[1], len(STOI)), -30.0)
            logits[0, -1, 0] = 40  # forbidden PAD
            logits[0, -1, 1] = 40  # forbidden BOS
            if ids.shape[1] == 1:
                logits[0, -1, 4] = 2
                logits[0, -1, 5] = 1.8
            elif ids[0, 1] == 5:
                logits[0, -1, 2] = 10  # cat -> EOS is best whole sequence
            else:
                logits[0, -1, 4:7] = 0
            return logits, torch.tensor([[0.5]])
    result = beam_search(Decoder(), torch.zeros(1, 512), torch.zeros(1, 5, 512), torch.zeros(1, 5), STOI, max_len=4)
    assert result == "cat"


def test_beam_max_length_and_visual_gate():
    seen = []
    class Decoder:
        def __call__(self, v, k, s, ids, gate_override):
            seen.append(gate_override)
            logits = torch.full((1, ids.shape[1], len(STOI)), -100.0)
            logits[0, -1, 4] = 100
            return logits, None
    result = beam_search(Decoder(), torch.zeros(1, 512), torch.zeros(1, 5, 512), torch.zeros(1, 5), STOI, max_len=20, gate_override=0.0)
    assert len(result.split()) == 20 and set(seen) == {0.0}


def test_wordnet_fallback_is_bounded_and_deterministic():
    semantic = SemanticExpansion.__new__(SemanticExpansion)
    semantic.wordnet = None
    assert semantic.expand([]) == set()
    assert semantic.expand(["airplane"]) == {"airplane", "plane", "aeroplane", "aircraft", "jet"}


def test_full_pipeline_fallback_uses_real_decoder_and_faiss(kb_files, monkeypatch):
    directory, embeddings, _ = kb_files
    captioner = Level5Captioner(directory, "cpu")
    captioner.model = NativeFiveTokenModel(len(STOI), 0).eval()
    # Deterministic synthetic weights only inside the test.
    with torch.no_grad():
        captioner.model.output_projection.weight.zero_()
        captioner.model.output_projection.bias.fill_(-10)
        captioner.model.output_projection.bias[5] = 10
    captioner.stoi, captioner.model_info = STOI, {"seed": 46}
    captioner.preprocess = lambda image: torch.zeros(3, 224, 224)
    captioner.clip_model = SimpleNamespace(encode_image=lambda image: torch.from_numpy(embeddings[:1]))
    captioner.kb = KnowledgeBase(directory)
    captioner.semantic = SemanticExpansion.__new__(SemanticExpansion)
    captioner.semantic.wordnet = None
    captioner.warnings = ["RelTR unavailable in synthetic test"]
    result = captioner.generate_details(Image.new("RGB", (32, 32)))
    assert result["pipeline"]["fallback"] and not result["pipeline"]["semantic_reranking"]
    assert result["retrieval"]["top_k"] == len(result["retrieval"]["items"]) == 5
    assert result["final_caption"] and result["knowledge_fusion"]
    assert all(0 <= item["metadata"]["gate_score"] <= 1 for item in result["retrieval"]["items"])
    json.dumps(result, allow_nan=False)


def test_api_lifespan_upload_error_and_health(monkeypatch):
    from fastapi.testclient import TestClient
    import backend.main as main
    from backend.services.caption_service import get_caption_service
    class Captioner:
        ready = False
        device, model_info, reltr, warnings = "cpu", {"seed": 46}, None, []
        def is_loaded(self): return self.ready
        def load(self): self.ready = True
        def generate_details(self, image):
            assert image.mode == "RGB"
            return {"initial_caption": "a cat", "final_caption": "a cat sitting", "model_type": "rag_level5",
                    "model_name": "Level 5A", "device": "cpu", "knowledge_retrieval": True,
                    "knowledge_ranking": True, "knowledge_fusion": True,
                    "retrieval": {"enabled": True, "top_k": 5, "items": [{"id": str(i), "content": "caption",
                    "source": "MS COCO Knowledge Base", "score": 0.9, "metadata": {"gate_score": 0.38}} for i in range(5)]}}
    service = CaptionService(Captioner())
    monkeypatch.setattr(main, "get_caption_service", lambda: service)
    main.app.dependency_overrides[get_caption_service] = lambda: service
    try:
        with TestClient(main.app) as client:
            assert client.get('/api/health').json()["model_loaded"] is True
            buffer = io.BytesIO()
            Image.new("RGBA", (32, 32)).save(buffer, format="PNG")
            response = client.post('/api/caption', files={"image": ("a.png", buffer.getvalue(), "image/png")})
            assert response.status_code == 200
            data = response.json()
            assert data["success"] and data["caption"] == data["final_caption"]
            assert len(data["retrieval"]["items"]) == 5
            assert client.post('/api/caption', files={"image": ("a.png", b"bad", "image/png")}).status_code == 400
            assert client.post('/api/caption', files={"image": ("a.png", b"x" * (10*1024*1024 + 1), "image/png")}).status_code == 413
            assert client.post('/api/caption').status_code == 422
            cors = client.options('/api/caption', headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"})
            assert cors.headers['access-control-allow-origin'] == 'http://localhost:5173'
            service.load_error = "Missing best_model.pt"
            assert not client.get('/api/health').json()["model_loaded"]
            assert client.post('/api/caption', files={"image": ("a.png", buffer.getvalue())}).status_code == 503
    finally:
        main.app.dependency_overrides.clear()


def test_missing_assets_do_not_serve_random_model(tmp_path):
    service = CaptionService(Level5Captioner(tmp_path, "cpu"))
    service.load_model()
    assert not service.is_ready() and "best_model.pt" in service.load_error
    assert service.health()["status"] == "offline"


def test_downloader_ids_and_html_error(tmp_path):
    downloader = import_file(ROOT.parents[1] / 'scripts/download_level5.py', 'download_level5')
    file_id = '1234567890_abcdef'
    assert downloader.drive_id(f'https://drive.google.com/file/d/{file_id}/view') == file_id
    assert downloader.drive_id(f'https://drive.google.com/open?id={file_id}') == file_id
    with pytest.raises(ValueError): downloader.drive_id('PASTE_SEED46_FILE_ID')
    bad = tmp_path / 'bad.pt'
    bad.write_text('<!DOCTYPE html><html>permission denied</html>')
    with pytest.raises(ValueError): downloader.validate_file(bad, 'checkpoint')
