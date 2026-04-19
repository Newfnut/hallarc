import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs, onSnapshot, updateDoc, deleteDoc, query as fsQ, orderBy, where, serverTimestamp, enableIndexedDbPersistence, writeBatch, limit } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ═══════════════════════════════════════════
// CONFIG & FIREBASE INIT
// ═══════════════════════════════════════════
const fbConfig = {
  apiKey: "AIzaSyATdyW05921fNz_wyZ3zjYVF4o44mm_tyg",
  authDomain: "hallarc.firebaseapp.com",
  projectId: "hallarc",
  storageBucket: "hallarc.firebasestorage.app",
  messagingSenderId: "1057782930491",
  appId: "1:1057782930491:web:b54109ac07001be634501e",
  measurementId: "G-RDCJCLSQ5X"
};
const fbApp = initializeApp(fbConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);
enableIndexedDbPersistence(db).catch(() => {});

// ═══════════════════════════════════════════
// STORE TEMPLATES & CATEGORY DATA
// ═══════════════════════════════════════════
const TEMPLATES = {
  warehouse: {
    label: 'Warehouse (Costco style)', icon: '🏪',
    categories: ['Produce','Dairy & Eggs','Meat & Seafood','Bakery & Bread','Frozen Foods','Pantry & Dry Goods','Snacks & Candy','Beverages','Household Essentials','Health & Beauty','Clothing','Electronics','Outdoor & Garden','Watchlist']
  },
  supermarket: {
    label: 'Supermarket (SuperStore style)', icon: '🛒',
    categories: ['Produce','Deli & Bakery','Meat & Seafood','Dairy & Eggs','Frozen Foods','Aisle 1 — Canned Goods & Soups','Aisle 2 — Pasta, Rice & Sauces','Aisle 3 — Breakfast & Cereal','Aisle 4 — Baking & Spices','Aisle 5 — Snacks & Chips','Aisle 6 — Beverages','Aisle 7 — International Foods','Household & Cleaning','Pharmacy & Health','Watchlist']
  },
  custom: {
    label: 'Custom store', icon: '🏬',
    categories: ['General','Watchlist']
  }
};

const CAT_KEYS = {
  Produce:    ['banana','apple','orange','grape','berry','strawberr','blueberr','lettuce','spinach','kale','tomato','cucumber','pepper','onion','garlic','potato','carrot','broccoli','cauliflower','zucchini','celery','avocado','lemon','lime','mango','melon','pineapple','peach','plum','cherry','pear','cabbage','mushroom','herb','ginger','leek','asparagus','radish'],
  Dairy:      ['milk','cheese','yogurt','butter','cream','sour cream','cottage','cheddar','mozzarella','parmesan','brie','gouda','whip','creamer','margarine'],
  Eggs:       ['egg'],
  Meat:       ['chicken','beef','pork','lamb','turkey','salmon','shrimp','fish','steak','ground','bacon','sausage','ham','roast','rib','breast','thigh','wing','tuna','cod','halibut','tilapia','prawn','crab'],
  Bakery:     ['bread','bagel','muffin','croissant','bun','roll','tortilla','wrap','pita','naan','baguette','sourdough','cake','cookie','pastry','donut'],
  Frozen:     ['frozen','ice cream','gelato','waffle','pizza','edamame','fries','tater','gyoza','dumpling'],
  Pantry:     ['rice','pasta','noodle','flour','sugar','oil','vinegar','sauce','ketchup','mustard','mayo','salsa','soup','broth','canned','bean','lentil','oat','cereal','honey','jam','peanut butter','almond butter','syrup','salt','spice','seasoning','dressing'],
  Snacks:     ['chip','cracker','popcorn','pretzel','nut','trail mix','granola','protein bar','chocolate','candy','gummy','jerky'],
  Beverages:  ['water','juice','coffee','tea','soda','pop','sparkling','energy drink','beer','wine','kombucha','lemonade','coconut water'],
  Household:  ['paper towel','toilet paper','napkin','tissue','soap','dish soap','detergent','laundry','cleaner','sponge','trash bag','foil','plastic wrap'],
  Health:     ['vitamin','supplement','medicine','shampoo','conditioner','toothpaste','toothbrush','deodorant','lotion','sunscreen','razor']
};

function guessCategory(name, storeCategories) {
  const lower = name.toLowerCase();
  for (const [key, words] of Object.entries(CAT_KEYS)) {
    if (words.some(w => lower.includes(w))) {
      const match = storeCategories.find(c => {
        const cl = c.toLowerCase();
        return cl.includes(key.toLowerCase()) || cl.split(/[\s&—-]/)[0].toLowerCase() === key.toLowerCase().split(' ')[0];
      });
      if (match) return match;
    }
  }
  return null;
}

function catIcon(cat) {
  if (!cat) return '🛍️';
  const l = cat.toLowerCase();
  if (l.includes('produce')) return '🥦';
  if (l.includes('dairy')||l.includes('egg')) return '🥛';
  if (l.includes('meat')||l.includes('seafood')) return '🥩';
  if (l.includes('baker')||l.includes('bread')) return '🍞';
  if (l.includes('frozen')) return '🧊';
  if (l.includes('snack')||l.includes('candy')) return '🍿';
  if (l.includes('beverage')) return '🥤';
  if (l.includes('household')||l.includes('cleaning')) return '🧹';
  if (l.includes('health')||l.includes('pharmacy')||l.includes('beauty')) return '💊';
  if (l.includes('aisle')) return '🏷️';
  if (l.includes('watchlist')) return '👁️';
  if (l.includes('pantry')||l.includes('dry')) return '🥫';
  return '🛍️';
}

// ═══════════════════════════════════════════
// STORE COLOUR SYSTEM
// ═══════════════════════════════════════════
const STORE_COLORS = [
  { id:'green',  bg:'#dcfce7', text:'#16a34a', darkBg:'#14532d', darkText:'#22c55e' },
  { id:'blue',   bg:'#dbeafe', text:'#2563eb', darkBg:'#1e3a8a', darkText:'#60a5fa' },
  { id:'purple', bg:'#f3e8ff', text:'#9333ea', darkBg:'#4a044e', darkText:'#c084fc' },
  { id:'orange', bg:'#ffedd5', text:'#ea580c', darkBg:'#431407', darkText:'#fb923c' },
  { id:'red',    bg:'#fee2e2', text:'#dc2626', darkBg:'#450a0a', darkText:'#f87171' },
  { id:'teal',   bg:'#ccfbf1', text:'#0d9488', darkBg:'#042f2e', darkText:'#2dd4bf' },
  { id:'pink',   bg:'#fce7f3', text:'#db2777', darkBg:'#500724', darkText:'#f472b6' },
  { id:'slate',  bg:'#f1f5f9', text:'#475569', darkBg:'#1e293b', darkText:'#94a3b8' },
];

function getStoreColor(store) {
  return STORE_COLORS.find(c => c.id === (store?.color || 'green')) || STORE_COLORS[0];
}
function sColorBg(store) {
  const c = getStoreColor(store);
  return S.theme === 'dark' ? c.darkBg : c.bg;
}
function sColorTxt(store) {
  const c = getStoreColor(store);
  return S.theme === 'dark' ? c.darkText : c.text;
}
function colorSwatchesHTML(selectedId) {
  return STORE_COLORS.map(c => {
    const bg  = S.theme === 'dark' ? c.darkBg  : c.bg;
    const txt = S.theme === 'dark' ? c.darkText : c.text;
    const sel = (selectedId || 'green') === c.id;
    return `<div class="color-swatch${sel?' sel':''}" data-cid="${c.id}"
      style="background:${bg};border-color:${sel?txt:'transparent'}"
    >${sel?`<span style="color:${txt}">✓</span>`:''}</div>`;
  }).join('');
}
function bindColorSwatches(containerId, onSelect) {
  const container = q(containerId);
  if (!container) return;
  container.querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      const cid = sw.dataset.cid;
      const colorObj = STORE_COLORS.find(c => c.id === cid);
      if (!colorObj) return;
      onSelect(cid);
      container.querySelectorAll('.color-swatch').forEach(s => {
        const co = STORE_COLORS.find(c => c.id === s.dataset.cid);
        if (!co) return;
        const txt = S.theme === 'dark' ? co.darkText : co.text;
        const sel = s.dataset.cid === cid;
        s.classList.toggle('sel', sel);
        s.style.borderColor = sel ? txt : 'transparent';
        s.innerHTML = sel ? `<span style="color:${txt}">✓</span>` : '';
      });
      haptic('light');
    });
  });
}

// ═══════════════════════════════════════════
// HAPTICS
// ═══════════════════════════════════════════
function haptic(type = 'light') {
  if (!navigator.vibrate) return;
  const patterns = { light: 10, medium: 25, heavy: [30, 20, 30] };
  navigator.vibrate(patterns[type] ?? 10);
}

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
const S = {
  screen: 'loading',
  user: null, householdId: null,
  stores: [], trips: [],
  trip: null, store: null, items: [],
  editorItem: null, editorMode: 'add',
  contextItem: null,
  ctxStore: null,
  theme: localStorage.getItem('theme')||'light',
  unsubs: [], tripNeedsUpdate: false,
  pendingHouseholdCode: null,
  authMode: 'signin',
  selectedStoreForTrip: null,
  regularsSelected: new Set(),
  dragId: null,
  histTrips: [],
  histDetailTrip: null,
  histDetailItems: [],
  watchlistItems: [],
};

// ═══════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════
function setTheme(t) {
  S.theme = t;
  document.documentElement.setAttribute('data-theme', t);
  document.getElementById('meta-theme')?.setAttribute('content', t==='dark'?'#1c1c1e':'#16a34a');
  localStorage.setItem('theme', t);
}
setTheme(S.theme);

// ═══════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════
function go(screen) { S.screen = screen; render(); }

// ═══════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════
function render() {
  const app = document.getElementById('app');
  switch(S.screen) {
    case 'loading': app.innerHTML = `<div class="loading-screen"><div style="font-size:44px">🛒</div><div class="spin"></div></div>`; return;
    case 'auth':    app.innerHTML = renderAuth();    break;
    case 'home':    app.innerHTML = renderHome();    break;
    case 'trip':    app.innerHTML = renderTrip();    break;
    case 'history': app.innerHTML = renderHistory(); break;
  }
  bind();
}

// ─── Auth ────────────────────────────────────
function renderAuth() {
  const m = S.authMode;
  return `
  <div class="screen" id="auth-screen">
    <div class="auth-logo">🛒</div>
    <div class="auth-title">Shopping List</div>
    <div class="auth-sub">Your household shopping lists</div>
    <div class="auth-form">
      ${m==='join'?`
        <input class="auth-inp" id="a-code" type="text" placeholder="6-digit household code" maxlength="6" autocomplete="off" style="text-align:center;font-size:22px;letter-spacing:.18em">
      `:`
        <input class="auth-inp" id="a-email" type="email" placeholder="Email address" autocomplete="email">
        <input class="auth-inp" id="a-pass" type="password" placeholder="Password" autocomplete="${m==='signup'?'new-password':'current-password'}">
        ${m==='signup'?`<input class="auth-inp" id="a-name" type="text" placeholder="Your name">`:''}
      `}
      <div id="a-err" style="display:none" class="err-msg"></div>
      <button class="btn-main" style="margin:0;width:100%" id="a-submit">
        ${m==='signin'?'Sign In':m==='signup'?'Create Account':'Join Household'}
      </button>
    </div>
    ${m!=='join'?`
      <div class="auth-link">${m==='signin'?`No account? <a href="#" id="a-toggle">Sign up</a>`:`Have an account? <a href="#" id="a-toggle">Sign in</a>`}</div>
      <div class="auth-or">or</div>
      <button class="btn-outline" id="a-join-btn">Join existing household</button>
    `:`<div class="auth-link"><a href="#" id="a-toggle">Back to sign in</a></div>`}
  </div>`;
}

