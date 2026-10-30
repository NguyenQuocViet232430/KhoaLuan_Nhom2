import os
import json
import time
import uuid
import logging
import asyncio
from PIL import Image
from typing import Dict, Any, Optional
from backend.evaluation.datasets import MSCOCOAdapter, Flickr30KAdapter, CustomJSONAdapter
from backend.evaluation.metrics import compute_corpus_metrics
from backend.evaluation.diagnosis import CaptionDiagnoser

logger = logging.getLogger(__name__)

class BatchEvaluationRunner:
    def __init__(self, caption_service):
        self.caption_service = caption_service
        self.jobs = {}
        self.results_dir = "evaluation_results"
        os.makedirs(self.results_dir, exist_ok=True)
    
    def start_job(self, dataset_name: str, split: str, limit: Optional[int]) -> str:
        experiment_id = f"exp_{uuid.uuid4().hex[:8]}"
        
        adapter = None
        if dataset_name.lower() == "mscoco":
            adapter = MSCOCOAdapter()
        elif dataset_name.lower() == "flickr30k":
            adapter = Flickr30KAdapter()
        elif dataset_name.lower() == "custom":
            adapter = CustomJSONAdapter("test_dataset.json")
        else:
            raise ValueError(f"Unknown dataset: {dataset_name}")
            
        total = adapter.get_sample_count()
        if limit and (total == 0 or limit < total):
            total = limit
            
        self.jobs[experiment_id] = {
            "experiment_id": experiment_id,
            "status": "queued",
            "dataset": dataset_name,
            "total": total,
            "processed": 0,
            "successful": 0,
            "failed": 0,
            "progress": 0.0,
            "adapter": adapter,
            "limit": limit,
            "start_time": time.time(),
            "results": [],
            "task": None
        }
        
        loop = asyncio.get_event_loop()
        self.jobs[experiment_id]["task"] = loop.create_task(self._run_job(experiment_id))
        
        return experiment_id

    async def _run_job(self, experiment_id: str):
        job = self.jobs[experiment_id]
        job["status"] = "running"
        adapter = job["adapter"]
        
        job_dir = os.path.join(self.results_dir, experiment_id)
        os.makedirs(job_dir, exist_ok=True)
        
        pred_file = open(os.path.join(job_dir, "predictions.jsonl"), "w", encoding="utf-8")
        err_file = open(os.path.join(job_dir, "errors.jsonl"), "w", encoding="utf-8")
        diag_file = open(os.path.join(job_dir, "diagnosis.jsonl"), "w", encoding="utf-8")
        
        diagnoser = CaptionDiagnoser()
        
        count = 0
        limit = job["limit"]
        
        if getattr(adapter, 'is_configured', True): 
            # If adapter has is_configured, check it. CustomJSONAdapter has it, MSCOCO/Flickr don't (they are hardcoded to empty/0 right now)
            pass
            
        if job["total"] == 0:
             job["status"] = "failed"
             err_file.write(json.dumps({"error": "Dataset not configured or empty"}) + "\n")
        else:
            for sample in adapter.iterate_samples():
                if limit and count >= limit:
                    break
                
                try:
                    start_t = time.time()
                    image_path = sample.get('image_path')
                    if not os.path.exists(image_path):
                        raise FileNotFoundError(f"Image not found: {image_path}")
                        
                    image = Image.open(image_path).convert("RGB")
                    
                    pred_raw = await asyncio.to_thread(self.caption_service.captioner.generate, image)
                    pred = pred_raw.capitalize() + "." if pred_raw else ""
                    
                    pt = time.time() - start_t
                    
                    res = {
                        "image_id": sample.get('id'),
                        "image_path": image_path,
                        "prediction": pred,
                        "references": sample.get('references', []),
                        "processing_time": pt,
                        "model_name": getattr(self.caption_service.captioner, "model_name", "unknown"),
                        "experiment_id": experiment_id,
                        "success": True,
                        "error": None
                    }
                    pred_file.write(json.dumps(res) + "\n")
                    pred_file.flush()
                    
                    # Diagnosis
                    diag = diagnoser.diagnose_with_references(pred, res["references"])
                    diag_res = {
                        "image_id": sample.get('id'),
                        "diagnosis": diag
                    }
                    diag_file.write(json.dumps(diag_res) + "\n")
                    diag_file.flush()
                    
                    job["results"].append(res)
                    job["successful"] += 1
                except Exception as e:
                    logger.error(f"Error on sample {sample.get('id')}: {e}")
                    res = {
                        "image_id": sample.get('id'),
                        "success": False,
                        "error": str(e)
                    }
                    err_file.write(json.dumps(res) + "\n")
                    err_file.flush()
                    job["failed"] += 1
                    
                count += 1
                job["processed"] = count
                job["progress"] = (count / job["total"]) * 100 if job["total"] > 0 else 0
                
        pred_file.close()
        err_file.close()
        diag_file.close()
        
        if job["status"] != "failed":
            job["status"] = "completed"
            
            hypotheses = [r["prediction"] for r in job["results"] if r.get("success")]
            references_list = [r["references"] for r in job["results"] if r.get("success")]
            
            metrics = compute_corpus_metrics(references_list, hypotheses)
            
            total_time = sum([r.get("processing_time", 0) for r in job["results"] if r.get("success")])
            import datetime
            report = {
                "experiment_id": experiment_id,
                "status": job["status"],
                "dataset": job["dataset"],
                "model_name": getattr(self.caption_service.captioner, "model_name", "unknown"),
                "device": getattr(self.caption_service.captioner, "device", "unknown"),
                "sample_count": count,
                "successful_samples": job["successful"],
                "failed_samples": job["failed"],
                "metrics": metrics,
                "total_processing_time": total_time,
                "average_processing_time": total_time / job["successful"] if job["successful"] > 0 else 0,
                "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
                "configuration": {
                    "seed": 42,
                    "model_version": "main",
                    "preprocessing_config": "default_vit_processor",
                    "decoding_config": "greedy_search",
                    "retrieval_enabled": False,
                    "ranking_enabled": False,
                    "fusion_enabled": False,
                    "training_config": "not_implemented"
                }
            }
            
            # Save configuration separately for reproducibility
            with open(os.path.join(job_dir, "config.json"), "w", encoding="utf-8") as f:
                json.dump(report["configuration"], f, indent=2)
                
            with open(os.path.join(job_dir, "report.json"), "w", encoding="utf-8") as f:
                json.dump(report, f, indent=2)
                
            job["report"] = report

    def get_status(self, experiment_id: str):
        if experiment_id not in self.jobs:
            return None
        job = self.jobs[experiment_id]
        return {
            "experiment_id": job["experiment_id"],
            "status": job["status"],
            "dataset": job["dataset"],
            "total": job["total"],
            "processed": job["processed"],
            "successful": job["successful"],
            "failed": job["failed"],
            "progress": job["progress"]
        }
        
    def get_report(self, job_id: str):
        if job_id not in self.jobs:
            return None
        job = self.jobs[job_id]
        if "report" in job:
            return job["report"]
        # if not complete but requested
        return {
            "job_id": job["job_id"],
            "status": job["status"],
            "dataset": job["dataset"],
            "model_name": getattr(self.caption_service.captioner, "model_name", "unknown"),
            "device": getattr(self.caption_service.captioner, "device", "unknown"),
            "sample_count": job["processed"],
            "successful_samples": job["successful"],
            "failed_samples": job["failed"],
            "metrics": {
                "bleu": None, "meteor": None, "rouge_l": None, "cider": None, "spice": None
            },
            "total_processing_time": 0,
            "average_processing_time": 0
        }

    def cancel_job(self, job_id: str):
        if job_id in self.jobs:
            job = self.jobs[job_id]
            if job["task"] and not job["task"].done():
                job["task"].cancel()
                job["status"] = "cancelled"
                return True
        return False
