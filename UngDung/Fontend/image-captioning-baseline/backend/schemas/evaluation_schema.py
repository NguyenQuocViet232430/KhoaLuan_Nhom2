from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class RunEvaluationRequest(BaseModel):
    dataset: str
    split: str = "val"
    limit: Optional[int] = None
    batch_size: int = 1

class JobStatusResponse(BaseModel):
    experiment_id: str
    status: str
    dataset: str
    total: int
    processed: int
    successful: int
    failed: int
    progress: float

class EvaluationMetrics(BaseModel):
    bleu_1: Optional[float] = None
    bleu_2: Optional[float] = None
    bleu_3: Optional[float] = None
    bleu_4: Optional[float] = None
    meteor: Optional[float] = None
    rouge_l: Optional[float] = None
    cider: Optional[float] = None
    spice: Optional[float] = None

class EvaluationReportResponse(BaseModel):
    experiment_id: str
    status: str
    dataset: str
    model_name: str
    device: str
    sample_count: int
    successful_samples: int
    failed_samples: int
    metrics: EvaluationMetrics
    total_processing_time: float
    average_processing_time: float
