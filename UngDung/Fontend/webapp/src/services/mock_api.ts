import type { AnalysisResult, RetrievedCandidate, DetectedObject, CaptionToken } from '../types';

export const SAMPLE_IMAGES = [
  {
    id: 'sample-1',
    name: 'COCO_val2014_000000048102.jpg',
    title: 'Golden retriever catching frisbee in park',
    url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
    tags: ['dog', 'frisbee', 'outdoor']
  },
  {
    id: 'sample-2',
    name: 'COCO_val2014_000000011904.jpg',
    title: 'Surfer on ocean wave near coastline',
    url: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=800&q=80',
    tags: ['surfer', 'ocean', 'wave']
  },
  {
    id: 'sample-3',
    name: 'COCO_val2014_000000072005.jpg',
    title: 'Vintage steam train on countryside tracks',
    url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    tags: ['train', 'tracks', 'travel']
  }
];

const BENCHMARK_EVALUATION_TEMPLATE = {
  benchmark_metadata: {
    dataset: "MS COCO 2014" as const,
    split: "Karpathy 5,000 Test Set",
    sample_count: 5000,
    evaluation_date: "2026-08-24",
    model_version: "Level 4: Proposed RAIC (Confidence Gated)",
    baseline_version: "Level 1: Baseline ViT-B/32 + Transformer",
    is_simulated: true,
    disclaimer: "Illustrative Demo Data — Not Experimental Results. Demonstrates proposed system behavior and interface flow prior to model checkpoint evaluation."
  },
  metrics: {
    bleu1: {
      baseline: 0.765,
      level2_rag: 0.781,
      level3_rerank: 0.792,
      raic: 0.804,
      higherIsBetter: true,
      description: "BLEU-1: 1-gram precision measuring lexical alignment with human ground truth."
    },
    bleu4: {
      baseline: 0.385,
      level2_rag: 0.398,
      level3_rerank: 0.409,
      raic: 0.421,
      higherIsBetter: true,
      description: "BLEU-4: 4-gram precision capturing grammatical phrasing and fluent expression."
    },
    meteor: {
      baseline: 0.291,
      level2_rag: 0.301,
      level3_rerank: 0.308,
      raic: 0.318,
      higherIsBetter: true,
      description: "METEOR: Harmonic unigram metric incorporating stemming and WordNet synonym matching."
    },
    rougeL: {
      baseline: 0.581,
      level2_rag: 0.592,
      level3_rerank: 0.603,
      raic: 0.614,
      higherIsBetter: true,
      description: "ROUGE-L: Longest common subsequence F-measure reflecting sentence structure."
    },
    cider: {
      baseline: 1.250,
      level2_rag: 1.285,
      level3_rerank: 1.318,
      raic: 1.348,
      higherIsBetter: true,
      description: "CIDEr: Primary consensus evaluation metric specifically tailored for image captioning (TF-IDF weighted)."
    },
    spice: {
      baseline: 0.225,
      level2_rag: 0.238,
      level3_rerank: 0.251,
      raic: 0.264,
      higherIsBetter: true,
      description: "SPICE: F-score based on parsed propositional semantic scene graphs."
    }
  },
  latency: {
    baseline_ms: 120,
    raic_ms: 178,
    overhead_ms: 58
  },
  ablation_study: [
    {
      id: "cfg-lvl1",
      level: "Level 1" as const,
      name: "Level 1: Baseline",
      tag: "CLIP+Trans",
      bleu1: 0.765,
      bleu4: 0.385,
      meteor: 0.291,
      rougeL: 0.581,
      cider: 1.250,
      spice: 0.225,
      latency: 120,
      description: "CLIP ViT-B/32 vision encoder directly connected to autoregressive Transformer decoder with no retrieval memory."
    },
    {
      id: "cfg-lvl2",
      level: "Level 2" as const,
      name: "Level 2: Simple RAG Fusion",
      tag: "FAISS-Top5",
      bleu1: 0.781,
      bleu4: 0.398,
      meteor: 0.301,
      rougeL: 0.592,
      cider: 1.285,
      spice: 0.238,
      latency: 142,
      description: "FAISS Top-K caption retrieval over MS COCO 2014 Train with standard concatenation/prefix fusion."
    },
    {
      id: "cfg-lvl3",
      level: "Level 3" as const,
      name: "Level 3: RAG with Reranking",
      tag: "CLIP-Rerank",
      bleu1: 0.792,
      bleu4: 0.409,
      meteor: 0.308,
      rougeL: 0.603,
      cider: 1.318,
      spice: 0.251,
      latency: 164,
      description: "FAISS Top-20 candidate retrieval filtered via CLIP Score and visual object consistency reranking."
    },
    {
      id: "cfg-lvl4",
      level: "Level 4" as const,
      name: "Level 4: Proposed RAIC",
      tag: "Conf-Gate",
      bleu1: 0.804,
      bleu4: 0.421,
      meteor: 0.318,
      rougeL: 0.614,
      cider: 1.348,
      spice: 0.264,
      latency: 178,
      description: "Full proposed model: Top-20 Candidate Retrieval + Reranking + Confidence-aware Gated Cross-Attention Fusion."
    },
    {
      id: "cfg-param-k3",
      level: "Parametric" as const,
      name: "Top-K Sensitivity: K = 3",
      tag: "TopK=3",
      bleu1: 0.795,
      bleu4: 0.412,
      meteor: 0.310,
      rougeL: 0.605,
      cider: 1.325,
      spice: 0.254,
      latency: 168,
      description: "Ablation testing retrieval depth K=3 into the gated cross-attention module."
    },
    {
      id: "cfg-param-k10",
      level: "Parametric" as const,
      name: "Top-K Sensitivity: K = 10",
      tag: "TopK=10",
      bleu1: 0.801,
      bleu4: 0.418,
      meteor: 0.315,
      rougeL: 0.611,
      cider: 1.339,
      spice: 0.259,
      latency: 195,
      description: "Ablation testing retrieval depth K=10 (introducing slight memory saturation)."
    }
  ]
};

