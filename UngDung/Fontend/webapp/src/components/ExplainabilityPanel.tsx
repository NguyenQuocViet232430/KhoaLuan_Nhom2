import { useTranslation } from 'react-i18next';
import type { CaptionToken, RetrievedCandidate } from '../types';
interface ExplainabilityPanelProps { token: CaptionToken | null; hasExplainability: boolean; retrievedCandidates: RetrievedCandidate[]; }
export function ExplainabilityPanel({ token, hasExplainability, retrievedCandidates }: ExplainabilityPanelProps) {
  const { i18n } = useTranslation(); const vi = i18n.language.startsWith('vi');
  const imageGate = retrievedCandidates[0]?.gate_score;
  if (!hasExplainability || !token) return <p className="section-note">{imageGate != null ? 'g = ' + imageGate.toFixed(4) : vi ? 'Chưa có dữ liệu attention theo từ.' : 'No per-word attention data available.'}</p>;
  return <dl className="technical-data">
    <div><dt>{vi ? 'Từ đã chọn' : 'Selected word'}</dt><dd>{token.text}</dd></div>
    <div><dt>{vi ? 'Cổng theo từ' : 'Word gate'}</dt><dd>{token.gate?.toFixed(3) ?? '—'}</dd></div>
    <div><dt>Visual attention</dt><dd>{token.visual_attention?.toFixed(3) ?? '—'}</dd></div>
    <div><dt>Knowledge attention</dt><dd>{token.knowledge_attention?.toFixed(3) ?? '—'}</dd></div>
    <div><dt>Token confidence</dt><dd>{token.token_confidence?.toFixed(3) ?? '—'}</dd></div>
    <div><dt>{vi ? 'Thực thể liên quan' : 'Related entities'}</dt><dd>{token.related_entities?.join(', ') || '—'}</dd></div>
  </dl>;
}

