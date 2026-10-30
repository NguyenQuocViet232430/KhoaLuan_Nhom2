import os
import json
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Generator

logger = logging.getLogger(__name__)

class DatasetAdapter(ABC):
    is_configured: bool = False
    
    @abstractmethod
    def get_dataset_name(self) -> str:
        pass
        
    @abstractmethod
    def get_sample_count(self) -> int:
        pass
        
    @abstractmethod
    def iterate_samples(self) -> Generator[Dict[str, Any], None, None]:
        pass
        
    @abstractmethod
    def get_references(self, sample_id: str) -> List[str]:
        pass

class CustomJSONAdapter(DatasetAdapter):
    def __init__(self, json_path: str = "test_dataset.json"):
        self.json_path = json_path
        self.data = []
        self.is_configured = False
        
        if os.path.exists(json_path):
            try:
                with open(json_path, 'r', encoding='utf-8') as f:
                    self.data = json.load(f)
                self.is_configured = True
            except:
                self.is_configured = False

    def get_dataset_name(self) -> str:
        return "Custom JSON"

    def get_sample_count(self) -> int:
        return len(self.data)

    def iterate_samples(self) -> Generator[Dict[str, Any], None, None]:
        for item in self.data:
            yield item

    def get_references(self, sample_id: str) -> List[str]:
        for item in self.data:
            if str(item.get('id')) == str(sample_id):
                return item.get('references', [])
        return []

class MSCOCOAdapter(DatasetAdapter):
    def __init__(self, ann_file: str = "data/coco/annotations/captions_val2014.json", img_dir: str = "data/coco/val2014"):
        self.ann_file = ann_file
        self.img_dir = img_dir
        self.is_configured = False
        self.annotations = {} # image_id -> list of captions
        self.images = []      # list of dict with id, file_name, path
        
        if os.path.exists(self.ann_file) and os.path.isdir(self.img_dir):
            try:
                with open(self.ann_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Check format (Karpathy vs Standard COCO)
                if 'images' in data and 'annotations' in data:
                    # Standard COCO format
                    for ann in data['annotations']:
                        img_id = str(ann['image_id'])
                        if img_id not in self.annotations:
                            self.annotations[img_id] = []
                        self.annotations[img_id].append(ann['caption'])
                        
                    for img in data['images']:
                        img_id = str(img['id'])
                        path = os.path.join(self.img_dir, img['file_name'])
                        if os.path.exists(path):
                            self.images.append({
                                'id': img_id,
                                'path': path
                            })
                elif 'images' in data and isinstance(data['images'], list) and 'sentences' in data['images'][0]:
                    # Karpathy format
                    for img in data['images']:
                        if img.get('split') in ['val', 'test']:
                            img_id = str(img['cocoid'])
                            path = os.path.join(self.img_dir, img['filename'])
                            if os.path.exists(path):
                                self.images.append({
                                    'id': img_id,
                                    'path': path
                                })
                                self.annotations[img_id] = [s['raw'] for s in img['sentences']]
                
                if len(self.images) > 0:
                    self.is_configured = True
            except Exception as e:
                logger.error(f"Error loading MS COCO: {e}")
                self.is_configured = False

    def get_dataset_name(self) -> str:
        return "MS COCO"

    def get_sample_count(self) -> int:
        return len(self.images)

    def iterate_samples(self) -> Generator[Dict[str, Any], None, None]:
        for img in self.images:
            yield {
                'id': img['id'],
                'path': img['path'],
                'references': self.annotations.get(img['id'], [])
            }

    def get_references(self, sample_id: str) -> List[str]:
        return self.annotations.get(str(sample_id), [])

class Flickr30KAdapter(DatasetAdapter):
    def __init__(self, ann_file: str = "data/flickr30k/results_20130124.token", img_dir: str = "data/flickr30k/flickr30k-images"):
        self.ann_file = ann_file
        self.img_dir = img_dir
        self.is_configured = False
        self.annotations = {}
        self.images = []
        
        if os.path.exists(self.ann_file) and os.path.isdir(self.img_dir):
            try:
                with open(self.ann_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        parts = line.strip().split('\t')
                        if len(parts) >= 2:
                            img_info = parts[0].split('#')
                            img_name = img_info[0]
                            caption = parts[1]
                            
                            img_id = img_name
                            if img_id not in self.annotations:
                                self.annotations[img_id] = []
                            self.annotations[img_id].append(caption)
                            
                for img_name in self.annotations.keys():
                    path = os.path.join(self.img_dir, img_name)
                    if os.path.exists(path):
                        self.images.append({
                            'id': img_name,
                            'path': path
                        })
                
                if len(self.images) > 0:
                    self.is_configured = True
            except Exception as e:
                logger.error(f"Error loading Flickr30K: {e}")
                self.is_configured = False

    def get_dataset_name(self) -> str:
        return "Flickr30K"

    def get_sample_count(self) -> int:
        return len(self.images)

    def iterate_samples(self) -> Generator[Dict[str, Any], None, None]:
        for img in self.images:
            yield {
                'id': img['id'],
                'path': img['path'],
                'references': self.annotations.get(img['id'], [])
            }

    def get_references(self, sample_id: str) -> List[str]:
        return self.annotations.get(str(sample_id), [])
