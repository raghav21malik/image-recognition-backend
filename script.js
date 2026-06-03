const BACKEND = "https://image-recognition-backend-93d6.onrender.com";
let selectedFile = null;
let allHistory = [];

// ── Tabs ──
function showTab(name, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.getElementById('tab-btn-' + name).classList.add('active');
  if (name === 'history') loadHistory();
}

function scrollToAnalyze() {
  document.getElementById('upload-card').scrollIntoView({behavior:'smooth'});
}

// ── File handling ──
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault(); dropZone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });

function handleFile(file) {
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('preview-img').src = e.target.result;
    document.getElementById('preview-filename').textContent = file.name + ' · ' + (file.size/1024).toFixed(1) + ' KB';
    document.getElementById('previewWrap').classList.add('visible');
    document.getElementById('analyzeBtn').disabled = false;
    document.getElementById('errorBox').classList.remove('visible');
    document.getElementById('resultsWrap').classList.remove('visible');
    document.getElementById('resultsWrap').innerHTML = '';
  };
  reader.readAsDataURL(file);
}

function resetUpload() {
  selectedFile = null; fileInput.value = '';
  document.getElementById('previewWrap').classList.remove('visible');
  document.getElementById('analyzeBtn').disabled = true;
  document.getElementById('resultsWrap').classList.remove('visible');
  document.getElementById('resultsWrap').innerHTML = '';
  document.getElementById('errorBox').classList.remove('visible');
  document.getElementById('loadingWrap').classList.remove('visible');
}

// ── Loading steps ──
function setStep(n) {
  for (let i=1;i<=3;i++) {
    const el = document.getElementById('step'+i);
    el.classList.remove('active','done');
    if (i < n) el.classList.add('done');
    else if (i === n) el.classList.add('active');
  }
}

// ── Analyze ──
async function analyzeImage() {
  if (!selectedFile) return;
  const btn = document.getElementById('analyzeBtn');
  const loading = document.getElementById('loadingWrap');
  const errorBox = document.getElementById('errorBox');
  btn.disabled = true;
  errorBox.classList.remove('visible');
  document.getElementById('resultsWrap').classList.remove('visible');
  loading.classList.add('visible');
  setStep(1);
  const formData = new FormData();
  formData.append('image', selectedFile);
  const apiUrl = `${BACKEND}/api/upload`;
  console.log("Uploading file:", selectedFile.name, selectedFile.type, selectedFile.size + " bytes");
  console.log("Backend URL:", apiUrl);
  try {
    setTimeout(()=>setStep(2), 900);
    setTimeout(()=>setStep(3), 2400);
    const res = await fetch(apiUrl, {method:'POST', body:formData});
    let data;
    try { data = await res.json(); } catch(parseErr) {
      throw new Error(`Server returned non-JSON response (HTTP ${res.status}). The backend may be down or starting up — try again in 30s.`);
    }
    console.log("Backend response:", data);
    loading.classList.remove('visible');
    if (!res.ok) {
      const msg = data.error || data.message || data.detail || `HTTP ${res.status} — Upload failed.`;
      showError(msg); console.error("Backend error:", data); btn.disabled=false; return;
    }
    renderResults(data);
    loadStats();
  } catch(err) {
    loading.classList.remove('visible');
    console.error("Fetch error:", err);
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      showError('Could not reach backend. Check your connection or wait ~30s for Render cold start.');
    } else {
      showError(err.message || 'Unknown error. Open browser DevTools (F12) → Console for details.');
    }
    btn.disabled = false;
  }
}

function showError(msg) {
  const box = document.getElementById('errorBox');
  box.textContent = '⚠️ ' + msg;
  box.classList.add('visible');
}

// ── Smart response parser — supports Format A & B ──
function parseResponse(data) {
  const imageUrl = data.image_url || data.url || '';
  const meta = data.image_meta || data.metadata || {};
  let ai = data.ai_results || data.analysis || data.result || {};
  const recordId = data.record_id || data.id || null;

  let labels = ai.labels || ai.tags || ai.classifications || [];
  if (!Array.isArray(labels)) labels = [];
  labels = labels.map(l => {
    if (typeof l === 'string') return {name:l, confidence:0};
    return {name: l.name||l.label||l.description||'Unknown', confidence: l.confidence||l.score||l.probability||0};
  });

  let objects = ai.objects || ai.detected_objects || [];
  if (!Array.isArray(objects)) objects = [];
  objects = objects.map(o => {
    if (typeof o === 'string') return {name:o, confidence:0};
    return {name: o.name||o.label||'Object', confidence: o.confidence||o.score||0};
  });

  return {
    imageUrl, meta, labels, objects,
    detectedText: ai.detected_text || ai.text || ai.ocr_text || '',
    landmark: ai.landmark || '',
    colors: ai.dominant_colors || ai.colors || [],
    safeSearch: ai.safe_search || {},
    recordId
  };
}

