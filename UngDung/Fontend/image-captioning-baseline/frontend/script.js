const API_BASE = ""; 

// =========================================
// I18N DICTIONARY
// =========================================
const i18n = {
    vi: {
        appName: "CapAI - Image Captioning Research",
        badgeResearch: "Research",
        navIntro: "Giới thiệu",
        navPipeline: "Pipeline",
        navDemo: "Live Demo",
        navEval: "Evaluation",
        navAblation: "Ablation",
        heroBadge: "IMAGE CAPTIONING RESEARCH",
        heroTitle: "Thực nghiệm và đánh giá<br>mô hình Image Captioning",
        heroSubtitle: "Nghiên cứu pipeline sinh mô tả ảnh dựa trên ViT-GPT2, đánh giá trên các bộ dữ liệu chuẩn và phân tích lỗi, đồng thời xây dựng nền tảng mở rộng cho Knowledge Augmentation.",
        btnLiveDemo: "Live Demo &rarr;",
        btnResearchPipeline: "Research Pipeline",
        demoImgLabel: "Example Input — UI Demonstration Only",
        aiAnalysisPreview: "AI Analysis Preview",
        demoWarningBadge: "UI Demo Only",
        statusImgReady: "Image ready",
        statusModelInf: "Model inference",
        statusCapGen: "Caption generated",
        uploadPrompt: "Upload an image to run real inference.",
        pipelineTitle: "RESEARCH PIPELINE ARCHITECTURE",
        pipelineDesc: "Kiến trúc hệ thống phục vụ thực nghiệm, đánh giá và mở rộng mô hình Image Captioning.",
        card1Title: "Image Preprocessing",
        card1Desc: "Chuẩn hóa và tiền xử lý hình ảnh trước khi đưa vào mô hình thị giác.",
        card2Title: "ViT-GPT2 Inference",
        card2Desc: "Sử dụng mô hình pretrained ViT-GPT2 để sinh caption ban đầu.",
        card3Title: "Initial Caption",
        card3Desc: "Nhận caption đầu tiên từ mô hình và trích xuất các thông tin liên quan.",
        card4Title: "Caption Analysis",
        card4Desc: "Phân tích caption và trích xuất keywords.",
        card5Title: "Evaluation & Diagnosis",
        card5Desc: "So sánh caption với ground-truth khi dataset được cấu hình và thực hiện phân tích lỗi.",
        card6Title: "Research Extensions",
        card6Desc: "Kiến trúc mở rộng cho Knowledge Retrieval, Ranking, Fusion, Training/Fine-tuning và Ablation Study.",
        demoTitle: "Phân tích hình ảnh",
        demoDesc: "Tải lên hình ảnh và tạo mô tả bằng mô hình ViT-GPT2.",
        checkingBackend: "Đang kiểm tra Backend...",
        btnRetry: "Thử lại",
        dzTitle: "Kéo & thả hình ảnh vào đây",
        dzSub: "hoặc <span>Click để chọn file</span>",
        dzHint: "JPG · JPEG · PNG · Tối đa 10MB",
        btnChangeImg: "Thay đổi ảnh",
        btnAnalyze: "Phân tích hình ảnh",
        lblAnalyzing: "ViT-GPT2 đang phân tích hình ảnh...",
        lblGenCap: "GENERATED CAPTION",
        btnCopy: "Copy Caption",
        lblCapKw: "Caption Keywords",
        lblProcTime: "Processing Time",
        lblResearchStatus: "RESEARCH STATUS",
        phase1: "Phase 1 — Baseline ViT-GPT2",
        phase15: "Phase 1.5 — Evaluation & Diagnosis",
        phase2: "Phase 2 — Batch Evaluation",
        phase3: "Phase 3 — MS COCO / Flickr30K Benchmark",
        phase4: "Phase 4 — Knowledge Retrieval",
        phase5: "Phase 5 — Ranking & Fusion",
        phase6: "Phase 6 — Training / Fine-tuning",
        phase7: "Phase 7 — Ablation Study",
        btnAnalyzeAnother: "Analyze Another Image",
        lblEvalDash: "RESEARCH EVALUATION",
        lblEvalDesc: "Chạy inference trên tập dữ liệu và đánh giá định lượng.",
        lblDataset: "Dataset",
        btnRunEval: "Run Evaluation",
        btnCancel: "Cancel",
        lblEvalResults: "Batch Evaluation Results",
        lblErrorAnalysis: "ERROR ANALYSIS",
        lblNoErrors: "Run a dataset evaluation to generate error analysis.",
        lblQualitative: "QUALITATIVE RESULTS",
        lblNoQualitative: "Run a dataset evaluation to see sample predictions.",
        lblDataset: "Dataset",
        lblDiagDash: "CAPTION DIAGNOSIS",
        lblAblation: "ABLATION STUDY",
        lblAblationDesc: "So sánh các cấu hình thực nghiệm.",
        errInvalidFile: "File không hợp lệ. Vui lòng chọn JPG, JPEG hoặc PNG.",
        errFileSize: "Kích thước file quá lớn. Tối đa 10MB.",
        errInferenceFailed: "Inference failed. Please try again.",
        errBackendOffline: "Không thể kết nối tới backend.",
        connectedText: "Backend connected",
        disconnectedText: "Backend disconnected"
    },
    en: {
        appName: "CapAI - Image Captioning Research",
        badgeResearch: "Research",
        navIntro: "Introduction",
        navPipeline: "Pipeline",
        navDemo: "Live Demo",
        navEval: "Evaluation",
        navAblation: "Ablation",
        heroBadge: "IMAGE CAPTIONING RESEARCH",
        heroTitle: "Image Captioning Model<br>Experiment & Evaluation",
        heroSubtitle: "Research pipeline for generating image descriptions based on ViT-GPT2, evaluating on standard datasets, performing error diagnosis, and building an extensible architecture for Knowledge Augmentation.",
        btnLiveDemo: "Live Demo &rarr;",
        btnResearchPipeline: "Research Pipeline",
        demoImgLabel: "Example Input — UI Demonstration Only",
        aiAnalysisPreview: "AI Analysis Preview",
        demoWarningBadge: "UI Demo Only",
        statusImgReady: "Image ready",
        statusModelInf: "Model inference",
        statusCapGen: "Caption generated",
        uploadPrompt: "Upload an image to run real inference.",
        pipelineTitle: "RESEARCH PIPELINE ARCHITECTURE",
        pipelineDesc: "System architecture for experimentation, evaluation, and extension of Image Captioning models.",
        card1Title: "Image Preprocessing",
        card1Desc: "Normalize and preprocess images before feeding them into the vision model.",
        card2Title: "ViT-GPT2 Inference",
        card2Desc: "Use a pretrained ViT-GPT2 model to generate the initial caption.",
        card3Title: "Initial Caption",
        card3Desc: "Receive the initial caption from the model and extract relevant information.",
        card4Title: "Caption Analysis",
        card4Desc: "Analyze captions and extract keywords.",
        card5Title: "Evaluation & Diagnosis",
        card5Desc: "Compare captions with ground-truth when a dataset is configured and perform error analysis.",
        card6Title: "Research Extensions",
        card6Desc: "Extensible architecture for Knowledge Retrieval, Ranking, Fusion, Training/Fine-tuning, and Ablation Study.",
        demoTitle: "Image Analysis",
        demoDesc: "Upload an image and generate a natural-language caption using ViT-GPT2.",
        checkingBackend: "Checking backend...",
        btnRetry: "Retry",
        dzTitle: "Drag & drop image here",
        dzSub: "or <span>Click to browse</span>",
        dzHint: "JPG · JPEG · PNG · Max 10MB",
        btnChangeImg: "Change Image",
        btnAnalyze: "Analyze Image",
        lblAnalyzing: "ViT-GPT2 is analyzing the image...",
        lblGenCap: "GENERATED CAPTION",
        btnCopy: "Copy Caption",
        lblCapKw: "Caption Keywords",
        lblProcTime: "Processing Time",
        lblResearchStatus: "RESEARCH STATUS",
        phase1: "Phase 1 — Baseline ViT-GPT2",
        phase15: "Phase 1.5 — Evaluation & Diagnosis",
        phase2: "Phase 2 — Batch Evaluation",
        phase3: "Phase 3 — MS COCO / Flickr30K Benchmark",
        phase4: "Phase 4 — Knowledge Retrieval",
        phase5: "Phase 5 — Ranking & Fusion",
        phase6: "Phase 6 — Training / Fine-tuning",
        phase7: "Phase 7 — Ablation Study",
        btnAnalyzeAnother: "Analyze Another Image",
        lblEvalDash: "RESEARCH EVALUATION",
        lblEvalDesc: "Run inference on a dataset and evaluate quantitatively.",
        lblDataset: "Dataset",
        btnRunEval: "Run Evaluation",
        btnCancel: "Cancel",
        lblEvalResults: "Batch Evaluation Results",
        lblErrorAnalysis: "ERROR ANALYSIS",
        lblNoErrors: "Run a dataset evaluation to generate error analysis.",
        lblQualitative: "QUALITATIVE RESULTS",
        lblNoQualitative: "Run a dataset evaluation to see sample predictions.",
        lblDataset: "Dataset",
        lblDiagDash: "CAPTION DIAGNOSIS",
        lblAblation: "ABLATION STUDY",
        lblAblationDesc: "Compare experimental configurations.",
        errInvalidFile: "Invalid file. Please select JPG, JPEG, or PNG.",
        errFileSize: "File size too large. Maximum 10MB.",
        errInferenceFailed: "Inference failed. Please try again.",
        errBackendOffline: "Cannot connect to backend.",
        connectedText: "Backend connected",
        disconnectedText: "Backend disconnected"
    }
};

