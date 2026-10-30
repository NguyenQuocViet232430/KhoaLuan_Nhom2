import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyPage } from './components/EmptyPage';
import type { AnalysisResult, CaptionToken, ActiveTab, ThemeMode, ModelEvaluation } from './types';
import { apiService } from './services/apiClient';
import { saveHistoryItem } from './services/historyService';
import { AppHeader } from './components/AppHeader';
import { ImageUploader } from './components/ImageUploader';
import { ProcessingPipeline } from './components/ProcessingPipeline';
import { ResultDashboard } from './components/ResultDashboard';
import { BaselineComparisonView } from './components/BaselineComparisonView';
import { RetrievalInspector } from './components/RetrievalInspector';
import { ModelEvaluationPanel, Level5Evaluation } from './components/ModelEvaluation';
import { AblationStudyDashboard } from './components/AblationStudyDashboard';
import { AnalysisHistoryView } from './components/AnalysisHistoryView';
import { SettingsPanel } from './components/SettingsPanel';
import { ModelArchitectureExplorer } from './components/ModelArchitectureExplorer';
import { ErrorAnalysisView } from './components/ErrorAnalysisView';
import { PresentationMode } from './components/PresentationMode';
import { PIPELINE_STEPS } from './services/pipelineConstants';

type AppFlowState = 'IDLE' | 'PROCESSING' | 'RESULT';