// ─── Home ─────────────────────────────────────
function renderHome() {
  // Date ASC then store name ASC
  const storesOpen = localStorage.getItem('storesOpen') !== 'false';
  const activeTrips = S.trips.filter(t=>t.status==='active')
    .sort((a,b)=>{
      const d=(a.tripDate||'').localeCompare(b.tripDate||'');
      return d!==0 ? d : (a.storeName||'').localeCompare(b.storeName||'');
    });

  return `
  <div class="screen" id="home-screen">
    <div class="hdr">
      <span style="font-size:22px">🛒</span>
      <div class="hdr-title">Shopping List</div>
      <button class="ico-btn" id="h-history" title="Trip history" style="font-size:18px;position:relative">
        🕘
        ${(()=>{const c=S.trips.filter(t=>t.status==='complete').length;return c>0?`<span style="position:absolute;top:4px;right:4px;width:8px;height:8px;background:var(--accent);border-radius:50%;border:1.5px solid var(--header)"></span>`:''})()}
      </button>
      <button class="ico-btn" id="h-theme">${S.theme==='dark'?'☀️':'🌙'}</button>
      <button class="ico-btn" id="h-user">👤</button>
    </div>
    <div class="scroll" id="home-scroll">
      ${activeTrips.length?`
        <div class="sec-hdr">Active Trips</div>
        ${activeTrips.map(t=>{
          const ts=S.stores.find(s=>s.id===t.storeId);
          const bg=sColorBg(ts), txt=sColorTxt(ts);
               return `<div class="card card-tap trip-row" data-tid="${t.id}">
            <div class="trip-icon">${storeIconHTML(ts)}</div>
            <div class="trip-info">
              <div class="trip-nm">${t.storeName}</div>
              <div class="trip-meta">${fmtDate(t.tripDate)}${t.label?' · '+t.label:''} · ${t.itemCount||0} item${t.itemCount!==1?'s':''}</div>
            </div>
            <div class="trip-total">
              <div class="trip-amt" style="color:${txt}">$${(t.totalActive||0).toFixed(2)}</div>
              <div class="trip-lbl">estimated</div>
            </div>
          </div>`;
        }).join('')}
      `:''}
      <div class="sec-hdr stores-sec-hdr" id="stores-toggle">Your Stores <span id="stores-chev" style="margin-left:5px;display:inline-block;transition:transform .2s;transform:${storesOpen?'rotate(90deg)':'rotate(0deg)'}">›</span></div>
      <div id="stores-section" style="${storesOpen?'':'display:none'}">
        <div class="store-grid">
          ${S.stores.map(s=>{
            const bg=sColorBg(s), txt=sColorTxt(s);
            return `<div class="store-card" data-sid="${s.id}">
            <div class="store-icon" style="background:${bg};color:${txt}">${storeIconHTML(s)}</div>
              <div class="store-nm">${s.name}</div>
              <div class="store-tp">${storeTypeLbl(s.type)}</div>
              <div class="store-edit-hint">Hold to manage</div>
            </div>`;
          }).join('')}
          <div class="store-card store-card-add" id="h-add-store">
            <div style="font-size:28px;margin-bottom:6px">+</div>
            <div style="font-size:13px;font-weight:500">Add store</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Date picker sheet -->
  <div class="overlay" id="date-sheet">
    <div class="sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-title" id="date-sheet-title">New trip</div>
      <div class="fg"><label class="fg-label">Shopping date</label>
        <input class="finput" id="d-date" type="date" value="${todayStr()}"></div>
      <div class="fg"><label class="fg-label">Label (optional)</label>
        <input class="finput" id="d-label" type="text" placeholder="e.g. Weekly shop"></div>
      <button class="btn-main" id="d-create">Open List</button>
      <div style="height:8px"></div>
    </div>
  </div>

  <!-- Add store sheet -->
  <div class="overlay" id="store-sheet">
    <div class="sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-title">Add a store</div>
      <div class="fg"><label class="fg-label">Store name</label>
        <input class="finput" id="s-name" type="text" placeholder="e.g. T&T Supermarket"></div>
      <div class="fg" style="margin-bottom:8px"><label class="fg-label">Type</label></div>
      <div class="type-grid" id="type-grid">
        <div class="type-opt sel" data-type="warehouse"><span class="type-opt-ic">🏪</span><span class="type-opt-lbl">Warehouse</span></div>
        <div class="type-opt" data-type="supermarket"><span class="type-opt-ic">🛒</span><span class="type-opt-lbl">Supermarket</span></div>
        <div class="type-opt" data-type="custom"><span class="type-opt-ic">🏬</span><span class="type-opt-lbl">Custom</span></div>
      </div>
      <div class="fg" style="margin-bottom:4px"><label class="fg-label">Colour</label></div>
      <div class="color-swatches" id="new-store-colors">${colorSwatchesHTML('green')}</div>
      <div class="fg"><label class="fg-label">Custom icon <span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:11px;color:var(--text-muted)">(optional — paste any emoji)</span></label>
        <input class="finput emoji-inp" id="s-icon" type="text" placeholder="e.g. 🏪" maxlength="2"></div>
      <button class="btn-main" id="s-save">Add Store</button>
      <div style="height:8px"></div>
    </div>
  </div>

  <!-- User / household sheet -->
  <div class="overlay" id="user-sheet">
    <div class="sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-title">Household</div>
      <div class="code-box">
        <div class="code-val">${(S.householdId||'').slice(-6).toUpperCase()}</div>
        <div class="code-hint">Share this code so your partner can join your lists</div>
      </div>
      <button class="btn-main" id="u-signout" style="background:var(--bg-secondary);color:var(--text);margin-top:14px">Sign Out</button>
      <div style="height:8px"></div>
    </div>
  </div>

  <!-- Store context menu (long press) -->
  <div class="overlay" id="store-ctx-sheet">
    <div class="sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-title" id="store-ctx-title">Manage store</div>
      <div class="ctx-option" id="sc-edit-name">
        <span class="ctx-option-ic">✏️</span>
        <span class="ctx-option-lbl">Edit name &amp; colour</span>
      </div>
      <div class="ctx-option" id="sc-edit-cats">
        <span class="ctx-option-ic">🗂️</span>
        <span class="ctx-option-lbl">Edit categories</span>
      </div>
      <div class="ctx-option" id="sc-delete">
        <span class="ctx-option-ic">🗑️</span>
        <span class="ctx-option-lbl" style="color:var(--danger)">Delete store</span>
      </div>
      <div style="height:8px"></div>
    </div>
  </div>

  <!-- Store name + colour editor -->
  <div class="overlay" id="store-edit-sheet">
    <div class="sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-title">Edit store</div>
      <div class="fg"><label class="fg-label">Store name</label>
        <input class="finput" id="se-name" type="text"></div>
      <div class="fg" style="margin-bottom:4px"><label class="fg-label">Colour</label></div>
     <div class="color-swatches" id="se-colors"></div>
      <div class="fg"><label class="fg-label">Custom icon <span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:11px;color:var(--text-muted)">(optional — paste any emoji)</span></label>
        <input class="finput emoji-inp" id="se-icon" type="text" placeholder="e.g. 🏪" maxlength="2"></div>
      <button class="btn-main" id="se-save">Save Changes</button>
      <div style="height:8px"></div>
    </div>
  </div>

  <!-- Category template editor -->
  <div class="overlay" id="te-sheet">
    <div class="sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-hdr-row">
        <button class="ico-btn" id="te-back" style="font-size:22px;color:var(--accent)">‹</button>
        <div style="flex:1;font-size:17px;font-weight:600" id="te-title">Edit categories</div>
        <button class="ico-btn" id="te-save-btn" style="color:var(--accent);font-weight:700;font-size:15px;width:auto;padding:0 4px">Save</button>
      </div>
      <div style="font-size:13px;color:var(--text-secondary);padding:8px 16px 10px">
        Drag ⠿ to reorder · Tap name to rename · Watchlist always last.
      </div>
      <div id="te-warn" class="te-warn">⚠ Deleting a category won't remove items already assigned to it.</div>
      <div style="background:var(--bg-card);border-radius:var(--r);margin:0 12px 4px;overflow:hidden;box-shadow:var(--shadow)">
        <div id="te-list"></div>
      </div>
      <div class="te-add-row">
        <input class="te-add-inp" id="te-add-inp" type="text" placeholder="New category name…" autocorrect="off" autocapitalize="words">
        <button class="te-add-btn" id="te-add-btn">Add</button>
      </div>
      <div style="height:8px"></div>
    </div>
  </div>`;
}

// ─── Trip ──────────────────────────────────────
function renderTrip() {
  const trip=S.trip, store=S.store;
  if(!trip||!store) return `<div class="screen"><div class="loading-screen"><div class="spin"></div></div></div>`;

  const sCTxt = sColorTxt(store);
  const sCBg  = sColorBg(store);
  const cssVars = `--accent:${sCTxt};--accent-bg:${sCBg};--accent-fg:#fff;--accent-dark:${sCTxt};--store-color:${sCTxt};--store-bg:${sCBg}`;

  const cats = (store.categories||[]).filter(c=>c!=='Watchlist');
  const items = S.items;
  const uncat    = items.filter(i=>!i.checked&&(!i.category||!store.categories.includes(i.category))&&!i.isWatchlist);
  const checked  = items.filter(i=>i.checked);
  const catMap   = {};
  cats.forEach(c=>{
    const ci=items.filter(i=>!i.checked&&i.category===c&&!i.isWatchlist);
    if(ci.length) catMap[c]=ci;
  });
  // Legacy: trip items still flagged isWatchlist (pre-migration) stay visible
  const legacyWlItems = items.filter(i=>!i.checked&&i.isWatchlist);
  const wlItems = [...S.watchlistItems, ...legacyWlItems];

  const activeTotal  = items.filter(i=>!i.checked&&!i.isWatchlist&&i.category!=='Watchlist').reduce((s,i)=>s+effPrice(i)*(i.qty||1),0);
  const checkedTotal = checked.reduce((s,i)=>s+effPrice(i)*(i.qty||1),0);

  return `
  <div class="screen" id="trip-screen" style="${cssVars}">
    <div class="hdr">
      <button class="ico-btn" id="t-back" style="font-size:22px">‹</button>
      <div style="flex:1;min-width:0">
        <div class="hdr-title">${trip.storeName}</div>
        <div class="hdr-sub" id="t-date-lbl" style="cursor:pointer">${fmtDate(trip.tripDate)}${trip.label?' · '+trip.label:''} <span style="font-size:10px;opacity:.45">✏️</span></div>
      </div>
      <button class="ico-btn" id="t-theme">${S.theme==='dark'?'☀️':'🌙'}</button>
      <button class="ico-btn" id="t-regulars" title="Regular items" style="font-size:16px">⭐</button>
      
      <button class="complete-btn" id="t-complete">Complete ✓</button>
    </div>

    <div class="add-bar">
      <div style="flex:1;position:relative">
        <input class="add-input" id="t-add" type="text" placeholder="Add item…" autocomplete="off" autocorrect="off" autocapitalize="words">
        <div class="ac-drop" id="ac" style="display:none"></div>
      </div>
      <button class="add-btn-pill" id="t-addBtn">Add</button>
    </div>

    <div class="scroll" id="trip-scroll">
      ${uncat.length?`
        <div class="cat-sec">
          <div class="cat-hdr cat-uncategorized" data-cat="__uncat__">
            <span class="cat-label">⚠ Uncategorized</span>
            <span class="cat-badge">${uncat.length}</span>
            <span class="cat-chev open">›</span>
          </div>
          <div class="cat-items-wrap" id="ci-__uncat__">${uncat.map(i=>rowHTML(i)).join('')}</div>
        </div>
      `:''}

      ${Object.entries(catMap).map(([c,ci])=>`
        <div class="cat-sec">
          <div class="cat-hdr" data-cat="${esc(c)}">
            <span class="cat-label">${c.toUpperCase()}</span>
            <span class="cat-badge">${ci.length}</span>
            <span class="cat-chev open">›</span>
          </div>
          <div class="cat-items-wrap" id="ci-${esc(c)}">${ci.map(i=>rowHTML(i)).join('')}</div>
        </div>
      `).join('')}

      ${wlItems.length?`
        <div class="cat-sec">
          <div class="cat-hdr cat-watchlist" data-cat="__watch__">
            <span class="cat-label">👁 Watchlist</span>
            <span class="cat-badge">${wlItems.length}</span>
            <span class="cat-chev open">›</span>
          </div>
          <div class="cat-items-wrap" id="ci-__watch__">
            ${S.watchlistItems.map(i=>rowHTML(i,true,true)).join('')}
            ${legacyWlItems.map(i=>rowHTML(i,true,false)).join('')}
          </div>
        </div>
      `:''}

      ${checked.length?`
        <div class="xoff-toggle" id="t-xoff-toggle">
          <span style="font-size:14px">▾</span>
          <span>Crossed off (${checked.length})</span>
          <span class="xoff-total">$${checkedTotal.toFixed(2)}</span>
        </div>
        <div id="t-xoff-list" style="display:none">
          <div style="background:var(--bg-card);border-radius:var(--r);margin:0 12px 4px;overflow:hidden;box-shadow:var(--shadow)">
            ${checked.map(i=>rowHTML(i)).join('')}
          </div>
        </div>
      `:''}

      ${items.length===0?`
        <div class="empty">
          <span class="empty-ico">🛍️</span>
          <div class="empty-ttl">List is empty</div>
          <div class="empty-txt">Type an item above and tap Add to get started</div>
        </div>
      `:''}
    </div>

    <div class="total-bar">
      <div class="total-col">
        <div class="total-lbl">Active</div>
        <div class="total-val active">$${activeTotal.toFixed(2)}</div>
      </div>
      <div class="total-sep"></div>
      <div class="total-col">
        <div class="total-lbl">Checked</div>
        <div class="total-val crossed">$${checkedTotal.toFixed(2)}</div>
      </div>
    </div>
  </div>

  <!-- Item editor sheet -->
  <div class="overlay" id="editor-sheet">
    <div class="sheet" id="editor-inner">${renderEditor()}</div>
  </div>

  <!-- Context menu (long press) -->
  <div class="overlay" id="ctx-sheet">
    <div class="sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-title" id="ctx-title">Move to category</div>
      <div id="ctx-cats"></div>
    </div>
  </div>

  <!-- Move to another list sheet -->
  <div class="overlay" id="move-list-sheet">
    <div class="sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-title" id="move-list-title">Move to list</div>
      <div id="move-list-options"></div>
      <div style="height:8px"></div>
    </div>
  </div>

  <!-- Regulars sheet -->
  <div class="overlay" id="regulars-sheet">
    <div class="sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-hdr-row">
        <div style="flex:1;font-size:17px;font-weight:600">⭐ Regular Items</div>
        <button class="ico-btn" id="reg-close" style="font-size:14px;color:var(--text-secondary)">✕</button>
      </div>
      <div style="font-size:13px;color:var(--text-secondary);padding:10px 18px 4px">Tap items to select, then add them all at once.</div>
      <div id="reg-list"></div>
      <button class="btn-main" id="reg-add-btn" style="opacity:.5">Select items above</button>
      <div style="height:8px"></div>
    </div>
  </div>
<!-- Edit trip date sheet -->
  <div class="overlay" id="edit-date-sheet">
    <div class="sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-title">Edit trip date</div>
      <div class="fg"><label class="fg-label">Shopping date</label>
        <input class="finput" id="ed-date" type="date" value="${trip.tripDate}"></div>
      <div class="fg"><label class="fg-label">Label (optional)</label>
        <input class="finput" id="ed-label" type="text" placeholder="e.g. Weekly shop" value="${esc(trip.label||'')}"></div>
      <button class="btn-main" id="ed-save">Save</button>
      <div style="height:8px"></div>
    </div>
  </div>
  `;
}

