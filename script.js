const SUPABASE_URL  = 'https://sywhdzyimwezunvysxex.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5d2hkenlpbXdlenVudnlzeGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzQyMjAsImV4cCI6MjA5NTkxMDIyMH0.AVsbtJvtRykSB7eyIooFBVmjwajrD8ucttt9Tn3V8pA';
const AUTH_PAGE     = 'auth.html';

// Load Supabase SDK dynamically
(function loadSupabase() {
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  s.onload = initSupabase;
  s.onerror = () => renderGuestInNav();
  document.head.appendChild(s);
})();

let sbClient = null;
let currentUser = null;

function initSupabase() {
  sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

  // Check session on load
  sbClient.auth.getSession().then(({ data }) => {
    if (!data.session) {
      renderGuestInNav();
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

function renderGuestInNav() {
  if (document.getElementById('nav-user-area')) return;
  const wrap = document.createElement('div');
  wrap.id = 'nav-user-area';
  wrap.style.cssText = 'display:flex;align-items:center;gap:10px;margin-left:8px;';
  wrap.innerHTML = `
    <div class="guest-chip" title="Guest mode keeps the demo usable without sign in">
      <span class="guest-chip-dot"></span>
      <span>Guest Mode</span>
    </div>
  `;
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn && themeBtn.parentNode) {
    themeBtn.parentNode.insertBefore(wrap, themeBtn);
  }
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
  const tabContent = document.getElementById('tab-' + name);
  if (tabContent) tabContent.classList.add('active');
  const tabBtn = document.getElementById('tab-btn-' + name);
  if (tabBtn) tabBtn.classList.add('active');
  if (name === 'history') loadHistory();
  if (name === 'analytics') loadAnalytics();
}

function scrollToAnalyze() {
  const el = document.getElementById('upload-card');
  if (el) el.scrollIntoView({behavior:'smooth'});
}

// ── File handling ──
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

if (dropZone) {
  dropZone.addEventListener('click', () => { if (fileInput) fileInput.click(); });
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
}
if (fileInput) {
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });
}

function handleFile(file) {
  const maxSize = 10 * 1024 * 1024;
  const meta = document.getElementById('dropMeta');
  if (!file.type.startsWith('image/')) {
    showError('Please upload an image file such as PNG, JPG, WEBP, or GIF.');
    showToast('That file is not an image.', 'warning');
    return;
  }
  if (file.size > maxSize) {
    showError('Image is larger than 10MB. Please choose a smaller file.');
    showToast('File is too large for this scanner.', 'warning');
    return;
  }
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('preview-img').src = e.target.result;
    document.getElementById('preview-filename').textContent = file.name + ' · ' + (file.size/1024).toFixed(1) + ' KB';
    document.getElementById('previewWrap').classList.add('visible');
    document.getElementById('analyzeBtn').disabled = false;
    if (dropZone) dropZone.classList.add('has-file');
    if (meta) meta.textContent = `${file.type || 'image'} ready · ${(file.size/1024/1024).toFixed(2)} MB`;
    document.getElementById('errorBox').classList.remove('visible');
    document.getElementById('resultsWrap').classList.remove('visible');
    document.getElementById('resultsWrap').innerHTML = '';
    showToast('Image ready for analysis.', 'success', 1800);
  };
  reader.readAsDataURL(file);
}

function resetUpload() {
  selectedFile = null;
  if (fileInput) fileInput.value = '';
  document.getElementById('previewWrap').classList.remove('visible');
  document.getElementById('analyzeBtn').disabled = true;
  if (dropZone) dropZone.classList.remove('has-file');
  const meta = document.getElementById('dropMeta');
  if (meta) meta.textContent = 'Smart validation active';
  document.getElementById('resultsWrap').classList.remove('visible');
  document.getElementById('resultsWrap').innerHTML = '';
  document.getElementById('errorBox').classList.remove('visible');
  document.getElementById('loadingWrap').classList.remove('visible');
}

