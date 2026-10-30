import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AnalysisHistoryItem } from '../types';
import { loadHistory, deleteHistoryItem, clearAllHistory } from '../services/historyService';
import { EmptyPage } from './EmptyPage';

export function AnalysisHistoryView({ onCreate }: { onCreate: () => void }) {
  const { t, i18n } = useTranslation();
  const vi = i18n.language.startsWith('vi');
  const [historyItems, setHistoryItems] = useState<AnalysisHistoryItem[]>(() => loadHistory());
  const [searchTerm, setSearchTerm] = useState('');
  const handleClearAll = () => { if (window.confirm(t('history.confirmClear'))) { clearAllHistory(); setHistoryItems([]); } };
  const filtered = historyItems.filter(item => [item.image_name, item.raic_caption, item.baseline_caption].some(text => text?.toLowerCase().includes(searchTerm.toLowerCase())));
  if (!historyItems.length) return <EmptyPage title={vi ? 'Lịch sử' : 'History'}
    description={vi ? 'Các chú thích đã tạo sẽ được lưu trong trình duyệt này để bạn xem lại.' : 'Generated captions are saved in this browser for later review.'} onCreate={onCreate} />;
  return <section>
    <header className="page-heading page-heading-with-action"><div><h1>{vi ? 'Lịch sử' : 'History'}</h1><p>{vi ? 'Xem lại chú thích đã tạo trên trình duyệt này.' : 'Review captions generated in this browser.'}</p></div>
      <button type="button" className="studio-primary-button" onClick={onCreate}>{vi ? 'Tạo chú thích' : 'Generate caption'}</button></header>
    <div className="history-toolbar"><label className="search-field"><span className="sr-only">{vi ? 'Tìm trong lịch sử' : 'Search history'}</span><input type="search" placeholder={vi ? 'Tìm tên ảnh hoặc chú thích…' : 'Search image names or captions…'} value={searchTerm} onChange={event => setSearchTerm(event.target.value)} /></label>
      <button type="button" className="subtle-button" onClick={handleClearAll}><Trash2 size={14} />{vi ? 'Xóa lịch sử' : 'Clear history'}</button></div>
    <div className="history-list">{filtered.map(item => <article key={item.id} className="history-row">
      <div className="history-row-heading"><h2>{item.image_name}</h2><time dateTime={item.timestamp}>{new Date(item.timestamp).toLocaleString(vi ? 'vi-VN' : 'en-US')}</time>
        <button type="button" className="studio-icon-button" aria-label={(vi ? 'Xóa kết quả ' : 'Delete result ') + item.image_name} onClick={() => setHistoryItems(deleteHistoryItem(item.id))}><Trash2 size={15} /></button></div>
      <p><span className="muted">{vi ? 'Ban đầu: ' : 'Initial: '}</span>{item.baseline_caption}</p><p><span className="muted">{vi ? 'Kết quả: ' : 'Result: '}</span>{item.raic_caption}</p>
      <p className="section-note">CIDEr: {item.cider_score?.toFixed(3) ?? '—'} · {item.latency_ms}</p>
    </article>)}</div>
    {!filtered.length && <p className="muted">{vi ? 'Không có kết quả phù hợp. Thử một từ khóa khác.' : 'No matching results. Try a different search.'}</p>}
  </section>;
}