let currentLang = localStorage.getItem('capai_language') || 'vi';

function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('capai_language', lang);
    
    document.getElementById('langVi').classList.toggle('active', lang === 'vi');
    document.getElementById('langEn').classList.toggle('active', lang === 'en');
    
    const dict = i18n[lang];
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            if (el.tagName === 'INPUT' && el.type === 'button') {
                el.value = dict[key];
            } else {
                el.innerHTML = dict[key];
            }
        }
    });

    updateBackendUI();
}

document.getElementById('langVi').addEventListener('click', () => applyLanguage('vi'));
document.getElementById('langEn').addEventListener('click', () => applyLanguage('en'));

// DOM Elements
const navMenu = document.getElementById('navMenu');
const hamburger = document.getElementById('hamburger');

const backendStatus = document.getElementById('backendStatus');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const retryBtn = document.getElementById('retryBtn');

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const dzContent = document.getElementById('dzContent');
const dzPreview = document.getElementById('dzPreview');
const previewImg = document.getElementById('previewImg');
const uploadActions = document.getElementById('uploadActions');
const changeImgBtn = document.getElementById('changeImgBtn');
const analyzeBtn = document.getElementById('analyzeBtn');

const errorBanner = document.getElementById('errorBanner');
const loadingState = document.getElementById('loadingState');
const resultSection = document.getElementById('result-section');
const analyzeAgainBtn = document.getElementById('analyzeAgainBtn');