function runDemoScan() {
  showTab('analyze', document.getElementById('tab-btn-analyze'));
  scrollToAnalyze();
  const demoData = {
    image_url: '',
    ai_results: {
      labels: [
        { name: 'futuristic control room', confidence: 0.97 },
        { name: 'computer vision dashboard', confidence: 0.91 },
        { name: 'cloud analytics interface', confidence: 0.86 },
        { name: 'neural network display', confidence: 0.79 }
      ],
      objects: ['dashboard panels', 'data stream', 'vision model', 'cloud pipeline'],
      detected_text: 'VISIONCLOUD · AI READY · LIVE PIPELINE',
      dominant_colors: ['#6366f1', '#22d3ee', '#34d399']
    },
    record_id: 'demo-scan'
  };
  document.getElementById('previewWrap').classList.remove('visible');
  document.getElementById('loadingWrap').classList.add('visible');
  setStep(1);
  setTimeout(() => setStep(2), 450);
  setTimeout(() => setStep(3), 900);
  setTimeout(() => {
    document.getElementById('loadingWrap').classList.remove('visible');
    renderResults(demoData);
    showToast('Demo scan generated.', 'success');
  }, 1300);
}

// ── Loading steps ──
function setStep(n) {
  for (let i=1;i<=3;i++) {
    const el = document.getElementById('step'+i);
    if (!el) continue;
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
  if (!box) return;
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
    if (typeof l === 'string') return {name:l, confidence:null};
    return {name: l.name||l.label||l.description||'Unknown', confidence: l.confidence||l.score||l.probability||null};
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
  if (!wrap) return;
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

  // AI Label ranked bars
  if (labels.length) {
    html += `<div class="result-card full-width">
      <div class="result-card-title">🤖 AI Classification Results</div>
      <div class="ranked-labels">`;
    const total = labels.length;
    labels.forEach((l, i) => {
      // Use real confidence if available, else rank-based fallback
      const rankWidths = [100, 80, 65, 52, 42];
      const hasConfidence = l.confidence !== null && l.confidence !== undefined && l.confidence > 0;
      const barWidth = hasConfidence ? Math.round(l.confidence) : (rankWidths[i] || Math.max(100 - (i * 15), 15));
      const displayPct = hasConfidence ? l.confidence.toFixed(1) + '%' : '#' + (i+1);
      const rankColors = [
        'linear-gradient(90deg,#6366f1,#22d3ee)',
        'linear-gradient(90deg,#8b5cf6,#6366f1)',
        'linear-gradient(90deg,#a78bfa,#8b5cf6)',
        'linear-gradient(90deg,#c4b5fd,#a78bfa)',
        'linear-gradient(90deg,#ddd6fe,#c4b5fd)',
      ];
      const color = rankColors[i] || rankColors[4];
      html += `<div class="ranked-label-row">
        <div class="ranked-label-rank" style="min-width:44px;">${displayPct}</div>
        <div class="ranked-label-name">${l.name||l}</div>
        <div class="ranked-label-bar-wrap">
          <div class="ranked-label-bar-fill" style="height:100%;border-radius:99px;background:${color};width:0%;transition:width 1.2s cubic-bezier(0.4,0,0.2,1);" data-w="${barWidth}"></div>
        </div>
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

  // Animate ranked bars after DOM renders
  setTimeout(function() {
    wrap.querySelectorAll('[data-w]').forEach(function(bar) {
      bar.style.width = bar.getAttribute('data-w') + '%';
    });
  }, 200);

  document.getElementById('analyzeBtn').disabled = false;
}

// ── History ──
async function loadHistory() {
  const body = document.getElementById('historyBody');
  if (!body) return;
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
  const searchEl = document.getElementById('searchBox');
  const filterEl = document.getElementById('filterLabel');
  const sortEl = document.getElementById('sortSelect');
  const search = searchEl ? searchEl.value.toLowerCase() : '';
  const labelFilter = filterEl ? filterEl.value.toLowerCase() : '';
  const sort = sortEl ? sortEl.value : 'newest';
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
  if (!body) return;
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
        <div style="display:flex;gap:6px;align-items:center;">
          ${r.image_url ? `<a class="history-cloud-link" href="${r.image_url}" target="_blank" onclick="event.stopPropagation()">☁️ Open ↗</a>` : ''}
          <button class="history-delete-btn" onclick="event.stopPropagation();deleteRecord(${r.id})" title="Delete this scan">🗑️</button>
        </div>
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
  if (!overlay) return;
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
  const overlay = document.getElementById('modalOverlay');
  if (overlay && e.target === overlay) {
    overlay.classList.remove('visible');
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

// ══════════════════════════════════════
// SPRING-PHYSICS COUNTER ANIMATION (Feature #7)
// ══════════════════════════════════════
function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = parseInt(el.textContent) || 0;
  let velocity = 0;
  const stiffness = 0.08;
  const damping = 0.85;
  function step() {
    const displacement = target - current;
    velocity = velocity * damping + displacement * stiffness;
    current += velocity;
    el.textContent = Math.round(current);
    if (Math.abs(displacement) > 0.5 || Math.abs(velocity) > 0.5) {
      requestAnimationFrame(step);
    } else {
      el.textContent = target;
    }
  }
  step();
}

// ── Utils ──
function parseField(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

// ══════════════════════════════════════
// INIT — window load
// ══════════════════════════════════════
window.addEventListener('load', () => {
  fetch(BACKEND + '/').catch(()=>{});
  loadStats();
  checkApiStatus();
  setInterval(checkApiStatus, 60000);
  showToast('Welcome to VisionCloud 🚀', 'info', 2500);
  initFutureInterface();

  // ── New futuristic features ──
  initParticles();
  initLiveClock();
  initMagneticButtons();
  initRippleEffect();
  initTypewriter();
  initPageTransition();
});

// ══════════════════════════════════════
// FUTURE INTERFACE (tilt + reveal) — Enhanced with staggered delays (Feature #8)
// ══════════════════════════════════════
function initFutureInterface() {
  const glow = document.getElementById('cursorGlow');
  window.addEventListener('pointermove', e => {
    if (!glow) return;
    glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  }, { passive: true });

  document.querySelectorAll('.card, .stat-card, .highlight-card, .model-card, .tech-card, .hero-card-preview').forEach(card => {
    card.addEventListener('pointermove', e => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * -8;
      card.style.setProperty('--tilt-x', `${y}deg`);
      card.style.setProperty('--tilt-y', `${x}deg`);
      card.classList.add('tilting');
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('tilting');
      card.style.removeProperty('--tilt-x');
      card.style.removeProperty('--tilt-y');
    });
  });

  const revealItems = document.querySelectorAll('.card, .stat-card, .highlight-card, .problem-card, .model-card, .arch-node, .tech-card');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('reveal-visible');
    });
  }, { threshold: 0.12 });
  // Enhanced staggered reveal (Feature #8)
  revealItems.forEach((el, index) => {
    el.classList.add('reveal-ready');
    el.style.transitionDelay = `${index * 0.06}s`;
    observer.observe(el);
  });
}

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
// KEYBOARD SHORTCUTS (enhanced with Ctrl+K for command palette)
// ══════════════════════════════════════
document.addEventListener('keydown', e => {
  const tag = e.target.tagName.toLowerCase();
  const typing = ['input','textarea','select'].includes(tag);

  // ── Command Palette shortcuts ──
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const cmdPalette = document.getElementById('cmdPalette');
    if (cmdPalette && cmdPalette.classList.contains('visible')) {
      closeCmdPalette();
    } else {
      openCmdPalette();
    }
    return;
  }

  // ── Escape: close command palette first, then modals ──
  if (e.key === 'Escape') {
    const cmdPalette = document.getElementById('cmdPalette');
    if (cmdPalette && cmdPalette.classList.contains('visible')) {
      closeCmdPalette();
      return;
    }
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) modalOverlay.classList.remove('visible');
    const fsOverlay = document.getElementById('fsOverlay');
    if (fsOverlay) fsOverlay.classList.remove('visible');
    resetUpload();
    return;
  }

  // ── Command palette input navigation ──
  if (e.target.id === 'cmdInput') {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      navigateCmdResults(e.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      executeActiveCmdItem();
      return;
    }
    return; // Don't process other shortcuts while in cmd input
  }

  if (e.key === 'Enter' && !typing) {
    const btn = document.getElementById('analyzeBtn');
    if (btn && !btn.disabled) analyzeImage();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
    e.preventDefault(); toggleTheme();
  }
  if (e.key === 'u' && !typing) {
    const fi = document.getElementById('fileInput');
    if (fi) fi.click();
  }
});

// ══════════════════════════════════════
// SCROLL PROGRESS + BACK TO TOP (Enhanced with gradient color — Feature #11)
// ══════════════════════════════════════
window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const docHeight = document.body.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  const bar = document.getElementById('scrollProgress');
  if (bar) {
    bar.style.width = progress + '%';
    // Enhanced gradient that shifts based on scroll position
    const hue1 = Math.round(240 + progress * 1.2); // indigo → cyan shift
    const hue2 = Math.round(180 + progress * 0.8);
    bar.style.background = `linear-gradient(90deg, hsl(${hue1}, 80%, 65%), hsl(${hue2}, 80%, 60%))`;
  }
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

// ══════════════════════════════════════
// ANALYTICS DASHBOARD
// ══════════════════════════════════════

async function loadAnalytics() {
  // Force grid layout via JS in case CSS loads late
  const statsRow = document.getElementById('analyticsStatsRow');
  const analyticsGrid = document.querySelector('.analytics-grid');
  if (statsRow) statsRow.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;';
  if (analyticsGrid) analyticsGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:16px;';

  // Show skeletons
  showAnalyticsSkeleton();

  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${BACKEND}/api/history`, { headers: authHeaders });
    const data = await res.json();
    console.log('Analytics data:', data);
    const records = data.history || data.data || [];

    if (!records.length) {
      const emptyEl = document.getElementById('analyticsEmpty');
      if (emptyEl) emptyEl.style.display = 'block';
      if (statsRow) statsRow.style.display = 'none';
      if (analyticsGrid) analyticsGrid.style.display = 'none';
      return;
    }

    // ── Parse all labels ──
    let totalLabels = 0;
    const labelCount = {};
    const today = new Date().toDateString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let thisWeek = 0;
    let todayCount = 0;

    records.forEach(r => {
      const labels = parseField(r.labels);
      totalLabels += labels.length;

      labels.forEach(l => {
        const name = (l.name || l.label || l || '').toLowerCase().trim();
        if (name) labelCount[name] = (labelCount[name] || 0) + 1;
      });

      const date = new Date(r.created_at);
      if (date >= weekAgo) thisWeek++;
      if (date.toDateString() === today) todayCount++;
    });

    // ── Render stats ──
    animateCount('an-total',  records.length);
    animateCount('an-labels', totalLabels);
    animateCount('an-today',  todayCount);

    // Card 4 — most common label
    const sortedLabels = Object.entries(labelCount).sort((a,b) => b[1]-a[1]);
    const topLabel = sortedLabels.length ? sortedLabels[0][0] : '—';
    const topEl = document.getElementById('an-top-label');
    if (topEl) {
      topEl.style.webkitTextFillColor = 'var(--accent3)';
      topEl.style.fontSize = '18px';
      topEl.style.fontWeight = '800';
      topEl.textContent = topLabel.split(',')[0].trim(); // clean label
    }

    // ── Scans per day (last 7 days) ──
    renderScansPerDayChart(records);

    // ── Top labels ──
    renderTopLabelsChart(labelCount);

    // ── Activity timeline ──
    renderActivityTimeline(records.slice(0, 8));

  } catch(err) {
    console.error('Analytics error:', err);
    const empty = document.getElementById('analyticsEmpty');
    if (empty) {
      empty.style.display = 'block';
      const lastDiv = empty.querySelector('div:last-child');
      if (lastDiv) lastDiv.textContent = 'Error loading data: ' + err.message;
    }
  }
}

function showAnalyticsSkeleton() {
  // Stats skeletons
  ['an-total','an-labels','an-today','an-top-label'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = '—'; }
  });
  // Chart skeletons
  const scansChart = document.getElementById('scansChart');
  if (scansChart) scansChart.innerHTML = '<div class="skeleton" style="height:160px;width:100%;"></div>';
  const labelsChart = document.getElementById('labelsChart');
  if (labelsChart) labelsChart.innerHTML = '<div class="skeleton" style="height:180px;width:100%;"></div>';
  const activityTimeline = document.getElementById('activityTimeline');
  if (activityTimeline) activityTimeline.innerHTML = '<div class="skeleton" style="height:120px;width:100%;"></div>';
}