// Label icon picker
function labelIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('dog')||n.includes('retriever')||n.includes('spaniel')||n.includes('hound')||n.includes('terrier')||n.includes('poodle')||n.includes('bulldog')||n.includes('beagle')) return '🐕';
  if (n.includes('cat')||n.includes('kitten')||n.includes('feline')) return '🐈';
  if (n.includes('bird')||n.includes('parrot')||n.includes('eagle')||n.includes('owl')) return '🐦';
  if (n.includes('car')||n.includes('vehicle')||n.includes('truck')||n.includes('auto')) return '🚗';
  if (n.includes('person')||n.includes('human')||n.includes('people')||n.includes('face')) return '👤';
  if (n.includes('food')||n.includes('pizza')||n.includes('burger')||n.includes('cake')) return '🍽️';
  if (n.includes('tree')||n.includes('plant')||n.includes('flower')||n.includes('grass')) return '🌿';
  if (n.includes('building')||n.includes('house')||n.includes('architecture')) return '🏛️';
  if (n.includes('water')||n.includes('ocean')||n.includes('sea')||n.includes('river')) return '🌊';
  if (n.includes('sky')||n.includes('cloud')||n.includes('weather')) return '☁️';
  if (n.includes('mountain')||n.includes('hill')||n.includes('landscape')) return '⛰️';
  if (n.includes('sport')||n.includes('ball')||n.includes('game')) return '⚽';
  return '🔍';
}

