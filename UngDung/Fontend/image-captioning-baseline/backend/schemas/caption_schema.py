from pydantic import BaseModel
from typing import List, Optional, Any, Dict

class KnowledgeItem(BaseModel):
    id: str
    content: str
    source: str
    score: float
    metadata: Dict[str, Any] = {}

class RetrievalData(BaseModel):
    enabled: bool = False
    top_k: int = 0
    items: List[KnowledgeItem] = []
    processing_time: float = 0.0

class EvaluationMetrics(BaseModel):
    bleu: Optional[float] = None
    meteor: Optional[float] = None
    rouge_l: Optional[float] = None
    cider: Optional[float] = None
    spice: Optional[float] = None

class EvaluationData(BaseModel):
    status: str = "not_evaluated"
    dataset: Optional[str] = None
    metrics: EvaluationMetrics = EvaluationMetrics()
    sample_count: int = 0

class DiagnosisData(BaseModel):
    status: str = "heuristic_only"
    overall_quality: Optional[str] = None
    semantic_consistency: Optional[str] = None
    repetition: bool = False
    possible_hallucination: bool = False
    missing_objects: List[str] = []
    incorrect_objects: List[str] = []
    issues: List[str] = []

class CaptionResponse(BaseModel):
    success: bool
    caption: Optional[str] = None
    initial_caption: Optional[str] = None
    final_caption: Optional[str] = None
    caption_keywords: List[str] = []
    model_type: Optional[str] = None
    model_name: Optional[str] = None
    device: Optional[str] = None
    processing_time: float = 0.0
    knowledge_retrieval: bool = False
    knowledge_ranking: bool = False
    knowledge_fusion: bool = False
    retrieval: Optional[RetrievalData] = None
    evaluation: Optional[EvaluationData] = None
    diagnosis: Optional[DiagnosisData] = None
    pipeline: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
