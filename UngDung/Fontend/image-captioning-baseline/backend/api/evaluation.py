from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import os
import json

from backend.schemas.evaluation_schema import RunEvaluationRequest, JobStatusResponse
from backend.services.caption_service import get_caption_service
from backend.evaluation.runner import BatchEvaluationRunner

router = APIRouter()

# Global runner instance
runner = None

def get_runner():
    global runner
    if runner is None:
        service = get_caption_service()
        runner = BatchEvaluationRunner(service)
    return runner

@router.get("/datasets")
async def get_datasets_status():
    from backend.evaluation.datasets import CustomJSONAdapter, MSCOCOAdapter, Flickr30KAdapter
    datasets = [
        CustomJSONAdapter(),
        MSCOCOAdapter(),
        Flickr30KAdapter()
    ]
    res = []
    for d in datasets:
        res.append({
            "name": d.get_dataset_name(),
            "is_configured": getattr(d, 'is_configured', False),
            "sample_count": d.get_sample_count()
        })
    return {"datasets": res}

@router.post("/evaluation/run")
async def run_evaluation(req: RunEvaluationRequest, r=Depends(get_runner)):
    try:
        experiment_id = r.start_job(dataset_name=req.dataset, split=req.split, limit=req.limit)
        return {"experiment_id": experiment_id, "status": "queued"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/evaluation/status")
async def get_status(experiment_id: str, r=Depends(get_runner)):
    status = r.get_status(experiment_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return status

@router.get("/evaluation/report")
async def get_report(experiment_id: str, r=Depends(get_runner)):
    report = r.get_report(experiment_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not ready or job not found")
    return report

@router.post("/evaluation/cancel")
async def cancel_job(experiment_id: str, r=Depends(get_runner)):
    if r.cancel_job(experiment_id):
        return {"success": True, "message": f"Job {experiment_id} cancelled"}
    else:
        raise HTTPException(status_code=400, detail="Cannot cancel job (maybe it's not running or doesn't exist)")

@router.get("/evaluation/{experiment_id}/errors")
async def get_errors(experiment_id: str, page: int = 1, limit: int = 50):
    # This reads the diagnosis.jsonl and errors.jsonl files
    results_dir = "evaluation_results"
    exp_dir = os.path.join(results_dir, experiment_id)
    if not os.path.exists(exp_dir):
        raise HTTPException(status_code=404, detail="Experiment not found")
        
    diag_file = os.path.join(exp_dir, "diagnosis.jsonl")
    data = []
    if os.path.exists(diag_file):
        with open(diag_file, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    obj = json.loads(line)
                    # Filter for those with issues
                    if obj.get("diagnosis", {}).get("issues"):
                        data.append(obj)
                except:
                    pass
                    
    start = (page - 1) * limit
    end = start + limit
    return {
        "experiment_id": experiment_id,
        "total_errors": len(data),
        "page": page,
        "limit": limit,
        "data": data[start:end]
    }

@router.get("/evaluation/{experiment_id}/results")
async def get_qualitative_results(experiment_id: str, limit: int = 50):
    """Returns qualitative results (prediction + references) for visual inspection."""
    results_dir = "evaluation_results"
    exp_dir = os.path.join(results_dir, experiment_id)
    if not os.path.exists(exp_dir):
        raise HTTPException(status_code=404, detail="Experiment not found")
        
    pred_file = os.path.join(exp_dir, "predictions.jsonl")
    data = []
    if os.path.exists(pred_file):
        with open(pred_file, "r", encoding="utf-8") as f:
            for i, line in enumerate(f):
                if i >= limit:
                    break
                try:
                    obj = json.loads(line)
                    data.append({
                        "image_id": obj.get("image_id"),
                        "image_path": obj.get("image_path"),
                        "prediction": obj.get("prediction"),
                        "references": obj.get("references")
                    })
                except:
                    pass
                    
    return {
        "experiment_id": experiment_id,
        "limit": limit,
        "data": data
    }

@router.get("/evaluation/compare")
async def compare_experiments():
    results_dir = "evaluation_results"
    if not os.path.exists(results_dir):
        return {"experiments": []}
        
    experiments = []
    for exp_id in os.listdir(results_dir):
        report_file = os.path.join(results_dir, exp_id, "report.json")
        if os.path.exists(report_file):
            try:
                with open(report_file, "r", encoding="utf-8") as f:
                    report = json.load(f)
                    experiments.append({
                        "experiment_id": report.get("experiment_id", exp_id),
                        "dataset": report.get("dataset"),
                        "metrics": report.get("metrics"),
                        "sample_count": report.get("sample_count"),
                        "average_inference_time": report.get("average_processing_time")
                    })
            except:
                pass
    return {"experiments": experiments}
