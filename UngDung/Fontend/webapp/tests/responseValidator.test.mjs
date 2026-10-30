import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/services/responseValidator.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { normalizeBackendCaptionResponse: normalize } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('real API data never inherits mock captions, metrics or attention', () => {
  const result = normalize({ success: true, initial_caption: 'a cat', final_caption: 'a cat sitting',
    model_type: 'rag_level5', model_name: 'Level 5A', processing_time: 1.2,
    knowledge_retrieval: true, knowledge_ranking: true, knowledge_fusion: true,
    pipeline: { fallback: true, candidates: 50 }, retrieval: { top_k: 5, items: [
      { id: 'c1', content: 'a cat', source: 'MS COCO', score: 0.9, metadata: { clip_score: 0.32, gate_score: 0.38, faiss_rank: 7 } }
    ] } }, 'blob:test', 'cat.png');
  assert.equal(result.level_info.level, 'Level 5A');
  assert.equal(result.level2_caption, undefined);
  assert.equal(result.raic_caption_vi, undefined);
  assert.deepEqual(result.detected_objects, []);
  assert.equal(result.has_explainability, false);
  assert.ok(result.tokens.every(token => token.gate === undefined));
  assert.equal(result.retrieved_candidates[0].faiss_similarity, 0.32);
  assert.equal(result.retrieved_candidates[0].rank, 7);
  assert.equal(result.retrieved_candidates[0].gate_score, 0.38);
  assert.equal(result.evaluation.status, 'not_evaluated');
  assert.equal(JSON.parse(JSON.stringify(result)).evaluation.metrics.cider.raic, null);
  assert.equal(result.metadata.is_mock, false);
});

test('empty retrieval stays empty; failed API responses are rejected', () => {
  const result = normalize({ success: true, caption: 'cat', retrieval: { items: [] } }, 'blob:test', 'cat.png');
  assert.deepEqual(result.retrieved_candidates, []);
  assert.throws(() => normalize({ success: false, error: 'Model offline' }, '', ''), /Model offline/);
  assert.throws(() => normalize({ success: true, caption: '' }, '', ''), /empty caption/);
});