let currentFile = null;
let backendState = 'checking'; // 'checking', 'connected', 'disconnected'
let backendModelName = '';

// =========================================
// UTILITIES
// =========================================
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.classList.remove('hidden');
}

function hideError() {
    errorBanner.classList.add('hidden');
    errorBanner.textContent = '';
}

// =========================================
// SINGLE SOURCE OF TRUTH: BACKEND STATUS
// =========================================
function updateBackendUI() {
    const dict = i18n[currentLang];
    
    if (backendState === 'checking') {
        statusDot.className = 'status-dot loading';
        statusText.textContent = dict.checkingBackend;
        retryBtn.classList.add('hidden');
        analyzeBtn.disabled = true;
    } else if (backendState === 'connected') {
        statusDot.className = 'status-dot online';
        statusText.textContent = `${dict.connectedText} (${backendModelName})`;
        retryBtn.classList.add('hidden');
        analyzeBtn.disabled = false;
    } else {
        statusDot.className = 'status-dot offline';
        statusText.textContent = dict.disconnectedText;
        retryBtn.classList.remove('hidden');
        analyzeBtn.disabled = true;
    }
}

async function checkBackendStatus() {
    backendState = 'checking';
    updateBackendUI();
    
    try {
        const res = await fetch(`${API_BASE}/api/health`);
        const data = await res.json();
        if (data.status === 'online' || data.model_loaded) {
            backendState = 'connected';
            backendModelName = data.model_name || 'nlpconnect/vit-gpt2-image-captioning';
        } else {
            backendState = 'disconnected';
        }
    } catch (err) {
        backendState = 'disconnected';
    }
    updateBackendUI();
}

