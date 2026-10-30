import { useTranslation } from 'react-i18next';
import { LEVEL5_RESEARCH } from '../services/level5Research';

export function BenchmarkTable() {
  const { i18n } = useTranslation();
  const vi = i18n.language.startsWith('vi');
  return <section className="benchmark-section">
    <div className="section-heading"><h2>{vi ? 'Kết quả benchmark' : 'Benchmark results'}</h2>
      <a className="text-link" href={LEVEL5_RESEARCH.source} target="_blank" rel="noreferrer">{vi ? 'Xem nguồn trên Drive' : 'View source on Drive'}</a></div>
    <div className="table-scroll"><table className="data-table">
      <caption>MS COCO 2014 · Karpathy test · {vi ? 'Thang điểm ×100' : 'Scores ×100'}</caption>
      <thead><tr><th scope="col">{vi ? 'Chỉ số' : 'Metric'}</th><th scope="col">Seed 46</th><th scope="col">{vi ? 'Trung bình ± SD (5 seed)' : 'Mean ± SD (5 seeds)'}</th></tr></thead>
      <tbody>{LEVEL5_RESEARCH.metrics.map(metric => <tr key={metric.name}><th scope="row">{metric.name}</th><td>{metric.value.toFixed(2)}</td><td>{metric.mean.toFixed(2)} ± {metric.std.toFixed(2)}</td></tr>)}</tbody>
    </table></div>
    <p className="section-note">{vi ? 'Số liệu đã lưu từ test_summary.json, seed 42–46. Cấu hình giải mã Beam Search k=3, α=0.6, max_len=30 đồng bộ hoàn toàn với Benchmark.' : 'Recorded test_summary.json results for seeds 42–46. Decoding parameters (Beam Search k=3, α=0.6, max_len=30) are fully aligned with the Benchmark.'}</p>
  </section>;
}

