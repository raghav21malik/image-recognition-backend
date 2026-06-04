
// ══════════════════════════════════════
// SUPABASE AUTH — Config
// ══════════════════════════════════════
const SUPABASE_URL  = 'https://sywhdzyimwezunvysxex.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5d2hkenlpbXdlenVudnlzeGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzQyMjAsImV4cCI6MjA5NTkxMDIyMH0.AVsbtJvtRykSB7eyIooFBVmjwajrD8ucttt9Tn3V8pA';
const AUTH_PAGE     = 'auth.html';

// Load Supabase SDK dynamically
(function loadSupabase() {
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  s.onload = initSupabase;
  document.head.appendChild(s);
})();

let sbClient = null;
let currentUser = null;

function initSupabase() {
  sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

  // Check session on load
  sbClient.auth.getSession().then(({ data }) => {
    if (!data.session) {
      window.location.href = AUTH_PAGE;
      return;
    }
    currentUser = data.session.user;
    renderUserInNav(currentUser);
  });

  // Listen for auth changes
  sbClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') window.location.href = AUTH_PAGE;
    if (event === 'SIGNED_IN' && session) {
      currentUser = session.user;
      renderUserInNav(currentUser);
    }
  });
}

// ── Render user info in navbar ──
function renderUserInNav(user) {
  const existing = document.getElementById('nav-user-area');
  if (existing) existing.remove();

  const name = user.user_metadata?.full_name || user.email.split('@')[0];
  const initial = name.charAt(0).toUpperCase();

  const wrap = document.createElement('div');
  wrap.id = 'nav-user-area';
  wrap.style.cssText = 'display:flex;align-items:center;gap:10px;margin-left:8px;';

  wrap.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);border-radius:10px;padding:6px 12px;cursor:pointer;" onclick="toggleUserMenu()">
      <div style="width:26px;height:26px;background:linear-gradient(135deg,#6366f1,#a78bfa);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:white;">${initial}</div>
      <span style="font-size:12px;font-weight:600;color:var(--text2);font-family:'DM Mono',monospace;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</span>
      <span style="color:var(--text3);font-size:10px;">▾</span>
    </div>
    <div id="user-menu" style="display:none;position:absolute;top:60px;right:48px;background:var(--bg2,#0c1022);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:8px;min-width:200px;z-index:200;box-shadow:0 16px 48px rgba(0,0,0,0.4);">
      <div style="padding:10px 14px 12px;border-bottom:1px solid rgba(255,255,255,0.07);margin-bottom:6px;">
        <div style="font-size:13px;font-weight:700;color:var(--text,#f1f5f9);">${name}</div>
        <div style="font-size:11px;color:var(--text3,#475569);font-family:'DM Mono',monospace;margin-top:2px;">${user.email}</div>
      </div>
      <button onclick="signOut()" style="width:100%;text-align:left;padding:9px 14px;background:none;border:none;color:#f87171;font-size:13px;font-weight:600;cursor:pointer;border-radius:8px;font-family:'Bricolage Grotesque',sans-serif;display:flex;align-items:center;gap:8px;transition:background 0.2s;" onmouseover="this.style.background='rgba(248,113,113,0.1)'" onmouseout="this.style.background='none'">
        🚪 Sign Out
      </button>
    </div>
  `;

  // Insert before theme toggle
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn && themeBtn.parentNode) {
    themeBtn.parentNode.insertBefore(wrap, themeBtn);
  }
}

function toggleUserMenu() {
  const menu = document.getElementById('user-menu');
  if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

// Close menu on outside click
document.addEventListener('click', e => {
  const menu = document.getElementById('user-menu');
  const area = document.getElementById('nav-user-area');
  if (menu && area && !area.contains(e.target)) menu.style.display = 'none';
});

async function signOut() {
  if (sbClient) {
    await sbClient.auth.signOut();
    showToast('Signed out successfully', 'info');
    setTimeout(() => window.location.href = AUTH_PAGE, 800);
  }
}

// ── Get auth token for backend requests ──
async function getAuthHeaders() {
  if (!sbClient) return {};
  const { data } = await sbClient.auth.getSession();
  if (!data.session) return {};
  return { 'Authorization': 'Bearer ' + data.session.access_token };
}

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
  checkApiStatus();
  setInterval(checkApiStatus, 60000);
  showToast('Welcome to VisionCloud 🚀', 'info', 2500);
});

// ══════════════════════════════════════
// DARK / LIGHT MODE
// ══════════════════════════════════════
function toggleTheme() {
  const html = document.documentElement;
  const isLight = html.getAttribute('data-theme') === 'light';
  const newTheme = isLight ? 'dark' : 'light';
  html.setAttribute('data-theme', newTheme);
  document.getElementById('themeToggle').textContent = newTheme === 'light' ? '🌙' : '☀️';
  localStorage.setItem('vc-theme', newTheme);
  showToast(newTheme === 'light' ? '☀️ Light mode on' : '🌙 Dark mode on', 'info');
}
(function initTheme() {
  const saved = localStorage.getItem('vc-theme');
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = '🌙';
  }
})();

// ══════════════════════════════════════
// TOAST NOTIFICATIONS
// ══════════════════════════════════════
function showToast(msg, type='info', duration=3000) {
  const icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span><span class="toast-msg">${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ══════════════════════════════════════
// COPY URL
// ══════════════════════════════════════
function copyUrl(url) {
  navigator.clipboard.writeText(url)
    .then(() => showToast('Cloudinary URL copied!', 'success'))
    .catch(() => showToast('Could not copy. Try manually.', 'error'));
}

// ══════════════════════════════════════
// PRINT / COPY SUMMARY
// ══════════════════════════════════════
function printResults() {
  window.print();
  showToast('Opening print dialog...', 'info');
}

let lastLabels = [];
function copyResultsToClipboard() {
  if (!lastLabels.length) { showToast('No results to copy yet.', 'warning'); return; }
  const lines = ['VisionCloud — AI Analysis Results', '─'.repeat(34),
    ...lastLabels.slice(0,8).map(l => `• ${l.name}: ${parseFloat(l.confidence||0).toFixed(1)}%`)
  ].join('\n');
  navigator.clipboard.writeText(lines)
    .then(() => showToast('Results summary copied!', 'success'))
    .catch(() => showToast('Copy failed.', 'error'));
}

// ══════════════════════════════════════
// KEYBOARD SHORTCUTS
// ══════════════════════════════════════
document.addEventListener('keydown', e => {
  const tag = e.target.tagName.toLowerCase();
  const typing = ['input','textarea','select'].includes(tag);
  if (e.key === 'Enter' && !typing) {
    const btn = document.getElementById('analyzeBtn');
    if (btn && !btn.disabled) analyzeImage();
  }
  if (e.key === 'Escape') {
    document.getElementById('modalOverlay').classList.remove('visible');
    document.getElementById('fsOverlay').classList.remove('visible');
    resetUpload();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
    e.preventDefault(); toggleTheme();
  }
  if (e.key === 'u' && !typing) {
    document.getElementById('fileInput').click();
  }
});

// ══════════════════════════════════════
// SCROLL PROGRESS + BACK TO TOP
// ══════════════════════════════════════
window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const docHeight = document.body.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  const bar = document.getElementById('scrollProgress');
  if (bar) bar.style.width = progress + '%';
  const btn = document.getElementById('backToTop');
  if (btn) {
    if (scrollTop > 400) btn.classList.add('visible');
    else btn.classList.remove('visible');
  }
});

// ══════════════════════════════════════
// API STATUS CHECKER
// ══════════════════════════════════════
async function checkApiStatus() {
  const el = document.getElementById('apiStatus');
  const txt = document.getElementById('apiStatusText');
  if (!el || !txt) return;
  el.className = 'api-status checking';
  txt.textContent = 'checking';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(BACKEND + '/', { signal: controller.signal });
    clearTimeout(timeout);
    el.className = 'api-status online';
    txt.textContent = 'API online';
  } catch {
    el.className = 'api-status offline';
    txt.textContent = 'API offline';
  }
}

// ══════════════════════════════════════
// FULLSCREEN IMAGE
// ══════════════════════════════════════
function openFsOverlay(src) {
  const img = document.getElementById('fsImg');
  const overlay = document.getElementById('fsOverlay');
  if (!img || !overlay) return;
  img.src = src;
  overlay.classList.add('visible');
}
function closeFsOverlay() {
  const overlay = document.getElementById('fsOverlay');
  if (overlay) overlay.classList.remove('visible');
}

// ══════════════════════════════════════
// PATCH renderResults TO STORE LABELS
// ══════════════════════════════════════
const _origRenderResults = renderResults;
window.renderResults = function(data) {
  const parsed = parseResponse(data);
  lastLabels = parsed.labels || [];
  _origRenderResults(data);
};