retryBtn.addEventListener('click', checkBackendStatus);

// =========================================
// UPLOAD LOGIC
// =========================================
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
dropzone.addEventListener('dragleave', (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); });
dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) handleFileSelect(e.target.files[0]);
});

function handleFileSelect(file) {
    hideError();
    const dict = i18n[currentLang];
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
        showError(dict.errInvalidFile);
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        showError(dict.errFileSize);
        return;
    }

    currentFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        dzContent.classList.add('hidden');
        dzPreview.classList.remove('hidden');
        uploadActions.classList.remove('hidden');
        dropzone.style.cursor = 'default';
        dropzone.onclick = null;
        
        // Hide Demo Image dynamically
        const demoImg = document.getElementById('demoImg');
        const demoImgLabel = document.getElementById('demoImgLabel');
        const demoCaption = document.getElementById('demoCaption');
        const demoTime = document.getElementById('demoTime');
        const statusAnalysis = document.getElementById('statusAnalysis');
        const statusCaption = document.getElementById('statusCaption');
        
        if (demoImg) {
            demoImg.src = e.target.result;
            demoImgLabel.style.display = 'none';
            const demoWarning = document.getElementById('demoWarning');
            if (demoWarning) demoWarning.style.display = 'none';
            demoCaption.textContent = dict.statusImgReady + "...";
            demoTime.textContent = "—";
            statusAnalysis.className = 'pending';
            statusAnalysis.querySelector('.check').textContent = '○';
            statusCaption.className = 'pending';
            statusCaption.querySelector('.check').textContent = '○';
        }
    };
    reader.readAsDataURL(file);
}

changeImgBtn.addEventListener('click', () => {
    currentFile = null;
    fileInput.value = '';
    previewImg.src = '';
    dzPreview.classList.add('hidden');
    uploadActions.classList.add('hidden');
    dzContent.classList.remove('hidden');
    hideError();
    dropzone.style.cursor = 'pointer';
    dropzone.onclick = () => fileInput.click();
});

// =========================================
// API INFERENCE
// =========================================
analyzeBtn.addEventListener('click', async () => {
    if (!currentFile) return;
    const dict = i18n[currentLang];

    if (backendState !== 'connected') {
        showError(dict.errBackendOffline);
        return;
    }

    hideError();
    analyzeBtn.disabled = true;
    changeImgBtn.disabled = true;
    loadingState.classList.remove('hidden');
    resultSection.classList.add('hidden');

    const statusAnalysis = document.getElementById('statusAnalysis');
    if (statusAnalysis) {
        statusAnalysis.className = '';
        statusAnalysis.querySelector('.check').textContent = '✓';
    }

    const formData = new FormData();
    formData.append('image', currentFile);

    try {
        const res = await fetch(`${API_BASE}/api/caption`, {
            method: 'POST',
            body: formData
        });
        
        // We do NOT change backendState to 'disconnected' just because 
        // a 500 error happens. Only true network errors mean offline.
        
        const data = await res.json();
        
        if (res.ok && data.success) {
            renderResult(data, previewImg.src);
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            showError(data.error || dict.errInferenceFailed);
        }
    } catch (err) {
        // Network error (server might be down)
        showError(dict.errBackendOffline);
        // We should trigger a health check to verify if it's really offline
        checkBackendStatus();
    } finally {
        analyzeBtn.disabled = false;
        changeImgBtn.disabled = false;
        loadingState.classList.add('hidden');
    }
});

