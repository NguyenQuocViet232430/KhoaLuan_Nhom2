import type { AnalysisResult, RetrievedCandidate, MetricScore } from '../types';

/** Normalize real FastAPI data without injecting simulator captions or metrics. */
export function normalizeBackendCaptionResponse(raw: any, imageUrl: string, imageName: string): AnalysisResult {
  if (!raw || raw.success !== true) throw new Error(raw?.error || 'Caption request failed');
  const caption = raw.final_caption || raw.caption;
  if (typeof caption !== 'string' || !caption.trim()) throw new Error('Backend returned an empty caption');
  const retrieved: RetrievedCandidate[] = (raw.retrieval?.items || []).map((item: any, idx: number) => ({
    id: item.id, rank: item.metadata?.faiss_rank ?? idx + 1, final_rank: idx + 1, caption: item.content,
    faiss_similarity: item.metadata?.clip_score ?? item.score,
    rerank_score: item.score, gate_score: item.metadata?.gate_score,
    source: item.source, status: 'admitted'
  }));
  // NaN is an internal missing-value sentinel for legacy numeric components.
  // status gates metric rendering; JSON export serializes these missing values as null.
  const missingMetric = (): MetricScore => ({ baseline: NaN, raic: NaN, higherIsBetter: true });
  const latency = Math.round((raw.processing_time || 0) * 1000);
  const native5 = raw.model_type === 'rag_level5';
  return {
    id: `live-run-${Date.now()}`, timestamp: new Date().toISOString(), image_url: imageUrl, image_name: imageName,
    baseline_caption: raw.initial_caption || '', raic_caption: caption,
    caption_keywords: raw.caption_keywords || [], retrieved_candidates: retrieved, detected_objects: [],
    tokens: caption.split(/\s+/).map((text, index) => ({ text, index })), has_explainability: false,
    pipeline: raw.pipeline,
    evaluation: {
      status: 'not_evaluated',
      benchmark_metadata: {
        dataset: 'Custom', split: 'Single uploaded image; no reference captions', sample_count: 0,
        evaluation_date: new Date().toISOString().split('T')[0], model_version: raw.model_name,
        baseline_version: 'Same model, knowledge gate forced to zero', is_simulated: false,
        disclaimer: 'Chưa đánh giá BLEU/CIDEr: ảnh tải lên không có caption tham chiếu. Câu ban đầu là ablation cùng model, không phải baseline Level 1.'
      },
      metrics: { bleu1: missingMetric(), bleu4: missingMetric(), meteor: missingMetric(), rougeL: missingMetric(), cider: missingMetric() },
      latency: { baseline_ms: NaN, raic_ms: latency, overhead_ms: NaN }, ablation_study: []
    },
    level_info: {
      level: native5 ? 'Level 5A' : 'Level 1', model_name: raw.model_name || 'Caption model',
      vision_backbone: native5 ? 'CLIP ViT-B/32 (frozen)' : 'Not reported',
      decoder: native5 ? 'Dual-branch Transformer: 3 layers, 8 heads, d_model=256' : 'Not reported',
      retrieval_enabled: Boolean(raw.knowledge_retrieval), retrieval_kb: 'MS COCO train/restval captions',
      faiss_candidates_retrieved: raw.pipeline?.candidates || 0, top_k_used: raw.retrieval?.top_k || 0,
      reranking_enabled: Boolean(raw.knowledge_ranking),
      reranking_method: raw.pipeline?.semantic_reranking ? 'CLIP + WordNet Jaccard + MMR' : 'CLIP + MMR',
      fusion_mechanism: native5 ? 'Confidence-aware dual cross-attention; 5 knowledge tokens' : 'Not reported',
      inference_latency_ms: latency
    },
    metadata: { is_mock: false, backend_source: 'live_fastapi', device: raw.device || 'Unknown' }
  };
}