export function App() {
  const { i18n } = useTranslation();
  const vi = i18n.language.startsWith('vi');
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('raic_theme') as ThemeMode) || 'light';
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('workspace');
  const [flowState, setFlowState] = useState<AppFlowState>('IDLE');
  const [isPresentationOpen, setIsPresentationOpen] = useState<boolean>(false);
  
  // Data State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedToken, setSelectedToken] = useState<CaptionToken | null>(null);
  
  // Processing animation & Backend health state
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiMode, setApiMode] = useState<'mock' | 'real'>(() => apiService.getMode());
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const activeRequest = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);

  // Apply dark theme class to document element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('raic_theme', theme);
  }, [theme]);

  // Health ping helper
  const checkBackendHealth = useCallback(async () => {
    const h = await apiService.checkHealth();
    setBackendOnline(h.status === 'online' && h.model_loaded);
    return h;
  }, []);

  useEffect(() => {
    let isMounted = true;
    const runCheck = async () => {
      const h = await apiService.checkHealth();
      if (isMounted) {
        setBackendOnline(h.status === 'online' && h.model_loaded);
      }
    };
    runCheck();
    const interval = setInterval(runCheck, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [apiMode]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Image upload handling
  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    if (previewUrl && !previewUrl.startsWith('http')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
    setErrorMessage(null);
  };

  const handleSampleSelected = (sampleId: string) => {
    setSelectedFile(null);
    setErrorMessage(null);
    executeAnalysisWithSample(sampleId);
  };

  const handleClearImage = () => {
    if (previewUrl && !previewUrl.startsWith('http')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMessage(null);
  };

  const handleResetAll = () => {
    requestVersion.current += 1;
    activeRequest.current?.abort();
    activeRequest.current = null;
    handleClearImage();
    setResult(null);
    setSelectedToken(null);
    setFlowState('IDLE');
    setActiveTab('workspace');
    setErrorMessage(null);
  };

  // Pipeline execution
  const executePipeline = async (fetchResult: (signal: AbortSignal) => Promise<AnalysisResult>) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const version = ++requestVersion.current;
    setFlowState('PROCESSING');
    window.scrollTo({ top: 0 });
    setCurrentStepIndex(0);
    setErrorMessage(null);

    // Stage animation is only used for the explicit simulator.
    const progressTimer = apiMode === 'mock' ? setInterval(() => {
      setCurrentStepIndex(prev => {
        if (prev < PIPELINE_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 450) : undefined;

    try {
      const data = await fetchResult(controller.signal);
      if (controller.signal.aborted || version !== requestVersion.current) return;
      clearInterval(progressTimer);
      setCurrentStepIndex(PIPELINE_STEPS.length);
      
      setResult(data);
      saveHistoryItem(data);
      setSelectedToken(data.tokens?.[0] || null);
      setFlowState('RESULT');
      window.scrollTo({ top: 0 });
    } catch (err: unknown) {
      if (controller.signal.aborted || version !== requestVersion.current) return;
      clearInterval(progressTimer);
      const msg = err instanceof Error ? err.message : 'Inference failed during pipeline execution.';
      setErrorMessage(msg);
      setFlowState('IDLE');
    } finally {
      clearInterval(progressTimer);
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  };

  const handleGenerate = () => {
    if (!selectedFile) return;
    executePipeline(signal => apiService.analyzeImage(selectedFile, signal));
  };

  const executeAnalysisWithSample = (sampleId: string) => {
    executePipeline(() => apiService.analyzeSample(sampleId));
  };

  // Callback when user imports custom evaluation JSON
  const handleImportEvaluation = (customEval: ModelEvaluation) => {
    if (result) {
      setResult({
        ...result,
        evaluation: customEval
      });
    }
  };

  return (
    <div className="app-shell">
      <AppHeader
        currentTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        theme={theme}
        onToggleTheme={toggleTheme}
        apiMode={apiMode}
        backendOnline={backendOnline}
        onOpenPresentation={() => setIsPresentationOpen(true)}
      />

      <div className="app-content">
      <main id="main-content" tabIndex={-1} className="app-main">
        {!result && activeTab === 'comparison' && <EmptyPage title={vi ? 'So sánh' : 'Compare'}
          description={vi ? 'Đặt cạnh nhau chú thích khi tắt và bật tri thức để xem mô hình thay đổi cách mô tả ảnh.' : 'Compare captions with knowledge disabled and enabled to inspect changes in the description.'}
          onCreate={() => setActiveTab('workspace')} />}
        {!result && activeTab === 'retrieval' && <EmptyPage title={vi ? 'Tri thức truy hồi' : 'Retrieved knowledge'}
          description={vi ? 'Xem các câu caption được tìm trong kho tri thức cho một ảnh.' : 'Inspect captions retrieved from the knowledge base for an image.'}
          onCreate={() => setActiveTab('workspace')} />}
        {/* Workspace Tab Content */}
        {activeTab === 'workspace' && (
          <div className="space-y-6 min-w-0">
            {flowState === 'IDLE' && (
              <ImageUploader
                onFileSelected={handleFileSelected}
                onSampleSelected={handleSampleSelected}
                selectedFile={selectedFile}
                previewUrl={previewUrl}
                onClear={handleClearImage}
                onGenerate={handleGenerate}
                isProcessing={false}
                errorMessage={errorMessage}
                showSamples={apiMode === 'mock'}
              />
            )}

            {flowState === 'PROCESSING' && (
              <ProcessingPipeline
                currentStepIndex={currentStepIndex}
                isSimulated={apiMode === 'mock'}
                onCancel={handleResetAll}
                error={errorMessage}
              />
            )}

            {flowState === 'RESULT' && result && (
              <ResultDashboard
                result={result}
                selectedToken={selectedToken}
                onSelectToken={setSelectedToken}
                onNavigateTab={setActiveTab}
                onNewImage={handleResetAll}
              />
            )}
          </div>
        )}

        {/* Trained Level 5A architecture */}
        {activeTab === 'architecture' && (
          <ModelArchitectureExplorer />
        )}

        {/* Baseline vs RAIC Comparison Dedicated Tab */}
        {activeTab === 'comparison' && result && (
          <BaselineComparisonView result={result} onCreate={handleResetAll} />
        )}

        {/* FAISS Candidate Retrieval Dedicated Tab */}
        {activeTab === 'retrieval' && result && (
          <RetrievalInspector
            retrievedCandidates={result.retrieved_candidates}
            topKUsed={result.level_info.top_k_used}
            searchedCount={result.level_info.faiss_candidates_retrieved}
            rerankingMethod={result.level_info.reranking_method}
            isMock={result.metadata.is_mock}
          />
        )}

        {/* Corpus Evaluation Tab */}
        {activeTab === 'evaluation' && (result?.metadata.is_mock ? (
          <ModelEvaluationPanel 
            evaluation={result.evaluation}
            onImportCustomEvaluation={handleImportEvaluation}
          />
        ) : <Level5Evaluation />)}

        {/* Ablation Study (Levels 1 to 4) Tab */}
        {activeTab === 'ablation' && (
          <AblationStudyDashboard ablationConfigs={result?.evaluation.ablation_study || []} onCreate={handleResetAll} />
        )}

        {/* Error Analysis & Case Studies Tab */}
        {activeTab === 'error_analysis' && (
          <ErrorAnalysisView />
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <AnalysisHistoryView onCreate={handleResetAll} />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <SettingsPanel
            apiMode={apiMode}
            onApiModeChange={(mode) => {
              apiService.setMode(mode);
              setApiMode(mode);
            }}
            onRefreshHealth={checkBackendHealth}
          />
        )}
      </main>
      </div>

      {/* Thesis Defense Presentation Deck Modal */}
      {isPresentationOpen && (
        <PresentationMode 
          onClose={() => setIsPresentationOpen(false)}
          result={result}
        />
      )}
    </div>
  );
}

export default App;


