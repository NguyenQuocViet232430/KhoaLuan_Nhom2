import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BenchmarkTable } from './BenchmarkTable';

export function ModelArchitectureExplorer() {
  const { i18n } = useTranslation();
  const vi = i18n.language.startsWith('vi');
  const stages = [
    [vi ? 'Ảnh' : 'Image', vi ? 'Ảnh RGB đầu vào' : 'RGB input image'],
    ['CLIP ViT-B/32', vi ? 'Vector ảnh 512 chiều' : '512-d image vector'],
    ['FAISS', vi ? 'Truy hồi 50 caption' : 'Retrieve 50 captions'],
    ['Hybrid + MMR', vi ? 'Chọn 5 câu đa dạng' : 'Select 5 diverse captions'],
    ['Fusion', vi ? 'Hợp nhất qua cổng g' : 'Fuse through gate g'],
    ['Transformer', vi ? 'Giải mã beam search' : 'Beam search decoding'],
    ['Caption', vi ? 'Câu mô tả tiếng Anh' : 'English description'],
  ];
  return <div className="research-page">
    <header className="page-heading"><h1>{vi ? 'Kiến trúc' : 'Architecture'}</h1><p>{vi ? 'Quy trình sinh chú thích ảnh dựa trên truy hồi tri thức.' : 'Image captioning with retrieved knowledge.'}</p></header>
    <ol className="architecture-pipeline" aria-label={vi ? 'Pipeline từ ảnh đến chú thích' : 'Image-to-caption pipeline'}>
      {stages.map(([name, detail], index) => <li key={name}><div className="pipeline-block"><h2>{name}</h2><p>{detail}</p></div>
        {index < stages.length - 1 && <ArrowRight size={16} aria-hidden="true" className="pipeline-arrow" />}</li>)}
    </ol>
    <div className="architecture-notes">
      <section><h2>{vi ? 'Truy hồi và tái xếp hạng' : 'Retrieval and ranking'}</h2><p>{vi ? '566.747 caption COCO train/restval. RelTR + WordNet mở rộng tối đa 8 từ cho mỗi thực thể. Hybrid: 0,6 CLIP + 0,4 Jaccard; MMR λ = 0,7. Nếu thiếu RelTR, dùng CLIP + MMR.' : '566,747 COCO train/restval captions. RelTR + WordNet expands each entity by up to 8 terms. Hybrid: 0.6 CLIP + 0.4 Jaccard; MMR λ = 0.7. Without RelTR, use CLIP + MMR.'}</p></section>
      <section><h2>{vi ? 'Cấu hình đã huấn luyện' : 'Trained configuration'}</h2><p>{vi ? '5 token tri thức qua Linear(512, 256). Decoder 3 lớp, 8 heads, d_model = 256, FFN = 1024. Beam size = 3, α = 0,6, độ dài chuỗi tối đa 30 token (đồng bộ với benchmark).' : '5 knowledge tokens via Linear(512, 256). Decoder: 3 layers, 8 heads, d_model = 256, FFN = 1024. Beam size = 3, α = 0.6, maximum sequence length 30 tokens (aligned with benchmark).'}</p></section>
    </div>
    <section className="gate-formula"><h2>{vi ? 'Cổng học được' : 'Learned gate'}</h2>
      <p className="formula">context = (1 − g) × context_visual + g × context_knowledge</p>
      <p>{vi ? 'g = sigmoid(Linear([v; c̄; s̄])). Cổng g dùng chung cho toàn ảnh trong các lớp decoder; c̄ là embedding caption được gộp theo softmax của điểm truy hồi. Câu ban đầu dùng cùng checkpoint với g = 0.' : 'g = sigmoid(Linear([v; c̄; s̄])). One image-level gate is shared across decoder layers; c̄ pools caption embeddings using softmax retrieval scores. The initial caption uses the same checkpoint with g = 0.'}</p>
    </section>
    <BenchmarkTable />
  </div>;
}

