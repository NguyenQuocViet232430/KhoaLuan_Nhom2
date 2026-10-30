from backend.schemas.caption_schema import EvaluationData, EvaluationMetrics

class CaptionEvaluator:
    """
    Interface for computing evaluation metrics against reference datasets.
    Currently returns a 'not_evaluated' state until datasets and metrics are configured.
    """
    def evaluate(self, prediction: str) -> EvaluationData:
        # Phase 1.5: Not configured with dataset adapters or ground-truth references.
        # Thus, returning default null/un-evaluated values.
        return EvaluationData(
            status="not_evaluated",
            dataset=None,
            metrics=EvaluationMetrics(
                bleu=None,
                meteor=None,
                rouge_l=None,
                cider=None,
                spice=None
            ),
            sample_count=0
        )