// ─── Item row HTML ────────────────────────────
function rowHTML(item, dim=false, isStoreWl=false) {
  const isWeight = item.priceType==='per_lb' || item.priceType==='per_kg';
  const unitLabel = item.priceType==='per_lb' ? 'lb' : 'kg';
  const effUnit   = effPrice(item);
  const hasSale   = item.saleDiscount>0 && saleActive(item);

  // Total displayed price = unit price × qty for weight items
  const displayEff  = isWeight ? effUnit*(item.qty||1) : effUnit;
  const displayBase = isWeight ? (item.price||0)*(item.qty||1) : (item.price||0);

  let saleExpiryStr='', saleExpiringSoon=false;
  if(hasSale&&item.saleExpiry){
    const expDate=new Date(item.saleExpiry+'T12:00:00');
    const today=new Date(todayStr()+'T12:00:00');
    const days=Math.round((expDate-today)/86400000);
    if(days===0){saleExpiryStr='expires today';saleExpiringSoon=true;}
    else if(days===1){saleExpiryStr='exp tomorrow';saleExpiringSoon=true;}
    else if(days<=3){saleExpiryStr=`exp ${fmtShort(item.saleExpiry)}`;saleExpiringSoon=true;}
    else{saleExpiryStr=`exp ${fmtShort(item.saleExpiry)}`;}
  }

  let unitDual='';
  if(isWeight&&(item.price||0)>0){
    if(item.priceType==='per_lb'){
      const perKg=(effUnit/0.453592).toFixed(2);
      unitDual=`$${effUnit.toFixed(2)}/lb · $${perKg}/kg`;
    } else {
      const perLb=(effUnit*0.453592).toFixed(2);
      unitDual=`$${effUnit.toFixed(2)}/kg · $${perLb}/lb`;
    }
  }

  const qtyLabel = isWeight ? `${item.qty||1} ${unitLabel}` : (item.qty>1||item.qty<1?`×${item.qty}`:'');

  let priceHTML='';
  if(hasSale){
    priceHTML=`<div class="item-price-old">$${displayBase.toFixed(2)}</div><div class="item-price-sale">$${displayEff.toFixed(2)}</div>`;
  } else if(displayEff>0){
    priceHTML=`<div class="item-price">$${displayEff.toFixed(2)}</div>`;
  } else {
    priceHTML=`<div class="item-price" style="color:var(--text-muted);font-size:13px">no price</div>`;
  }

  return `
  <div class="item-wrap" data-iid="${item.id}" draggable="true"${isStoreWl?' data-swl="true"':''}>
    <div class="item-reveal">
      <div class="item-reveal-left">${isStoreWl?'＋ Add to trip':'✓ Check off'}</div>
      ${isStoreWl
        ?`<div class="item-reveal-right">Remove ✕</div>`
        :`<div class="item-reveal-right irr-split"><div class="irr-del">🗑 Delete</div><div class="irr-move">↗ Move</div></div>`}
    </div>
    <div class="item-row${item.checked?' checked':''}${dim?' item-dim':''}" data-iid="${item.id}">
      <div class="item-circle"></div>
      <div class="item-body">
        <div class="item-nm">${item.name}</div>
         <div class="item-detail">${item.packSize||''}${item.notes?(item.packSize?' · ':'')+item.notes:''}</div>
        ${unitDual?`<div class="unit-both">${unitDual}</div>`:''}
        ${hasSale?`<div class="sale-tag${saleExpiringSoon?' expiring':''}">SALE −$${item.saleDiscount.toFixed(2)}${saleExpiryStr?` <span style="font-weight:400;opacity:.8">${saleExpiryStr}</span>`:''}</div>`:''}
    
      </div>
      ${item.photoData?`<img src="${item.photoData}" class="item-photo-thumb" alt="">`:''}
      <div class="item-right">
        ${priceHTML}
        <div class="item-qty">${qtyLabel}</div>
      </div>
    </div>
  </div>`;
}

// ─── Item Editor ──────────────────────────────
function renderEditor() {
  const item = S.editorItem||{};
  const cats = (S.store?.categories||[]).filter(c=>c!=='Watchlist');
  const isWeight = item.priceType==='per_lb'||item.priceType==='per_kg';
  const eachPriceVal = (!isWeight&&(item.price||0)>0) ? item.price : '';
  const wPriceVal    = (isWeight&&(item.price||0)>0) ? item.price : '';
  const wQtyVal      = isWeight ? (item.qty||1) : '';
  const eachQtyVal   = !isWeight ? (item.qty||1) : 1;
  const wType        = item.priceType==='per_kg' ? 'per_kg' : 'per_lb';

  return `
  <div class="sheet-handle"></div>
  <div class="sheet-hdr-row">
    <div style="flex:1;font-size:17px;font-weight:600">${S.editorMode==='add'?'Add item':'Edit item'}</div>
    ${S.editorMode==='edit'?`<button class="ico-btn" id="e-del" style="color:var(--danger);font-size:16px">🗑 Delete</button>`:''}
  </div>

  <div class="fg"><label class="fg-label">Item name</label>
    <input class="finput" id="e-name" type="text" value="${esc(item.name||'')}" placeholder="e.g. Bananas" autocorrect="off" autocapitalize="words"></div>

  <div class="fg"><label class="fg-label">Category</label>
    <select class="finput" id="e-cat">
      <option value="">— Uncategorized —</option>
      ${cats.map(c=>`<option value="${esc(c)}"${item.category===c?' selected':''}>${c}</option>`).join('')}
    </select>
  </div>

  <div class="frow">
    <div class="fg"><label class="fg-label">Price per item</label>
      <input class="finput" id="e-price" type="number" value="${eachPriceVal}" min="0" step="0.01" placeholder="0.00"></div>
    <div class="fg" style="max-width:110px"><label class="fg-label">Quantity</label>
      <input class="finput" id="e-qty" type="number" value="${eachQtyVal}" min="1" step="1" onfocus="this.select()" style="text-align:center"></div>
  </div>

  <div class="fg"><label class="fg-label">Pack size</label>
    <input class="finput" id="e-packsize" type="text" value="${esc(item.packSize||'')}" placeholder="e.g. 906 g, 1.5 kg, 12 ct" autocorrect="off"></div>

  <div style="margin:18px 16px 0;border-top:1.5px solid var(--border-mid);position:relative">
    <span style="position:absolute;top:-9px;left:12px;background:var(--bg-card);padding:0 6px;font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted)">or by weight</span>
  </div>

  <div class="fg" style="margin-top:18px"><label class="fg-label">Price per weight</label>
    <input class="finput" id="e-wprice" type="number" value="${wPriceVal}" min="0" step="0.01" placeholder="0.00"></div>

  <div class="frow">
    <div class="fg"><label class="fg-label" id="e-wqty-label">Weight (lb)</label>
      <input class="finput" id="e-wqty" type="number" value="${wQtyVal}" min="0" step="0.1" onfocus="this.select()" placeholder="0.0" style="text-align:center"></div>
    <div class="fg" style="max-width:110px;padding-top:0">
      <label class="fg-label">Unit</label>
      <div class="pt-toggle" style="margin-top:6px">
        <button class="wt-btn${wType==='per_lb'?' sel':''}" data-pt="per_lb">lb</button>
        <button class="wt-btn${wType==='per_kg'?' sel':''}" data-pt="per_kg">kg</button>
      </div>
    </div>
  </div>
  <div class="w-equiv" id="e-w-equiv" style="padding:0 16px 4px"></div>

  <div class="tog-row" style="margin-top:6px">
    <div class="tog-info"><div class="tog-lbl">On Sale</div><div class="tog-sub">Add a discount</div></div>
    <div class="tog${(item.saleDiscount||0)>0?' on':''}" id="sale-tog"></div>
  </div>
  <div id="sale-fields" style="${(item.saleDiscount||0)>0?'':'display:none'}">
    <div class="frow">
      <div class="fg"><label class="fg-label">Discount ($)</label>
        <input class="finput" id="e-disc" type="number" value="${item.saleDiscount||''}" min="0" step="0.01" placeholder="0.00"></div>
      <div class="fg"><label class="fg-label">Sale ends</label>
        <input class="finput" id="e-exp" type="date" value="${item.saleExpiry||''}"></div>
    </div>
  </div>

  <div class="fg"><label class="fg-label">Notes</label>
    <input class="finput" id="e-notes" type="text" value="${esc(item.notes||'')}" placeholder="Any details…"></div>

  <div class="fg" style="margin-top:2px">
    <label class="fg-label">Photo <span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:11px;color:var(--text-muted)">(optional)</span></label>
    <input type="file" accept="image/*" id="e-photo-input" style="display:none">
    <div id="e-photo-preview" style="${item.photoData?'':'display:none'}">
      <div class="editor-photo-wrap">
        <img id="e-photo-img" src="${item.photoData||''}" class="editor-photo-preview" alt="">
        <button type="button" id="e-photo-remove" class="editor-photo-remove">✕</button>
      </div>
    </div>
    <button type="button" id="e-photo-add-btn" class="editor-photo-add" style="${item.photoData?'display:none':''}">📷 Add photo</button>
  </div>

  <div class="tog-row" style="margin-top:6px">
    <div class="tog-info"><div class="tog-lbl">Regular Buy ⭐</div><div class="tog-sub">Quick re-add on future trips</div></div>
    <div class="tog${item.isRegular?' on':''}" id="reg-tog"></div>
  </div>
  <div class="tog-row">
    <div class="tog-info"><div class="tog-lbl">Watchlist</div><div class="tog-sub">Not urgent — excluded from total</div></div>
    <div class="tog${item.isWatchlist?' on':''}" id="wl-tog"></div>
  </div>

  <button class="btn-main" id="e-save">${S.editorMode==='add'?'Add to List':'Save Changes'}</button>
  <div style="height:8px"></div>`;
}
// ─── History screen ───────────────────────────
function renderHistory() {
  const trips=S.histTrips.slice().sort((a,b)=>(b.completedAt?.seconds||b.createdAt?.seconds||0)-(a.completedAt?.seconds||a.createdAt?.seconds||0));
  const groups={};
  trips.forEach(t=>{
    const d=t.completedAt?new Date(t.completedAt.seconds*1000):new Date((t.tripDate||'')+'T12:00:00');
    const key=d.toLocaleDateString('en-CA',{year:'numeric',month:'long'});
    if(!groups[key]) groups[key]=[];
    groups[key].push(t);
  });
  return `
  <div class="screen" id="history-screen">
    <div class="hdr">
      <button class="ico-btn" id="hist-back" style="font-size:22px">‹</button>
      <div class="hdr-title">Trip History</div>
      <button class="ico-btn" id="hist-theme">${S.theme==='dark'?'☀️':'🌙'}</button>
    </div>
    <div class="scroll">
      ${trips.length===0?`
        <div class="empty">
          <span class="empty-ico">🕘</span>
          <div class="empty-ttl">No completed trips yet</div>
          <div class="empty-txt">When you tap Complete ✓ on a trip, it'll show up here.</div>
        </div>
      `:Object.entries(groups).map(([month,mTrips])=>`
        <div class="hist-month-hdr">
          <span>${month}</span><span class="hist-month-line"></span>
          <span style="font-size:12px;font-weight:500">${mTrips.length} trip${mTrips.length!==1?'s':''}</span>
        </div>
        ${mTrips.map(t=>`
          <div class="hist-card" data-hid="${t.id}">
            <div class="hist-card-inner">
              <div class="hist-top">
                ${(()=>{const _hs=S.stores.find(s=>s.id===t.storeId);return `<div class="hist-icon" style="background:${sColorBg(_hs)};color:${sColorTxt(_hs)}">${storeIconHTML(_hs)}</div>`;})()}
                <div style="flex:1;min-width:0">
                  <div class="hist-store">${t.storeName}</div>
                  <div class="hist-date">${fmtDate(t.tripDate)}${t.label?' · '+t.label:''}</div>
                </div>
              </div>
              <div class="hist-totals">
                <div class="hist-total-col"><div class="hist-total-lbl">Spent</div><div class="hist-total-val spent">$${(t.totalChecked||0).toFixed(2)}</div></div>
                <div class="hist-total-col"><div class="hist-total-lbl">Items</div><div class="hist-total-val">${t.itemCount||0}</div></div>
                <div class="hist-total-col"><div class="hist-total-lbl">Completed</div><div class="hist-total-val" style="font-size:13px;font-weight:500;color:var(--text-secondary)">${t.completedAt?fmtShort(new Date(t.completedAt.seconds*1000).toISOString().split('T')[0]):'—'}</div></div>
              </div>
            </div>
          </div>`).join('')}
      `).join('')}
      <div style="height:20px"></div>
    </div>
  </div>
  <div class="overlay" id="hd-sheet">
    <div class="sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-hdr-row">
        <div style="flex:1">
          <div style="font-size:17px;font-weight:600" id="hd-title">Trip detail</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:2px" id="hd-sub"></div>
        </div>
        <button class="ico-btn" id="hd-csv" title="Download CSV" style="font-size:17px">⬇️</button>
        <button class="ico-btn" id="hd-delete" title="Delete trip" style="color:var(--danger);font-size:16px">🗑</button>
        <button class="ico-btn" id="hd-close" style="font-size:14px;color:var(--text-secondary)">✕</button>
      </div>
      <div id="hd-body"><div style="text-align:center;padding:36px;color:var(--text-secondary)"><div class="spin" style="margin:0 auto"></div></div></div>
      <div style="height:8px"></div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════
// BIND
// ═══════════════════════════════════════════
function bind() {
  switch(S.screen){
    case 'auth':    bindAuth();    break;
    case 'home':    bindHome();    break;
    case 'trip':    bindTrip();    break;
    case 'history': bindHistory(); break;
  }
}

function bindAuth() {
  on('a-submit','click',doAuth);
  on('a-toggle','click',e=>{e.preventDefault();S.authMode=S.authMode==='signin'?'signup':S.authMode==='join'?'signin':'signin';render();});
  on('a-join-btn','click',()=>{S.authMode='join';render();});
  qAll('.auth-inp').forEach(i=>i.addEventListener('keydown',e=>{if(e.key==='Enter')doAuth();}));
}

async function doAuth() {
  const btn=q('a-submit'),err=q('a-err');
  if(!btn) return;
  err.style.display='none'; btn.disabled=true; btn.textContent='Please wait…';
  try {
    if(S.authMode==='join'){
      const code=q('a-code').value.trim().toUpperCase();
      if(code.length!==6) throw{message:'Please enter a valid 6-digit code'};
      S.pendingHouseholdCode=code; S.authMode='signup'; render(); return;
    }
    const email=q('a-email').value.trim(), pass=q('a-pass').value;
    if(S.authMode==='signup'){
      const name=(q('a-name')?.value.trim())||'Member';
      const cred=await createUserWithEmailAndPassword(auth,email,pass);
      if(S.pendingHouseholdCode){
        const snap=await getDocs(fsQ(collection(db,'households'),where('code','==',S.pendingHouseholdCode)));
        if(!snap.empty){
          const hid=snap.docs[0].id;
          await setDoc(doc(db,'users',cred.user.uid),{householdId:hid,name,email,createdAt:serverTimestamp()});
          S.pendingHouseholdCode=null; return;
        }
      }
      const code=rndCode();
      const hRef=await addDoc(collection(db,'households'),{code,createdBy:cred.user.uid,createdAt:serverTimestamp()});
      await setDoc(doc(db,'users',cred.user.uid),{householdId:hRef.id,name,email,createdAt:serverTimestamp()});
    } else {
      await signInWithEmailAndPassword(auth,email,pass);
    }
  } catch(e){
    err.textContent=e.message||'Something went wrong'; err.style.display='block';
    btn.disabled=false; btn.textContent=S.authMode==='signin'?'Sign In':S.authMode==='signup'?'Create Account':'Join Household';
  }
}

// ─── Home bindings ────────────────────────────
let _newStoreColor='green';
let _editStoreColor='green';

function bindHome() {
  on('h-theme','click',()=>{setTheme(S.theme==='dark'?'light':'dark');render();});
  on('h-user','click',()=>openSheet('user-sheet'));
  on('h-add-store','click',()=>openSheet('store-sheet'));
  on('h-history','click',()=>{haptic('light');goHistory();});
  on('stores-toggle','click',()=>{
    const sec=q('stores-section'), chev=q('stores-chev');
    if(!sec) return;
    const open=sec.style.display!=='none';
    sec.style.display=open?'none':'';
    if(chev) chev.style.transform=open?'rotate(0deg)':'rotate(90deg)';
    localStorage.setItem('storesOpen',String(!open));
    haptic('light');
  });
  on('u-signout','click',doSignOut);
  on('d-create','click',doCreateTrip);
  on('s-save','click',doSaveStore);
  on('te-back','click',closeSheets);
  on('te-save-btn','click',doSaveStoreCategories);
  on('te-add-btn','click',doTeAdd);
  on('se-save','click',doSaveStoreName);
  on('sc-edit-name','click',()=>openStoreNameEditor(S.ctxStore?.id));
  on('sc-edit-cats','click',()=>{ if(!S.ctxStore) return; closeSheets(); setTimeout(()=>openStoreEditor(S.ctxStore.id),50); });
  on('sc-delete','click',doDeleteStore);

  _newStoreColor='green';
  bindColorSwatches('new-store-colors', id=>{ _newStoreColor=id; });

  qAll('[data-sid]').forEach(el=>{
    let lpt=null, longFired=false;
    el.addEventListener('touchstart',()=>{ longFired=false; lpt=setTimeout(()=>{ longFired=true; lpt=null; haptic('heavy'); openStoreCtxMenu(el.dataset.sid); },600); },{passive:true});
    el.addEventListener('touchend',()=>clearTimeout(lpt));
    el.addEventListener('touchmove',()=>clearTimeout(lpt),{passive:true});
    el.addEventListener('click',()=>{
      if(longFired) return;
      clearTimeout(lpt); lpt=null; haptic('light');
      S.selectedStoreForTrip=S.stores.find(s=>s.id===el.dataset.sid);
      if(!S.selectedStoreForTrip) return;
      q('date-sheet-title').textContent=`New trip to ${S.selectedStoreForTrip.name}`;
      openSheet('date-sheet');
    });
  });

  qAll('[data-tid]').forEach(el=>el.addEventListener('click',()=>{haptic('light');loadTrip(el.dataset.tid);}));
  qAll('[data-type]').forEach(opt=>opt.addEventListener('click',()=>{qAll('[data-type]').forEach(o=>o.classList.remove('sel'));opt.classList.add('sel');}));
  const teInp=q('te-add-inp');
  if(teInp) teInp.addEventListener('keydown',e=>{if(e.key==='Enter')doTeAdd();});
  bindOverlayClose();
}

function openStoreCtxMenu(storeId) {
  S.ctxStore=S.stores.find(s=>s.id===storeId);
  if(!S.ctxStore) return;
  const title=q('store-ctx-title');
  if(title) title.textContent=S.ctxStore.name;
  openSheet('store-ctx-sheet');
}

function openStoreNameEditor(storeId) {
  if(storeId) S.ctxStore=S.stores.find(s=>s.id===storeId)||S.ctxStore;
  if(!S.ctxStore) return;
  _editStoreColor=S.ctxStore.color||'green';
  const nameInp=q('se-name');
  if(nameInp) nameInp.value=S.ctxStore.name;
  const iconInp=q('se-icon');
  if(iconInp) iconInp.value=S.ctxStore.icon||'';
  const container=q('se-colors');
  if(container) container.innerHTML=colorSwatchesHTML(_editStoreColor);
  bindColorSwatches('se-colors',id=>{_editStoreColor=id;});
  closeSheets();
  setTimeout(()=>openSheet('store-edit-sheet'),50);
}

async function doSaveStoreName() {
  if(!S.ctxStore) return;
  const name=q('se-name')?.value.trim(); if(!name) return;
  const icon=(q('se-icon')?.value.trim())||'';
  haptic('medium');
  if(DEV){ const s=S.stores.find(s=>s.id===S.ctxStore.id); if(s){s.name=name;s.color=_editStoreColor;s.icon=icon;} closeSheets();render();return; }
  await updateDoc(doc(db,`households/${S.householdId}/stores/${S.ctxStore.id}`),{name,color:_editStoreColor,icon});
  closeSheets();
}

async function doDeleteStore() {
  if(!S.ctxStore) return;
  if(!confirm(`Delete "${S.ctxStore.name}"?\n\nThis won't affect any existing trips for this store.`)) return;
  haptic('heavy');
  if(DEV){ S.stores=S.stores.filter(s=>s.id!==S.ctxStore.id); S.ctxStore=null; closeSheets();render();return; }
  await deleteDoc(doc(db,`households/${S.householdId}/stores/${S.ctxStore.id}`));
  S.ctxStore=null; closeSheets();
}