// ── Scans Per Day Bar Chart ──
function renderScansPerDayChart(records) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      label: d.toLocaleDateString('en', { weekday: 'short' }),
      date:  d.toDateString(),
      count: 0
    });
  }

  records.forEach(r => {
    const d = new Date(r.created_at).toDateString();
    const day = days.find(x => x.date === d);
    if (day) day.count++;
  });

  const max = Math.max(...days.map(d => d.count), 1);

  let html = '<div class="day-bars">';
  days.forEach(day => {
    const pct = Math.round((day.count / max) * 100);
    const heightPx = Math.max(Math.round((day.count / max) * 140), day.count > 0 ? 8 : 4);
    if (day.count === 0) {
      html += `<div class="day-bar-wrap">
        <div class="day-count" style="opacity:0.3">0</div>
        <div class="day-bar-zero"></div>
        <div class="day-label">${day.label}</div>
      </div>`;
    } else {
      html += `<div class="day-bar-wrap">
        <div class="day-count">${day.count}</div>
        <div class="day-bar" style="height:${heightPx}px" data-count="${day.count}">
          <div class="day-bar-tooltip">${day.count} scan${day.count!==1?'s':''}</div>
        </div>
        <div class="day-label">${day.label}</div>
      </div>`;
    }
  });
  html += '</div>';
  const el = document.getElementById('scansChart');
  if (el) el.innerHTML = html;
}