// ── Render Results ──
function renderResults(data) {
  const wrap = document.getElementById('resultsWrap');
  const { imageUrl, meta, labels, objects, detectedText, landmark, colors, recordId } = parseResponse(data);

  // Summary card
  let html = `
    <div class="summary-card">
      <div class="summary-item">
        <div class="summary-icon">✅</div>
        <div class="summary-label">Status</div>
        <div class="summary-value success">Completed</div>
      </div>
      <div class="summary-item">
        <div class="summary-icon">🏷️</div>
        <div class="summary-label">Detected Labels</div>
        <div class="summary-value accent">${labels.length}</div>
      </div>
      <div class="summary-item">
        <div class="summary-icon">☁️</div>
        <div class="summary-label">Cloud Upload</div>
        <div class="summary-value success">${imageUrl ? 'Success' : '—'}</div>
      </div>
      <div class="summary-item">
        <div class="summary-icon">🗄️</div>
        <div class="summary-label">AI Model</div>
        <div class="summary-value" style="font-size:11px;">ViT Base</div>
      </div>
    </div>`;

  // Analyzed image preview
  if (imageUrl) {
    html += `<div class="results-grid" style="margin-bottom:16px;">
      <div class="result-card full-width" style="padding:0;overflow:hidden;">
        <div class="analyzed-img-card" onclick="window.open('${imageUrl}','_blank')" style="border-radius:0;border:none;box-shadow:none;margin:0;">
          <img src="${imageUrl}" alt="Analyzed image" style="width:100%;max-height:320px;object-fit:cover;display:block;"/>
          <div class="analyzed-img-overlay">
            <span class="analyzed-img-label">☁️ Stored on Cloudinary CDN</span>
            <span style="font-family:'DM Mono',monospace;font-size:10px;color:rgba(255,255,255,0.55);">Click to open ↗</span>
          </div>
        </div>
      </div>
    </div>`;
  }

  html += `<div class="results-grid">`;

  // AI Label chips (FIX 1 — no fake confidence %)
  if (labels.length) {
    html += `<div class="result-card full-width">
      <div class="result-card-title">🤖 AI Classification Results</div>
      <div class="label-chips">`;
    labels.forEach((l, i) => {
      html += `<div class="label-chip">
        <span class="label-chip-icon">${labelIcon(l.name)}</span>
        <span class="label-chip-text">${l.name}</span>
        <span class="label-chip-num">#${i+1}</span>
      </div>`;
    });
    html += `</div></div>`;
  }

  // Objects
  if (objects.length) {
    html += `<div class="result-card">
      <div class="result-card-title">📦 Detected Objects</div>
      <div class="objects-wrap">`;
    objects.forEach(o => {
      html += `<div class="object-tag">${o.name}</div>`;
    });
    html += `</div></div>`;
  }

  // Detected text
  if (detectedText) {
    html += `<div class="result-card ${!objects.length?'full-width':''}">
      <div class="result-card-title">📝 Detected Text (OCR)</div>
      <div class="detected-text-box">${detectedText}</div>
    </div>`;
  }

  // Landmark
  if (landmark) {
    html += `<div class="result-card">
      <div class="result-card-title">🗺️ Landmark Detected</div>
      <div style="font-size:20px;font-weight:800;color:var(--accent3);letter-spacing:-0.5px;">${landmark}</div>
    </div>`;
  }

  // Cloud info (FIX 2 — replaces fake metadata)
  html += `<div class="result-card full-width">
    <div class="result-card-title">☁️ Cloud Infrastructure</div>
    <div class="cloud-info-grid">
      <div class="cloud-info-card">
        <div class="cloud-info-icon">🖼️</div>
        <div class="cloud-info-body">
          <div class="cloud-info-label">Cloud Storage</div>
          <div class="cloud-info-value"><span class="cloud-info-dot"></span>Cloudinary CDN</div>
        </div>
      </div>
      <div class="cloud-info-card">
        <div class="cloud-info-icon">🗄️</div>
        <div class="cloud-info-body">
          <div class="cloud-info-label">Database</div>
          <div class="cloud-info-value"><span class="cloud-info-dot"></span>Supabase PostgreSQL</div>
        </div>
      </div>
      <div class="cloud-info-card">
        <div class="cloud-info-icon">🤗</div>
        <div class="cloud-info-body">
          <div class="cloud-info-label">AI Engine</div>
          <div class="cloud-info-value"><span class="cloud-info-dot"></span>Hugging Face ViT</div>
        </div>
      </div>
      <div class="cloud-info-card">
        <div class="cloud-info-icon">⚙️</div>
        <div class="cloud-info-body">
          <div class="cloud-info-label">Backend</div>
          <div class="cloud-info-value"><span class="cloud-info-dot"></span>Render (Flask)</div>
        </div>
      </div>
    </div>
  </div>`;

  html += `</div>
    <button class="btn-analyze" style="margin-top:18px;background:linear-gradient(135deg,var(--success),var(--accent2));" onclick="resetUpload()">
      <span>↑ Analyze Another Image</span>
    </button>`;

  wrap.innerHTML = html;
  wrap.classList.add('visible');
  document.getElementById('analyzeBtn').disabled = false;
}