async function doSignOut() {
  S.unsubs.forEach(u=>u()); S.unsubs=[];
  await signOut(auth);
  S.user=S.householdId=null; S.stores=[]; S.trips=[]; S.authMode='signin'; go('auth');
}

async function doCreateTrip() {
  if(!S.selectedStoreForTrip) return;
  haptic('medium');
  const date=q('d-date').value, label=q('d-label').value.trim();
  if(DEV){
    const t={id:'t-'+Date.now(),storeId:S.selectedStoreForTrip.id,storeName:S.selectedStoreForTrip.name,storeType:S.selectedStoreForTrip.type,tripDate:date,label,status:'active',totalActive:0,totalChecked:0,itemCount:0};
    S.trips.push(t); S.trip=t; S.store=S.selectedStoreForTrip; S.items=[];
    closeSheets(); go('trip'); return;
  }
  const ref=await addDoc(col('trips'),{storeId:S.selectedStoreForTrip.id,storeName:S.selectedStoreForTrip.name,storeType:S.selectedStoreForTrip.type,tripDate:date,label,status:'active',totalActive:0,totalChecked:0,itemCount:0,createdAt:serverTimestamp()});
  closeSheets(); loadTrip(ref.id);
}

async function doSaveStore() {
  const name=q('s-name').value.trim(); if(!name) return;
  haptic('medium');
  const type=document.querySelector('#type-grid [data-type].sel')?.dataset.type||'custom';
  const icon=(q('s-icon')?.value.trim())||'';
  const storeData={name,type,color:_newStoreColor,icon,categories:TEMPLATES[type].categories,sortOrder:S.stores.length,createdAt:serverTimestamp()};
  if(DEV){ S.stores.push({id:'dev-s-'+Date.now(),...storeData}); q('s-name').value=''; if(q('s-icon'))q('s-icon').value=''; _newStoreColor='green'; closeSheets();render();return; }
  await addDoc(col('stores'),storeData);
  q('s-name').value=''; if(q('s-icon'))q('s-icon').value=''; _newStoreColor='green'; closeSheets();
}

function bindHistory() {
  on('hist-back','click',()=>{haptic('light');go('home');});
  on('hist-theme','click',()=>{setTheme(S.theme==='dark'?'light':'dark');render();});
  on('hd-close','click',closeSheets);
  on('hd-csv','click',doDownloadCSV);
  on('hd-delete','click',doDeleteHistTrip);
  bindOverlayClose();
  qAll('.hist-card').forEach(el=>el.addEventListener('click',()=>{haptic('light');openHistDetail(el.dataset.hid);}));
}

async function goHistory() {
  go('loading');
  if(DEV){
    S.histTrips=[
      {id:'h1',storeId:'s1',storeName:'Costco Langley',storeType:'warehouse',tripDate:'2026-03-22',label:'Weekly',status:'complete',totalChecked:87.43,itemCount:9,completedAt:{seconds:Date.now()/1000-86400*14}},
      {id:'h2',storeId:'s2',storeName:'SuperStore Langley',storeType:'supermarket',tripDate:'2026-03-08',label:'',status:'complete',totalChecked:54.12,itemCount:14,completedAt:{seconds:Date.now()/1000-86400*28}},
      {id:'h3',storeId:'s1',storeName:'Costco Langley',storeType:'warehouse',tripDate:'2026-02-15',label:'Monthly stock-up',status:'complete',totalChecked:212.88,itemCount:22,completedAt:{seconds:Date.now()/1000-86400*49}},
    ];
  } else {
    try {
      const snap=await getDocs(fsQ(col('trips'),where('status','==','complete')));
      S.histTrips=snap.docs.map(d=>({id:d.id,...d.data()}));
    } catch(e){ S.histTrips=[]; }
  }
  go('history');
}

