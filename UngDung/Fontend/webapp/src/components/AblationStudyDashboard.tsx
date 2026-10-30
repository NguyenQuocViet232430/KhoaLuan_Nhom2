import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AblationLevelConfig } from '../types';
import { EmptyPage } from './EmptyPage';

type MetricKey = 'cider' | 'bleu4' | 'bleu1' | 'meteor' | 'rougeL' | 'latency';
const metrics: { key: MetricKey; label: string; higherIsBetter: boolean }[] = [
  { key: 'cider', label: 'CIDEr', higherIsBetter: true }, { key: 'bleu4', label: 'BLEU-4', higherIsBetter: true },
  { key: 'bleu1', label: 'BLEU-1', higherIsBetter: true }, { key: 'meteor', label: 'METEOR', higherIsBetter: true },
  { key: 'rougeL', label: 'ROUGE-L', higherIsBetter: true }, { key: 'latency', label: 'Thời gian (ms)', higherIsBetter: false },
];
export function AblationStudyDashboard({ ablationConfigs, onCreate }: { ablationConfigs: AblationLevelConfig[]; onCreate: () => void }) {
  const { i18n } = useTranslation();
  const vi = i18n.language.startsWith('vi');
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('cider');
  const [selectedConfigId, setSelectedConfigId] = useState<string | undefined>(ablationConfigs[3]?.id || ablationConfigs[0]?.id);
  const option = metrics.find(metric => metric.key === selectedMetric)!;
  const baseline = ablationConfigs.find(config => config.level === 'Level 1') || ablationConfigs[0];
  const best = [...ablationConfigs].sort((a, b) => option.higherIsBetter ? b[selectedMetric] - a[selectedMetric] : a[selectedMetric] - b[selectedMetric])[0];
  const selected = ablationConfigs.find(config => config.id === selectedConfigId) || ablationConfigs[0];
  if (!ablationConfigs.length) return <EmptyPage title={vi ? 'Thử nghiệm thành phần' : 'Ablation study'} description={vi ? 'Đối chiếu ảnh hưởng của từng thành phần khi có báo cáo ablation. Kết quả hiện tại chưa kèm dữ liệu này.' : 'Compare the contribution of individual components using an ablation report. No ablation data accompanies the current result.'} onCreate={onCreate} />;
  return <section><header className="page-heading"><h1>{vi ? 'Thử nghiệm thành phần' : 'Ablation study'}</h1><p>{vi ? 'So sánh cấu hình theo số liệu đi kèm kết quả hiện tại.' : 'Compare configurations using data from the current result.'}</p></header>
    <div className="filter-row"><label htmlFor="ablation-metric">{vi ? 'Chỉ số so sánh' : 'Comparison metric'}</label><select id="ablation-metric" value={selectedMetric} onChange={event => setSelectedMetric(event.target.value as MetricKey)}>
      {metrics.map(metric => <option key={metric.key} value={metric.key}>{metric.key === 'latency' && !vi ? 'Runtime (ms)' : metric.label}</option>)}</select></div>
    <div className="table-scroll"><table className="data-table"><thead><tr><th>{vi ? 'Cấu hình' : 'Configuration'}</th><th>{option.label}</th><th>{vi ? 'Chênh lệch với baseline' : 'Difference from baseline'}</th></tr></thead>
      <tbody>{ablationConfigs.map(config => <tr key={config.id} className={selected?.id === config.id ? 'selected-row' : ''}><th scope="row"><button className="table-selection" aria-pressed={selected?.id === config.id} onClick={() => setSelectedConfigId(config.id)}>{config.name}</button></th>
        <td>{config[selectedMetric].toFixed(3)}{config.id === best?.id && <span className="muted text-caption"> · {vi ? 'Tốt nhất' : 'Best'}</span>}</td><td>{(config[selectedMetric] - baseline[selectedMetric]).toFixed(3)}</td></tr>)}</tbody></table></div>
    <section className="detail-subsection"><h2>{selected?.name}</h2><p className="muted">{selected?.description}</p></section>
  </section>;
}

