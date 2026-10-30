import type { AnalysisResult } from '../types';

export const copyCaptionToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
    return false;
  }
};

export const downloadAnalysisJson = (result: AnalysisResult): void => {
  const cleanExport = {
    ...result,
    _export_notice: result.metadata.is_mock ? "RAIC simulator data" : "Real API output. Null metrics mean not evaluated."
  };
  const jsonStr = JSON.stringify(cleanExport, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RAIC_Analysis_${result.id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadMetricsCsv = (result: AnalysisResult): void => {
  if (result.evaluation.status === 'not_evaluated') return;
  const headers = ['Metric', 'Level1_Baseline', 'Level2_RAG', 'Level3_Rerank', 'Level4_Proposed', 'Delta_L4_vs_L1', 'Higher_Is_Better', 'Description'];
  const rows: string[][] = [];

  const m = result.evaluation.metrics;
  const metricsList = [
    { key: 'BLEU-1', item: m.bleu1 },
    { key: 'BLEU-4', item: m.bleu4 },
    { key: 'METEOR', item: m.meteor },
    { key: 'ROUGE-L', item: m.rougeL },
    { key: 'CIDEr (Primary)', item: m.cider },
    ...(m.spice ? [{ key: 'SPICE', item: m.spice }] : []),
    ...(m.clipScore ? [{ key: 'CLIPScore', item: m.clipScore }] : [])
  ];

  for (const { key, item } of metricsList) {
    const l1 = item.baseline;
    const l2 = item.level2_rag !== undefined ? item.level2_rag.toFixed(3) : '-';
    const l3 = item.level3_rerank !== undefined ? item.level3_rerank.toFixed(3) : '-';
    const l4 = item.raic;
    const diff = l4 - l1;
    const sign = diff > 0 ? `+${diff.toFixed(3)}` : diff.toFixed(3);
    const dir = item.higherIsBetter ? 'Yes' : 'No';
    rows.push([key, l1.toFixed(3), l2, l3, l4.toFixed(3), sign, dir, `"${item.description || ''}"`]);
  }

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RAIC_Level1_to_4_Metrics_${result.id}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