// ── History ──
async function loadHistory() {
  const body = document.getElementById('historyBody');
  body.innerHTML = `<div class="empty-state"><div class="icon">⏳</div><div>Fetching from Supabase...</div></div>`;
  try {
    const res = await fetch(`${BACKEND}/api/history`);
    const data = await res.json();
    console.log("History response:", data);
    allHistory = data.history || [];
    renderHistory(allHistory);
  } catch(err) {
    body.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><div>Could not load history. Check backend.</div></div>`;
  }
}

function filterHistory() {
  const search = document.getElementById('searchBox').value.toLowerCase();
  const labelFilter = document.getElementById('filterLabel').value.toLowerCase();
  const sort = document.getElementById('sortSelect').value;
  let filtered = allHistory.filter(r => {
    const nameMatch = (r.filename||'').toLowerCase().includes(search);
    const labels = parseField(r.labels);
    const labelStr = labels.map(l=>l.name||l.label||l).join(' ').toLowerCase();
    const labelMatch = !labelFilter || labelStr.includes(labelFilter);
    return nameMatch && labelMatch;
  });
  if (sort === 'oldest') filtered = [...filtered].reverse();
  renderHistory(filtered);
}

function renderHistory(records) {
  const body = document.getElementById('historyBody');
  if (!records.length) {
    body.innerHTML = `<div class="empty-state"><div class="icon">🔍</div><div>No records found. Try a different search.</div></div>`;
    return;
  }
  let html = `<div class="history-grid">`;
  records.forEach(r => {
    const labels = parseField(r.labels).slice(0,3);
    const date = new Date(r.created_at).toLocaleString();
    html += `<div class="history-card" onclick="openModal(${r.id})">`;
    html += `<div class="history-img-wrap">`;
    if (r.image_url) {
      html += `<img class="history-img" src="${r.image_url}" alt="${r.filename||'image'}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'history-img-placeholder\\'>🖼️</div>'"/>`;
      html += `<div class="history-img-badge">☁️ Cloudinary</div>`;
    } else {
      html += `<div class="history-img-placeholder">🖼️</div>`;
    }
    html += `</div>`;
    html += `<div class="history-body">
      <div class="history-filename">${r.filename||'image'}</div>
      <div class="history-labels">`;
    labels.forEach(l => {
      html += `<span class="history-label">${l.name||l.label||l}</span>`;
    });
    html += `</div>
      <div class="history-footer">
        <div class="history-time">🕓 ${date}</div>
        ${r.image_url ? `<a class="history-cloud-link" href="${r.image_url}" target="_blank" onclick="event.stopPropagation()">☁️ Open ↗</a>` : ''}
      </div>
    </div></div>`;
  });
  html += `</div>`;
  body.innerHTML = html;
}

// ── Modal ──
async function openModal(id) {
  const record = allHistory.find(r => r.id === id);
  if (!record) return;
  const overlay = document.getElementById('modalOverlay');
  const modalImg = document.getElementById('modal-img');
  const modalBody = document.getElementById('modal-body');
  document.getElementById('modal-title').textContent = record.filename || 'Scan Details';
  if (record.image_url) {
    modalImg.src = record.image_url;
    modalImg.style.display = 'block';
  } else {
    modalImg.style.display = 'none';
  }
  const labels = parseField(record.labels);
  let html = `<div class="labels-list" style="margin-bottom:16px;">`;
  labels.slice(0,6).forEach(l => {
    const pct = parseFloat(l.confidence||l.score||0).toFixed(1);
    html += `<div class="label-item">
      <div class="label-name" style="font-size:12px;">${l.name||l.label||l}</div>
      <div class="label-bar-wrap"><div class="label-bar" data-width="${pct}" style="width:${pct}%"></div></div>
      <div class="label-score">${pct}%</div>
    </div>`;
  });
  html += `</div>
    <div class="meta-grid">
      <div class="meta-item"><div class="meta-label">Format</div><div class="meta-value">${(record.format||'—').toUpperCase()}</div></div>
      <div class="meta-item"><div class="meta-label">Size</div><div class="meta-value">${record.size_bytes?(record.size_bytes/1024).toFixed(1)+' KB':'—'}</div></div>
      <div class="meta-item"><div class="meta-label">Scanned</div><div class="meta-value" style="font-size:12px;">${new Date(record.created_at).toLocaleString()}</div></div>
    </div>`;
  modalBody.innerHTML = html;
  overlay.classList.add('visible');
}

function closeModal(e) {
  if (e.target === document.getElementById('modalOverlay')) {
    document.getElementById('modalOverlay').classList.remove('visible');
  }
}

// ── Stats ──
async function loadStats() {
  try {
    const res = await fetch(`${BACKEND}/api/history`);
    const data = await res.json();
    const records = data.history || [];
    const totalImages = records.length;
    let totalLabels = 0;
    records.forEach(r => {
      const labels = parseField(r.labels);
      totalLabels += labels.length;
    });
    animateCount('stat-images', totalImages);
    animateCount('stat-labels', totalLabels);
    animateCount('stat-records', totalImages);
  } catch(e) {}
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration = 1200;
  const start = Date.now();
  const startVal = parseInt(el.textContent)||0;
  const timer = setInterval(() => {
    const progress = Math.min((Date.now()-start)/duration, 1);
    const ease = 1 - Math.pow(1-progress, 3);
    el.textContent = Math.round(startVal + (target-startVal)*ease);
    if (progress === 1) clearInterval(timer);
  }, 16);
}

// ── Utils ──
function parseField(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

// ── Init ──
window.addEventListener('load', () => {
  fetch(BACKEND + '/').catch(()=>{});
  loadStats();
});