async function openHistDetail(tripId) {
  S.histDetailTrip=S.histTrips.find(t=>t.id===tripId);
  if(!S.histDetailTrip) return;
  const title=q('hd-title'),sub=q('hd-sub'),body=q('hd-body');
  if(title) title.textContent=S.histDetailTrip.storeName;
  if(sub)   sub.textContent=fmtDate(S.histDetailTrip.tripDate)+(S.histDetailTrip.label?' · '+S.histDetailTrip.label:'');
  if(body)  body.innerHTML=`<div style="text-align:center;padding:36px;color:var(--text-secondary)"><div class="spin" style="margin:0 auto"></div></div>`;
  openSheet('hd-sheet');
  let items=[];
  if(DEV){
    items=[
      {id:'hi1',name:'Bananas',category:'Produce',qty:1,price:3.49,priceType:'each',saleDiscount:0,checked:true},
      {id:'hi2',name:'Chicken Breasts',category:'Meat & Seafood',qty:1,price:22.99,priceType:'each',saleDiscount:4.00,checked:true},
      {id:'hi3',name:'Sourdough Bread',category:'Bakery & Bread',qty:1,price:8.99,priceType:'each',saleDiscount:0,checked:true},
      {id:'hi4',name:'Paper Towels',category:'Household Essentials',qty:1,price:24.99,priceType:'each',saleDiscount:0,checked:false},
    ];
  } else {
    try {
      const snap=await getDocs(fsQ(collection(db,`households/${S.householdId}/trips/${tripId}/items`),orderBy('sortOrder')));
      items=snap.docs.map(d=>({id:d.id,...d.data()}));
    } catch(e){}
  }
  S.histDetailItems = items;
  if(!body) return;
  const cats={};
  items.forEach(i=>{const c=i.category||'Uncategorized';if(!cats[c])cats[c]=[];cats[c].push(i);});
  const checkedCount=items.filter(i=>i.checked).length;
  const total=items.filter(i=>i.checked).reduce((s,i)=>s+effPrice(i)*(i.qty||1),0);
  body.innerHTML=`
    <div style="display:flex;gap:0;background:var(--bg-secondary);margin:10px 16px 14px;border-radius:var(--r-sm);overflow:hidden">
      <div style="flex:1;padding:10px;text-align:center">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:3px">Spent</div>
        <div style="font-size:20px;font-weight:700;color:var(--accent)">$${total.toFixed(2)}</div>
      </div>
      <div style="width:.5px;background:var(--border)"></div>
      <div style="flex:1;padding:10px;text-align:center">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:3px">Checked off</div>
        <div style="font-size:20px;font-weight:700">${checkedCount} / ${items.length}</div>
      </div>
    </div>
    ${Object.entries(cats).map(([cat,citems])=>`
      <div style="margin:0 16px 12px">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary);margin-bottom:6px">${catIcon(cat)} ${cat}</div>
        <div style="background:var(--bg-card);border-radius:var(--r-sm);overflow:hidden;box-shadow:var(--shadow)">
          ${citems.map(i=>`
            <div class="hd-item">
              <div class="hd-check ${i.checked?'on':'off'}">${i.checked?'✓':'–'}</div>
              <div class="hd-name${i.checked?' checked':''}">${i.name}${i.qty>1?' ×'+i.qty:''}</div>
              <div class="hd-price">${effPrice(i)>0?'$'+effPrice(i).toFixed(2):''}</div>
            </div>`).join('')}
        </div>
      </div>`).join('')}`;
}
function doDownloadCSV(){
  const trip = S.histDetailTrip;
  const items = S.histDetailItems || [];
  if(!trip) return;
  haptic('light');
  const rows = [['Name','Category','Pack Size','Qty','Unit','Price Type','Unit Price','Sale Discount','Effective Unit Price','Line Total','Notes','Checked']];
  items.forEach(i => {
    const eff = effPrice(i);
    const qty = i.qty || 1;
    rows.push([
      i.name,
      i.category || '',
      i.packSize || '',
      qty,
      i.unit || 'ea',
      i.priceType || 'each',
      (i.price || 0).toFixed(2),
      (i.saleDiscount || 0).toFixed(2),
      eff.toFixed(2),
      (eff * qty).toFixed(2),
      i.notes || '',
      i.checked ? 'Yes' : 'No'
    ]);
  });
  const checkedItems = items.filter(i => i.checked);
  const grandTotal = checkedItems.reduce((s,i) => s + effPrice(i)*(i.qty||1), 0);
  const savings = items.reduce((s,i) => s + (i.saleDiscount && saleActive(i) ? i.saleDiscount*(i.qty||1) : 0), 0);
  rows.push([]);
  rows.push(['TOTAL SPENT','','','','','','','','','$'+grandTotal.toFixed(2),'','']);
  if(savings > 0) rows.push(['TOTAL SAVINGS','','','','','','','','','$'+savings.toFixed(2),'','']);
  rows.push(['Items checked','','','','','','','','',checkedItems.length+' / '+items.length,'','']);
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = `${trip.storeName} ${trip.tripDate}${trip.label?' '+trip.label:''}`.replace(/[/\\?%*:|"<>]/g,'-');
  a.download = safeName + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

async function doDeleteHistTrip(){
  const trip = S.histDetailTrip;
  if(!trip) return;
  if(!confirm(`Permanently delete the ${trip.storeName} trip from ${fmtDate(trip.tripDate)}?\n\nThis cannot be undone.`)) return;
  haptic('heavy');
  if(DEV){
    S.histTrips = S.histTrips.filter(t => t.id !== trip.id);
    S.histDetailTrip = null; S.histDetailItems = [];
    closeSheets(); render(); return;
  }
  try {
    const itemsSnap = await getDocs(collection(db,`households/${S.householdId}/trips/${trip.id}/items`));
    const batch = writeBatch(db);
    itemsSnap.docs.forEach(d => batch.delete(d.ref));
    batch.delete(doc(db,`households/${S.householdId}/trips/${trip.id}`));
    await batch.commit();
  } catch(e){ console.error('Delete trip failed', e); return; }
  S.histTrips = S.histTrips.filter(t => t.id !== trip.id);
  S.histDetailTrip = null; S.histDetailItems = [];
  closeSheets(); render();
}
// ─── Store / category template editor ─────────
let _teStoreId=null, _teCats=[], _teDragIdx=null;

function openStoreEditor(storeId) {
  const store=S.stores.find(s=>s.id===storeId); if(!store) return;
  _teStoreId=storeId;
  _teCats=[...(store.categories||[]).filter(c=>c!=='Watchlist')];
  if(q('te-title')) q('te-title').textContent=`${store.name} · Categories`;
  if(q('te-warn'))  q('te-warn').style.display='none';
  renderTeList();
  if(q('te-add-inp')) q('te-add-inp').value='';
  openSheet('te-sheet');
}

function renderTeList() {
  const list=q('te-list'); if(!list) return;
  list.innerHTML=_teCats.map((c,i)=>`
    <div class="te-row" data-ti="${i}" draggable="true">
      <span class="te-handle" data-ti="${i}">⠿</span>
      <input class="te-name" data-ti="${i}" value="${esc(c)}" type="text" maxlength="48">
      <button class="te-del" data-ti="${i}">✕</button>
    </div>`).join('');

  list.querySelectorAll('.te-name').forEach(inp=>{
    inp.addEventListener('blur',()=>{ const i=+inp.dataset.ti; const v=inp.value.trim(); if(v) _teCats[i]=v; else inp.value=_teCats[i]; });
    inp.addEventListener('keydown',e=>{if(e.key==='Enter') inp.blur();});
  });

  list.querySelectorAll('.te-del').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(!confirm(`Remove category "${_teCats[+btn.dataset.ti]}"?`)) return;
      haptic('heavy');
      _teCats.splice(+btn.dataset.ti,1);
      if(q('te-warn')) q('te-warn').style.display='block';
      renderTeList();
    });
  });

  // Desktop drag
  list.querySelectorAll('.te-row').forEach(row=>{
    const i=+row.dataset.ti;
    row.addEventListener('dragstart',e=>{ _teDragIdx=i; row.classList.add('te-dragging'); e.dataTransfer.effectAllowed='move'; });
    row.addEventListener('dragend',()=>{ row.classList.remove('te-dragging'); list.querySelectorAll('.te-row').forEach(r=>r.classList.remove('te-drag-over')); });
    row.addEventListener('dragover',e=>{ e.preventDefault(); if(_teDragIdx!==null&&_teDragIdx!==i){ list.querySelectorAll('.te-row').forEach(r=>r.classList.remove('te-drag-over')); row.classList.add('te-drag-over'); } });
    row.addEventListener('dragleave',()=>row.classList.remove('te-drag-over'));
    row.addEventListener('drop',e=>{ e.preventDefault(); row.classList.remove('te-drag-over'); if(_teDragIdx!==null&&_teDragIdx!==i){ const[m]=_teCats.splice(_teDragIdx,1); _teCats.splice(i,0,m); _teDragIdx=null; haptic('light'); renderTeList(); } });
    const handle=row.querySelector('.te-handle');
    if(handle) setupTeDragTouch(handle,i);
  });
}

function setupTeDragTouch(handle,startIdx){
  handle.addEventListener('touchstart',()=>{
    _teDragIdx=startIdx;
    const onMove=ev=>{
      ev.preventDefault();
      const y=ev.touches[0].clientY;
      const list=q('te-list'); if(!list) return;
      const rows=[...list.querySelectorAll('.te-row')];
      rows.forEach(r=>r.classList.remove('te-drag-over'));
      const target=rows.find(r=>{ const rect=r.getBoundingClientRect(); return y>=rect.top&&y<=rect.bottom; });
      if(target){ const ti=+target.dataset.ti; if(ti!==_teDragIdx) target.classList.add('te-drag-over'); }
    };
    const onEnd=()=>{
      document.removeEventListener('touchmove',onMove);
      document.removeEventListener('touchend',onEnd);
      const list=q('te-list'); if(!list) return;
      const over=list.querySelector('.te-row.te-drag-over');
      if(over){ const toIdx=+over.dataset.ti; over.classList.remove('te-drag-over'); if(toIdx!==_teDragIdx){ const[m]=_teCats.splice(_teDragIdx,1); _teCats.splice(toIdx,0,m); } }
      _teDragIdx=null; renderTeList();
    };
    document.addEventListener('touchmove',onMove,{passive:false});
    document.addEventListener('touchend',onEnd);
  },{passive:true});
}

function doTeAdd(){
  const inp=q('te-add-inp'); if(!inp) return;
  const v=inp.value.trim(); if(!v){ inp.focus(); return; }
  if(_teCats.map(c=>c.toLowerCase()).includes(v.toLowerCase())){ inp.style.boxShadow='0 0 0 2px var(--danger)'; setTimeout(()=>inp.style.boxShadow='',1200); return; }
  _teCats.push(v); inp.value=''; haptic('light'); renderTeList();
  const list=q('te-list'); if(list) list.lastElementChild?.scrollIntoView({block:'end',behavior:'smooth'});
}

async function doSaveStoreCategories(){
  if(!_teStoreId) return;
  const focused=document.activeElement;
  if(focused?.classList.contains('te-name')) focused.blur();
  const list=q('te-list');
  if(list) list.querySelectorAll('.te-name').forEach(inp=>{ const i=+inp.dataset.ti; const v=inp.value.trim(); if(v) _teCats[i]=v; });
  const final=[..._teCats.filter(c=>c!=='Watchlist'),'Watchlist'];
  const btn=q('te-save-btn');
  if(btn){ btn.textContent='…'; btn.disabled=true; }
  try {
    if(!DEV) await updateDoc(doc(db,`households/${S.householdId}/stores/${_teStoreId}`),{categories:final});
    haptic('medium');
    const s=S.stores.find(s=>s.id===_teStoreId); if(s) s.categories=final;
    if(S.store?.id===_teStoreId) S.store.categories=final;
  } catch(e){ console.error('Category save failed',e); }
  if(btn){ btn.textContent='Save'; btn.disabled=false; }
  closeSheets();
}

// ─── Trip bindings ────────────────────────────
function bindTrip(){
  on('t-back','click',()=>{ haptic('light'); S.unsubs.forEach(u=>u()); S.unsubs=[]; S.items=[]; go('home'); });
  on('t-theme','click',()=>{ setTheme(S.theme==='dark'?'light':'dark'); renderTripContent(); });
  on('t-complete','click',doCompleteTrip);
  on('t-regulars','click',openRegularsSheet);
  
  on('t-addBtn','click',doQuickAdd);
  on('t-date-lbl','click',()=>openSheet('edit-date-sheet'));
  on('ed-save','click',doEditTripDate);
  on('t-xoff-toggle','click',()=>{ const l=q('t-xoff-list'); if(l) l.style.display=l.style.display==='none'?'block':'none'; });
  const inp=q('t-add');
  if(inp){
    inp.addEventListener('input',debounce(doAC,180));
    inp.addEventListener('keydown',e=>{ if(e.key==='Enter') doQuickAdd(); });
    inp.addEventListener('blur',()=>setTimeout(()=>{ if(q('ac')) q('ac').style.display='none'; },200));
  }
  qAll('.cat-hdr').forEach(h=>h.addEventListener('click',()=>{
    const id='ci-'+h.dataset.cat; const wrap=document.getElementById(id);
    if(wrap){ const open=wrap.style.display!=='none'; wrap.style.display=open?'none':''; h.querySelector('.cat-chev').classList.toggle('open',!open); haptic('light'); }
  }));
  bindItemInteractions();
  bindEditor();
  bindOverlayClose();
  on('ctx-sheet','click',e=>{ if(e.target.id==='ctx-sheet') closeSheets(); });
  on('reg-close','click',closeSheets);
  on('reg-add-btn','click',doAddRegulars);
}

async function doQuickAdd(){
  const inp=q('t-add'); if(!q('ac')) return;
  const val=inp.value.trim(); if(!val) return;
  inp.value=''; q('ac').style.display='none';
  haptic('medium');
  const cat=guessCategory(val,S.store?.categories||[]);
  const data={name:cap(val),category:cat,qty:1,unit:'ea',priceType:'each',price:0,saleDiscount:0,saleExpiry:null,notes:'',isWatchlist:false,checked:false,sortOrder:Date.now()};
  if(DEV){ S.items.push({id:'dev-'+Date.now(),...data}); renderTripContent(); return; }
  await addDoc(itemsCol(),{...data,createdAt:serverTimestamp()});
  updCache(cap(val),cat); recalcTotals();
}

async function doAC(){
  const inp=q('t-add'),drop=q('ac'); if(!inp||!drop) return;
  const val=inp.value.trim(); if(val.length<2){ drop.style.display='none'; return; }
  const lower=val.toLowerCase();
  let res=[];
  if(DEV){
    const seen=new Set();
    S.items.forEach(i=>{ const k=i.name.toLowerCase(); if(k.includes(lower)&&!seen.has(k)){ seen.add(k); res.push({name:i.name,category:i.category,lastPrice:i.price||0,lastQty:i.qty||1,lastUnit:i.unit||'ea',lastPackSize:i.packSize||'',lastPriceType:i.priceType||'each',lastStoreId:S.store?.id}); } });
  } else {
    try {
      const snap=await getDocs(fsQ(collection(db,`households/${S.householdId}/itemCache`),where('normalizedName','>=',lower),where('normalizedName','<=',lower+'\uf8ff'),limit(8)));
      res=snap.docs.map(d=>d.data());
    } catch(e){}
    if(res.length===0){
      drop.innerHTML=`<div class="ac-item" style="justify-content:center;color:var(--text-muted);font-size:13px"><div class="spin" style="width:16px;height:16px;border-width:2px;margin-right:8px;display:inline-block"></div>Searching food database…</div>`;
      drop.style.display='block';
      const offRes=await fetchOFF(val);
      res=offRes.slice(0,6);
    }
  }
  if(!res.find(r=>r.name.toLowerCase()===lower)){ const gc=guessCategory(val,S.store?.categories||[]); res.push({name:cap(val),category:gc,isNew:true}); }
  if(!res.length){ drop.style.display='none'; return; }
  drop.innerHTML=res.map(r=>`
    <div class="ac-item" data-n="${esc(r.name)}" data-c="${esc(r.category||'')}" data-p="${r.lastPrice||0}" data-q="${r.lastQty||1}" data-u="${esc(r.lastUnit||'ea')}" data-ps="${esc(r.lastPackSize||'')}" data-pt="${esc(r.lastPriceType||'each')}">
      <div class="ac-ic">${catIcon(r.category)}</div>
      <div style="flex:1">
        <div class="ac-name">${r.name}${r.source==='off'?`<span class="off-badge">OFF</span>`:''}</div>
        ${r.category?`<div class="ac-cat">${r.category}</div>`:''}
      </div>
      ${r.lastPrice>0?`<div style="font-size:13px;color:var(--text-secondary)">$${r.lastPrice.toFixed(2)}</div>`:r.isNew?`<div style="font-size:12px;color:var(--text-muted)">new</div>`:''}
    </div>`).join('');
  drop.style.display='block';
  drop.querySelectorAll('.ac-item').forEach(item=>item.addEventListener('click',()=>{
    inp.value=item.dataset.n; drop.style.display='none';
    openEditor('add',{
      name:item.dataset.n,
      category:item.dataset.c||guessCategory(item.dataset.n,S.store?.categories||[]),
      price:parseFloat(item.dataset.p)||0,
      qty:parseFloat(item.dataset.q)||1,
      unit:item.dataset.u||'ea',
      packSize:item.dataset.ps||'',
      priceType:item.dataset.pt||'each',
    });
  }));
}

