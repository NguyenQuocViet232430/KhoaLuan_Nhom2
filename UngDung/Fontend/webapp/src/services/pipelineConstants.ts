import React from 'react';
import { Cpu, FileText, Database, Filter, Sparkles, Layers } from 'lucide-react';

export interface PipelineStepInfo {
  id: string;
  title: string;
  shortDesc: string;
  titleVi: string;
  shortDescVi: string;
  icon: React.ReactNode;
}

export const PIPELINE_STEPS: PipelineStepInfo[] = [
  {
    id: 'encoding',
    title: '1. Vision Feature Extraction',
    shortDesc: 'Frozen CLIP ViT-B/32 → normalized 512-dimensional image vector',
    titleVi: '1. Trích xuất đặc trưng ảnh',
    shortDescVi: 'CLIP ViT-B/32 đóng băng → vector ảnh 512 chiều chuẩn hóa L2',
    icon: React.createElement(Cpu, { className: 'w-4 h-4' })
  },
  {
    id: 'semantic_labels',
    title: '2. Entity Vocabulary',
    shortDesc: 'RelTR + WordNet when available; CLIP-only retrieval otherwise',
    titleVi: '2. Từ vựng thực thể',
    shortDescVi: 'RelTR + WordNet khi có detector; dùng truy hồi CLIP nếu thiếu',
    icon: React.createElement(Sparkles, { className: 'w-4 h-4' })
  },
  {
    id: 'faiss_retrieval',
    title: '3. Candidate Caption Retrieval',
    shortDesc: 'IndexFlatIP over 566,747 COCO train/restval captions; top 50 candidates',
    titleVi: '3. Truy hồi caption ứng viên',
    shortDescVi: 'IndexFlatIP trên 566.747 caption COCO train/restval; lấy 50 ứng viên',
    icon: React.createElement(Database, { className: 'w-4 h-4' })
  },
  {
    id: 'reranking',
    title: '4. Hybrid Reranking + MMR',
    shortDesc: 'CLIP + Jaccard relevance; MMR selects exactly 5 diverse captions',
    titleVi: '4. Tái xếp hạng và MMR',
    shortDescVi: 'Điểm CLIP + Jaccard; MMR chọn đúng 5 caption đa dạng',
    icon: React.createElement(Filter, { className: 'w-4 h-4' })
  },
  {
    id: 'gated_fusion',
    title: '5. Native 5-Token Fusion',
    shortDesc: 'Project each caption to 256 dimensions; learned image-level knowledge gate',
    titleVi: '5. Dung hợp 5 token tri thức',
    shortDescVi: 'Chiếu từng caption xuống 256 chiều; cổng tri thức chung cho ảnh',
    icon: React.createElement(Layers, { className: 'w-4 h-4' })
  },
  {
    id: 'beam_decode',
    title: '6. Beam Search Captioning',
    shortDesc: '3-layer decoder, beam size 3; initial g=0 and final learned-gate captions',
    titleVi: '6. Giải mã Beam Search',
    shortDescVi: 'Decoder 3 lớp, beam 3; câu ban đầu g=0 và câu cuối dùng cổng học được',
    icon: React.createElement(FileText, { className: 'w-4 h-4' })
  }
];
