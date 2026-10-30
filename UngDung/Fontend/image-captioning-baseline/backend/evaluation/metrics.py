import json
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any

logger = logging.getLogger(__name__)

class MetricEvaluator(ABC):
    @abstractmethod
    def compute(self, references_list: List[List[str]], hypotheses: List[str]) -> Dict[str, Optional[float]]:
        pass

class BLEUEvaluator(MetricEvaluator):
    def __init__(self):
        self.available = False
        try:
            import nltk
            from nltk.translate.bleu_score import corpus_bleu
            self.corpus_bleu = corpus_bleu
            self.available = True
        except ImportError:
            pass

    def compute(self, references_list: List[List[str]], hypotheses: List[str]) -> Dict[str, Optional[float]]:
        if not self.available or not hypotheses:
            return {"bleu_1": None, "bleu_2": None, "bleu_3": None, "bleu_4": None}
        
        refs_tokenized = [[ref.lower().split() for ref in refs] for refs in references_list]
        hyps_tokenized = [hyp.lower().split() for hyp in hypotheses]
        
        res = {"bleu_1": None, "bleu_2": None, "bleu_3": None, "bleu_4": None}
        try:
            res["bleu_1"] = float(self.corpus_bleu(refs_tokenized, hyps_tokenized, weights=(1, 0, 0, 0)))
            res["bleu_2"] = float(self.corpus_bleu(refs_tokenized, hyps_tokenized, weights=(0.5, 0.5, 0, 0)))
            res["bleu_3"] = float(self.corpus_bleu(refs_tokenized, hyps_tokenized, weights=(0.33, 0.33, 0.33, 0)))
            res["bleu_4"] = float(self.corpus_bleu(refs_tokenized, hyps_tokenized, weights=(0.25, 0.25, 0.25, 0.25)))
        except Exception as e:
            logger.error(f"BLEU compute error: {e}")
            
        return res

class RougeEvaluator(MetricEvaluator):
    def __init__(self):
        self.available = False
        try:
            from rouge_score import rouge_scorer
            self.scorer = rouge_scorer.RougeScorer(['rougeL'], use_stemmer=True)
            self.available = True
        except ImportError:
            pass

    def compute(self, references_list: List[List[str]], hypotheses: List[str]) -> Dict[str, Optional[float]]:
        if not self.available or not hypotheses:
            return {"rouge_l": None}
            
        scores = []
        try:
            for refs, hyp in zip(references_list, hypotheses):
                # ROUGE takes the max over references
                max_score = 0
                for ref in refs:
                    score = self.scorer.score(ref, hyp)
                    if score['rougeL'].fmeasure > max_score:
                        max_score = score['rougeL'].fmeasure
                scores.append(max_score)
            
            return {"rouge_l": float(sum(scores)/len(scores)) if scores else None}
        except Exception as e:
            logger.error(f"ROUGE compute error: {e}")
            return {"rouge_l": None}

class PycocoEvaluator(MetricEvaluator):
    def __init__(self):
        self.available = False
        try:
            from pycocoevalcap.cider.cider import Cider
            from pycocoevalcap.meteor.meteor import Meteor
            self.cider = Cider()
            self.meteor = Meteor()
            self.available = True
        except ImportError:
            pass
        except Exception as e:
            logger.warning(f"pycocoevalcap initialized failed: {e}")
            pass

    def compute(self, references_list: List[List[str]], hypotheses: List[str]) -> Dict[str, Optional[float]]:
        res = {"cider": None, "meteor": None, "spice": None}
        if not self.available or not hypotheses:
            return res
            
        try:
            # pycocoevalcap expects dicts formatted as: {image_id: [caption, ...]}
            # where caption for hyp is [{'caption': '...'}] and for ref is [{'caption': '...'}, ...]
            gts = {}
            res_dict = {}
            for i, (refs, hyp) in enumerate(zip(references_list, hypotheses)):
                gts[str(i)] = refs
                res_dict[str(i)] = [hyp]
                
            cider_score, _ = self.cider.compute_score(gts, res_dict)
            res["cider"] = float(cider_score)
            
            meteor_score, _ = self.meteor.compute_score(gts, res_dict)
            res["meteor"] = float(meteor_score)
        except Exception as e:
            logger.error(f"pycocoevalcap compute error: {e}")
            
        return res

def compute_corpus_metrics(references_list: List[List[str]], hypotheses: List[str]) -> Dict[str, Optional[float]]:
    metrics = {
        "bleu_1": None,
        "bleu_2": None,
        "bleu_3": None,
        "bleu_4": None,
        "meteor": None,
        "rouge_l": None,
        "cider": None,
        "spice": None
    }
    
    evaluators = [BLEUEvaluator(), RougeEvaluator(), PycocoEvaluator()]
    
    for evaluator in evaluators:
        if hasattr(evaluator, 'available') and getattr(evaluator, 'available', False):
            computed = evaluator.compute(references_list, hypotheses)
            metrics.update(computed)
            
    return metrics
