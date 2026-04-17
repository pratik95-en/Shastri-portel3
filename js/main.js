/* ================================================
   शास्त्री पोर्टल v3 — main.js
   Night mode FIXED · 7 Themes · Chapter read-only
   ================================================ */
'use strict';

/* ── State ── */
const App = {
  page: 'home',
  yearId: null,
  subjectId: null,
  theme: localStorage.getItem('sp_theme') || 'light',
  fontSize: +(localStorage.getItem('sp_fontsize') || 16),
  notes: JSON.parse(localStorage.getItem('sp_notes') || '[]'),
  bookmarks: JSON.parse(localStorage.getItem('sp_bookmarks') || '[]'),
  history: JSON.parse(localStorage.getItem('sp_history') || '[]'),
  chaptersCache: {},   // loaded from JSON files
  editNoteId: null,
  newsIdx: 0,
  data: null,
};

/* ── Subject config ── */
const SUBJ = {
  nepali:   { label:'नेपाली साहित्य',    icon:'📜', g:'#FFE0B2,#FF8A65' },
  english:  { label:'English Literature', g:'#C8E6C9,#43A047' },
  sanskrit: { label:'संस्कृत साहित्य',   icon:'🕉️', g:'#D1C4E9,#7B1FA2' },
  vyakaran: { label:'व्याकरण',           icon:'✏️', g:'#BBDEFB,#1565C0' },
  jyotish:  { label:'ज्योतिष शास्त्र',  icon:'⭐', g:'#FFF9C4,#F57F17' },
};

const THEMES = [
  { id:'light',  label:'Warm Saffron',  dot:'td-saffron', emoji:'🟠' },
  { id:'green',  label:'Forest Green',  dot:'td-green',   emoji:'🟢' },
  { id:'blue',   label:'Ocean Blue',    dot:'td-blue',    emoji:'🔵' },
  { id:'purple', label:'Royal Purple',  dot:'td-purple',  emoji:'🟣' },
  { id:'rose',   label:'Rose Gold',     dot:'td-rose',    emoji:'🌸' },
  { id:'slate',  label:'Slate Gray',    dot:'td-slate',   emoji:'🩶' },
  { id:'dark',   label:'Midnight Dark', dot:'td-dark',    emoji:'🌑' },
];

/* ════════════════════════════════════
   BOOT
   ════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  applyTheme(App.theme, false);
  applyFontSize(App.fontSize, false);
  await loadData();
  renderHome();
  startClock();
  initSearch();
  initNews();
  initNav();
  initNotes();
  initDotsMenu();
  initBackgroundCanvas();
});

/* ════════════════════════════════════
   DATA
   ════════════════════════════════════ */
async function loadData() {
  try {
    const r = await fetch('data/books.json');
    App.data = await r.json();
  } catch { App.data = makeFallback(); }
}

function makeFallback() {
  const mk = (pre, lbl, n) => Array.from({length:n},(_,i)=>({
    id:`${pre}_${i+1}`, title:`${lbl} ${['१','२','३'][i]}`,
    author:'लेखकको नाम', cover:'', description:`${lbl} — विवरण`, pdf:''
  }));
  const yr = (id,t,s,c) => ({id,title:t,subtitle:s,color:c,subjects:{
    nepali:  mk(`nep${id}`,'नेपाली साहित्य',3),
    english: mk(`eng${id}`,'English Literature',3),
    sanskrit:mk(`san${id}`,'संस्कृत साहित्य',3),
    vyakaran:mk(`vya${id}`,'व्याकरण',2),
    jyotish: mk(`jyo${id}`,'ज्योतिष शास्त्र',2),
  }});
  return {
    years:[yr(1,'प्रथम वर्ष','पहिलो वर्ष','o'),yr(2,'द्वितीय वर्ष','दोस्रो वर्ष','g'),
           yr(3,'तृतीय वर्ष','तेस्रो वर्ष','b'),yr(4,'चतुर्थ वर्ष','चौथो वर्ष','p')],
    news:[]
  };
}

/* ════════════════════════════════════
   THEME  ← KEY FIX
   ════════════════════════════════════ */
function applyTheme(t, save=true) {
  App.theme = t;
  // Apply on both html AND body — belt & suspenders
  document.documentElement.setAttribute('data-theme', t);
  document.body.setAttribute('data-theme', t);
  // Set color-scheme for browser chrome (scrollbars, inputs)
  document.documentElement.style.colorScheme = (t === 'dark') ? 'dark' : 'light';
  if (save) localStorage.setItem('sp_theme', t);

  // Sync theme button emoji
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = (t === 'dark') ? '☀️' : '🌙';

  // Sync dots menu active dot
  document.querySelectorAll('.theme-dot').forEach(d =>
    d.classList.toggle('active', d.dataset.theme === t)
  );

  // Sync dots-menu dark toggle (if visible)
  const tog = document.getElementById('darkMenuTog');
  if (tog) tog.classList.toggle('on', t === 'dark');

  // Force canvas redraw with new theme colors
  if (window._bgCanvas) drawBg();
}