function renderResult(data, imgSrc) {
    resultSection.classList.remove('hidden');
    document.getElementById('resultImgDisplay').src = imgSrc;
    
    const demoCaption = document.getElementById('demoCaption');
    if (demoCaption) {
        demoCaption.textContent = `"${data.caption}"`;
        document.getElementById('demoTime').textContent = data.processing_time ? `Processing time: ${data.processing_time.toFixed(2)}s` : 'Processing time: —';
        document.getElementById('statusCaption').className = '';
        document.getElementById('statusCaption').querySelector('.check').textContent = '✓';
    }
    
    document.getElementById('resCaptionText').textContent = `"${data.caption}"`;
    
    const kwWrap = document.getElementById('resKeywordsWrap');
    const kwList = document.getElementById('resKeywordsList');
    if (data.caption_keywords && data.caption_keywords.length > 0) {
        kwList.innerHTML = '';
        data.caption_keywords.forEach(kw => {
            const span = document.createElement('span');
            span.className = 'kw-badge';
            span.textContent = escapeHtml(kw);
            kwList.appendChild(span);
        });
        kwWrap.classList.remove('hidden');
    } else {
        kwWrap.classList.add('hidden');
    }

    document.getElementById('metaModel').textContent = escapeHtml(data.model_name || 'ViT-GPT2');
    document.getElementById('metaTime').textContent = data.processing_time ? `${data.processing_time.toFixed(2)}s` : 'N/A';
    
    // Render Diagnosis (if available)
    if (data.diagnosis) {
        const diag = data.diagnosis;
        document.getElementById('diagModeBadge').textContent = diag.mode === 'ground_truth_available' ? 'GROUND-TRUTH AVAILABLE' : 'HEURISTIC ONLY';
        document.getElementById('diagRepetition').textContent = diag.repetition ? 'Yes' : '—';
        document.getElementById('diagHallucination').textContent = diag.possible_hallucination ? 'Yes' : '—';
        document.getElementById('diagSemantic').textContent = diag.semantic_consistency || 'Not evaluated';
        document.getElementById('diagMissing').textContent = diag.missing_objects?.length ? escapeHtml(diag.missing_objects.join(', ')) : '—';
        document.getElementById('diagIncorrect').textContent = diag.incorrect_objects?.length ? escapeHtml(diag.incorrect_objects.join(', ')) : '—';
    }
}

analyzeAgainBtn.addEventListener('click', () => {
    document.getElementById('upload-section').scrollIntoView({ behavior: 'smooth' });
    changeImgBtn.click();
    resultSection.classList.add('hidden');
});

// =========================================
// EVALUATION PIPELINE
// =========================================
const runEvalBtn = document.getElementById('runEvalBtn');
let activeJobId = null;
let pollInterval = null;

if (runEvalBtn) {
    runEvalBtn.addEventListener('click', async () => {
        const dataset = document.getElementById('evalDatasetSelect').value;
        const split = document.getElementById('evalSplitSelect').value;
        const limitInput = document.getElementById('evalLimitInput').value;
        const limit = limitInput ? parseInt(limitInput) : null;
        
        runEvalBtn.disabled = true;
        document.getElementById('evalResultsPanel').classList.add('hidden');
        
        try {
            const res = await fetch('/api/evaluation/run', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ dataset, split, limit })
            });
            const data = await res.json();
            if (res.ok && data.experiment_id) {
                activeJobId = data.experiment_id;
                document.getElementById('evalProgressContainer').classList.remove('hidden');
                document.getElementById('cancelEvalBtn').classList.remove('hidden');
                runEvalBtn.classList.add('hidden');
                pollJobStatus();
            } else {
                runEvalBtn.disabled = false;
                alert(data.detail || "Failed to start evaluation.");
            }
        } catch (err) {
            runEvalBtn.disabled = false;
        }
    });
}

