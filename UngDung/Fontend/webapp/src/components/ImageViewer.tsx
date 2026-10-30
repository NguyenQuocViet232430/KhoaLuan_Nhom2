import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, X } from 'lucide-react';
import type { DetectedObject, CaptionToken } from '../types';
interface ImageViewerProps {
  imageUrl: string; imageDimensions?: { width: number; height: number };
  detectedObjects: DetectedObject[]; selectedToken: CaptionToken | null;
  highlightedObjectId: string | null; onObjectClick?: (objectId: string) => void;
}
export function ImageViewer({ imageUrl, imageDimensions, detectedObjects, selectedToken, highlightedObjectId, onObjectClick }: ImageViewerProps) {
  const { i18n } = useTranslation(); const vi = i18n.language.startsWith('vi');
  const [viewMode, setViewMode] = useState<'original' | 'attention' | 'bboxes'>('original');
  const [zoom, setZoom] = useState(1);
  const [full, setFull] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fullButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (full) dialogRef.current?.showModal(); else dialogRef.current?.close();
    if (!full) return;
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [full]);
  const focal = selectedToken?.attention_data?.focalPoints?.[0];
  return <figure className="image-viewer">
    {(selectedToken?.attention_data || detectedObjects.some(object => object.bbox)) && <div className="segmented-control">
      <button type="button" aria-pressed={viewMode === 'original'} onClick={() => setViewMode('original')}>{vi ? 'Ảnh gốc' : 'Original'}</button>
      {selectedToken?.attention_data && <button type="button" aria-pressed={viewMode === 'attention'} onClick={() => setViewMode('attention')}>{vi ? 'Vị trí chú ý' : 'Attention position'}</button>}
      {detectedObjects.some(object => object.bbox) && <button type="button" aria-pressed={viewMode === 'bboxes'} onClick={() => setViewMode('bboxes')}>{vi ? 'Thực thể' : 'Entities'}</button>}
    </div>}
    <div className="viewer-toolbar"><span>{Math.round(zoom * 100)}%</span>
      <button type="button" className="studio-icon-button" aria-label={vi ? 'Thu nhỏ' : 'Zoom out'} onClick={() => setZoom(previous => Math.max(previous - .25, .75))}><ZoomOut size={16} /></button>
      <button type="button" className="studio-icon-button" aria-label={vi ? 'Phóng to' : 'Zoom in'} onClick={() => setZoom(previous => Math.min(previous + .25, 2.5))}><ZoomIn size={16} /></button>
      <button type="button" className="studio-icon-button" aria-label={vi ? 'Đặt lại kích thước' : 'Reset zoom'} onClick={() => setZoom(1)}><RotateCcw size={16} /></button>
      <button ref={fullButtonRef} type="button" className="studio-icon-button" aria-label={vi ? 'Xem toàn màn hình' : 'Full screen'} onClick={() => setFull(true)}><Maximize2 size={16} /></button>
    </div>
    <div className="viewer-stage"><div className="viewer-image" style={{ transform: 'scale(' + zoom + ')' }}>
      <img src={imageUrl} alt={vi ? 'Ảnh được tạo chú thích' : 'Captioned image'} />
      {viewMode === 'attention' && focal && <span className="attention-marker" style={{ left: focal.x * 100 + '%', top: focal.y * 100 + '%' }} />}
      {viewMode === 'bboxes' && detectedObjects.map(object => object.bbox && <button type="button" key={object.id} className="viewer-box" aria-label={object.label}
        aria-pressed={highlightedObjectId === object.id} onClick={() => onObjectClick?.(object.id)}
        style={{ left: object.bbox.x * 100 + '%', top: object.bbox.y * 100 + '%', width: object.bbox.width * 100 + '%', height: object.bbox.height * 100 + '%' }}>
        <span>{object.label} {(object.confidence * 100).toFixed(0)}%</span></button>)}
    </div></div>
    <figcaption className="viewer-caption">{viewMode === 'attention' ? (vi ? 'Vị trí chú ý minh họa theo dữ liệu của từ đã chọn.' : 'Illustrative attention position from the selected word data.') : imageDimensions ? imageDimensions.width + ' × ' + imageDimensions.height + ' px' : (vi ? 'Ảnh gốc' : 'Original image')}</figcaption>
    <dialog ref={dialogRef} className="image-dialog" aria-label={vi ? 'Xem ảnh lớn' : 'Expanded image'} onCancel={() => setFull(false)} onClose={() => { setFull(false); fullButtonRef.current?.focus(); }}>
      <button type="button" className="subtle-button" onClick={() => setFull(false)}><X size={16} />{vi ? 'Đóng' : 'Close'}</button><img src={imageUrl} alt={vi ? 'Ảnh kích thước lớn' : 'Expanded image'} />
    </dialog>
  </figure>;
}