function applyFontSize(sz, save=true) {
  App.fontSize = sz;
  document.documentElement.style.fontSize = sz + 'px';
  if (save) localStorage.setItem('sp_fontsize', sz);
  const lbl = document.getElementById('fontSizeLbl');
  if (lbl) lbl.textContent = sz + 'px';
  const sl = document.getElementById('fontSizeSlider');
  if (sl) sl.value = sz;
}

/* ════════════════════════════════════
   ANIMATED CANVAS BACKGROUND
   ════════════════════════════════════ */
function initBackgroundCanvas() {
  const c = document.getElementById('bgCanvas');
  if (!c) return;
  window._bgCanvas = c;
  window._bgCtx = c.getContext('2d');
  resizeBg();
  window.addEventListener('resize', resizeBg);
  animateBg();
}

function resizeBg() {
  const c = window._bgCanvas;
  if (!c) return;
  c.width = window.innerWidth;
  c.height = window.innerHeight;
}

let _bgT = 0;
function animateBg() {
  _bgT += 0.003;
  drawBg();
  requestAnimationFrame(animateBg);
}

function drawBg() {
  const c = window._bgCanvas;
  const ctx = window._bgCtx;
  if (!c || !ctx) return;
  const W = c.width, H = c.height;
  const t = App.theme;

  // Theme color maps
  const colors = {
    light:  { bg:'#EAE6DE', a:'rgba(245,192,122,0.55)', b:'rgba(168,216,176,0.45)', c:'rgba(144,196,232,0.40)', d:'rgba(196,168,224,0.40)' },
    green:  { bg:'#E2EDE6', a:'rgba(168,228,184,0.55)', b:'rgba(212,240,168,0.45)', c:'rgba(136,200,168,0.40)', d:'rgba(184,232,200,0.40)' },
    blue:   { bg:'#DDE8F4', a:'rgba(144,200,248,0.55)', b:'rgba(168,216,255,0.45)', c:'rgba(200,232,255,0.40)', d:'rgba(136,184,232,0.40)' },
    purple: { bg:'#EAE2F5', a:'rgba(200,168,240,0.55)', b:'rgba(224,200,255,0.45)', c:'rgba(184,136,232,0.40)', d:'rgba(216,184,255,0.40)' },
    rose:   { bg:'#F2E8EC', a:'rgba(248,184,200,0.55)', b:'rgba(255,216,224,0.45)', c:'rgba(240,168,184,0.40)', d:'rgba(232,200,216,0.40)' },
    slate:  { bg:'#E0E6EC', a:'rgba(184,200,216,0.55)', b:'rgba(200,216,232,0.45)', c:'rgba(168,184,200,0.40)', d:'rgba(208,220,232,0.40)' },
    dark:   { bg:'#0C0A07', a:'rgba(180,90,20,0.45)',   b:'rgba(40,110,60,0.38)',  c:'rgba(30,80,160,0.38)',  d:'rgba(90,50,160,0.32)' },
  };
  const col = colors[t] || colors.light;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = col.bg;
  ctx.fillRect(0, 0, W, H);

  const blobs = [
    { x: 0.15 + Math.sin(_bgT*0.7)*0.08, y: 0.18 + Math.cos(_bgT*0.5)*0.06, r:0.55, col:col.a },
    { x: 0.82 + Math.cos(_bgT*0.6)*0.08, y: 0.15 + Math.sin(_bgT*0.8)*0.07, r:0.48, col:col.b },
    { x: 0.12 + Math.sin(_bgT*0.9)*0.07, y: 0.82 + Math.cos(_bgT*0.4)*0.06, r:0.52, col:col.c },
    { x: 0.80 + Math.cos(_bgT*0.5)*0.07, y: 0.80 + Math.sin(_bgT*0.7)*0.06, r:0.46, col:col.d },
  ];

  blobs.forEach(b => {
    const grd = ctx.createRadialGradient(b.x*W, b.y*H, 0, b.x*W, b.y*H, b.r * Math.min(W,H));
    grd.addColorStop(0, b.col);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
  });

  // Dark overlay for dark theme
  if (t === 'dark') {
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.fillRect(0, 0, W, H);
  }
}

/* ════════════════════════════════════
   CLOCK
   ════════════════════════════════════ */