document.getElementById('cancelEvalBtn')?.addEventListener('click', async () => {
    if (!activeJobId) return;
    try {
        await fetch(`/api/evaluation/cancel?experiment_id=${activeJobId}`, { method: 'POST' });
        if (pollInterval) clearInterval(pollInterval);
        document.getElementById('evalStatusText').textContent = "Cancelled";
        document.getElementById('runEvalBtn').classList.remove('hidden');
        document.getElementById('runEvalBtn').disabled = false;
        document.getElementById('cancelEvalBtn').classList.add('hidden');
    } catch (err) {}
});

function pollJobStatus() {
    pollInterval = setInterval(async () => {
        if (!activeJobId) { clearInterval(pollInterval); return; }
        try {
            const res = await fetch(`/api/evaluation/status?experiment_id=${activeJobId}`);
            if (!res.ok) return;
            const data = await res.json();
            
            document.getElementById('evalStatusText').textContent = data.status;
            document.getElementById('evalCountText').textContent = `${data.processed} / ${data.total}`;
            document.getElementById('evalProgressBar').style.width = `${data.progress}%`;
            
            if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
                clearInterval(pollInterval);
                document.getElementById('runEvalBtn').classList.remove('hidden');
                document.getElementById('runEvalBtn').disabled = false;
                document.getElementById('cancelEvalBtn').classList.add('hidden');
                if (data.status === 'completed') fetchEvalReport(activeJobId);
            }
        } catch (err) {}
    }, 1000);
}

async function fetchEvalReport(jobId) {
    try {
        const res = await fetch(`/api/evaluation/report?experiment_id=${jobId}`);
        if (!res.ok) return;
        const data = await res.json();
        
        document.getElementById('evalResultsPanel').classList.remove('hidden');
        document.getElementById('batchBleu1').textContent = data.metrics?.bleu_1 !== null ? data.metrics.bleu_1.toFixed(4) : "—";
        document.getElementById('batchBleu2').textContent = data.metrics?.bleu_2 !== null ? data.metrics.bleu_2.toFixed(4) : "—";
        document.getElementById('batchBleu3').textContent = data.metrics?.bleu_3 !== null ? data.metrics.bleu_3.toFixed(4) : "—";
        document.getElementById('batchBleu4').textContent = data.metrics?.bleu_4 !== null ? data.metrics.bleu_4.toFixed(4) : "—";
        document.getElementById('batchMeteor').textContent = data.metrics?.meteor !== null ? data.metrics.meteor.toFixed(4) : "—";
        document.getElementById('batchRouge').textContent = data.metrics?.rouge_l !== null ? data.metrics.rouge_l.toFixed(4) : "—";
        document.getElementById('batchCider').textContent = data.metrics?.cider !== null ? data.metrics.cider.toFixed(4) : "—";
        document.getElementById('batchSpice').textContent = data.metrics?.spice !== null ? data.metrics.spice.toFixed(4) : "—";
        
        fetchErrorAnalysis(jobId);
        fetchQualitativeResults(jobId);
    } catch(err) {}
}

