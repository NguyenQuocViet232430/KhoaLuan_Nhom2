// ============================
// CONSTANTS & STORAGE KEY
// ============================
const STORAGE_KEY = 'capAI_history';
const MAX_HISTORY = 20;

// ============================
// DOM REFERENCES
// ============================
const dropZone       = document.getElementById('dropZone');
const fileInput      = document.getElementById('fileInput');
const uploadError    = document.getElementById('uploadError');
const uploadSection  = document.getElementById('upload-section');
const loadingSection = document.getElementById('loading-section');
const resultSection  = document.getElementById('result-section');
const previewImg     = document.getElementById('previewImg');
const diagnosisText  = document.getElementById('diagnosisText');
const tagList        = document.getElementById('tagList');
const retryBtn       = document.getElementById('retryBtn');
const progressBar    = document.getElementById('progressBar');
const historyGrid    = document.getElementById('historyGrid');
const historyEmpty   = document.getElementById('historyEmpty');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const hamburgerBtn   = document.getElementById('hamburgerBtn');
const mobileNav      = document.getElementById('mobileNav');

// Giữ file gốc để compress canvas sau khi xử lý
let currentFile = null;

// ============================
// NAVBAR – HAMBURGER MENU
// ============================
hamburgerBtn.addEventListener('click', () => {
  mobileNav.classList.toggle('open');
});

function closeMobileNav() {
  mobileNav.classList.remove('open');
}

// ============================
// DROP ZONE – SỰ KIỆN DRAG & DROP
// ============================
// Click vào vùng drop thì kích hoạt input
dropZone.addEventListener('click', () => fileInput.click());

// Highlight khi kéo file vào vùng drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
});

// Thả file vào vùng drop
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

// Chọn file qua input
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (file) handleFile(file);
});

// ============================
// XỬ LÝ FILE
// ============================
function handleFile(file) {
  uploadError.textContent = '';

  // Validate: phải là hình ảnh
  if (!file.type.startsWith('image/')) {
    uploadError.textContent = '⚠️ Vui lòng chọn file định dạng ảnh (JPG, PNG, WEBP).';
    showToast('File không hợp lệ. Chỉ chấp nhận ảnh!', 'error');
    return;
  }

  // Validate: giới hạn 10MB
  if (file.size > 10 * 1024 * 1024) {
    uploadError.textContent = '⚠️ File quá lớn. Giới hạn tối đa 10MB.';
    showToast('File quá lớn! Tối đa 10MB.', 'error');
    return;
  }

  currentFile = file;
  const objectUrl = URL.createObjectURL(file);
  previewImg.src = objectUrl;

  startProcessing();
}

// ============================
// QUY TRÌNH GIẢ LẬP AI
// ============================
function startProcessing() {
  // Ẩn upload, hiện loading
  show(loadingSection);
  hide(uploadSection);
  hide(resultSection);

  // Chạy thanh tiến trình mượt trong 3s
  let pct = 0;
  const interval = setInterval(() => {
    pct += 1.5;
    progressBar.style.width = Math.min(pct, 95) + '%';
  }, 50);

  // Giả lập AI delay 3 giây
  setTimeout(() => {
    clearInterval(interval);
    progressBar.style.width = '100%';

    // Dữ liệu kết quả giả lập
    const fakeCaption = 'Phát hiện cấu trúc bất thường tại vùng trung tâm. Mật độ tế bào cao hơn bình thường, gợi ý khả năng tổn thương độ II. Đề nghị theo dõi thêm.';
    const fakeKnowledge = [
      '🔴 Vùng trung tâm (98%)',
      '🟠 Mật độ cao (85%)',
      '🟡 Tổn thương độ II (72%)',
      '🔵 Theo dõi định kỳ (91%)',
    ];

    displayResult(fakeCaption, fakeKnowledge);
  }, 3000);
}

