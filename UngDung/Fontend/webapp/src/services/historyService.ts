import type { AnalysisHistoryItem, AnalysisResult } from '../types';

const STORAGE_KEY = 'raic_analysis_history_v2';
const MAX_HISTORY_ITEMS = 25;

export const loadHistory = (): AnalysisHistoryItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read history from localStorage', e);
    return [];
  }
};

export const saveHistoryItem = (result: AnalysisResult): void => {
  try {
    const current = loadHistory();
    const newItem: AnalysisHistoryItem = {
      id: result.id,
      timestamp: result.timestamp,
      image_name: result.image_name,
      baseline_caption: result.baseline_caption,
      raic_caption: result.raic_caption,
      cider_score: Number.isFinite(result.evaluation?.metrics?.cider?.raic) ? result.evaluation.metrics.cider.raic : null,
      latency_ms: `${result.level_info?.inference_latency_ms ?? 0} ms`
    };

    const filtered = current.filter(item => item.id !== result.id);
    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save analysis to history', e);
  }
};

export const deleteHistoryItem = (id: string): AnalysisHistoryItem[] => {
  try {
    const current = loadHistory();
    const updated = current.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to delete history item', e);
    return [];
  }
};

export const clearAllHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear history', e);
  }
};