// DOG / FRISBEE (Sample 1)
const SAMPLE_1_DATA = {
  baseline_caption: "A dog jumping in a field with a toy.",
  baseline_caption_vi: "Một chú chó đang nhảy trên bãi cỏ với một món đồ chơi.",
  level2_caption: "A dog jumping to catch a red frisbee on grass.",
  level2_caption_vi: "Một chú chó nhảy bắt chiếc đĩa ném màu đỏ trên cỏ.",
  level3_caption: "A golden retriever jumping to catch a red frisbee in a grassy park.",
  level3_caption_vi: "Một chú chó golden retriever nhảy bắt đĩa ném màu đỏ trong công viên rợp cỏ.",
  raic_caption: "A golden retriever leaps across a sunny grass field to catch a red flying disc.",
  raic_caption_vi: "Một chú chó golden retriever lao qua bãi cỏ đầy nắng để đớp chiếc đĩa bay màu đỏ.",
  caption_keywords: ["golden retriever", "leaps", "grass field", "flying disc"],
  detected_objects: [
    { id: "o1", label: "dog (Golden Retriever)", confidence: 0.96, bbox: { x: 0.25, y: 0.28, width: 0.38, height: 0.48 } },
    { id: "o2", label: "frisbee / flying disc", confidence: 0.91, bbox: { x: 0.62, y: 0.20, width: 0.14, height: 0.12 } },
    { id: "o3", label: "grass field", confidence: 0.94, bbox: { x: 0.0, y: 0.55, width: 1.0, height: 0.45 } }
  ] as DetectedObject[],
  retrieved_candidates: [
    {
      id: "c-01", rank: 1, final_rank: 1,
      caption: "A golden retriever jumping into the air to catch a frisbee in a park.",
      faiss_similarity: 0.924, rerank_score: 0.948,
      source: "MS COCO 2014 Train (id: 48102)",
      matched_entities: ["dog", "frisbee", "park"], status: "admitted"
    },
    {
      id: "c-02", rank: 2, final_rank: 2,
      caption: "A brown and white dog catching a plastic red disc mid air on grass.",
      faiss_similarity: 0.895, rerank_score: 0.912,
      source: "MS COCO 2014 Train (id: 11904)",
      matched_entities: ["dog", "disc", "grass"], status: "admitted"
    },
    {
      id: "c-03", rank: 3, final_rank: 3,
      caption: "A canine leaping acrobatically to grab a toy in a green open lawn.",
      faiss_similarity: 0.862, rerank_score: 0.880,
      source: "MS COCO 2014 Train (id: 29014)",
      matched_entities: ["dog", "lawn"], status: "admitted"
    },
    {
      id: "c-04", rank: 5, final_rank: 4,
      caption: "A happy golden dog running outdoors with a round frisbee.",
      faiss_similarity: 0.812, rerank_score: 0.845,
      source: "MS COCO 2014 Train (id: 94021)",
      matched_entities: ["dog", "frisbee"], status: "admitted"
    },
    {
      id: "c-05", rank: 4, final_rank: 5,
      caption: "A dog catching a flying disc on a grassy backyard lawn.",
      faiss_similarity: 0.835, rerank_score: 0.830,
      source: "MS COCO 2014 Train (id: 72005)",
      matched_entities: ["dog", "disc"], status: "admitted"
    },
    {
      id: "c-06", rank: 6, final_rank: 6,
      caption: "A puppy chasing a ball in a large open sports field.",
      faiss_similarity: 0.778, rerank_score: 0.690,
      source: "MS COCO 2014 Train (id: 55401)",
      matched_entities: ["dog"], status: "pruned"
    },
    {
      id: "c-07", rank: 7, final_rank: 7,
      caption: "Two dogs playing together on green pasture under the sun.",
      faiss_similarity: 0.761, rerank_score: 0.640,
      source: "MS COCO 2014 Train (id: 31089)",
      matched_entities: ["dog"], status: "pruned"
    },
    {
      id: "c-08", rank: 8, final_rank: 8,
      caption: "A dog sitting on the grass watching a person throw a toy.",
      faiss_similarity: 0.745, rerank_score: 0.620,
      source: "MS COCO 2014 Train (id: 88402)",
      matched_entities: ["dog"], status: "pruned"
    }
  ] as RetrievedCandidate[],
  tokens: [
    { index: 0, text: "A", gate: 0.88, visual_attention: 0.72, knowledge_attention: 0.15, token_confidence: 0.99, attention_data: { type: 'radial', focalPoints: [{ x: 0.5, y: 0.5, weight: 0.3 }] } },
    { index: 1, text: "golden", gate: 0.78, visual_attention: 0.86, knowledge_attention: 0.35, token_confidence: 0.94, related_entities: ["dog"], attention_data: { type: 'bbox', bboxRef: 'o1', focalPoints: [{ x: 0.42, y: 0.48, weight: 0.85 }] } },
    { index: 2, text: "retriever", gate: 0.74, visual_attention: 0.88, knowledge_attention: 0.48, token_confidence: 0.96, related_entities: ["dog"], attention_data: { type: 'bbox', bboxRef: 'o1', focalPoints: [{ x: 0.44, y: 0.46, weight: 0.95 }] } },
    { index: 3, text: "leaps", gate: 0.65, visual_attention: 0.78, knowledge_attention: 0.52, token_confidence: 0.91, attention_data: { type: 'radial', focalPoints: [{ x: 0.45, y: 0.42, weight: 0.8 }] } },
    { index: 4, text: "across", gate: 0.68, visual_attention: 0.45, knowledge_attention: 0.32, token_confidence: 0.98, attention_data: { type: 'grid' } },
    { index: 5, text: "a", gate: 0.85, visual_attention: 0.55, knowledge_attention: 0.10, token_confidence: 0.99, attention_data: { type: 'grid' } },
    { index: 6, text: "sunny", gate: 0.82, visual_attention: 0.84, knowledge_attention: 0.28, token_confidence: 0.92, attention_data: { type: 'radial', focalPoints: [{ x: 0.5, y: 0.2, weight: 0.7 }] } },
    { index: 7, text: "grass", gate: 0.90, visual_attention: 0.94, knowledge_attention: 0.15, token_confidence: 0.95, related_entities: ["grass field"], attention_data: { type: 'bbox', bboxRef: 'o3', focalPoints: [{ x: 0.5, y: 0.75, weight: 0.85 }] } },
    { index: 8, text: "field", gate: 0.86, visual_attention: 0.90, knowledge_attention: 0.22, token_confidence: 0.94, related_entities: ["grass field"], attention_data: { type: 'bbox', bboxRef: 'o3', focalPoints: [{ x: 0.5, y: 0.75, weight: 0.8 }] } },
    { index: 9, text: "to", gate: 0.70, visual_attention: 0.40, knowledge_attention: 0.35, token_confidence: 0.99, attention_data: { type: 'grid' } },
    { index: 10, text: "catch", gate: 0.62, visual_attention: 0.65, knowledge_attention: 0.55, token_confidence: 0.93, attention_data: { type: 'radial', focalPoints: [{ x: 0.55, y: 0.35, weight: 0.75 }] } },
    { index: 11, text: "a", gate: 0.88, visual_attention: 0.30, knowledge_attention: 0.12, token_confidence: 0.99, attention_data: { type: 'grid' } },
    { index: 12, text: "red", gate: 0.65, visual_attention: 0.85, knowledge_attention: 0.45, token_confidence: 0.90, related_entities: ["frisbee / flying disc"], attention_data: { type: 'bbox', bboxRef: 'o2', focalPoints: [{ x: 0.68, y: 0.26, weight: 0.9 }] } },
    { index: 13, text: "flying", gate: 0.58, visual_attention: 0.70, knowledge_attention: 0.65, token_confidence: 0.95, related_entities: ["frisbee / flying disc"], attention_data: { type: 'bbox', bboxRef: 'o2', focalPoints: [{ x: 0.68, y: 0.26, weight: 0.88 }] } },
    { index: 14, text: "disc.", gate: 0.52, visual_attention: 0.64, knowledge_attention: 0.78, token_confidence: 0.94, related_entities: ["frisbee / flying disc"], attention_data: { type: 'bbox', bboxRef: 'o2', focalPoints: [{ x: 0.68, y: 0.26, weight: 0.92 }] } }
  ] as CaptionToken[]
};