async function fetchErrorAnalysis(jobId) {
    try {
        const res = await fetch(`/api/evaluation/${jobId}/errors`);
        if (!res.ok) return;
        const data = await res.json();
        const container = document.getElementById('errorAnalysisContainer');
        if (!data.data || data.data.length === 0) {
            container.innerHTML = '<div style="color: var(--success);">No errors found or ground-truth missing.</div>';
            return;
        }
        let html = `<div style="display: flex; flex-direction: column; gap: 8px;">`;
        data.data.forEach(item => {
            html += `<div style="border: 1px solid var(--border); border-radius: 4px; padding: 8px;">
                <strong>${item.image_id}</strong>: ${item.diagnosis.issues.join(', ')}
            </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch(err) {}
}

async function fetchQualitativeResults(jobId) {
    try {
        const res = await fetch(`/api/evaluation/${jobId}/results`);
        if (!res.ok) return;
        const data = await res.json();
        const container = document.getElementById('qualitativeResultsContainer');
        
        if (!data.data || data.data.length === 0) {
            container.innerHTML = '<div style="color: var(--text-sec);">No qualitative results available.</div>';
            return;
        }
        
        let html = `<div style="display: flex; flex-direction: column; gap: 16px;">`;
        data.data.forEach(item => {
            const refsHtml = item.references && item.references.length > 0 
                ? item.references.map(r => `<li>${r}</li>`).join('') 
                : '<li>—</li>';
            
            html += `
            <div style="border: 1px solid var(--border); border-radius: 6px; padding: 12px; background: var(--surface);">
                <div style="display: flex; gap: 16px;">
                    <div style="flex-shrink: 0; width: 120px;">
                        <img src="${item.image_path.replace(/\\/g, '/')}" style="width: 100%; border-radius: 4px; object-fit: cover;" onerror="this.src='/assets/sample-landscape.jpg'; this.style.opacity='0.5';">
                    </div>
                    <div style="flex-grow: 1;">
                        <div style="font-size: 0.9rem; margin-bottom: 4px;"><strong>ID:</strong> ${item.image_id}</div>
                        <div style="font-size: 0.9rem; margin-bottom: 8px;"><strong>Generated:</strong> <span style="color: var(--primary);">"${item.prediction}"</span></div>
                        <div style="font-size: 0.85rem; color: var(--text-sec);">
                            <strong>Ground Truth:</strong>
                            <ul style="margin: 4px 0 0 16px; padding: 0;">${refsHtml}</ul>
                        </div>
                    </div>
                </div>
            </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch(err) {
        console.error("Qualitative load error", err);
    }
}

// Copy button logic
document.getElementById('copyBtn')?.addEventListener('click', async () => {
    const text = document.getElementById('resCaptionText').textContent.replace(/^"|"$/g, '');
    try {
        await navigator.clipboard.writeText(text);
        const ct = document.getElementById('copyText');
        ct.textContent = 'Copied ✓';
        setTimeout(() => ct.textContent = 'Copy Caption', 2000);
    } catch (err) {}
});

hamburger.addEventListener('click', () => navMenu.classList.toggle('active'));
document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => navMenu.classList.remove('active')));

// Initialization
applyLanguage(currentLang);
checkBackendStatus();

let datasetsInfo = {};
async function fetchDatasetsStatus() {
    try {
        const res = await fetch('/api/datasets');
        if (!res.ok) return;
        const data = await res.json();
        const select = document.getElementById('evalDatasetSelect');
        const statusText = document.getElementById('datasetConfigStatus');
        if (!select || !statusText) return;
        
        data.datasets.forEach(d => {
            let key = '';
            if(d.name === 'Custom JSON') key = 'custom';
            if(d.name === 'MS COCO') key = 'mscoco';
            if(d.name === 'Flickr30K') key = 'flickr30k';
            datasetsInfo[key] = d;
        });
        
        function updateStatus() {
            const val = select.value;
            const info = datasetsInfo[val];
            if(info) {
                if(info.is_configured) {
                    statusText.innerHTML = '<span style="color: #166534; font-weight: 600;">✓ Configured</span> (' + info.sample_count + ' samples)';
                } else {
                    statusText.innerHTML = '<span style="color: #b91c1c; font-weight: 600;">⚠ Not Configured</span> (Missing dataset files/annotations)';
                }
            }
        }
        
        select.addEventListener('change', updateStatus);
        updateStatus();
    } catch(err) {
        console.error("Dataset status error", err);
    }
}
fetchDatasetsStatus();
