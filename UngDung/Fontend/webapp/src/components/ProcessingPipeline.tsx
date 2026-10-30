import { Loader2, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PIPELINE_STEPS } from '../services/pipelineConstants';
interface ProcessingPipelineProps { currentStepIndex: number; isSimulated?: boolean; onCancel?: () => void; error?: string | null; }
export function ProcessingPipeline({ currentStepIndex, isSimulated = true, onCancel, error }: ProcessingPipelineProps) {
  const { i18n } = useTranslation();
  const vi = i18n.language.startsWith('vi');
  return <section className="processing-page" aria-live="polite"><header className="page-heading"><h1>{vi ? 'Đang tạo chú thích' : 'Generating caption'}</h1><p>{vi ? 'Mô hình đang xử lý ảnh và tìm caption liên quan.' : 'Processing the image and retrieving related captions.'}</p></header>
    {!error && <Loader2 size={24} className="animate-spin muted" aria-hidden="true" />}
    {error && <p role="alert" className="notice">{error}</p>}
    {isSimulated ? <><p className="section-note">{vi ? 'Tiến trình mô phỏng' : 'Simulated progress'}</p><ol className="processing-steps">{PIPELINE_STEPS.map((step, index) => <li key={step.id} aria-current={currentStepIndex === index ? 'step' : undefined}>
      {currentStepIndex > index ? <Check size={16} /> : <span className="step-number">{index + 1}</span>}<span>{vi ? step.titleVi : step.title}</span></li>)}</ol></>
      : <p className="section-note">{vi ? 'Thời gian xử lý phụ thuộc vào ảnh và thiết bị.' : 'Processing time depends on the image and device.'}</p>}
    {onCancel && <button type="button" className="studio-secondary-button" onClick={onCancel}>{vi ? 'Hủy' : 'Cancel'}</button>}
  </section>;
}