// SURFER (Sample 2)
const SAMPLE_2_DATA = {
  baseline_caption: "A person on a surfboard in the water near rocks.",
  baseline_caption_vi: "Một người trên ván lướt sóng dưới nước gần các mỏm đá.",
  level2_caption: "A surfer on a board in the ocean waves.",
  level2_caption_vi: "Một người lướt sóng trên ván giữa những con sóng biển.",
  level3_caption: "A surfer in a wetsuit riding a breaking blue wave.",
  level3_caption_vi: "Một người lướt sóng mặc đồ lặn đang cưỡi con sóng xanh cuộn trào.",
  raic_caption: "A surfer in a black wetsuit maneuvers through a breaking blue ocean wave.",
  raic_caption_vi: "Một vận động viên lướt sóng mặc bộ đồ lặn màu đen khéo léo lướt qua ngọn sóng biển xanh cuộn trào.",
  caption_keywords: ["surfer", "wetsuit", "maneuvers", "breaking wave"],
  detected_objects: [
    { id: "o1", label: "surfer (person)", confidence: 0.95, bbox: { x: 0.38, y: 0.30, width: 0.22, height: 0.38 } },
    { id: "o2", label: "surfboard", confidence: 0.92, bbox: { x: 0.36, y: 0.62, width: 0.26, height: 0.14 } },
    { id: "o3", label: "cresting ocean wave", confidence: 0.97, bbox: { x: 0.05, y: 0.15, width: 0.90, height: 0.75 } }
  ] as DetectedObject[],
  retrieved_candidates: [
    {
      id: "c-21", rank: 1, final_rank: 1,
      caption: "A surfer in a black wetsuit riding a cresting turquoise wave.",
      faiss_similarity: 0.918, rerank_score: 0.945,
      source: "MS COCO 2014 Train (id: 11904)",
      matched_entities: ["surfer", "wave"], status: "admitted"
    },
    {
      id: "c-22", rank: 2, final_rank: 2,
      caption: "A man surfing a large barrel wave in the ocean.",
      faiss_similarity: 0.892, rerank_score: 0.920,
      source: "MS COCO 2014 Train (id: 88412)",
      matched_entities: ["surfer", "ocean"], status: "admitted"
    },
    {
      id: "c-23", rank: 4, final_rank: 3,
      caption: "An athletic surfer balancing on a board near the crest.",
      faiss_similarity: 0.835, rerank_score: 0.875,
      source: "MS COCO 2014 Train (id: 29014)",
      matched_entities: ["surfer", "board"], status: "admitted"
    },
    {
      id: "c-24", rank: 3, final_rank: 4,
      caption: "A person riding a surfboard on a huge curling wave.",
      faiss_similarity: 0.860, rerank_score: 0.862,
      source: "MS COCO 2014 Train (id: 34109)",
      matched_entities: ["surfboard", "wave"], status: "admitted"
    },
    {
      id: "c-25", rank: 5, final_rank: 5,
      caption: "A surfer carving through a blue ocean wave under the sun.",
      faiss_similarity: 0.810, rerank_score: 0.835,
      source: "MS COCO 2014 Train (id: 72005)",
      matched_entities: ["surfer", "wave"], status: "admitted"
    },
    {
      id: "c-26", rank: 6, final_rank: 6,
      caption: "A surfer riding waves near a rocky jetty with seagulls.",
      faiss_similarity: 0.742, rerank_score: 0.620,
      source: "MS COCO 2014 Train (id: 33190)",
      matched_entities: ["surfer"], status: "pruned"
    },
    {
      id: "c-27", rank: 7, final_rank: 7,
      caption: "People swimming and playing in shallow coastal beach waters.",
      faiss_similarity: 0.720, rerank_score: 0.580,
      source: "MS COCO 2014 Train (id: 44102)",
      matched_entities: ["water"], status: "pruned"
    }
  ] as RetrievedCandidate[],
  tokens: [
    { index: 0, text: "A", gate: 0.88, visual_attention: 0.60, knowledge_attention: 0.12, token_confidence: 0.99, attention_data: { type: 'grid' } },
    { index: 1, text: "surfer", gate: 0.82, visual_attention: 0.92, knowledge_attention: 0.38, token_confidence: 0.96, related_entities: ["surfer"], attention_data: { type: 'bbox', bboxRef: 'o1', focalPoints: [{ x: 0.45, y: 0.45, weight: 0.9 }] } },
    { index: 2, text: "in", gate: 0.75, visual_attention: 0.40, knowledge_attention: 0.20, token_confidence: 0.98, attention_data: { type: 'grid' } },
    { index: 3, text: "a", gate: 0.85, visual_attention: 0.35, knowledge_attention: 0.10, token_confidence: 0.99, attention_data: { type: 'grid' } },
    { index: 4, text: "black", gate: 0.70, visual_attention: 0.85, knowledge_attention: 0.40, token_confidence: 0.93, related_entities: ["surfer"], attention_data: { type: 'bbox', bboxRef: 'o1', focalPoints: [{ x: 0.45, y: 0.45, weight: 0.85 }] } },
    { index: 5, text: "wetsuit", gate: 0.62, visual_attention: 0.88, knowledge_attention: 0.65, token_confidence: 0.94, related_entities: ["surfer"], attention_data: { type: 'bbox', bboxRef: 'o1', focalPoints: [{ x: 0.45, y: 0.45, weight: 0.9 }] } },
    { index: 6, text: "maneuvers", gate: 0.55, visual_attention: 0.72, knowledge_attention: 0.68, token_confidence: 0.91, attention_data: { type: 'radial', focalPoints: [{ x: 0.45, y: 0.55, weight: 0.8 }] } },
    { index: 7, text: "through", gate: 0.72, visual_attention: 0.45, knowledge_attention: 0.25, token_confidence: 0.98, attention_data: { type: 'grid' } },
    { index: 8, text: "a", gate: 0.88, visual_attention: 0.35, knowledge_attention: 0.10, token_confidence: 0.99, attention_data: { type: 'grid' } },
    { index: 9, text: "breaking", gate: 0.64, visual_attention: 0.82, knowledge_attention: 0.55, token_confidence: 0.92, related_entities: ["ocean wave"], attention_data: { type: 'bbox', bboxRef: 'o3', focalPoints: [{ x: 0.5, y: 0.5, weight: 0.85 }] } },
    { index: 10, text: "blue", gate: 0.75, visual_attention: 0.88, knowledge_attention: 0.35, token_confidence: 0.95, attention_data: { type: 'radial', focalPoints: [{ x: 0.5, y: 0.5, weight: 0.7 }] } },
    { index: 11, text: "ocean", gate: 0.84, visual_attention: 0.90, knowledge_attention: 0.32, token_confidence: 0.96, related_entities: ["ocean wave"], attention_data: { type: 'bbox', bboxRef: 'o3', focalPoints: [{ x: 0.5, y: 0.5, weight: 0.8 }] } },
    { index: 12, text: "wave.", gate: 0.82, visual_attention: 0.94, knowledge_attention: 0.42, token_confidence: 0.97, related_entities: ["ocean wave"], attention_data: { type: 'bbox', bboxRef: 'o3', focalPoints: [{ x: 0.5, y: 0.5, weight: 0.88 }] } }
  ] as CaptionToken[]
};

