import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AnalysisResult } from '../types';
import { ModelArchitectureExplorer } from './ModelArchitectureExplorer';
import { BenchmarkTable } from './BenchmarkTable';

interface PresentationModeProps { onClose: () => void; result: AnalysisResult | null }
export function PresentationMode({ onClose, result }: PresentationModeProps) {
  const { i18n } = useTranslation(); const vi = i18n.language.startsWith('vi');
  const [slide, setSlide] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const total = 4;
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.showModal();
    const previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight' || event.key === ' ') { event.preventDefault(); setSlide(value => Math.min(total - 1, value + 1)); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); setSlide(value => Math.max(0, value - 1)); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const gate = result?.retrieved_candidates[0]?.gate_score;
  return <dialog ref={dialogRef} className="presentation-dialog" aria-label={vi ? 'Trình chiếu nghiên cứu' : 'Research presentation'} onCancel={onClose}>
    <div className="presentation-top"><span>RAIC · {vi ? 'Trình chiếu' : 'Presentation'}</span><button type="button" className="studio-icon-button" onClick={onClose} aria-label={vi ? 'Đóng trình chiếu' : 'Close presentation'}><X size={20} /></button></div>
    <div className="presentation-content">
      {slide === 0 && <section className="presentation-intro"><header className="page-heading"><h1>{vi ? 'Sinh chú thích ảnh dựa trên truy hồi tri thức' : 'Retrieval-augmented image captioning'}</h1>
        <p>{vi ? 'Kết hợp đặc trưng ảnh với những caption liên quan trong kho tri thức để tạo câu mô tả.' : 'Combine image features with relevant knowledge-base captions to generate a description.'}</p></header>
        <dl className="technical-data"><div><dt>{vi ? 'Mô hình' : 'Model'}</dt><dd>Level 5A · Seed 46</dd></div><div><dt>{vi ? 'Kho tri thức' : 'Knowledge base'}</dt><dd>566.747 COCO captions</dd></div><div><dt>{vi ? 'Bộ nhớ tri thức' : 'Knowledge memory'}</dt><dd>5 tokens</dd></div></dl>
      </section>}
      {slide === 1 && <ModelArchitectureExplorer />}
      {slide === 2 && <section><header className="page-heading"><h1>{vi ? 'Kết quả minh họa' : 'Example result'}</h1></header>
        {result ? <><p className="section-note">{result.metadata.is_mock ? (vi ? 'Dữ liệu mô phỏng' : 'Simulated data') : result.level_info.model_name}</p>
          <div className="comparison-layout"><figure><img src={result.image_url} alt={vi ? 'Ảnh minh họa' : 'Example image'} /></figure><div>
            <section className="comparison-caption"><h2>{vi ? 'Tắt tri thức · g = 0' : 'Knowledge off · g = 0'}</h2><p>{result.baseline_caption || '—'}</p></section>
            <section className="comparison-caption"><h2>{vi ? 'Bật tri thức' : 'Knowledge on'}</h2><p>{result.raic_caption}</p></section></div></div>
          <p className="section-note">g = {gate?.toFixed(4) ?? '—'} · {result.level_info.inference_latency_ms} ms</p>
          <ol className="presentation-knowledge">{result.retrieved_candidates.map(candidate => <li key={candidate.id}>{candidate.caption} <span className="muted">CLIP {candidate.faiss_similarity.toFixed(3)}</span></li>)}</ol>
        </> : <p className="muted">{vi ? 'Tạo chú thích cho một ảnh trước khi trình chiếu kết quả.' : 'Generate a caption before presenting a result.'}</p>}
      </section>}
      {slide === 3 && <section><header className="page-heading"><h1>{vi ? 'Đánh giá mô hình' : 'Model evaluation'}</h1></header><BenchmarkTable /></section>}
    </div>
    <div className="presentation-bottom"><span>{slide + 1} / {total}</span><div>
      <button type="button" disabled={slide === 0} className="studio-icon-button" onClick={() => setSlide(value => value - 1)} aria-label={vi ? 'Trang trước' : 'Previous slide'}><ChevronLeft size={20} /></button>
      <button type="button" disabled={slide === total - 1} className="studio-icon-button" onClick={() => setSlide(value => value + 1)} aria-label={vi ? 'Trang sau' : 'Next slide'}><ChevronRight size={20} /></button></div></div>
  </dialog>;
}

