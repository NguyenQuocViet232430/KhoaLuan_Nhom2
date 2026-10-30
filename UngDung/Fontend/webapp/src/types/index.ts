export interface BoundingBox {
  x: number; // 0 to 1 normalized
  y: number;
  width: number;
  height: number;
}

export interface DetectedObject {
  id: string;
  label: string;
  confidence: number;
  bbox?: BoundingBox;
}

export interface RetrievedCandidate {
  id: string;
  rank: number;
  caption: string;
  faiss_similarity: number; // Initial FAISS cosine similarity
  rerank_score?: number;    // Level 3 Rerank score (CLIP score + consistency)
  final_rank?: number;     // Rank after reranking
  source: string;          // MS COCO 2014 Train
  matched_entities?: string[];
  status?: 'admitted' | 'pruned';
  gate_score?: number; // Image-level knowledge gate; not a per-token attention weight.
}

export interface AttentionHeatmapData {
  type: 'grid' | 'radial' | 'bbox' | 'token_focal';
  focalPoints?: Array<{ x: number; y: number; weight: number }>;
  gridWeights?: number[][];
  bboxRef?: string;
}

export interface CaptionToken {
  index: number;
  text: string;
  gate?: number; // Raw Confidence-aware Gated Fusion scalar (gamma in [0, 1])
  visual_attention?: number;
  knowledge_attention?: number;
  token_confidence?: number;
  related_entities?: string[];
  attention_data?: AttentionHeatmapData;
}

export interface MetricScore {
  baseline: number;
  level2_rag?: number;
  level3_rerank?: number;
  raic: number;
  unit?: string;
  higherIsBetter: boolean;
  description?: string;
}

export interface AblationLevelConfig {
  id: string;
  level: 'Level 1' | 'Level 2' | 'Level 3' | 'Level 4' | 'Parametric';
  name: string;
  tag: string;
  bleu1: number;
  bleu4: number;
  meteor: number;
  rougeL: number;
  cider: number;
  spice?: number | null;
  latency: number; // in ms
  description: string;
}

export interface BenchmarkMetrics {
  bleu1: MetricScore;
  bleu4: MetricScore;
  meteor: MetricScore;
  rougeL: MetricScore;
  cider: MetricScore; // Primary metric
  spice?: MetricScore;
  clipScore?: MetricScore;
  chair_s?: MetricScore;
}

export interface ModelEvaluation {
  status?: 'not_evaluated';
  benchmark_metadata: {
    dataset: 'MS COCO 2014' | 'Flickr30K' | 'Custom';
    split: string;
    sample_count: number;
    evaluation_date: string;
    model_version: string;
    baseline_version: string;
    is_simulated: boolean;
    disclaimer: string;
  };
  metrics: BenchmarkMetrics;
  latency: {
    baseline_ms: number;
    raic_ms: number;
    overhead_ms: number;
  };
  ablation_study: AblationLevelConfig[];
}

export interface LevelMetadata {
  level: 'Level 1' | 'Level 2' | 'Level 3' | 'Level 4' | 'Level 5A';
  model_name: string;
  vision_backbone: string;
  decoder: string;
  retrieval_enabled: boolean;
  retrieval_kb: string;
  faiss_candidates_retrieved: number;
  top_k_used: number;
  reranking_enabled: boolean;
  reranking_method?: string;
  fusion_mechanism: string;
  inference_latency_ms: number;
}

export interface AnalysisResult {
  pipeline?: {
    beam_size?: number;
    max_len?: number;
    length_penalty?: number;
    initial_caption_kind?: string;
    fallback?: boolean;
    reltr_status?: string;
    warnings?: string[];
    detected_labels?: string[];
    expanded_labels?: string[];
    semantic_reranking?: boolean;
    clip_weight?: number;
    mmr_weight?: number;
  };
  id: string;
  timestamp: string;
  image_url: string;
  image_name: string;
  image_dimensions?: { width: number; height: number };
  file_size_bytes?: number;
  
  // Multi-Level Inference Comparison
  baseline_caption: string; // Level 1: Vanilla CLIP ViT-B/32 + Transformer Decoder
  baseline_caption_vi?: string;
  level2_caption?: string;  // Level 2: Simple RAG Direct Concat
  level2_caption_vi?: string;
  level3_caption?: string;  // Level 3: RAG with Semantic Reranking
  level3_caption_vi?: string;
  raic_caption: string;     // Level 4: Proposed RAIC (Confidence-aware Gated Fusion)
  raic_caption_vi?: string;
  caption_keywords?: string[];

  // Candidate Knowledge (MS COCO 2014 Train Captions via FAISS Top-20)
  retrieved_candidates: RetrievedCandidate[];
  detected_objects: DetectedObject[];
  
  // Explainability (Gated Fusion & Attention)
  tokens: CaptionToken[];
  has_explainability: boolean; // Flag to indicate if real backend provides token-level gate/attention
  
  // Benchmark Evaluation (MS COCO 2014 Karpathy Split)
  evaluation: ModelEvaluation;

  // Architectural Level Specs
  level_info: LevelMetadata;
  metadata: {
    is_mock: boolean;
    backend_source: 'live_fastapi' | 'mock_research_simulator';
    device: string;
  };
}

export interface AnalysisHistoryItem {
  id: string;
  timestamp: string;
  image_name: string;
  baseline_caption: string;
  raic_caption: string;
  cider_score: number | null;
  latency_ms: string;
}

export interface ErrorAnalysisCase {
  id: string;
  title: string;
  category: 'retrieval_success' | 'distractor_filtering' | 'rare_entity_boost' | 'rerank_correction';
  imageUrl: string;
  imageCaptionGroundTruth: string;
  baselineCaption: string;
  baselineIssue: string;
  retrievedEvidence: string[];
  raicCaption: string;
  gatingMechanismEffect: string;
  ciderImprovement: string;
}

export type ThemeMode = 'dark' | 'light';
export type ActiveTab = 'workspace' | 'comparison' | 'retrieval' | 'architecture' | 'evaluation' | 'ablation' | 'error_analysis' | 'history' | 'settings';