function startClock() { tick(); setInterval(tick, 1000); }
function tick() {
  const now = new Date();
  const te = document.getElementById('dtTime');
  const de = document.getElementById('dtDate');
  const be = document.getElementById('dtBS');
  if (te) te.textContent = `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
  if (de) {
    const days=['आइत','सोम','मङ्गल','बुध','बिही','शुक्र','शनि'];
    const mons=['जनवरी','फेब्रुअरी','मार्च','अप्रिल','मई','जुन','जुलाई','अगस्ट','सेप्टेम्बर','अक्टोबर','नोभेम्बर','डिसेम्बर'];
    de.textContent = `${days[now.getDay()]}, ${now.getDate()} ${mons[now.getMonth()]}`;
  }
  if (be) be.textContent = adToBs(now);
}
function p(n) { return String(n).padStart(2,'0'); }
function adToBs(d) {
  const bsY = d.getFullYear() + (d.getMonth()<3||(d.getMonth()===3&&d.getDate()<14)?56:57);
  const ms=['बैशाख','जेठ','असार','श्रावण','भाद्र','आश्विन','कार्तिक','मंसिर','पुष','माघ','फागुन','चैत्र'];
  return toN(bsY)+' '+ms[(d.getMonth()+8)%12];
}
function toN(n){ return String(n).replace(/[0-9]/g,d=>'०१२३४५६७८९'[d]); }

/* ════════════════════════════════════
   3-DOTS MENU
   ════════════════════════════════════ */
function initDotsMenu() {
  const btn = document.getElementById('dotsBtn');
  const menu = document.getElementById('dotsMenu');
  if (!btn||!menu) return;

  btn.addEventListener('click', e => {
    e.stopPropagation();
    menu.classList.toggle('open');
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.dots-menu-wrap')) menu.classList.remove('open');
  });

  // Build theme dots
  const dotsWrap = document.getElementById('themeDots');
  if (dotsWrap) {
    dotsWrap.innerHTML = THEMES.map(th => `
      <div class="theme-dot ${th.dot} ${App.theme===th.id?'active':''}"
           data-theme="${th.id}" title="${th.label}"
           onclick="applyTheme('${th.id}')">
        ${App.theme===th.id?'✓':''}
      </div>`).join('');
  }

  // Dark toggle in menu
  const darkTog = document.getElementById('darkMenuTog');
  if (darkTog) {
    darkTog.classList.toggle('on', App.theme==='dark');
    darkTog.addEventListener('click', () => applyTheme(App.theme==='dark'?'light':'dark'));
  }

  // Font slider
  const sl = document.getElementById('fontSizeSlider');
  const lb = document.getElementById('fontSizeLbl');
  if (sl) {
    sl.value = App.fontSize;
    sl.addEventListener('input', () => {
      applyFontSize(+sl.value);
      if (lb) lb.textContent = sl.value+'px';
    });
  }

  // Share
  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) shareBtn.addEventListener('click', () => {
    if (navigator.share) navigator.share({ title:'शास्त्री पोर्टल', url:location.href });
    else { navigator.clipboard.writeText(location.href); toast('Link copied! ✓'); }
    menu.classList.remove('open');
  });
}

/* ════════════════════════════════════
   NAVIGATION
   ════════════════════════════════════ */
function initNav() {
  document.querySelectorAll('.nav-item').forEach(el =>
    el.addEventListener('click', () => go(el.dataset.page))
  );
}

function go(page, data={}) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('on'));
  const pg = document.getElementById('p-'+page);
  if (pg) { pg.classList.add('on'); App.page = page; }
  const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (nav) nav.classList.add('on');

  if (page==='year'&&data.yearId)       { App.yearId=data.yearId; renderYearPage(data.yearId); }
  else if (page==='subject'&&data.subjectId) { App.subjectId=data.subjectId; App.yearId=data.yearId; renderSubjectPage(data.subjectId,data.yearId); }
  else if (page==='notes')   renderNotes();
  else if (page==='profile') renderProfile();
  else if (page==='courses') renderCourses('all');
  window.scrollTo(0,0);
}
window.go = go;

/* ════════════════════════════════════
   HOME
   ════════════════════════════════════ */
function renderHome() {
  if (!App.data) return;
  const grid = document.getElementById('yearsGrid');
  if (!grid) return;
  const yClr = ['o','g','b','p'];
  grid.innerHTML = App.data.years.map((yr,i) => {
    const total = Object.values(yr.subjects).reduce((a,b)=>a+b.length,0);
    return `
    <a class="year-card s${i+1}" onclick="go('year',{yearId:${yr.id}});return false;" href="#">
      <div class="yc-bg yc-${yClr[i]||'o'}"></div>
      <div class="yc-shine"></div><div class="yc-glare"></div>
      <div class="yc-blob yc-blob-1"></div><div class="yc-blob yc-blob-2"></div>
      <div class="yc-body">
        <div class="yc-title">${yr.title}</div>
        <div class="yc-sub">${yr.subtitle}</div>
        <div class="yc-badges">
          <span class="yc-badge">📚 ${total}</span>
          <span class="yc-badge">🕉️ संस्कृत</span>
          <span class="yc-badge">⭐ ज्योतिष</span>
        </div>
      </div>
      <div class="yc-arrow">›</div>
    </a>`;
  }).join('');
  renderTicker();
  renderNewsCards();
}

/* ════════════════════════════════════
   TICKER
   ════════════════════════════════════ */
function renderTicker() {
  const el = document.getElementById('tickerInner');
  if (!el||!App.data?.news?.length) return;
  const dbl = [...App.data.news,...App.data.news];
  el.innerHTML = dbl.map(n=>`<span class="t-item" onclick="openNews(${n.id})">${n.title}</span>`).join('');
}

/* ════════════════════════════════════
   NEWS CARDS  (with photo support)
   ════════════════════════════════════ */
function renderNewsCards() {
  const track = document.getElementById('newsTrack');
  const dots  = document.getElementById('newsDots');
  if (!track||!App.data?.news?.length) return;
  const cc = {परीक्षा:'cat-e',पाठ्यक्रम:'cat-c',छात्रवृत्ति:'cat-s',कार्यक्रम:'cat-ev',कार्यशाला:'cat-w'};
  track.innerHTML = App.data.news.map(n => {
    const imgHtml = n.image
      ? `<img class="nc-img" src="${n.image}" alt="${n.title}" loading="lazy" onerror="this.style.display='none'">`
      : '';
    return `
    <div class="news-card" onclick="openNews(${n.id})">
      ${imgHtml}
      <div class="nc-body">
        <div class="nc-top">
          <span class="nc-cat ${cc[n.category]||'cat-ev'}">${n.category}</span>
          <span class="nc-date">${n.date}</span>
        </div>
        <div class="nc-title">${n.title}</div>
        <div class="nc-text">${n.content}</div>
      </div>
    </div>`;
  }).join('');
  dots.innerHTML = App.data.news.map((_,i)=>
    `<div class="nd${i===0?' on':''}" onclick="setNews(${i})"></div>`
  ).join('');
}

function initNews() { setInterval(()=>{ if(App.data?.news) setNews((App.newsIdx+1)%App.data.news.length); },4500); }

function setNews(idx) {
  App.newsIdx = idx;
  const track = document.getElementById('newsTrack');
  if (!track||!track.children.length) return;
  const w = track.children[0].offsetWidth + 12;
  track.style.transform = `translateX(-${idx*w}px)`;
  document.querySelectorAll('.nd').forEach((d,i)=>d.classList.toggle('on',i===idx));
}
window.setNews = setNews;

function openNews(id) {
  const n = App.data?.news?.find(x=>x.id===id);
  if (!n) return;
  document.getElementById('newsMTitle').textContent = n.title;
  document.getElementById('newsMDate').textContent  = n.date;
  document.getElementById('newsMBody').textContent  = n.content;
  const img = document.getElementById('newsMImg');
  if (img) { img.src = n.image||''; img.style.display = n.image?'block':'none'; }
  openOv('newsModal');
}
window.openNews = openNews;

// Swipe for news
(function(){
  let sx=0;
  document.addEventListener('DOMContentLoaded',()=>{
    const el = document.getElementById('newsOverflow');
    if (!el) return;
    el.addEventListener('touchstart',e=>sx=e.touches[0].clientX,{passive:true});
    el.addEventListener('touchend',e=>{
      const dx=sx-e.changedTouches[0].clientX;
      if(Math.abs(dx)>40&&App.data?.news){
        const t=App.data.news.length;
        setNews(dx>0?(App.newsIdx+1)%t:(App.newsIdx-1+t)%t);
      }
    },{passive:true});
  });
})();

/* ════════════════════════════════════
   YEAR PAGE
   ════════════════════════════════════ */
function renderYearPage(yearId) {
  const yr = App.data.years.find(y=>y.id===yearId);
  if (!yr) return;
  const yClr = ['o','g','b','p'];
  const ci = yearId-1;
  const el = document.getElementById('p-year');
  el.innerHTML = `
  <div class="content">
    <a class="back-btn" onclick="go('home');return false;" href="#">← फिर्ता</a>
    <div class="yr-head yc-bg yc-${yClr[ci]||'o'} s1" style="position:relative;overflow:hidden">
      <div class="yc-shine" style="position:absolute;inset:0"></div>
      <div class="yc-glare" style="position:absolute;top:0;left:0;right:0;height:48%"></div>
      <div style="position:relative;z-index:2">
        <div class="yr-head-title" style="color:${['#5A2800','#0A3010','#082050','#280650'][ci]||'#1A1209'};${ci===3&&App.theme==='dark'?'color:white':''}">${yr.title}</div>
        <div class="yr-head-sub" style="color:${['#5A2800','#0A3010','#082050','#280650'][ci]||'#5C4A2A'}">${yr.subtitle}</div>
        <div class="prog-bar"><div class="prog-fill" style="width:${getYrPct(yearId)}%"></div></div>
        <div class="prog-lbl" style="color:${['#5A2800','#0A3010','#082050','#280650'][ci]}">${getYrPct(yearId)}% अध्ययन भयो</div>
      </div>
    </div>
    ${Object.entries(yr.subjects).map(([key,books])=>{
      const s=SUBJ[key]||{label:key,icon:'📚',g:'#EEE,#CCC'};
      return `
      <div class="subj-grp">
        <div class="subj-grp-head">
          <div class="subj-grp-ico">${s.icon}</div>${s.label}
        </div>
        <div class="books-grid">
          ${books.map(b=>bookCardHtml(b,yr.id,key)).join('')}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function getYrPct(yid) {
  const yr=App.data.years.find(y=>y.id===yid); if(!yr) return 0;
  let r=0,t=0;
  Object.values(yr.subjects).forEach(books=>books.forEach(b=>{t++;if(App.bookmarks.includes(b.id)||App.history.find(h=>h.id===b.id))r++;}));
  return t?Math.round((r/t)*100):0;
}

function bookCardHtml(b, yearId, key) {
  const s=SUBJ[key]||{icon:'📚',g:'#EEE,#CCC'};
  const [c1,c2]=s.g.split(',');
  const isBm=App.bookmarks.includes(b.id);
  return `
  <a class="book-card" onclick="go('subject',{subjectId:'${b.id}',yearId:${yearId}});return false;" href="#">
    <div class="book-cover-ph" style="background:linear-gradient(135deg,${c1},${c2})">
      ${b.cover?`<img src="${b.cover}" alt="${b.title}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0" onerror="this.style.display='none'">`:'' }
      <span class="bk-ico">${s.icon}</span>
      <span class="bk-lbl">COVER</span>
      ${isBm?'<span style="position:absolute;top:7px;right:7px;z-index:2;font-size:13px">🔖</span>':''}
    </div>
    <div class="book-info">
      <div class="bk-title">${b.title}</div>
      <div class="bk-author">${b.author}</div>
    </div>
  </a>`;
}

/* ════════════════════════════════════
   SUBJECT PAGE
   ════════════════════════════════════ */
function renderSubjectPage(subjectId, yearId) {
  const yr=App.data.years.find(y=>y.id===yearId); if(!yr) return;
  let book=null,key=null;
  for(const[k,books]of Object.entries(yr.subjects)){const f=books.find(b=>b.id===subjectId);if(f){book=f;key=k;break;}}
  if(!book) return;
  addHistory(book,yr);
  const s=SUBJ[key]||{icon:'📚',g:'#EEE,#CCC',label:key};
  const [c1,c2]=s.g.split(',');
  const isBm=App.bookmarks.includes(book.id);

  document.getElementById('p-subject').innerHTML = `
  <div class="content">
    <a class="back-btn" onclick="go('year',{yearId:${yearId}});return false;" href="#">← ${yr.title}</a>
    <div class="subj-hero" style="background:linear-gradient(135deg,${c1},${c2})">
      <span class="subj-hero-emoji">${s.icon}</span>
      <div class="subj-hero-overlay">
        <div><div class="sh-title">${book.title}</div><div class="sh-meta">${s.label} · ${yr.title}</div></div>
        <span class="bm-btn" onclick="toggleBm('${book.id}')">${isBm?'🔖':'🏷️'}</span>
      </div>
    </div>

    <div class="tabs-pill">
      <button class="tab-btn on"  onclick="setTab(this,'tab-ov')">विवरण</button>
      <button class="tab-btn"     onclick="setTab(this,'tab-ch')">अध्यायहरू</button>
      <button class="tab-btn"     onclick="setTab(this,'tab-nt')">नोट</button>
    </div>

    <div id="tab-ov" class="tab-pane on">
      <div class="info-card">
        <h3>📖 किताबको बारेमा</h3>
        <p>${book.description||'विवरण यहाँ राख्नुस्।'}</p>
      </div>
      <div class="info-card">
        <h3>👨‍🏫 लेखक</h3><p>${book.author}</p>
      </div>
    </div>

    <div id="tab-ch" class="tab-pane">
      <div id="chList"><div class="spin-wrap"><div class="spinner"></div></div></div>
    </div>

    <div id="tab-nt" class="tab-pane">
      <div id="bookNotes"></div>
      <button class="add-ch-btn" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px;background:var(--surface);backdrop-filter:blur(14px);border:2px dashed var(--border);border-radius:var(--r-md);cursor:pointer;font-family:var(--font);font-size:0.82rem;font-weight:700;color:var(--text-3);margin-top:6px" onclick="openNoteModal('${book.title}')">
        ➕ नोट थप्नुस्
      </button>
    </div>
  </div>`;

  loadAndRenderChapters(book.id);
  renderBookNotes(book.title);
}

function setTab(btn, tabId) {
  const p=btn.closest('.content');
  p.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('on'));
  p.querySelectorAll('.tab-pane').forEach(t=>t.classList.remove('on'));
  btn.classList.add('on');
  const pane=document.getElementById(tabId);
  if(pane) pane.classList.add('on');
}
window.setTab = setTab;

/* ════════════════════════════════════
   CHAPTERS — READ-ONLY VIEW
   Files: data/chapters/{bookId}.json
   ════════════════════════════════════ */
async function loadAndRenderChapters(bookId) {
  const el = document.getElementById('chList');
  if (!el) return;

  // Cache check
  if (!App.chaptersCache[bookId]) {
    try {
      const r = await fetch(`data/chapters/${bookId}.json`);
      if (!r.ok) throw new Error('not found');
      const d = await r.json();
      App.chaptersCache[bookId] = d.chapters || [];
    } catch {
      App.chaptersCache[bookId] = [];
    }
  }

  const chs = App.chaptersCache[bookId];
  if (!chs.length) {
    el.innerHTML = `
      <div class="empty">
        <div class="empty-ico">📖</div>
        <div class="empty-t">अध्याय छैन</div>
        <div class="empty-s">data/chapters/${bookId}.json फाइलमा अध्याय थप्नुस्</div>
      </div>`;
    return;
  }

  el.innerHTML = `<div class="ch-list">${chs.map((ch,i)=>`
    <div class="chapter-item" id="chi-${bookId}-${i}" onclick="toggleCh('${bookId}',${i})">
      <div class="ch-head">
        <div class="ch-num">${toN(i+1)}</div>
        <div class="ch-title-txt">${ch.title||('अध्याय '+(i+1))}</div>
        <span class="ch-chevron">›</span>
      </div>
      <div class="ch-read-body">
        <div class="ch-read-content">${renderMd(ch.content||'')}</div>
        <div class="ch-read-foot">
          <span class="ch-rd-lbl">अध्याय ${toN(i+1)} / ${toN(chs.length)}</span>
          ${i<chs.length-1?`<button class="ch-rd-btn" onclick="event.stopPropagation();nextCh('${bookId}',${i})">अर्को →</button>`:'<span class="ch-rd-lbl" style="color:var(--accent);font-weight:700">✓ सकियो</span>'}
        </div>
      </div>
    </div>`).join('')}</div>`;
}

function toggleCh(bookId, idx) {
  const item = document.getElementById(`chi-${bookId}-${idx}`);
  if (!item) return;
  const wasOpen = item.classList.contains('open');
  // Close all first
  document.querySelectorAll('.chapter-item.open').forEach(el => el.classList.remove('open'));
  if (!wasOpen) item.classList.add('open');
}
window.toggleCh = toggleCh;

function nextCh(bookId, idx) {
  const chs = App.chaptersCache[bookId]||[];
  if (idx+1 >= chs.length) return;
  // Close current, open next
  document.querySelectorAll('.chapter-item.open').forEach(el=>el.classList.remove('open'));
  const next = document.getElementById(`chi-${bookId}-${idx+1}`);
  if (next) {
    next.classList.add('open');
    next.scrollIntoView({behavior:'smooth',block:'start'});
  }
}
window.nextCh = nextCh;

/* ════════════════════════════════════
   MARKDOWN RENDERER
   ════════════════════════════════════ */
function renderMd(text) {
  if (!text) return '<span style="color:var(--text-4)">सामग्री छैन</span>';
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g,'<img src="$2" alt="$1">')
    .replace(/^# (.+)$/gm,'<h1>$1</h1>')
    .replace(/^## (.+)$/gm,'<h2>$1</h2>')
    .replace(/^### (.+)$/gm,'<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/==(.+?)==/g,'<span class="highlight">$1</span>')
    .replace(/^> (.+)$/gm,'<blockquote>$1</blockquote>')
    .replace(/^- (.+)$/gm,'<li>$1</li>')
    .replace(/(<li>.*?<\/li>\n?)+/gs,m=>`<ul>${m}</ul>`)
    .replace(/\n\n/g,'</p><p>')
    .replace(/\n/g,'<br>');
}

/* ════════════════════════════════════
   BOOKMARK
   ════════════════════════════════════ */
function toggleBm(bookId) {
  const idx=App.bookmarks.indexOf(bookId);
  if(idx>-1) App.bookmarks.splice(idx,1);
  else App.bookmarks.push(bookId);
  localStorage.setItem('sp_bookmarks',JSON.stringify(App.bookmarks));
  const btn=document.querySelector('.bm-btn');
  if(btn) btn.textContent=App.bookmarks.includes(bookId)?'🔖':'🏷️';
  toast(idx>-1?'Bookmark हटाइयो':'Bookmark गरियो 🔖');
}
window.toggleBm = toggleBm;

/* ════════════════════════════════════
   HISTORY
   ════════════════════════════════════ */
function addHistory(book,yr){
  App.history=App.history.filter(h=>h.id!==book.id);
  App.history.unshift({id:book.id,title:book.title,year:yr.title,time:new Date().toLocaleString('ne-NP'),yearId:yr.id});
  if(App.history.length>20) App.history=App.history.slice(0,20);
  localStorage.setItem('sp_history',JSON.stringify(App.history));
}

/* ════════════════════════════════════
   SEARCH
   ════════════════════════════════════ */
function initSearch() {
  const inp=document.getElementById('sInp');
  const clr=document.getElementById('sClr');
  const drop=document.getElementById('sDrop');
  if(!inp) return;
  inp.addEventListener('input',()=>{
    const q=inp.value.trim();
    clr.classList.toggle('show',q.length>0);
    if(q.length<2){drop.classList.remove('open');return;}
    const res=doSearch(q);
    renderDrop(res,q);
    drop.classList.add('open');
  });
  clr.addEventListener('click',()=>{inp.value='';clr.classList.remove('show');drop.classList.remove('open');inp.focus();});
  document.addEventListener('click',e=>{if(!e.target.closest('.search-glass')) drop.classList.remove('open');});
}

function doSearch(q) {
  if(!App.data) return [];
  const ql=q.toLowerCase(); const res=[];
  App.data.years.forEach(yr=>Object.entries(yr.subjects).forEach(([key,books])=>
    books.forEach(b=>{ if(b.title.toLowerCase().includes(ql)||b.author.toLowerCase().includes(ql)||yr.title.includes(q)) res.push({b,yr,key}); })
  ));
  return res.slice(0,7);
}

function renderDrop(res,q) {
  const el=document.getElementById('sDrop');
  if(!res.length){el.innerHTML=`<div class="s-empty">🔍 "${q}" भेटिएन</div>`;return;}
  el.innerHTML=res.map(({b,yr,key})=>{
    const s=SUBJ[key]||{icon:'📚',g:'#EEE,#CCC'};
    const[c1,c2]=s.g.split(',');
    return `<div class="s-row" onclick="go('subject',{subjectId:'${b.id}',yearId:${yr.id}});document.getElementById('sDrop').classList.remove('open')">
      <div class="s-ico2" style="background:linear-gradient(135deg,${c1},${c2})">${s.icon}</div>
      <div><div class="s-name">${b.title}</div><div class="s-sub">${yr.title} · ${b.author}</div></div>
    </div>`;
  }).join('');
}

/* ════════════════════════════════════
   NOTES
   ════════════════════════════════════ */
function initNotes() {
  const fab=document.getElementById('notesFab');
  if(fab) fab.addEventListener('click',()=>openNoteModal());
  document.getElementById('closeNoteModal')?.addEventListener('click',()=>closeOv('noteModal'));
  document.getElementById('noteForm')?.addEventListener('submit',e=>{e.preventDefault();saveNote();});
}

function renderNotes() {
  const el=document.getElementById('notesList');
  if(!el) return;
  if(!App.notes.length){
    el.innerHTML='<div class="empty"><div class="empty-ico">📝</div><div class="empty-t">कुनै नोट छैन</div><div class="empty-s">+ थिचेर नोट थप्नुस्</div></div>';
    return;
  }
  el.innerHTML=App.notes.map(n=>`
    <div class="note-card">
      <div class="nc2-head">
        <div class="nc2-title">${n.title}</div>
        <div class="nc2-actions">
          <button class="nc2-btn" onclick="editNote('${n.id}')">✏️</button>
          <button class="nc2-btn del" onclick="delNote('${n.id}')">🗑️</button>
        </div>
      </div>
      <div class="nc2-body">${n.content}</div>
      <div class="nc2-foot">
        <span class="nc2-date">${n.date}</span>
        ${n.subject?`<span class="nc2-tag">${n.subject}</span>`:''}
      </div>
    </div>`).join('');
}

function renderBookNotes(subj) {
  const el=document.getElementById('bookNotes');
  if(!el) return;
  const notes=App.notes.filter(n=>n.subject===subj);
  if(!notes.length){el.innerHTML='<div class="empty"><div class="empty-ico">📝</div><div class="empty-t">यो किताबको नोट छैन</div></div>';return;}
  el.innerHTML=notes.map(n=>`<div class="note-card"><div class="nc2-title">${n.title}</div><div class="nc2-body">${n.content}</div><div class="nc2-foot"><span class="nc2-date">${n.date}</span></div></div>`).join('');
}

function openNoteModal(subj='') {
  App.editNoteId=null;
  document.getElementById('noteMT').textContent='नयाँ नोट';
  document.getElementById('nTitle').value='';
  document.getElementById('nContent').value='';
  document.getElementById('nSubject').value=subj;
  openOv('noteModal');
}
window.openNoteModal = openNoteModal;

function saveNote() {
  const t=document.getElementById('nTitle').value.trim();
  const c=document.getElementById('nContent').value.trim();
  const s=document.getElementById('nSubject').value.trim();
  if(!t||!c){toast('शीर्षक र सामग्री आवश्यक!');return;}
  if(App.editNoteId){const n=App.notes.find(x=>x.id===App.editNoteId);if(n) Object.assign(n,{title:t,content:c,subject:s});}
  else App.notes.unshift({id:Date.now().toString(),title:t,content:c,subject:s,date:new Date().toLocaleDateString('ne-NP')});
  localStorage.setItem('sp_notes',JSON.stringify(App.notes));
  closeOv('noteModal');
  renderNotes();
  toast('नोट सुरक्षित ✓');
}

function editNote(id){
  const n=App.notes.find(x=>x.id===id);if(!n) return;
  App.editNoteId=id;
  document.getElementById('noteMT').textContent='नोट सम्पादन';
  document.getElementById('nTitle').value=n.title;
  document.getElementById('nContent').value=n.content;
  document.getElementById('nSubject').value=n.subject||'';
  openOv('noteModal');
}
window.editNote=editNote;

function delNote(id){App.notes=App.notes.filter(n=>n.id!==id);localStorage.setItem('sp_notes',JSON.stringify(App.notes));renderNotes();toast('नोट मेटियो');}
window.delNote=delNote;

/* ════════════════════════════════════
   COURSES
   ════════════════════════════════════ */
function renderCourses(filter='all') {
  const el=document.getElementById('coursesList');
  if(!el||!App.data) return;
  document.querySelectorAll('.cf-chip').forEach(c=>c.classList.toggle('on',c.dataset.key===filter));
  let html='';
  App.data.years.forEach(yr=>Object.entries(yr.subjects).forEach(([key,books])=>{
    if(filter!=='all'&&key!==filter) return;
    const s=SUBJ[key]||{icon:'📚',g:'#EEE,#CCC',label:key};
    const[c1,c2]=s.g.split(',');
    books.forEach(b=>{
      html+=`<div style="display:flex;align-items:center;gap:11px;padding:11px 13px;margin-bottom:8px;background:var(--surface);backdrop-filter:blur(var(--blur));border:1px solid var(--surface-b);border-radius:var(--r-md);cursor:pointer;box-shadow:0 2px 10px var(--shadow);transition:transform 0.2s var(--ease-spring)!important"
        onclick="go('subject',{subjectId:'${b.id}',yearId:${yr.id}})"
        onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform=''">
        <div style="width:44px;height:44px;border-radius:11px;background:linear-gradient(135deg,${c1},${c2});display:flex;align-items:center;justify-content:center;font-size:21px;flex-shrink:0">${s.icon}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:0.84rem;font-weight:700;color:var(--text-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b.title}</div>
          <div style="font-size:0.7rem;color:var(--text-3);margin-top:2px">${yr.title} · ${b.author}</div>
        </div>
        <span style="color:var(--text-3);font-size:17px">›</span>
      </div>`;
    });
  }));
  el.innerHTML=html||'<div class="empty"><div class="empty-ico">📭</div><div class="empty-t">भेटिएन</div></div>';
}
window.renderCourses=renderCourses;

/* ════════════════════════════════════
   PROFILE
   ════════════════════════════════════ */
function renderProfile() {
  renderStats();
  renderHistory();
  const tog=document.getElementById('profileDarkTog');
  if(tog){tog.classList.toggle('on',App.theme==='dark');tog.onclick=()=>applyTheme(App.theme==='dark'?'light':'dark');}
  const sl=document.getElementById('profFontSlider');
  const lb=document.getElementById('profFontLbl');
  if(sl){sl.value=App.fontSize;sl.oninput=()=>{applyFontSize(+sl.value);if(lb)lb.textContent=sl.value+'px';};}
}

function renderStats() {
  let books=0,chs=0;
  if(App.data) App.data.years.forEach(yr=>Object.values(yr.subjects).forEach(bs=>{books+=bs.length;bs.forEach(b=>{chs+=(App.chaptersCache[b.id]||[]).length;});}));
  const el=document.getElementById('statsGrid');
  if(el) el.innerHTML=`
    <div class="stat-card"><div class="stat-num">${books}</div><div class="stat-lbl">📚 किताबहरू</div></div>
    <div class="stat-card"><div class="stat-num">${chs}</div><div class="stat-lbl">📖 अध्यायहरू</div></div>
    <div class="stat-card"><div class="stat-num">${App.notes.length}</div><div class="stat-lbl">📝 नोटहरू</div></div>
    <div class="stat-card"><div class="stat-num">${App.bookmarks.length}</div><div class="stat-lbl">🔖 Bookmarks</div></div>`;
}

function renderHistory() {
  const el=document.getElementById('histList');
  if(!el) return;
  if(!App.history.length){el.innerHTML='<div class="empty"><div class="empty-ico">🕐</div><div class="empty-t">इतिहास छैन</div></div>';return;}
  el.innerHTML=App.history.slice(0,8).map(h=>`
    <div class="hist-item" onclick="go('subject',{subjectId:'${h.id}',yearId:${h.yearId}})">
      <span class="hi-ico">📖</span>
      <div><div class="hi-name">${h.title}</div><div class="hi-sub">${h.year}</div></div>
      <span class="hi-time">${h.time}</span>
    </div>`).join('');
}

function exportData() {
  const d={notes:App.notes,bookmarks:App.bookmarks,history:App.history};
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:'application/json'}));
  a.download='shastri-backup-'+Date.now()+'.json';
  a.click();
  toast('Backup download भयो ✓');
}
window.exportData=exportData;

function importData(e) {
  const file=e.target.files[0]; if(!file) return;
  const r=new FileReader();
  r.onload=ev=>{
    try{
      const d=JSON.parse(ev.target.result);
      if(d.notes){App.notes=d.notes;localStorage.setItem('sp_notes',JSON.stringify(d.notes));}
      if(d.bookmarks){App.bookmarks=d.bookmarks;localStorage.setItem('sp_bookmarks',JSON.stringify(d.bookmarks));}
      if(d.history){App.history=d.history;localStorage.setItem('sp_history',JSON.stringify(d.history));}
      toast('Import भयो ✓'); renderProfile();
    }catch{toast('File गलत छ!');}
  };
  r.readAsText(file);
}
window.importData=importData;

/* ════════════════════════════════════
   OVERLAY HELPERS
   ════════════════════════════════════ */
function openOv(id){document.getElementById(id)?.classList.add('open');}
function closeOv(id){document.getElementById(id)?.classList.remove('open');}
window.openOv=openOv; window.closeOv=closeOv;

/* ════════════════════════════════════
   TOAST
   ════════════════════════════════════ */
function toast(msg) {
  const t=document.getElementById('toastEl');
  if(!t) return;
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2400);
}
window.toast=toast;

// Expose App
window.App=App;
window.applyTheme=applyTheme;