// STEAM TRAIN (Sample 3)
const SAMPLE_3_DATA = {
  baseline_caption: "A train moving on the train tracks near trees.",
  baseline_caption_vi: "Một đoàn tàu đang chạy trên đường ray gần hàng cây.",
  level2_caption: "A black train traveling on railroad tracks outdoors.",
  level2_caption_vi: "Một đoàn tàu màu đen di chuyển trên đường ray ngoài trời.",
  level3_caption: "A vintage steam engine pulling passenger cars on tracks.",
  level3_caption_vi: "Một đầu máy hơi nước cổ điển kéo các toa hành khách trên đường ray.",
  raic_caption: "A vintage steam locomotive travels along countryside railway tracks with passenger coaches.",
  raic_caption_vi: "Một đầu tàu hơi nước cổ điển lăn bánh dọc tuyến đường ray đồng quê cùng các toa chở khách.",
  caption_keywords: ["vintage", "steam locomotive", "countryside", "passenger coaches"],
  detected_objects: [
    { id: "o1", label: "steam locomotive (train)", confidence: 0.97, bbox: { x: 0.22, y: 0.28, width: 0.55, height: 0.48 } },
    { id: "o2", label: "railway tracks", confidence: 0.93, bbox: { x: 0.10, y: 0.65, width: 0.80, height: 0.32 } },
    { id: "o3", label: "countryside scenery", confidence: 0.91, bbox: { x: 0.02, y: 0.10, width: 0.95, height: 0.50 } }
  ] as DetectedObject[],
  retrieved_candidates: [
    {
      id: "c-31", rank: 2, final_rank: 1,
      caption: "An antique steam locomotive spewing smoke along rural railroad tracks.",
      faiss_similarity: 0.825, rerank_score: 0.932,
      source: "MS COCO 2014 Train (id: 72005)",
      matched_entities: ["locomotive", "tracks"], status: "admitted"
    },
    {
      id: "c-32", rank: 3, final_rank: 2,
      caption: "A vintage black steam engine pulling coaches past green countryside.",
      faiss_similarity: 0.815, rerank_score: 0.908,
      source: "MS COCO 2014 Train (id: 48102)",
      matched_entities: ["steam engine", "countryside"], status: "admitted"
    },
    {
      id: "c-33", rank: 4, final_rank: 3,
      caption: "A historic steam train traveling on steel tracks surrounded by trees.",
      faiss_similarity: 0.802, rerank_score: 0.880,
      source: "MS COCO 2014 Train (id: 29014)",
      matched_entities: ["train", "tracks"], status: "admitted"
    },
    {
      id: "c-34", rank: 5, final_rank: 4,
      caption: "A passenger steam locomotive rolling down a scenic railway line.",
      faiss_similarity: 0.795, rerank_score: 0.852,
      source: "MS COCO 2014 Train (id: 94021)",
      matched_entities: ["locomotive", "railway"], status: "admitted"
    },
    {
      id: "c-35", rank: 6, final_rank: 5,
      caption: "A preserved steam train operating on heritage rural tracks.",
      faiss_similarity: 0.780, rerank_score: 0.825,
      source: "MS COCO 2014 Train (id: 11904)",
      matched_entities: ["train", "tracks"], status: "admitted"
    },
    {
      id: "c-36", rank: 1, final_rank: 6,
      caption: "A modern passenger commuter train traveling at high speed.",
      faiss_similarity: 0.841, rerank_score: 0.680,
      source: "MS COCO 2014 Train (id: 55401)",
      matched_entities: ["train"], status: "pruned"
    },
    {
      id: "c-37", rank: 7, final_rank: 7,
      caption: "Freight cargo train stopped on industrial siding tracks.",
      faiss_similarity: 0.730, rerank_score: 0.590,
      source: "MS COCO 2014 Train (id: 31089)",
      matched_entities: ["train"], status: "pruned"
    }
  ] as RetrievedCandidate[],
  tokens: [
    { index: 0, text: "A", gate: 0.88, visual_attention: 0.50, knowledge_attention: 0.12, token_confidence: 0.99, attention_data: { type: 'grid' } },
    { index: 1, text: "vintage", gate: 0.65, visual_attention: 0.75, knowledge_attention: 0.62, token_confidence: 0.92, related_entities: ["steam locomotive"], attention_data: { type: 'bbox', bboxRef: 'o1', focalPoints: [{ x: 0.45, y: 0.45, weight: 0.85 }] } },
    { index: 2, text: "steam", gate: 0.62, visual_attention: 0.88, knowledge_attention: 0.70, token_confidence: 0.95, related_entities: ["steam locomotive"], attention_data: { type: 'bbox', bboxRef: 'o1', focalPoints: [{ x: 0.45, y: 0.45, weight: 0.9 }] } },
    { index: 3, text: "locomotive", gate: 0.58, visual_attention: 0.92, knowledge_attention: 0.75, token_confidence: 0.96, related_entities: ["steam locomotive"], attention_data: { type: 'bbox', bboxRef: 'o1', focalPoints: [{ x: 0.45, y: 0.45, weight: 0.92 }] } },
    { index: 4, text: "travels", gate: 0.68, visual_attention: 0.55, knowledge_attention: 0.45, token_confidence: 0.94, attention_data: { type: 'radial', focalPoints: [{ x: 0.5, y: 0.5, weight: 0.7 }] } },
    { index: 5, text: "along", gate: 0.74, visual_attention: 0.45, knowledge_attention: 0.25, token_confidence: 0.98, attention_data: { type: 'grid' } },
    { index: 6, text: "countryside", gate: 0.78, visual_attention: 0.85, knowledge_attention: 0.42, token_confidence: 0.93, related_entities: ["countryside scenery"], attention_data: { type: 'bbox', bboxRef: 'o3', focalPoints: [{ x: 0.5, y: 0.3, weight: 0.8 }] } },
    { index: 7, text: "railway", gate: 0.82, visual_attention: 0.90, knowledge_attention: 0.35, token_confidence: 0.95, related_entities: ["railway tracks"], attention_data: { type: 'bbox', bboxRef: 'o2', focalPoints: [{ x: 0.5, y: 0.75, weight: 0.88 }] } },
    { index: 8, text: "tracks", gate: 0.85, visual_attention: 0.92, knowledge_attention: 0.30, token_confidence: 0.96, related_entities: ["railway tracks"], attention_data: { type: 'bbox', bboxRef: 'o2', focalPoints: [{ x: 0.5, y: 0.75, weight: 0.9 }] } },
    { index: 9, text: "with", gate: 0.78, visual_attention: 0.40, knowledge_attention: 0.20, token_confidence: 0.99, attention_data: { type: 'grid' } },
    { index: 10, text: "passenger", gate: 0.60, visual_attention: 0.72, knowledge_attention: 0.65, token_confidence: 0.91, related_entities: ["steam locomotive"], attention_data: { type: 'bbox', bboxRef: 'o1', focalPoints: [{ x: 0.6, y: 0.45, weight: 0.8 }] } },
    { index: 11, text: "coaches.", gate: 0.55, visual_attention: 0.78, knowledge_attention: 0.72, token_confidence: 0.93, related_entities: ["steam locomotive"], attention_data: { type: 'bbox', bboxRef: 'o1', focalPoints: [{ x: 0.65, y: 0.45, weight: 0.85 }] } }
  ] as CaptionToken[]
};

