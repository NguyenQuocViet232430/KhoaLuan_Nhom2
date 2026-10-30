import { useRef, useState } from 'react';
import { Image, X, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SAMPLE_IMAGES } from '../services/mock_api';

interface ImageUploaderProps {
  onFileSelected: (file: File) => void; onSampleSelected: (sampleId: string) => void;
  selectedFile: File | null; previewUrl: string | null; onClear: () => void;
  onGenerate: () => void; isProcessing: boolean; errorMessage: string | null; showSamples?: boolean;
}
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export function ImageUploader({ onFileSelected, onSampleSelected, selectedFile, previewUrl, onClear, onGenerate, isProcessing, errorMessage, showSamples = false }: ImageUploaderProps) {
  const { t, i18n } = useTranslation();
  const vi = i18n.language.startsWith('vi');
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const chooseFile = () => fileInputRef.current?.click();
  const validateFile = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) { setValidationError(t('uploader.errorInvalidFormat')); return; }
    if (file.size > 10 * 1024 * 1024) { setValidationError(t('uploader.errorSizeExceeded')); return; }
    setValidationError(null); onFileSelected(file);
  };
  return <section className="upload-page">
    <header className="page-heading"><h1>{vi ? 'Tạo chú thích' : 'Generate a caption'}</h1>
      <p>{vi ? 'Chọn một ảnh để mô hình tạo câu mô tả bằng tiếng Anh.' : 'Choose an image to generate an English description.'}</p>
    </header>
    {(validationError || errorMessage) && <p role="alert" className="notice"><AlertCircle size={17} aria-hidden="true" />{validationError || errorMessage}</p>}
    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label={vi ? 'Chọn tệp ảnh' : 'Choose an image file'}
      onChange={event => { const file = event.target.files?.[0]; if (file) validateFile(file); event.target.value = ''; }} />
    <div className={'upload-area' + (isDragging ? ' is-dragging' : '')}
      onDragEnter={event => { event.preventDefault(); dragDepth.current += 1; setIsDragging(true); }}
      onDragOver={event => event.preventDefault()}
      onDragLeave={event => { event.preventDefault(); dragDepth.current -= 1; if (dragDepth.current <= 0) setIsDragging(false); }}
      onDrop={event => { event.preventDefault(); dragDepth.current = 0; setIsDragging(false); const file = event.dataTransfer.files[0]; if (file) validateFile(file); }}>
      <button type="button" className={'upload-picker' + (previewUrl ? ' has-preview' : '')} onClick={chooseFile} disabled={isProcessing}
        aria-label={vi ? (previewUrl ? 'Đổi ảnh' : 'Chọn ảnh từ máy tính') : (previewUrl ? 'Change image' : 'Choose an image')}>
        {previewUrl ? <img src={previewUrl} alt={vi ? 'Ảnh đã chọn' : 'Selected image'} /> : <>
          <Image size={32} strokeWidth={1.3} aria-hidden="true" />
          <span>{vi ? 'Kéo ảnh vào đây hoặc bấm để chọn' : 'Drop an image here or click to browse'}</span>
          <span className="muted text-caption">JPG, PNG, WebP · {vi ? 'Tối đa 10 MiB' : 'Up to 10 MiB'}</span>
        </>}
      </button>
    </div>
    <div className="upload-file-row">
      {selectedFile ? <><span title={selectedFile.name}>{selectedFile.name} <span className="muted">· {(selectedFile.size / 1024).toFixed(0)} KiB</span></span>
        <button type="button" className="subtle-button" onClick={() => { setValidationError(null); onClear(); }} disabled={isProcessing}><X size={14} />{vi ? 'Bỏ ảnh' : 'Remove'}</button></>
        : <span className="muted">{vi ? 'Chưa chọn ảnh' : 'No image selected'}</span>}
    </div>
    <button type="button" onClick={onGenerate} disabled={!selectedFile || isProcessing} className="studio-primary-button upload-submit">{vi ? 'Tạo chú thích' : 'Generate caption'}</button>
    {showSamples && <section className="sample-list"><h2>{vi ? 'Ảnh mẫu · dữ liệu mô phỏng' : 'Sample images · simulated data'}</h2>
      <div>{SAMPLE_IMAGES.map((sample, index) => <button type="button" key={sample.id} onClick={() => onSampleSelected(sample.id)}><img src={sample.url} alt="" /><span>{t('uploader.sample' + (index + 1) + 'Title')}</span></button>)}</div>
    </section>}
  </section>;
}