async function fetchOFF(query){
  try {
    const r=await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&fields=product_name&page_size=8`);
    if(!r.ok) return [];
    const d=await r.json();
    const seen=new Set();
    return (d.products||[]).filter(p=>p.product_name&&p.product_name.length>1&&p.product_name.length<60)
      .filter(p=>{ const k=p.product_name.toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true; })
      .map(p=>({name:p.product_name,category:guessCategory(p.product_name,S.store?.categories||[]),source:'off'}));
  } catch(e){ return []; }
}
async function doEditTripDate(){
  const date=q('ed-date')?.value; if(!date) return;
  const label=q('ed-label')?.value.trim()||'';
  haptic('medium');
  if(!DEV) await updateDoc(doc(db,`households/${S.householdId}/trips/${S.trip.id}`),{tripDate:date,label});
  S.trip.tripDate=date; S.trip.label=label;
  closeSheets();
  renderTripContent();
}
async function doCompleteTrip(){
  if(!confirm('Mark this trip as complete and archive it?')) return;
  haptic('medium');
  if(DEV){ S.unsubs.forEach(u=>u()); S.unsubs=[]; S.items=[]; go('home'); return; }
  await updateDoc(doc(db,`households/${S.householdId}/trips/${S.trip.id}`),{status:'complete',completedAt:serverTimestamp()});
  S.unsubs.forEach(u=>u()); S.unsubs=[]; S.items=[]; go('home');
}

async function openRegularsSheet(){
  const list=q('reg-list'); if(!list) return;
  list.innerHTML=`<div style="text-align:center;padding:28px;color:var(--text-secondary)"><div class="spin" style="margin:0 auto"></div></div>`;
  openSheet('regulars-sheet');
  S.regularsSelected=new Set();
  const btn=q('reg-add-btn'); if(btn){ btn.textContent='Select items above'; btn.style.opacity='.5'; }
  let regulars=[];
  if(DEV){ regulars=S.items.filter(i=>i.isRegular).map(i=>({id:'r-'+i.id,name:i.name,category:i.category,lastPrice:i.price||0})); }
  else {
    try {
      const snap=await getDocs(fsQ(collection(db,`households/${S.householdId}/itemCache`),where('isRegular','==',true)));
      regulars=snap.docs.map(d=>({id:d.id,...d.data()}));
    } catch(e){}
  }
  if(!regulars.length){
    list.innerHTML=`<div style="text-align:center;padding:36px 24px;color:var(--text-secondary)"><div style="font-size:40px;margin-bottom:12px">⭐</div><div style="font-size:16px;font-weight:600;color:var(--text);margin-bottom:6px">No regular items yet</div><div style="font-size:14px;line-height:1.5">Open any item, toggle <strong>Regular Buy</strong>, and save.</div></div>`;
    return;
  }
  list.innerHTML=`<div style="background:var(--bg-card);border-radius:var(--r);margin:10px 12px 4px;overflow:hidden;box-shadow:var(--shadow)">`+
    regulars.map(r=>`
      <div class="reg-item" data-rid="${esc(r.id)}" data-rname="${esc(r.name)}" data-rcat="${esc(r.category||'')}" data-rp="${r.lastPrice||0}" data-rq="${r.lastQty||1}" data-ru="${esc(r.lastUnit||'ea')}" data-rps="${esc(r.lastPackSize||'')}" data-rpt="${esc(r.lastPriceType||'each')}">
        <div class="reg-check" id="rc-${r.id}"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:15px;font-weight:500">${r.name}</div>
          ${r.category?`<div style="font-size:12px;color:var(--text-secondary)">${r.category}</div>`:''}
        </div>
        ${(r.lastPrice||0)>0?`<div style="font-size:13px;font-weight:600;color:var(--text-secondary)">$${r.lastPrice.toFixed(2)}</div>`:''}
      </div>`).join('')+`</div>`;
  list.querySelectorAll('.reg-item').forEach(el=>{
    el.addEventListener('click',()=>{
      haptic('light');
      const rid=el.dataset.rid;
      const chk=document.getElementById('rc-'+rid);
      if(S.regularsSelected.has(rid)){ S.regularsSelected.delete(rid); chk?.classList.remove('on'); }
      else { S.regularsSelected.add(rid); chk?.classList.add('on'); }
      const n=S.regularsSelected.size;
      if(btn){ btn.textContent=n>0?`Add ${n} item${n>1?'s':''}…`:'Select items above'; btn.style.opacity=n>0?'1':'.5'; }
    });
  });
}

async function doAddRegulars(){
  if(!S.regularsSelected?.size) return;
  haptic('medium');
  const toAdd=[];
  q('reg-list').querySelectorAll('.reg-item').forEach(el=>{ if(S.regularsSelected.has(el.dataset.rid)) toAdd.push({name:el.dataset.rname,category:el.dataset.rcat,price:parseFloat(el.dataset.rp)||0,qty:parseFloat(el.dataset.rq)||1,unit:el.dataset.ru||'ea',packSize:el.dataset.rps||'',priceType:el.dataset.rpt||'each'}); });
  for(const item of toAdd){
    const cat=item.category||guessCategory(item.name,S.store?.categories||[]);
    const data={name:item.name,category:cat,qty:item.qty||1,unit:item.unit||'ea',priceType:item.priceType||'each',price:item.price||0,packSize:item.packSize||'',saleDiscount:0,saleExpiry:null,notes:'',isWatchlist:false,isRegular:true,checked:false,sortOrder:Date.now()+Math.random()*1000};
    if(DEV){ S.items.push({id:'dev-'+Date.now(),...data}); }
    else await addDoc(itemsCol(),{...data,createdAt:serverTimestamp()});
  }
  if(!DEV) recalcTotals();
  closeSheets();
  if(DEV) renderTripContent();
}


 

// ─── Editor bindings ─────────────────────────
let _sale=false, _wl=false, _reg=false, _wt='per_lb';

function bindEditor(){
  _sale=(S.editorItem?.saleDiscount||0)>0;
  _wl=S.editorItem?.isWatchlist||false;
  _reg=S.editorItem?.isRegular||false;
  _wt=(S.editorItem?.priceType==='per_kg')?'per_kg':'per_lb';

  on('sale-tog','click',()=>{ _sale=!_sale; q('sale-tog').classList.toggle('on',_sale); const sf=q('sale-fields'); if(sf) sf.style.display=_sale?'block':'none'; haptic('light'); });
  on('wl-tog','click',()=>{ _wl=!_wl; q('wl-tog').classList.toggle('on',_wl); haptic('light'); });
  on('reg-tog','click',()=>{ _reg=!_reg; q('reg-tog').classList.toggle('on',_reg); haptic('light'); });
  on('e-save','click',doSaveItem);
  on('e-del','click',doDeleteItem);
  on('e-photo-add-btn','click',()=>q('e-photo-input')?.click());
  on('e-photo-remove','click',()=>{
    S.editorItem.photoData=null;
    const prev=q('e-photo-preview'); if(prev) prev.style.display='none';
    const addBtn=q('e-photo-add-btn'); if(addBtn) addBtn.style.display='';
    const img=q('e-photo-img'); if(img) img.src='';
    const pi=q('e-photo-input'); if(pi) pi.value='';
  });
  const _pi=q('e-photo-input');
  if(_pi) _pi.addEventListener('change',async e=>{
    const file=e.target.files?.[0]; if(!file) return;
    const data=await compressImage(file,65000); if(!data) return;
    S.editorItem.photoData=data;
    const img=q('e-photo-img'); if(img) img.src=data;
    const prev=q('e-photo-preview'); if(prev) prev.style.display='';
    const addBtn=q('e-photo-add-btn'); if(addBtn) addBtn.style.display='none';
  });
  on('editor-sheet','click',e=>{ if(e.target.id==='editor-sheet') closeSheets(); });

  qAll('.wt-btn').forEach(b=>b.addEventListener('click',()=>{
    qAll('.wt-btn').forEach(x=>x.classList.remove('sel'));
    b.classList.add('sel'); _wt=b.dataset.pt; haptic('light');
    updateWeightEquiv();
  }));

  const wPriceInp=q('e-wprice');
  const wQtyInp=q('e-wqty');
  if(wPriceInp){ wPriceInp.addEventListener('input',updateWeightEquiv); }
  if(wQtyInp){  wQtyInp.addEventListener('input',updateWeightEquiv); }
  updateWeightEquiv();

  document.querySelectorAll('#editor-inner .finput').forEach(inp=>{
    inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); doSaveItem(); } });
  });
}

function updateWeightEquiv(){
  const el=q('e-w-equiv'); if(!el) return;
  const price=parseFloat(q('e-wprice')?.value)||0;
  const lbl=q('e-wqty-label');
  if(price<=0){
    el.textContent='';
    if(lbl) lbl.textContent='Weight (lb)';
    return;
  }
  if(_wt==='per_lb'){
    el.textContent=`$${price.toFixed(2)}/lb = $${(price/0.453592).toFixed(2)}/kg`;
    if(lbl) lbl.textContent='Weight (lb)';
  } else {
    el.textContent=`$${price.toFixed(2)}/kg = $${(price*0.453592).toFixed(2)}/lb`;
    if(lbl) lbl.textContent='Weight (kg)';
  }
}

async function doSaveItem(){
  const name=q('e-name')?.value.trim(); if(!name) return;
  const cat=q('e-cat')?.value||'';
  const packSize=q('e-packsize')?.value.trim()||'';
  const notes=q('e-notes')?.value.trim()||'';

  const eachPrice=parseFloat(q('e-price')?.value)||0;
  const eachQty=parseFloat(q('e-qty')?.value)||1;
  const wPrice=parseFloat(q('e-wprice')?.value)||0;
  const wQty=parseFloat(q('e-wqty')?.value)||1;

  let finalPrice=0, finalPriceType='each', finalQty=1;
  if(wPrice>0){ finalPrice=wPrice; finalPriceType=_wt; finalQty=wQty; }
  else { finalPrice=eachPrice; finalPriceType='each'; finalQty=eachQty; }

  const disc=_sale?(parseFloat(q('e-disc')?.value)||0):0;
  const exp=_sale?(q('e-exp')?.value||null):null;
  const photoData=S.editorItem?.photoData||null;
  const baseData={name,category:cat,qty:finalQty,unit:'ea',packSize,priceType:finalPriceType,price:finalPrice,saleDiscount:disc,saleExpiry:exp,notes,isRegular:_reg,photoData};
  haptic('medium');

  const isStoreWl=S.editorItem?.isStoreWl||false;
  const wlCol=()=>collection(db,`households/${S.householdId}/stores/${S.store.id}/watchlist`);
  const wlRef=(id)=>doc(db,`households/${S.householdId}/stores/${S.store.id}/watchlist/${id}`);

  if(_wl){
    // ── Save to store watchlist ──
    const wlData={...baseData,isWatchlist:true,checked:false};
    if(S.editorMode==='add'){
      if(DEV){ S.watchlistItems.push({id:'dev-wl-'+Date.now(),...wlData,isStoreWl:true}); closeSheets(); return; }
      await addDoc(wlCol(),{...wlData,createdAt:serverTimestamp()});
    } else if(isStoreWl){
      // Editing an existing watchlist item — update in place
      if(DEV){ const idx=S.watchlistItems.findIndex(i=>i.id===S.editorItem.id); if(idx>=0) S.watchlistItems[idx]={...S.watchlistItems[idx],...wlData,isStoreWl:true}; closeSheets(); return; }
      await updateDoc(wlRef(S.editorItem.id),wlData);
    } else {
      // Moving a trip item to watchlist
      if(DEV){
        S.items=S.items.filter(i=>i.id!==S.editorItem.id);
        S.watchlistItems.push({id:'dev-wl-'+Date.now(),...wlData,isStoreWl:true});
        closeSheets(); return;
      }
      await addDoc(wlCol(),{...wlData,createdAt:serverTimestamp()});
      await deleteDoc(doc(db,`households/${S.householdId}/trips/${S.trip.id}/items/${S.editorItem.id}`));
      recalcTotals();
    }
  } else if(isStoreWl){
    // ── Promoting watchlist item to this trip (stays on watchlist) ──
    const tripData={...baseData,isWatchlist:false,checked:false,sortOrder:Date.now()};
    const wlUpdate={...baseData,isWatchlist:true}; // keep watchlist copy current
    if(DEV){
      const idx=S.watchlistItems.findIndex(i=>i.id===S.editorItem.id);
      if(idx>=0) S.watchlistItems[idx]={...S.watchlistItems[idx],...wlUpdate,isStoreWl:true};
      S.items.push({id:'dev-'+Date.now(),...tripData}); closeSheets(); return;
    }
    await updateDoc(wlRef(S.editorItem.id),wlUpdate);
    await addDoc(itemsCol(),{...tripData,createdAt:serverTimestamp()});
    recalcTotals();
  } else {
    // ── Normal trip item save ──
    const data={...baseData,isWatchlist:false,checked:false};
    if(S.editorMode==='add'){
      data.sortOrder=Date.now();
      if(DEV){ S.items.push({id:'dev-'+Date.now(),...data}); closeSheets(); return; }
      await addDoc(itemsCol(),{...data,createdAt:serverTimestamp()});
      updCache(name,cat,finalPrice,_reg,{qty,unit,packSize,priceType:finalPriceType,storeId:S.store?.id});
    } else {
      if(DEV){ const idx=S.items.findIndex(i=>i.id===S.editorItem.id); if(idx>=0) S.items[idx]={...S.items[idx],...data}; closeSheets(); return; }
      await updateDoc(doc(db,`households/${S.householdId}/trips/${S.trip.id}/items/${S.editorItem.id}`),data);
      if(_reg) updCache(name,cat,finalPrice,true,{qty,unit,packSize,priceType:finalPriceType,storeId:S.store?.id});
    }
    recalcTotals();
  }
  closeSheets();
}

async function doDeleteItem(){
  if(!S.editorItem?.id) return;
  const msg=S.editorItem.isStoreWl?`Remove "${S.editorItem.name}" from watchlist?`:`Delete "${S.editorItem.name}"?`;
  if(!confirm(msg)) return;
  haptic('heavy');
  if(S.editorItem.isStoreWl){
    if(DEV){ S.watchlistItems=S.watchlistItems.filter(i=>i.id!==S.editorItem.id); closeSheets(); return; }
    await deleteDoc(doc(db,`households/${S.householdId}/stores/${S.store.id}/watchlist/${S.editorItem.id}`));
    closeSheets(); return;
  }
  if(DEV){ S.items=S.items.filter(i=>i.id!==S.editorItem.id); closeSheets(); return; }
  await deleteDoc(doc(db,`households/${S.householdId}/trips/${S.trip.id}/items/${S.editorItem.id}`));
  recalcTotals(); closeSheets();
}

// ─── Item interactions ────────────────────────
function bindItemInteractions(){
  qAll('.item-row').forEach(row=>{
    const iid=row.dataset.iid; if(!iid) return;
    const wrap=row.closest('.item-wrap');
    const isStoreWl=wrap?.dataset.swl==='true';

    // Double-tap = check/add; single tap after delay = edit
    let tapTimer=null, tapCount=0;
    row.addEventListener('click',()=>{
      tapCount++;
      if(tapCount===1){
        tapTimer=setTimeout(()=>{
          tapCount=0;
          const item=S.items.find(i=>i.id===iid)||S.watchlistItems.find(i=>i.id===iid);
          if(item) openEditor('edit',item);
        },300);
      } else {
        clearTimeout(tapTimer); tapCount=0;
        if(isStoreWl){
          doAddWatchlistToTrip(iid);
        } else {
          row.classList.add('anim-pop'); setTimeout(()=>row.classList.remove('anim-pop'),250);
          doToggleCheck(iid);
        }
      }
    });
    if(wrap) setupSwipe(wrap,row,iid,isStoreWl);
    setupLongPress(row,iid);
    if(wrap) setupDragSort(wrap,iid);
  });
}

function setupSwipe(wrap,row,iid,isStoreWl=false){
  let sx=0,sy=0,cx=0,going=false;
  const THRESH=65;
  row.addEventListener('touchstart',e=>{ sx=e.touches[0].clientX; sy=e.touches[0].clientY; cx=0; going=true; row.style.transition='none'; },{passive:true});
  row.addEventListener('touchmove',e=>{
    if(!going) return;
    const dx=e.touches[0].clientX-sx, dy=e.touches[0].clientY-sy;
    if(Math.abs(dy)>Math.abs(dx)*1.3){ going=false; return; }
    e.preventDefault();
    cx=Math.max(isStoreWl?-100:-220,Math.min(100,dx));
    row.style.transform=`translateX(${cx}px)`;
    if(!isStoreWl){
      const dEl=wrap.querySelector('.irr-del'),mEl=wrap.querySelector('.irr-move');
      if(dEl&&mEl){ dEl.classList.toggle('hi',cx<-70&&cx>=-140); mEl.classList.toggle('hi',cx<-140); }
    }
  },{passive:false});
  row.addEventListener('touchend',()=>{
    if(!going) return; going=false;
    row.style.transition='transform .25s ease';
    const dEl2=wrap.querySelector('.irr-del'),mEl2=wrap.querySelector('.irr-move');
    if(dEl2) dEl2.classList.remove('hi');
    if(mEl2) mEl2.classList.remove('hi');
    if(!isStoreWl&&cx<-140){
      row.style.transform=''; haptic('medium'); setTimeout(()=>openMoveToList(iid),50);
    } else if(cx<-65){
      const msg=isStoreWl?'Remove from watchlist?':'Delete this item?';
      if(!confirm(msg)){ row.style.transform=''; return; }
      haptic('heavy'); row.style.transform='translateX(-110%)'; setTimeout(()=>doDeleteItem2(iid),240);
      } else if(cx>65){
      haptic('medium');
      row.style.transform='translateX(110%)';
      setTimeout(()=>{
        row.style.transform=''; row.style.transition='';
        if(isStoreWl) doAddWatchlistToTrip(iid);
        else doToggleCheck(iid);
      },240);
    } else {
      row.style.transform='';
    }
  });
}

function setupLongPress(row,iid){
  let lpt=null;
  row.addEventListener('touchstart',()=>{ lpt=setTimeout(()=>openCtxMenu(iid),600); },{passive:true});
  row.addEventListener('touchend',()=>clearTimeout(lpt));
  row.addEventListener('touchmove',()=>clearTimeout(lpt),{passive:true});
}

function setupDragSort(wrap,iid){
  // Desktop drag — still on full wrap
  wrap.addEventListener('dragstart',e=>{ S.dragId=iid; wrap.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain',iid); });
  wrap.addEventListener('dragend',()=>{ wrap.classList.remove('dragging'); qAll('.item-wrap.drag-over').forEach(el=>el.classList.remove('drag-over')); S.dragId=null; });
  wrap.addEventListener('dragover',e=>{ e.preventDefault(); e.dataTransfer.dropEffect='move'; if(S.dragId&&S.dragId!==iid){ qAll('.item-wrap.drag-over').forEach(el=>el.classList.remove('drag-over')); wrap.classList.add('drag-over'); } });
  wrap.addEventListener('dragleave',()=>wrap.classList.remove('drag-over'));
  wrap.addEventListener('drop',e=>{ e.preventDefault(); wrap.classList.remove('drag-over'); if(S.dragId&&S.dragId!==iid){ haptic('light'); doReorderItem(S.dragId,iid); } });

  // Touch drag — circle handle only, unchecked items
  const circle=wrap.querySelector('.item-circle');
  const row=wrap.querySelector('.item-row');
  if(!circle||row?.classList.contains('checked')) return;
  circle.addEventListener('touchstart',e=>{
    e.stopPropagation();
    S.dragId=iid; wrap.classList.add('dragging');
    const onMove=ev=>{
      ev.preventDefault();
      const y=ev.touches[0].clientY;
      qAll('.item-wrap.drag-over').forEach(el=>el.classList.remove('drag-over'));
      const all=[...document.querySelectorAll('.item-wrap:not(.dragging)')];
      const target=all.find(el=>{ const r=el.getBoundingClientRect(); return y>=r.top&&y<=r.bottom; });
      if(target) target.classList.add('drag-over');
    };
    const onEnd=()=>{
      document.removeEventListener('touchmove',onMove);
      document.removeEventListener('touchend',onEnd);
      wrap.classList.remove('dragging');
      const over=document.querySelector('.item-wrap.drag-over');
      if(over){ over.classList.remove('drag-over'); const toId=over.dataset.iid; if(toId&&toId!==iid){ haptic('light'); doReorderItem(iid,toId); } }
      S.dragId=null;
    };
    document.addEventListener('touchmove',onMove,{passive:false});
    document.addEventListener('touchend',onEnd);
  },{passive:true});
}

async function doReorderItem(fromId,toId){
  const arr=[...S.items];
  const fi=arr.findIndex(i=>i.id===fromId), ti=arr.findIndex(i=>i.id===toId);
  if(fi<0||ti<0) return;
  const[moved]=arr.splice(fi,1); arr.splice(ti,0,moved); S.items=arr; renderTripContent();
  if(DEV) return;
  try {
    const batch=writeBatch(db);
    arr.forEach((item,idx)=>batch.update(doc(db,`households/${S.householdId}/trips/${S.trip.id}/items/${item.id}`),{sortOrder:idx*10}));
    await batch.commit();
  } catch(e){}
}

function openCtxMenu(iid){
  const wlItem=S.watchlistItems.find(i=>i.id===iid);
  const item=wlItem||S.items.find(i=>i.id===iid); if(!item) return;
  S.contextItem={...item,isStoreWl:!!wlItem};
  q('ctx-title').textContent=`"${item.name}"`;

  if(wlItem){
    // Watchlist item: just offer "Add to this trip"
    q('ctx-cats').innerHTML=`
      <div class="ctx-option" id="ctx-wl-add">
        <span class="ctx-option-ic">＋</span>
        <span class="ctx-option-lbl">Add to this trip</span>
      </div>`;
    document.getElementById('ctx-wl-add')?.addEventListener('click',()=>{ haptic('light'); closeSheets(); doAddWatchlistToTrip(iid); });
    openSheet('ctx-sheet'); return;
  }

  // Trip item: offer Move to Watchlist + Move to another list + categories
  const otherTrips=S.trips.filter(t=>t.status==='active'&&t.id!==S.trip.id);
  const moveRow=otherTrips.length?`<div class="ctx-option" id="ctx-move-list"><span class="ctx-option-ic">↗️</span><span class="ctx-option-lbl">Move to another list…</span></div>`:'';
  const wlRow=`<div class="ctx-option" id="ctx-to-watchlist"><span class="ctx-option-ic">👁</span><span class="ctx-option-lbl">Move to Watchlist</span></div><div style="height:.5px;background:var(--border);margin:0 16px"></div>`;
  const cats=(S.store?.categories||[]).filter(c=>c!=='Watchlist');
  q('ctx-cats').innerHTML=moveRow+wlRow+cats.map(c=>`    <div class="ctx-option" data-cc="${esc(c)}">
      <span class="ctx-option-ic">${catIcon(c)}</span>
      <span class="ctx-option-lbl">${c}</span>
      ${item.category===c?'<span style="margin-left:auto;color:var(--accent)">✓</span>':''}
    </div>`).join('');
  qAll('.ctx-option[data-cc]').forEach(o=>o.addEventListener('click',async()=>{
    haptic('light');
    const cc=o.dataset.cc; if(!cc||!S.contextItem) return;
    if(!DEV) await updateDoc(doc(db,`households/${S.householdId}/trips/${S.trip.id}/items/${S.contextItem.id}`),{category:cc,isWatchlist:false});
    else { const it=S.items.find(i=>i.id===S.contextItem.id); if(it){it.category=cc;it.isWatchlist=false;} }
    updCache(S.contextItem.name,cc); closeSheets();
  }));
  document.getElementById('ctx-move-list')?.addEventListener('click',()=>{ closeSheets(); setTimeout(()=>openMoveToList(iid),50); });
  document.getElementById('ctx-to-watchlist')?.addEventListener('click',()=>{ closeSheets(); setTimeout(()=>doMoveToWatchlist(iid),50); });
  openSheet('ctx-sheet');
}

function openMoveToList(iid){
  const item=S.items.find(i=>i.id===iid); if(!item) return;
  S.contextItem=item;
  const otherTrips=S.trips.filter(t=>t.status==='active'&&t.id!==S.trip.id);
  if(!q('move-list-title')||!q('move-list-options')) return;
  q('move-list-title').textContent=`Move "${item.name}" to…`;
  q('move-list-options').innerHTML=otherTrips.length
    ? otherTrips.map(t=>`
      <div class="ctx-option" data-tid="${t.id}">
        <span class="ctx-option-ic">${storeIco(t.storeType)}</span>
        <div style="flex:1">
          <div class="ctx-option-lbl">${t.storeName}</div>
          <div style="font-size:12px;color:var(--text-secondary)">${fmtDate(t.tripDate)}${t.label?' · '+t.label:''}</div>
        </div>
      </div>`).join('')
    : `<div style="padding:24px;text-align:center;color:var(--text-secondary);font-size:14px">No other active lists.</div>`;
  q('move-list-options').querySelectorAll('.ctx-option').forEach(o=>
    o.addEventListener('click',()=>doMoveToList(o.dataset.tid))
  );
  openSheet('move-list-sheet');
}

async function doMoveToList(targetTripId){
  const item=S.contextItem; if(!item||!targetTripId) return;
  haptic('medium');
  const newItem={name:item.name,category:null,qty:item.qty||1,unit:item.unit||'ea',priceType:'each',price:0,saleDiscount:0,saleExpiry:null,notes:'',isWatchlist:false,isRegular:item.isRegular||false,checked:false,sortOrder:Date.now()};
  if(DEV){
    S.items=S.items.filter(i=>i.id!==item.id);
    closeSheets(); renderTripContent(); return;
  }
  try {
    await addDoc(collection(db,`households/${S.householdId}/trips/${targetTripId}/items`),{...newItem,createdAt:serverTimestamp()});
    await deleteDoc(doc(db,`households/${S.householdId}/trips/${S.trip.id}/items/${item.id}`));
    recalcTotals();
    const targetSnap=await getDocs(collection(db,`households/${S.householdId}/trips/${targetTripId}/items`));
    const tItems=targetSnap.docs.map(d=>({id:d.id,...d.data()}));
    const tActive=tItems.filter(i=>!i.checked&&!i.isWatchlist&&i.category!=='Watchlist').reduce((s,i)=>s+effPrice(i)*(i.qty||1),0);
    const tChecked=tItems.filter(i=>i.checked).reduce((s,i)=>s+effPrice(i)*(i.qty||1),0);
    const tCnt=tItems.filter(i=>!i.checked).length;
    await updateDoc(doc(db,`households/${S.householdId}/trips/${targetTripId}`),{totalActive:tActive,totalChecked:tChecked,itemCount:tCnt});
  } catch(e){ console.error('Move to list failed',e); }
  closeSheets();
}

async function doToggleCheck(iid){
  const item=S.items.find(i=>i.id===iid); if(!item) return;
  haptic('medium');
  if(DEV){ item.checked=!item.checked; renderTripContent(); return; }
  await updateDoc(doc(db,`households/${S.householdId}/trips/${S.trip.id}/items/${iid}`),{checked:!item.checked});
  recalcTotals();
}

async function doDeleteItem2(iid){
  const isWl=S.watchlistItems.some(i=>i.id===iid);
  if(isWl){
    if(DEV){ S.watchlistItems=S.watchlistItems.filter(i=>i.id!==iid); renderTripContent(); return; }
    await deleteDoc(doc(db,`households/${S.householdId}/stores/${S.store.id}/watchlist/${iid}`));
    return;
  }
  if(DEV){ S.items=S.items.filter(i=>i.id!==iid); renderTripContent(); return; }
  await deleteDoc(doc(db,`households/${S.householdId}/trips/${S.trip.id}/items/${iid}`));
  recalcTotals();
}

function openEditor(mode,item={}){
  S.editorMode=mode; S.editorItem={...item};
  const inner=q('editor-inner'); if(!inner) return;
  inner.innerHTML=renderEditor(); openSheet('editor-sheet');
  bindEditor();
  setTimeout(()=>q('e-name')?.focus(),380);
}

function renderTripContent(){
  const editorOpen=document.getElementById('editor-sheet')?.classList.contains('open');
  if(editorOpen){ S.tripNeedsUpdate=true; return; }
  const app=document.getElementById('app');
  app.innerHTML=renderTrip(); bindTrip();
  S.tripNeedsUpdate=false;
}

// ═══════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════
function col(name){ return collection(db,`households/${S.householdId}/${name}`); }
function itemsCol(){ return collection(db,`households/${S.householdId}/trips/${S.trip.id}/items`); }

async function loadHousehold(hid){
  S.householdId=hid;
  const su=onSnapshot(fsQ(col('stores'),orderBy('sortOrder')),snap=>{ S.stores=snap.docs.map(d=>({id:d.id,...d.data()})); if(S.screen==='home') render(); });
  const tu=onSnapshot(col('trips'),snap=>{ S.trips=snap.docs.map(d=>({id:d.id,...d.data()})); if(S.screen==='home') render(); });
  S.unsubs.push(su,tu);
  const chk=await getDocs(col('stores'));
  if(chk.empty) await seedStores(hid);
}

async function loadTrip(tripId){
  S.unsubs.forEach(u=>u()); S.unsubs=[];
  const snap=await getDoc(doc(db,`households/${S.householdId}/trips/${tripId}`));
  if(!snap.exists()){ go('home'); return; }
  S.trip={id:tripId,...snap.data()};
  S.store=S.stores.find(s=>s.id===S.trip.storeId)||{categories:[]};
  S.items=[]; go('trip');
  const iu=onSnapshot(fsQ(collection(db,`households/${S.householdId}/trips/${tripId}/items`),orderBy('sortOrder')),snap=>{
    S.items=snap.docs.map(d=>({id:d.id,...d.data()}));
    if(S.screen==='trip') renderTripContent();
  });
  const wu=onSnapshot(collection(db,`households/${S.householdId}/stores/${S.trip.storeId}/watchlist`),snap=>{
    S.watchlistItems=snap.docs.map(d=>({id:d.id,...d.data(),isStoreWl:true}));
    if(S.screen==='trip') renderTripContent();
  });
  const su2=onSnapshot(fsQ(col('stores'),orderBy('sortOrder')),snap=>{ S.stores=snap.docs.map(d=>({id:d.id,...d.data()})); S.store=S.stores.find(s=>s.id===S.trip.storeId)||{categories:[]}; });
  const tu2=onSnapshot(col('trips'),snap=>{ S.trips=snap.docs.map(d=>({id:d.id,...d.data()})); });
  S.unsubs.push(iu,wu,su2,tu2);
}

async function seedStores(hid){
  const batch=writeBatch(db);
  [{name:'Costco Langley',type:'warehouse',color:'green',sortOrder:0},{name:'SuperStore Langley',type:'supermarket',color:'blue',sortOrder:1}].forEach(s=>{
    const ref=doc(collection(db,`households/${hid}/stores`));
    batch.set(ref,{...s,categories:TEMPLATES[s.type].categories,createdAt:serverTimestamp()});
  });
  await batch.commit();
}

async function recalcTotals(){
  if(DEV) return;
  const items=S.items;
  const active=items.filter(i=>!i.checked&&!i.isWatchlist&&i.category!=='Watchlist').reduce((s,i)=>s+effPrice(i)*(i.qty||1),0);
  const checked=items.filter(i=>i.checked).reduce((s,i)=>s+effPrice(i)*(i.qty||1),0);
  const cnt=items.filter(i=>!i.checked).length;
  await updateDoc(doc(db,`households/${S.householdId}/trips/${S.trip.id}`),{totalActive:active,totalChecked:checked,itemCount:cnt});
}

async function updCache(name,cat,price=0,isRegular=false,extras={}){
  if(!name||!S.householdId||DEV) return;
  const norm=name.toLowerCase();
  const id=norm.replace(/[^a-z0-9]/g,'_').slice(0,80);
  const ref=doc(db,`households/${S.householdId}/itemCache/${id}`);
  try {
    const snap=await getDoc(ref);
    const prev=snap.data()||{};
    const update={
      frequency:(prev.frequency||0)+1,lastUsed:serverTimestamp(),category:cat,
      lastPrice:price>0?price:prev.lastPrice||0,
      lastQty:extras.qty||prev.lastQty||1,
      lastUnit:extras.unit||prev.lastUnit||'ea',
      lastPackSize:extras.packSize!==undefined?extras.packSize:prev.lastPackSize||'',
      lastPriceType:extras.priceType||prev.lastPriceType||'each',
    };
    if(isRegular) update.isRegular=true;
    if(snap.exists()) await updateDoc(ref,update);
    else await setDoc(ref,{name,normalizedName:norm,category:cat,frequency:1,
      lastPrice:price,lastQty:extras.qty||1,lastUnit:extras.unit||'ea',
      lastPackSize:extras.packSize||'',lastPriceType:extras.priceType||'each',
      lastUsed:serverTimestamp(),isRegular:isRegular||false});
  } catch(e){}
}

// ═══════════════════════════════════════════
// DEV MODE
// ═══════════════════════════════════════════
const DEV=new URLSearchParams(location.search).has('dev');

if(DEV){
  S.householdId='dev-household';
  S.user={uid:'dev-user',email:'dev@local'};
  S.stores=[
    {id:'s1',name:'Costco Langley',    type:'warehouse',  color:'green', categories:TEMPLATES.warehouse.categories},
    {id:'s2',name:'SuperStore Langley',type:'supermarket',color:'blue',  categories:TEMPLATES.supermarket.categories},
  ];
  S.trips=[{id:'t1',storeId:'s1',storeName:'Costco Langley',storeType:'warehouse',tripDate:todayStr(),label:'Weekly',status:'active',totalActive:47.96,totalChecked:12.99,itemCount:5}];
  S.trip=S.trips[0]; S.store=S.stores[0];
  S.items=[
    {id:'i1',name:'Bananas',            category:'Produce',        qty:3,  unit:'lb', priceType:'per_lb',price:0.69, saleDiscount:0,   saleExpiry:null,        notes:'',         isWatchlist:false,isRegular:false,checked:false,sortOrder:1},
    {id:'i2',name:'Kirkland Whole Milk',category:'Dairy & Eggs',   qty:2,  unit:'L',  priceType:'each',  price:6.99, saleDiscount:0,   saleExpiry:null,        notes:'2% works', isWatchlist:false,isRegular:true, checked:false,sortOrder:2},
    {id:'i3',name:'Chicken Breasts',    category:'Meat & Seafood', qty:2.5,unit:'lb', priceType:'per_lb',price:8.99, saleDiscount:1.50,saleExpiry:'2026-04-15',notes:'Boneless', isWatchlist:false,isRegular:false,checked:false,sortOrder:3},
    {id:'i4',name:'Spinach',            category:'Produce',        qty:1,  unit:'bag',priceType:'each',  price:5.99, saleDiscount:0,   saleExpiry:null,        notes:'',         isWatchlist:false,isRegular:false,checked:true, sortOrder:4},
    {id:'i6',name:'Sourdough Bread',    category:'Bakery & Bread', qty:1,  unit:'ea', priceType:'each',  price:8.99, saleDiscount:0,   saleExpiry:null,        notes:'',         isWatchlist:false,isRegular:false,checked:false,sortOrder:6},
  ];
  S.watchlistItems=[
    {id:'wl1',name:'Dyson V15',      category:'Electronics',qty:1,unit:'ea',priceType:'each',price:699.99,saleDiscount:0,  saleExpiry:null,        notes:'Wait for sale',isWatchlist:true,isRegular:false,isStoreWl:true},
    {id:'wl2',name:'Vitamix Blender',category:'Electronics',qty:1,unit:'ea',priceType:'each',price:599.99,saleDiscount:50,saleExpiry:'2026-04-20',notes:'',             isWatchlist:true,isRegular:false,isStoreWl:true},
  ];
  window._devMode=true;
  go('trip');
} else {

// ═══════════════════════════════════════════
// AUTH STATE
// ═══════════════════════════════════════════
onAuthStateChanged(auth,async user=>{
  if(user){
    S.user=user;
    let ud=await getDoc(doc(db,'users',user.uid));
    if(!ud.exists()){ await new Promise(r=>setTimeout(r,1500)); ud=await getDoc(doc(db,'users',user.uid)); }
    if(ud.exists()){ await loadHousehold(ud.data().householdId); go('home'); }
    else { await signOut(auth); go('auth'); }
  } else go('auth');
});

} // end DEV else

// ═══════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════
function q(id){ return document.getElementById(id); }
function qAll(sel){ return document.querySelectorAll(sel); }
function on(id,ev,fn){ const el=q(id); if(el) el.addEventListener(ev,fn); }
function esc(s){ return String(s||'').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
function rndCode(){ return Math.random().toString(36).toUpperCase().slice(2,8); }
function debounce(fn,ms){ let t; return(...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; }
function compressImage(file,maxBytes){
  return new Promise(resolve=>{
    const img=new Image(), url=URL.createObjectURL(file);
    img.onload=()=>{
      URL.revokeObjectURL(url);
      const canvas=document.createElement('canvas');
      let w=img.width,h=img.height,maxW=270,maxH=480;
      if(w>maxW||h>maxH){ const rs=Math.min(maxW/w,maxH/h); w=Math.round(w*rs); h=Math.round(h*rs); }
      canvas.width=w; canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      let q=0.75,data='';
      do{data=canvas.toDataURL('image/jpeg',q);q-=0.1;}while(data.length>maxBytes&&q>0.1);
      resolve(data);
    };
    img.onerror=()=>resolve(null);
    img.src=url;
  });
}
function todayStr(){ return new Date().toISOString().split('T')[0]; }
function fmtDate(d){ if(!d) return ''; return new Date(d+'T12:00:00').toLocaleDateString('en-CA',{weekday:'short',month:'short',day:'numeric'}); }
function fmtShort(d){ if(!d) return ''; return new Date(d+'T12:00:00').toLocaleDateString('en-CA',{month:'short',day:'numeric'}); }
function storeIco(t){ return t==='warehouse'?'🏪':t==='supermarket'?'🛒':'🏬'; }
function storeTypeLbl(t){ return t==='warehouse'?'Warehouse':t==='supermarket'?'Supermarket':'Custom'; }
function storeIconHTML(store){ if(store?.icon) return `<span style="font-size:22px">${store.icon}</span>`; return `<img src="./store-icon.png" alt="">`; }
function effPrice(item){ const b=item.price||0; if(!item.saleDiscount||!saleActive(item)) return b; return Math.max(0,b-item.saleDiscount); }
function saleActive(item){ if(!item.saleExpiry) return(item.saleDiscount||0)>0; return new Date(item.saleExpiry+'T12:00:00')>=new Date(todayStr()+'T00:00:00'); }

function openSheet(id){ const el=q(id); if(!el) return; el.style.display='flex'; requestAnimationFrame(()=>{ el.classList.add('open'); const sheet=el.querySelector('.sheet'); if(sheet) bindSheetDrag(sheet); }); }
function bindSheetDrag(sheet){
  if(sheet._dragBound) return; sheet._dragBound=true;
  const handle=sheet.querySelector('.sheet-handle'); if(!handle) return;
  let sy=0, going=false;
  const dragZone=sheet;
  dragZone.addEventListener('touchstart',e=>{ if(e.touches[0].clientY>sheet.getBoundingClientRect().top+48) return; sy=e.touches[0].clientY; going=true; sheet.style.transition='none'; },{passive:true});
  dragZone.addEventListener('touchmove',e=>{ if(!going) return; const dy=e.touches[0].clientY-sy; if(dy>0) sheet.style.transform=`translateY(${dy}px)`; },{passive:true});
  dragZone.addEventListener('touchend',e=>{ if(!going) return; going=false; const dy=e.changedTouches[0].clientY-sy; sheet.style.transition=''; if(dy>40){ closeSheets(); } else { sheet.style.transform=''; } });
}
function closeSheets(){
  qAll('.overlay').forEach(el=>{ el.classList.remove('open'); const sheet=el.querySelector('.sheet'); if(sheet){ sheet.style.transform=''; sheet.style.transition=''; } setTimeout(()=>{ if(!el.classList.contains('open')) el.style.display='none'; },300); });
  if(S.tripNeedsUpdate&&S.screen==='trip'){ setTimeout(()=>{ S.tripNeedsUpdate=false; renderTripContent(); },320); }
}
function bindOverlayClose(){ qAll('.overlay').forEach(el=>el.addEventListener('click',e=>{ if(e.target===el) closeSheets(); })); }

if('serviceWorker' in navigator) navigator.serviceWorker.register('/hallarc/sw.js').catch(()=>{});
try { screen.orientation?.lock?.('portrait').catch(()=>{}); } catch(_){}
render();
