// script.js - client app (configured for server proxy at /esv)
const APP = {
  planUrl: 'plan.json',
  esvProxyUrl: '/esv', // Express proxy endpoint (server.js)
  dayCount: 365,
  cacheKeyPrefix: 'esv_cache_',
  defaultFontSize: 18,
  minFontSize: 12,
  maxFontSize: 28,
  showVerseNumbers: true
};

let plan = [];
let currentDayIndex = 0; // 0..364

// helpers
const qs = (s) => document.querySelector(s);
const qsa = (s) => document.querySelectorAll(s);
const formatDateISO = d => d.toISOString().slice(0,10);

function loadPlan(){
  return fetch(APP.planUrl).then(r => {
    if(!r.ok) throw new Error('Failed to load plan.json');
    return r.json();
  }).then(data => {
    if(!Array.isArray(data) || data.length===0) throw new Error('plan.json must be an array with 365 entries.');
    plan = data;
    APP.dayCount = plan.length;
  });
}

function getDayIndexFromDate(date){
  const start = new Date(date.getFullYear(),0,1);
  const diff = Math.floor((date - start)/(24*3600*1000));
  return ((diff % APP.dayCount) + APP.dayCount) % APP.dayCount;
}

function getDateFromDayIndex(index, year){
  const start = new Date(year,0,1);
  const d = new Date(start.getTime() + index * 24*3600*1000);
  return d;
}

async function fetchPassagesForDay(index){
  const entry = plan[index];
  if(!entry) return [];
  const passages = Array.isArray(entry.passages) ? entry.passages : [entry.passages];
  const key = APP.cacheKeyPrefix + encodeURIComponent(passages.join(';'));
  const cached = localStorage.getItem(key);
  if(cached) return JSON.parse(cached);

  const q = passages.join('; ');
  const url = APP.esvProxyUrl + '?q=' + encodeURIComponent(q) +
    '&include-footnotes=false&include-headings=false&include-crossrefs=false&include-verse-numbers=true&include-passage-references=true&include-short-copyright=false';

  const res = await fetch(url);
  if(!res.ok) {
    const body = await res.text();
    throw new Error('ESV proxy returned ' + res.status + ' - ' + body);
  }

  // The proxy may return JSON or plain text. Handle JSON first.
  const contentType = res.headers.get('content-type') || '';
  if(contentType.includes('application/json')){
    const json = await res.json();
    const results = (json.passages || []).map((p,i) => ({
      ref: passages[i] || `Passage ${i+1}`,
      text: p
    }));
    localStorage.setItem(key, JSON.stringify(results));
    return results;
  } else {
    // fallback: treat response as text for single combined passage
    const text = await res.text();
    const results = passages.map((p, i) => ({ ref: p, text }));
    localStorage.setItem(key, JSON.stringify(results));
    return results;
  }
}

function renderDay(index, dateObj){
  const dayNumberEl = qs('#day-number');
  const readingDateEl = qs('#reading-date');
  const progressBar = qs('#progress-bar');
  const progressText = qs('#progress-text');
  const passageList = qs('#passage-list');

  const displayDay = index + 1;
  dayNumberEl.textContent = `Day ${displayDay} / ${APP.dayCount}`;
  readingDateEl.textContent = formatDateISO(dateObj);
  progressBar.value = displayDay;
  progressBar.max = APP.dayCount;
  progressText.textContent = `${Math.round((displayDay/APP.dayCount)*100)}%`;

  passageList.innerHTML = `<div class="passage"><em>Loading passages...</em></div>`;
  fetchPassagesForDay(index).then(items => {
    passageList.innerHTML = '';
    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'passage';
      const ref = document.createElement('div');
      ref.className = 'ref';
      ref.textContent = item.ref;
      const text = document.createElement('div');
      text.className = 'text';
      text.innerHTML = sanitizeESVHtml(item.text);
      div.appendChild(ref);
      div.appendChild(text);
      passageList.appendChild(div);
    });
    applyFontSize();
    applyVerseNumberToggle();
    updateShareLink(dateObj);
  }).catch(err => {
    passageList.innerHTML = `<div class="passage"><strong>Error loading passages:</strong> ${err.message}</div>`;
  });
}