// ── Top Labels Horizontal Bar Chart ──
function renderTopLabelsChart(labelCount) {
  const sorted = Object.entries(labelCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const labelsChartEl = document.getElementById('labelsChart');
  if (!labelsChartEl) return;

  if (!sorted.length) {
    labelsChartEl.innerHTML = '<div class="empty-state" style="padding:24px;"><div>No labels yet</div></div>';
    return;
  }

  const max = sorted[0][1];
  let html = '';

  sorted.forEach(([name, count], i) => {
    const pct = Math.round((count / max) * 100);
    // Gradient shifts per item
    const hue = (i * 35) % 360;
    html += `<div class="label-bar-row">
      <div class="label-bar-name" title="${name}">${name}</div>
      <div class="label-bar-track">
        <div class="label-bar-fill" data-width="${pct}" style="background:linear-gradient(90deg,hsl(${hue},70%,60%),hsl(${(hue+40)%360},70%,65%))"></div>
      </div>
      <div class="label-bar-count">${count}</div>
    </div>`;
  });

  labelsChartEl.innerHTML = html;

  // Animate bars
  setTimeout(function() {
    document.querySelectorAll('#labelsChart [data-width]').forEach(function(bar) {
      bar.style.width = bar.getAttribute('data-width') + '%';
    });
  }, 200);
}

// ── Activity Timeline ──
function renderActivityTimeline(records) {
  const timelineEl = document.getElementById('activityTimeline');
  if (!timelineEl) return;
  if (!records.length) {
    timelineEl.innerHTML = '<div class="empty-state" style="padding:16px;"><div>No activity yet</div></div>';
    return;
  }

  let html = '<div class="timeline">';
  records.forEach(r => {
    const labels = parseField(r.labels).slice(0, 3);
    const time = timeAgo(new Date(r.created_at));
    const emoji = getImageEmoji(labels);

    html += `<div class="timeline-item">
      <div class="timeline-dot">${emoji}</div>
      <div class="timeline-body">
        <div class="timeline-title">${r.filename || 'image'}</div>
        <div class="timeline-labels">`;
    labels.forEach(l => {
      html += `<span class="timeline-label">${l.name||l.label||l}</span>`;
    });
    html += `</div>
        <div class="timeline-time">🕓 ${time}</div>
      </div>`;
    if (r.image_url) {
      html += `<img class="timeline-img" src="${r.image_url}" alt="${r.filename}" loading="lazy" onerror="this.style.display='none'"/>`;
    }
    html += `</div>`;
  });
  html += '</div>';
  timelineEl.innerHTML = html;
}

// ── Helpers ──
function timeAgo(date) {
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  return Math.floor(diff/86400) + 'd ago';
}

function getImageEmoji(labels) {
  const str = labels.map(l => (l.name||l.label||l||'').toLowerCase()).join(' ');
  if (str.includes('dog') || str.includes('cat') || str.includes('animal')) return '🐾';
  if (str.includes('car') || str.includes('vehicle') || str.includes('truck')) return '🚗';
  if (str.includes('food') || str.includes('pizza') || str.includes('fruit')) return '🍕';
  if (str.includes('person') || str.includes('face') || str.includes('human')) return '👤';
  if (str.includes('building') || str.includes('city') || str.includes('architecture')) return '🏢';
  if (str.includes('nature') || str.includes('tree') || str.includes('flower')) return '🌿';
  if (str.includes('text') || str.includes('book') || str.includes('document')) return '📄';
  return '🖼️';
}


// ╔══════════════════════════════════════════════════════════════╗
// ║           NEW FUTURISTIC INTERACTIVE FEATURES               ║
// ╚══════════════════════════════════════════════════════════════╝


// ══════════════════════════════════════
// FEATURE 1 — PARTICLE CANVAS SYSTEM
// ══════════════════════════════════════
function initParticles() {
  const canvas = document.getElementById('particleBg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  let mouse = { x: null, y: null };
  const PARTICLE_COUNT = 80;
  const CONNECTION_DISTANCE = 120;
  const MOUSE_RADIUS = 150;
  let animId = null;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.radius = Math.random() * 1.5 + 0.5;
      this.opacity = Math.random() * 0.5 + 0.2;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
      if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
      // Mouse interaction — particles gently pushed away
      if (mouse.x !== null) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS) {
          const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS * 0.02;
          this.vx += dx / dist * force;
          this.vy += dy / dist * force;
        }
      }
      // Damping
      this.vx *= 0.999;
      this.vy *= 0.999;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(99,102,241,${this.opacity})`;
      ctx.fill();
    }
  }

  function init() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());
  }

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECTION_DISTANCE) {
          const opacity = (1 - dist / CONNECTION_DISTANCE) * 0.15;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(99,102,241,${opacity})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    drawConnections();
    animId = requestAnimationFrame(animate);
  }

  resize();
  init();
  animate();
  window.addEventListener('resize', () => { resize(); init(); });
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; });
}


// ══════════════════════════════════════
// FEATURE 2 — COMMAND PALETTE (Ctrl+K)
// ══════════════════════════════════════
const CMD_ITEMS = [
  { icon: '📤', label: 'Upload Image', shortcut: 'U', action: () => { document.getElementById('fileInput')?.click(); } },
  { icon: '🎯', label: 'Run Demo Scan', shortcut: '', action: () => { if (typeof runDemoScan === 'function') runDemoScan(); } },
  { icon: '🕓', label: 'View History', shortcut: '', action: () => { if (typeof showTab === 'function') showTab('history', document.getElementById('tab-btn-history')); } },
  { icon: '📊', label: 'View Analytics', shortcut: '', action: () => { if (typeof showTab === 'function') showTab('analytics', document.getElementById('tab-btn-analytics')); } },
  { icon: '🏗', label: 'Architecture', shortcut: '', action: () => { window.location.href = 'architecture.html'; } },
  { icon: '🌙', label: 'Toggle Theme', shortcut: 'Ctrl+D', action: () => { toggleTheme(); } },
  { icon: '⬆️', label: 'Back to Top', shortcut: '', action: () => { window.scrollTo({ top: 0, behavior: 'smooth' }); } },
  { icon: '🔄', label: 'Check API Status', shortcut: '', action: () => { checkApiStatus(); } },
];

function openCmdPalette() {
  const el = document.getElementById('cmdPalette');
  if (!el) return;
  el.classList.add('visible');
  const input = document.getElementById('cmdInput');
  if (input) {
    input.value = '';
    input.focus();
    // Attach real-time filter listener (only once)
    if (!input._cmdListenerAttached) {
      input.addEventListener('input', function() {
        renderCmdResults(this.value);
      });
      input._cmdListenerAttached = true;
    }
  }
  renderCmdResults('');
}

function closeCmdPalette() {
  const el = document.getElementById('cmdPalette');
  if (el) el.classList.remove('visible');
}

function renderCmdResults(query) {
  const results = document.getElementById('cmdResults');
  if (!results) return;
  const filtered = CMD_ITEMS.filter(item =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );
  if (!filtered.length) {
    results.innerHTML = '<div class="cmd-empty">No commands found</div>';
    return;
  }
  results.innerHTML = filtered.map((item, i) =>
    `<div class="cmd-item${i === 0 ? ' active' : ''}" data-cmd-index="${CMD_ITEMS.indexOf(item)}" onclick="executeCmdItem(${CMD_ITEMS.indexOf(item)})" onmouseenter="this.parentNode.querySelectorAll('.cmd-item').forEach(x=>x.classList.remove('active'));this.classList.add('active')">
      <span class="cmd-item-icon">${item.icon}</span>
      <span class="cmd-item-label">${item.label}</span>
      ${item.shortcut ? `<kbd class="cmd-shortcut">${item.shortcut}</kbd>` : ''}
    </div>`
  ).join('');
}

function executeCmdItem(index) {
  closeCmdPalette();
  CMD_ITEMS[index]?.action();
}

function navigateCmdResults(direction) {
  const results = document.getElementById('cmdResults');
  if (!results) return;
  const items = results.querySelectorAll('.cmd-item');
  if (!items.length) return;
  let activeIndex = -1;
  items.forEach((item, i) => {
    if (item.classList.contains('active')) activeIndex = i;
  });
  items.forEach(item => item.classList.remove('active'));
  let newIndex = activeIndex + direction;
  if (newIndex < 0) newIndex = items.length - 1;
  if (newIndex >= items.length) newIndex = 0;
  items[newIndex].classList.add('active');
  items[newIndex].scrollIntoView({ block: 'nearest' });
}

function executeActiveCmdItem() {
  const results = document.getElementById('cmdResults');
  if (!results) return;
  const active = results.querySelector('.cmd-item.active');
  if (active) {
    const index = parseInt(active.getAttribute('data-cmd-index'));
    if (!isNaN(index)) executeCmdItem(index);
  }
}

// Close command palette on backdrop click
document.addEventListener('click', e => {
  const cmdPalette = document.getElementById('cmdPalette');
  if (cmdPalette && cmdPalette.classList.contains('visible')) {
    // If clicked directly on the backdrop (not the inner modal)
    if (e.target === cmdPalette) {
      closeCmdPalette();
    }
  }
});


// ══════════════════════════════════════
// FEATURE 3 — LIVE CLOCK
// ══════════════════════════════════════
function initLiveClock() {
  const el = document.getElementById('liveClock');
  if (!el) return;
  function update() {
    const now = new Date();
    el.textContent = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }
  update();
  setInterval(update, 1000);
}


// ══════════════════════════════════════
// FEATURE 4 — MAGNETIC BUTTON EFFECT
// ══════════════════════════════════════
function initMagneticButtons() {
  document.querySelectorAll('.btn-primary, .btn-analyze, .fab-btn').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
}


// ══════════════════════════════════════
// FEATURE 5 — RIPPLE EFFECT ON BUTTONS
// ══════════════════════════════════════
function initRippleEffect() {
  document.querySelectorAll('button, .tab, .smart-action, .nav-links a').forEach(el => {
    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });
}


// ══════════════════════════════════════
// FEATURE 6 — TYPEWRITER EFFECT
// ══════════════════════════════════════
function initTypewriter() {
  const el = document.getElementById('heroTyping');
  if (!el) return;
  const text = el.textContent;
  el.textContent = '';
  let i = 0;
  function type() {
    if (i < text.length) {
      el.textContent += text.charAt(i);
      i++;
      setTimeout(type, 50 + Math.random() * 30);
    }
  }
  setTimeout(type, 800); // delay after page load
}


// ══════════════════════════════════════
// FEATURE 9 — FAB MENU TOGGLE
// ══════════════════════════════════════
function toggleFabMenu() {
  const menu = document.getElementById('fabMenu');
  const btn = document.getElementById('fabBtn');
  if (!menu) return;
  menu.classList.toggle('visible');
  if (btn) btn.textContent = menu.classList.contains('visible') ? '✕' : '⚡';
}


// ══════════════════════════════════════
// FEATURE 10 — PAGE TRANSITION
// ══════════════════════════════════════
function initPageTransition() {
  const transition = document.getElementById('pageTransition');
  if (transition) {
    setTimeout(() => transition.remove(), 600);
  }
  // Add transition on link clicks to architecture/index page
  document.querySelectorAll('a[href*="architecture"], a[href*="index"]').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const href = this.href;
      const div = document.createElement('div');
      div.className = 'page-transition';
      div.style.animation = 'pageSlideIn 0.4s ease forwards';
      document.body.appendChild(div);
      setTimeout(() => window.location.href = href, 400);
    });
  });
}

// ══════════════════════════════════════
// DELETE SCAN RECORD
// ══════════════════════════════════════
async function deleteRecord(id) {
  if (!confirm('Delete this scan? This cannot be undone.')) return;

  try {
    const authHeaders = await getAuthHeaders();

    // Delete from Supabase via backend
    const res = await fetch(`${BACKEND}/api/history/${id}`, {
      method: 'DELETE',
      headers: authHeaders
    });

    if (res.ok) {
      // Remove from local array
      allHistory = allHistory.filter(r => r.id !== id);
      renderHistory(allHistory);
      showToast('Scan deleted successfully', 'success');

      // Update stats
      loadStats();
    } else {
      // If backend delete not yet implemented, delete directly via Supabase
      const SUPABASE_URL  = document.querySelector('[data-sburl]')?.dataset?.sburl || window.SUPABASE_URL;
      const SUPABASE_ANON = document.querySelector('[data-sbkey]')?.dataset?.sbkey  || window.SUPABASE_ANON;

      if (sbClient) {
        const { error } = await sbClient
          .from('scan_history')
          .delete()
          .eq('id', id);

        if (!error) {
          allHistory = allHistory.filter(r => r.id !== id);
          renderHistory(allHistory);
          showToast('Scan deleted successfully', 'success');
          loadStats();
        } else {
          showToast('Delete failed: ' + error.message, 'error');
        }
      } else {
        showToast('Could not delete. Please try again.', 'error');
      }
    }
  } catch(err) {
    // Fallback: use Supabase client directly
    if (typeof sbClient !== 'undefined' && sbClient) {
      const { error } = await sbClient
        .from('scan_history')
        .delete()
        .eq('id', id);

      if (!error) {
        allHistory = allHistory.filter(r => r.id !== id);
        renderHistory(allHistory);
        showToast('Scan deleted!', 'success');
        loadStats();
      } else {
        showToast('Delete failed.', 'error');
      }
    }
  }
}