export const generateStandardMockResult = (
  imageUrl: string,
  imageName: string,
  imageDim: { width: number; height: number } = { width: 1280, height: 853 },
  fileSizeBytes: number = 428000,
  sampleId?: string
): AnalysisResult => {
  // Determine sample profile
  let sampleData = SAMPLE_1_DATA;
  if (sampleId === 'sample-2' || imageName.toLowerCase().includes('11904') || imageName.toLowerCase().includes('surfer')) {
    sampleData = SAMPLE_2_DATA;
  } else if (sampleId === 'sample-3' || imageName.toLowerCase().includes('72005') || imageName.toLowerCase().includes('train')) {
    sampleData = SAMPLE_3_DATA;
  }

  return {
    id: `raic-exp-${Date.now()}`,
    timestamp: new Date().toISOString(),
    image_url: imageUrl,
    image_name: imageName,
    image_dimensions: imageDim,
    file_size_bytes: fileSizeBytes,
    
    // Multi-Level comparison
    baseline_caption: sampleData.baseline_caption,
    baseline_caption_vi: sampleData.baseline_caption_vi,
    level2_caption: sampleData.level2_caption,
    level2_caption_vi: sampleData.level2_caption_vi,
    level3_caption: sampleData.level3_caption,
    level3_caption_vi: sampleData.level3_caption_vi,
    raic_caption: sampleData.raic_caption,
    raic_caption_vi: sampleData.raic_caption_vi,
    caption_keywords: sampleData.caption_keywords,

    // Candidates & Detection
    retrieved_candidates: sampleData.retrieved_candidates,
    detected_objects: sampleData.detected_objects,
    tokens: sampleData.tokens,
    has_explainability: true,

    // Benchmark evaluation template
    evaluation: BENCHMARK_EVALUATION_TEMPLATE,

    level_info: {
      level: "Level 4",
      model_name: "Proposed RAIC (Confidence-aware Gated Fusion)",
      vision_backbone: "CLIP ViT-B/32",
      decoder: "Transformer Decoder with Gated Cross-Attention",
      retrieval_enabled: true,
      retrieval_kb: "MS COCO 2014 Training Captions (414,113 sentences)",
      faiss_candidates_retrieved: 20,
      top_k_used: 5,
      reranking_enabled: true,
      reranking_method: "CLIP Similarity + Object Consistency",
      fusion_mechanism: "Confidence-aware Gated Fusion",
      inference_latency_ms: 178
    },

    metadata: {
      is_mock: true,
      backend_source: "mock_research_simulator",
      device: "CUDA (Simulated)"
    }
  };
};

export const analyzeImageMock = async (file: File): Promise<AnalysisResult> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  const imageUrl = URL.createObjectURL(file);
  return generateStandardMockResult(imageUrl, file.name, { width: 1280, height: 853 }, file.size);
};

export const analyzeSampleMock = async (sampleId: string): Promise<AnalysisResult> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  const sample = SAMPLE_IMAGES.find(s => s.id === sampleId) || SAMPLE_IMAGES[0];
  return generateStandardMockResult(sample.url, sample.name, { width: 1280, height: 853 }, 428000, sampleId);
};
