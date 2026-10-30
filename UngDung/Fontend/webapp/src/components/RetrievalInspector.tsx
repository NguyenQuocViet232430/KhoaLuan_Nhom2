import { useState } from 'react';
import { Database } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { RetrievedCandidate } from '../types';

interface RetrievalInspectorProps {
  retrievedCandidates: RetrievedCandidate[];
  topKUsed: number;
  searchedCount?: number;
  rerankingMethod?: string;
  isMock?: boolean;
}
export function RetrievalInspector({ retrievedCandidates, topKUsed, searchedCount, rerankingMethod, isMock = false }: RetrievalInspectorProps) {
  const { i18n } = useTranslation();
  const vi = (i18n.resolvedLanguage || i18n.language).startsWith('vi');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(retrievedCandidates[0]?.id);
  const selected = retrievedCandidates.find(candidate => candidate.id === selectedId) || retrievedCandidates[0];
  const visible = retrievedCandidates.filter(candidate => candidate.caption.toLowerCase().includes(query.toLowerCase()));
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
      <div className="flex items-start gap-3"><Database className="mt-1 h-5 w-5 shrink-0 text-blue-500" /><div><h3 className="font-bold">{vi ? 'Truy hồi caption và tái xếp hạng' : 'Caption retrieval and reranking'}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{isMock ? (vi ? 'Dữ liệu mô phỏng' : 'Simulated data') : 'MS COCO 2014 train/restval · 566.747 captions'}</p></div></div>
      <div className="flex flex-wrap gap-2 text-xs">
        {searchedCount != null && <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2">{vi ? 'Ứng viên đã truy hồi' : 'Candidates retrieved'}: {searchedCount}</span>}
        <span className="rounded-lg bg-blue-50 dark:bg-blue-950/40 px-3 py-2 text-blue-600 dark:text-blue-300">K = {topKUsed}</span>
        {rerankingMethod && <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2">{rerankingMethod}</span>}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{vi ? 'Bảng hiển thị các caption được API trả về. Relevance là điểm tái xếp hạng đã chuẩn hóa; CLIP là độ tương đồng ảnh–caption.' : 'This table shows the captions returned by the API. Relevance is normalized reranking score; CLIP is image–caption similarity.'}</p>
      <input aria-label={vi ? 'Tìm trong caption đã chọn' : 'Search returned captions'} value={query} onChange={event => setQuery(event.target.value)} placeholder={vi ? 'Tìm trong caption đã chọn…' : 'Search returned captions…'} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm" />
      <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-slate-500 dark:text-slate-400"><tr><th className="p-2">{vi ? 'Hạng cuối' : 'Final rank'}</th><th className="p-2">Caption</th><th className="p-2">FAISS rank</th><th className="p-2">CLIP</th><th className="p-2">Relevance</th></tr></thead><tbody>{visible.map(candidate => <tr key={candidate.id} className={`border-t border-slate-100 dark:border-slate-800 ${selected?.id === candidate.id ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}><td className="p-2">#{candidate.final_rank ?? candidate.rank}</td><td className="min-w-48 p-2"><button onClick={() => setSelectedId(candidate.id)} className="text-left leading-relaxed hover:text-blue-500">{candidate.caption}</button></td><td className="p-2">#{candidate.rank}</td><td className="p-2 tabular-nums">{candidate.faiss_similarity.toFixed(4)}</td><td className="p-2 tabular-nums">{candidate.rerank_score?.toFixed(4) ?? '—'}</td></tr>)}</tbody></table></div>
      {visible.length === 0 && <p className="text-sm text-slate-500">{vi ? 'Không có caption phù hợp.' : 'No matching captions.'}</p>}
      {selected && <div className="rounded-lg border border-blue-200 dark:border-blue-900 p-4 text-sm"><p className="font-medium">{selected.caption}</p><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{selected.id} · {selected.source}</p>{selected.gate_score != null && <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">{vi ? 'Cổng tri thức toàn ảnh' : 'Image-level knowledge gate'}: g = {selected.gate_score.toFixed(4)}</p>}</div>}
    </section>
  );
}
