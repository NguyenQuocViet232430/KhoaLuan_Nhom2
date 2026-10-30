import { useState } from 'react';
import { Copy, Check, FileJson, FileSpreadsheet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AnalysisResult, CaptionToken, ActiveTab } from '../types';
import { ImageViewer } from './ImageViewer';
import { ExplainabilityPanel } from './ExplainabilityPanel';
import { copyCaptionToClipboard, downloadAnalysisJson, downloadMetricsCsv } from '../services/exportService';

interface ResultDashboardProps {
  result: AnalysisResult; selectedToken: CaptionToken | null;
  onSelectToken: (token: CaptionToken | null) => void;
  onNavigateTab: (tab: ActiveTab) => void; onNewImage: () => void;
}
export function ResultDashboard({ result, selectedToken, onSelectToken, onNavigateTab, onNewImage }: ResultDashboardProps) {
  const { i18n } = useTranslation();
  const vi = i18n.language.startsWith('vi');
  const [copied, setCopied] = useState(false);
  const [highlightedObjectId, setHighlightedObjectId] = useState<string | null>(null);
  const native5 = result.level_info.level === 'Level 5A';
  const evaluated = result.evaluation.status !== 'not_evaluated';
  const caption = vi && result.raic_caption_vi ? result.raic_caption_vi : result.raic_caption;
  const candidates = [...result.retrieved_candidates].filter(candidate => candidate.status !== 'pruned')
    .sort((a, b) => (a.final_rank ?? a.rank) - (b.final_rank ?? b.rank)).slice(0, result.level_info.top_k_used);
  const gate = result.retrieved_candidates.find(candidate => typeof candidate.gate_score === 'number')?.gate_score;
  const copy = async () => {
    if (await copyCaptionToClipboard(caption)) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };
  return <div className="result-page">
    <header className="page-heading page-heading-with-action"><div><h1>{vi ? 'Kết quả chú thích' : 'Caption result'}</h1><p className="filename">{result.image_name}</p></div>
      <button type="button" className="studio-primary-button" onClick={onNewImage}>{vi ? 'Ảnh mới' : 'New image'}</button></header>
    {result.metadata.is_mock && <p className="notice">{vi ? 'Dữ liệu mô phỏng, dùng để minh họa giao diện.' : 'Simulated data for interface demonstration.'}</p>}
    {result.pipeline?.fallback && <p className="notice" role="status">{vi ? 'RelTR chưa sẵn sàng. Kết quả dùng CLIP + MMR.' : 'RelTR is unavailable. This result uses CLIP + MMR.'}</p>}
    <div className="result-columns">
      <div className="result-image-column"><ImageViewer imageUrl={result.image_url} imageDimensions={result.image_dimensions}
        detectedObjects={result.detected_objects} selectedToken={selectedToken} highlightedObjectId={highlightedObjectId}
        onObjectClick={id => setHighlightedObjectId(previous => previous === id ? null : id)} /></div>
      <div className="result-text-column">
        <section aria-labelledby="caption-heading" className="caption-section">
          <h2 id="caption-heading">{vi ? 'Chú thích' : 'Caption'}</h2><p className="caption-result-text">{caption}</p>
          {vi && result.raic_caption_vi && <p className="muted">{result.raic_caption}</p>}
          <div className="caption-tools"><button type="button" className="subtle-button" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? (vi ? 'Đã sao chép' : 'Copied') : (vi ? 'Sao chép' : 'Copy')}</button>
            <button type="button" className="subtle-button" onClick={() => downloadAnalysisJson(result)}><FileJson size={14} />{vi ? 'Tải JSON' : 'Download JSON'}</button>
            <span className="sr-only" role="status">{copied ? (vi ? 'Đã sao chép chú thích' : 'Caption copied') : ''}</span>
          </div>
        </section>
        <section className="knowledge-section" aria-labelledby="knowledge-heading">
          <div className="section-heading"><h2 id="knowledge-heading">{vi ? 'Caption tri thức' : 'Retrieved captions'}</h2><span className="muted text-caption">{candidates.length} {vi ? 'câu' : 'captions'}</span></div>
          <ol className="knowledge-list">{candidates.map((candidate, index) => <li key={candidate.id}>
            <span className="knowledge-rank">{index + 1}</span><div><p>{candidate.caption}</p>
              <div className="similarity-row"><span className="similarity-track" aria-hidden="true"><span style={{ width: Number.isFinite(candidate.faiss_similarity) ? Math.max(0, Math.min(100, (candidate.faiss_similarity + 1) * 50)) + '%' : '0%' }} /></span>
                <span className="similarity-label">CLIP {Number.isFinite(candidate.faiss_similarity) ? candidate.faiss_similarity.toFixed(3) : '—'}</span></div></div>
          </li>)}</ol>
          {!candidates.length && <p className="muted">{vi ? 'API chưa trả về caption tri thức.' : 'No retrieved captions returned by the API.'}</p>}
          <p className="section-note">{vi ? 'Điểm CLIP là độ tương đồng cosine (−1 đến 1), không phải xác suất.' : 'CLIP scores are cosine similarities (−1 to 1), not probabilities.'}</p>
        </section>
        <details className="details-section"><summary>{vi ? 'Chi tiết' : 'Details'}</summary>
          <dl className="technical-data">
            <div><dt>{vi ? 'Thời gian chạy' : 'Runtime'}</dt><dd>{result.level_info.inference_latency_ms} ms</dd></div>
            <div><dt>Beam size</dt><dd>{result.pipeline?.beam_size ?? '—'}</dd></div>
            <div><dt>{vi ? 'Giới hạn token' : 'Token limit'}</dt><dd>{result.pipeline?.max_len ?? '—'}</dd></div>
            <div><dt>{vi ? 'Cổng tri thức g' : 'Knowledge gate g'}</dt><dd>{gate !== undefined ? gate.toFixed(4) : '—'}</dd></div>
            <div><dt>{vi ? 'Thiết bị' : 'Device'}</dt><dd>{result.metadata.device}</dd></div>
            <div><dt>{vi ? 'Truy hồi → sử dụng' : 'Retrieved → used'}</dt><dd>{result.level_info.faiss_candidates_retrieved} → {result.level_info.top_k_used}</dd></div>
            <div><dt>{vi ? 'Mô hình' : 'Model'}</dt><dd>{result.level_info.model_name}</dd></div>
          </dl>
          <div className="detail-subsection"><h3>{native5 ? (vi ? 'Chú thích khi tắt tri thức (g = 0)' : 'Caption with knowledge disabled (g = 0)') : (vi ? 'Chú thích ban đầu' : 'Initial caption')}</h3>
            <p>{result.baseline_caption || '—'}</p><button type="button" className="text-link" onClick={() => onNavigateTab('comparison')}>{vi ? 'Xem so sánh' : 'Compare captions'}</button></div>
          <div className="detail-subsection"><h3>{vi ? 'Nhãn thực thể' : 'Entity labels'}</h3><p>{result.pipeline?.detected_labels?.join(', ') || result.detected_objects.map(object => object.label).join(', ') || '—'}</p></div>
          <div className="detail-subsection"><h3>{vi ? 'Các từ trong chú thích' : 'Caption words'}</h3>
            <p className="section-note">{vi ? 'Cổng g có phạm vi toàn ảnh. Chỉ hiển thị attention theo từ nếu API có cung cấp.' : 'Gate g is image-level. Word attention is shown only when supplied by the API.'}</p>
            <div className="result-token-list">{result.tokens.map(token => <button type="button" key={token.index} aria-pressed={selectedToken?.index === token.index} onClick={() => onSelectToken(token)}>{token.text}</button>)}</div>
            {result.has_explainability && <ExplainabilityPanel token={selectedToken} hasExplainability={result.has_explainability} retrievedCandidates={result.retrieved_candidates} />}
          </div>
          <p className="section-note">{evaluated ? 'CIDEr: ' + result.evaluation.metrics.cider.raic.toFixed(3) : vi ? 'Ảnh này chưa có caption tham chiếu để tính BLEU/CIDEr.' : 'This image has no reference captions for BLEU/CIDEr evaluation.'}</p>
          <button type="button" className="subtle-button" disabled={!evaluated} onClick={() => downloadMetricsCsv(result)}><FileSpreadsheet size={14} />{vi ? 'Tải chỉ số CSV' : 'Download metrics CSV'}</button>
          {result.pipeline?.warnings?.map(warning => <p key={warning} className="section-note">{warning}</p>)}
        </details>
      </div>
    </div>
  </div>;
}