// ============================
// HIỂN THỊ KẾT QUẢ
// ============================
function displayResult(caption, knowledge) {
  diagnosisText.textContent = `"${caption}"`;

  // Render tag list
  tagList.innerHTML = '';
  knowledge.forEach(k => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = k;
    tagList.appendChild(tag);
  });

  hide(loadingSection);
  show(resultSection);
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  showToast('Phân tích hoàn tất!', 'success');

  // Lưu lịch sử
  if (currentFile) {
    compressImageToBase64(currentFile, (base64) => {
      saveHistory({
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        thumbnail: base64,
        caption: caption,
        knowledge: knowledge,
      });
      renderHistory();
    });
  }
}

// ============================
// NÚT "THỬ ẢNH KHÁC"
// ============================
retryBtn.addEventListener('click', () => {
  fileInput.value = '';
  currentFile = null;
  previewImg.src = '';
  progressBar.style.width = '0%';
  uploadError.textContent = '';

  hide(resultSection);
  hide(loadingSection);
  show(uploadSection);
  uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ============================
// CANVAS API – NÉN ẢNH BASE64
// ============================
function compressImageToBase64(file, callback) {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (e) => {
    const img = new Image();
    img.src = e.target.result;
    img.onload = () => {
      const MAX = 800;
      let w = img.width;
      let h = img.height;
      if (w > h && w > MAX) { h *= MAX / w; w = MAX; }
      else if (h > MAX)      { w *= MAX / h; h = MAX; }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.7));
    };
  };
}

// ============================
// HISTORY – LOCALSTORAGE
// ============================
function getHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveHistory(item) {
  const items = getHistory();
  items.unshift(item);           // thêm vào đầu mảng
  if (items.length > MAX_HISTORY) items.pop();  // giới hạn 20 bản
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function deleteHistory(id) {
  const items = getHistory().filter(i => i.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  renderHistory();
}

// ============================
// RENDER LỊCH SỬ
// ============================
function renderHistory() {
  const items = getHistory();
  historyGrid.innerHTML = '';

  if (items.length === 0) {
    show(historyEmpty);
    return;
  }
  hide(historyEmpty);

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'history-card';

    const date = new Date(item.timestamp).toLocaleString('vi-VN');

    card.innerHTML = `
      <img src="${item.thumbnail}" alt="Lịch sử" loading="lazy"/>
      <button class="history-card-del" title="Xoá bản ghi này">🗑</button>
      <div class="history-card-body">
        <p class="history-card-caption">"${item.caption}"</p>
        <p class="history-card-meta">🕐 ${date}</p>
      </div>
    `;

    // Click xoá
    card.querySelector('.history-card-del').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Xoá bản ghi này?')) deleteHistory(item.id);
    });

    // Click xem chi tiết → scroll lên Result và hiển thị lại
    card.addEventListener('click', () => {
      previewImg.src = item.thumbnail;
      displayResultFromHistory(item.caption, item.knowledge);
    });

    historyGrid.appendChild(card);
  });
}

// Hiển thị lại kết quả từ lịch sử (không lưu lại)
function displayResultFromHistory(caption, knowledge) {
  diagnosisText.textContent = `"${caption}"`;
  tagList.innerHTML = '';
  knowledge.forEach(k => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = k;
    tagList.appendChild(tag);
  });
  hide(uploadSection);
  hide(loadingSection);
  show(resultSection);
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Xoá toàn bộ lịch sử
clearHistoryBtn.addEventListener('click', () => {
  if (confirm('Xoá toàn bộ lịch sử? Hành động này không thể hoàn tác.')) {
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
    showToast('Đã xoá toàn bộ lịch sử.', 'success');
  }
});

// ============================
// TOAST NOTIFICATION
// ============================
const toastContainer = document.getElementById('toastContainer');

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${message}`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
}

// ============================
// UTILITIES
// ============================
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

// ============================
// INIT
// ============================
renderHistory();