function sanitizeESVHtml(s){
  const esc = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return esc.replace(/\r\n|\n/g, '<br>');
}

function setDateFromInput(dateStr){
  const date = new Date(dateStr + 'T00:00:00');
  currentDayIndex = getDayIndexFromDate(date);
  updateUIForDate(date);
}

function updateUIForDate(date){
  const picker = qs('#date-picker');
  picker.value = formatDateISO(date);
  renderDay(currentDayIndex, date);
  const params = new URLSearchParams(window.location.search);
  params.set('date', formatDateISO(date));
  history.replaceState(null, '', '?' + params.toString());
}

function changeDay(delta){
  currentDayIndex = (currentDayIndex + delta + APP.dayCount) % APP.dayCount;
  const year = new Date().getFullYear();
  const date = getDateFromDayIndex(currentDayIndex, year);
  updateUIForDate(date);
}

function applyFontSize(){
  const size = Number(localStorage.getItem('reading_font_size')) || APP.defaultFontSize;
  qsa('.text').forEach(t => t.style.fontSize = size + 'px');
  localStorage.setItem('reading_font_size', size);
}

function changeFont(delta){
  let size = Number(localStorage.getItem('reading_font_size')) || APP.defaultFontSize;
  size = Math.min(APP.maxFontSize, Math.max(APP.minFontSize, size + delta));
  localStorage.setItem('reading_font_size', size);
  applyFontSize();
}

function toggleVerseNumbers(){
  APP.showVerseNumbers = !APP.showVerseNumbers;
  applyVerseNumberToggle();
}

function applyVerseNumberToggle(){
  if(APP.showVerseNumbers){
    qsa('.text').forEach(el => {
      if(!el.dataset.vWrapped){
        el.innerHTML = el.innerHTML.replace(/\b([0-9]{1,3})\b\s/g, '<span class="verse-number">$1</span> ');
        el.dataset.vWrapped = '1';
      }
      el.querySelectorAll('span.verse-number').forEach(v => v.style.display = '');
    });
  }else{
    qsa('.text').forEach(el => {
      el.querySelectorAll('span.verse-number').forEach(v => v.style.display = 'none');
    });
  }
}

function updateShareLink(date){
  const input = qs('#share-link');
  const url = new URL(window.location.href);
  url.searchParams.set('date', formatDateISO(date));
  input.value = url.toString();
}

function copyShareLink(){
  const input = qs('#share-link');
  input.select();
  input.setSelectionRange(0, 99999);
  document.execCommand('copy');
}

function initEventHandlers(){
  qs('#prev-day').addEventListener('click', () => changeDay(-1));
  qs('#next-day').addEventListener('click', () => changeDay(1));
  qs('#date-picker').addEventListener('change', (e) => setDateFromInput(e.target.value));
  qs('#increase-font').addEventListener('click', () => changeFont(2));
  qs('#decrease-font').addEventListener('click', () => changeFont(-2));
  qs('#toggle-verses').addEventListener('click', () => { toggleVerseNumbers(); });
  qs('#print').addEventListener('click', () => window.print());
  qs('#copy-link').addEventListener('click', copyShareLink);

  window.addEventListener('keydown', e => {
    if(e.key === 'ArrowLeft') changeDay(-1);
    if(e.key === 'ArrowRight') changeDay(1);
    if(e.key === '+' || e.key === '=') changeFont(2);
    if(e.key === '-') changeFont(-2);
  });
}

function initFromURL(){
  const params = new URLSearchParams(window.location.search);
  const dateParam = params.get('date');
  let date;
  if(dateParam){
    date = new Date(dateParam + 'T00:00:00');
  }else{
    date = new Date();
  }
  currentDayIndex = getDayIndexFromDate(date);
  qs('#date-picker').value = formatDateISO(date);
  renderDay(currentDayIndex, date);
}

async function start(){
  try{
    await loadPlan();
  }catch(err){
    const app = qs('#app');
    app.innerHTML = `<div style="padding:20px;color:tomato">Failed to load plan.json: ${err.message}</div>`;
    return;
  }
  initEventHandlers();
  applyFontSize();
  initFromURL();
}

start();