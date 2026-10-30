from dataclasses import dataclass
from typing import Optional

@dataclass
class ExperimentConfig:
    name: str = "EXP-BASELINE"
    retrieval_enabled: bool = False
    top_k: int = 0
    ranking_enabled: bool = False
    ranking_method: str = "none"
    fusion_enabled: bool = False
    fusion_method: str = "none"

EXP_BASELINE = ExperimentConfig(name="EXP-BASELINE")
EXP_RETRIEVAL = ExperimentConfig(name="EXP-RETRIEVAL", retrieval_enabled=True, top_k=5)
EXP_RANKING = ExperimentConfig(name="EXP-RANKING", retrieval_enabled=True, top_k=10, ranking_enabled=True, ranking_method="cross_encoder")
EXP_FUSION = ExperimentConfig(name="EXP-FUSION", retrieval_enabled=True, top_k=10, ranking_enabled=True, fusion_enabled=True, fusion_method="llm")

# Mặc định sử dụng BASELINE (Tất cả knowledge flag = False)
DEFAULT_CONFIG = EXP_BASELINE
