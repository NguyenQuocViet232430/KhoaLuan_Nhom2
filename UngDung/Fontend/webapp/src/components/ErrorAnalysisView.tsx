import React, { useState } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  FileText 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ERROR_ANALYSIS_CASES } from '../services/errorAnalysisData';

export const ErrorAnalysisView: React.FC = () => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeCaseId, setActiveCaseId] = useState<string>(ERROR_ANALYSIS_CASES[0].id);

  const filteredCases = ERROR_ANALYSIS_CASES.filter(c => {
    if (selectedCategory === 'all') return true;
    return c.category === selectedCategory;
  });

  const activeCase = ERROR_ANALYSIS_CASES.find(c => c.id === activeCaseId) || ERROR_ANALYSIS_CASES[0];

  return (
    <div className="space-y-6">
      <p className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-700 dark:text-amber-300">Các tình huống dưới đây là nội dung minh họa của dashboard cũ. Caption, điểm cải thiện và phân tích cổng trong các mẫu này chưa được đo bằng checkpoint Level 5A Seed 46.</p>
      {/* Overview Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm min-w-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                <FileText className="w-5 h-5" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                {t('caseStudies.title')}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              {t('caseStudies.subtitle')}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-x-auto scrollbar-none shrink-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {t('caseStudies.catAll')} ({ERROR_ANALYSIS_CASES.length})
            </button>
            <button
              onClick={() => setSelectedCategory('retrieval_success')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'retrieval_success'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {t('caseStudies.catSuccess')}
            </button>
            <button
              onClick={() => setSelectedCategory('distractor_filtering')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'distractor_filtering'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {t('caseStudies.catDistractor')}
            </button>
            <button
              onClick={() => setSelectedCategory('rerank_correction')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'rerank_correction'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {t('caseStudies.catRerank')}
            </button>
          </div>
        </div>
      </div>

      {/* Case Studies Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
        {/* Case Selector List (4 Cols) */}
        <div className="lg:col-span-4 space-y-3 min-w-0">
          {filteredCases.map((c) => {
            const isSelected = c.id === activeCase.id;
            return (
              <div
                key={c.id}
                onClick={() => setActiveCaseId(c.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 border-blue-500 shadow-md ring-1 ring-blue-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded ${
                    c.category === 'retrieval_success'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                      : c.category === 'distractor_filtering'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                      : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                  }`}>
                    {c.category.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {c.ciderImprovement.split(' ')[0]}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {c.title}
                </h4>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {c.baselineIssue}
                </p>
              </div>
            );
          })}
        </div>

        {/* Detailed Case Study Viewer (8 Cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 shadow-sm space-y-6 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Case Study Inspection</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{activeCase.title}</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                {activeCase.ciderImprovement}
              </span>
            </div>
          </div>

          {/* Image & Ground Truth */}
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="w-full md:w-56 h-40 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
              <img 
                src={activeCase.imageUrl} 
                alt={activeCase.title} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 space-y-2">
              <div className="text-[10px] font-mono uppercase text-slate-400">Ground Truth Human Annotation</div>
              <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 italic bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800">
                "{activeCase.imageCaptionGroundTruth}"
              </p>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Evaluating against 5 human reference captions from MS COCO 2014 val split.
              </div>
            </div>
          </div>

          {/* Model Output Comparison: Baseline vs RAIC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Baseline Box */}
            <div className="p-4 rounded-xl border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-400">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Baseline (Level 1)
                </span>
                <span className="text-[10px] font-mono uppercase bg-rose-100 dark:bg-rose-950 px-1.5 py-0.5 rounded">Failure</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                "{activeCase.baselineCaption}"
              </p>
              <div className="text-[11px] text-rose-600 dark:text-rose-400/90 pt-1 border-t border-rose-100 dark:border-rose-900/40">
                <strong>Deficiency:</strong> {activeCase.baselineIssue}
              </div>
            </div>

            {/* RAIC Box */}
            <div className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Proposed RAIC (Level 4)
                </span>
                <span className="text-[10px] font-mono uppercase bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">Enhanced</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100">
                "{activeCase.raicCaption}"
              </p>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400/90 pt-1 border-t border-emerald-100 dark:border-emerald-900/40">
                <strong>Grounding:</strong> Faithfully generates accurate fine-grained terms without hallucinations.
              </div>
            </div>
          </div>

          {/* Retrieved Evidence Pool */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" /> External Evidence Candidates (MS COCO 2014)
            </div>
            <div className="space-y-1.5">
              {activeCase.retrievedEvidence.map((ev, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
                  {ev}
                </div>
              ))}
            </div>
          </div>

          {/* Architectural Gating Explanation */}
          <div className="p-4 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-1.5">
            <div className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-500" /> Gating & Fusion Analysis
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {activeCase.gatingMechanismEffect}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
