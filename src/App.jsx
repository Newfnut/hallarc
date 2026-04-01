import { useState, useRef, useEffect, useCallback } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ─── Firebase ─────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyATdyW05921fNz_wyZ3zjYVF4o44mm_tyg",
  authDomain: "hallarc.firebaseapp.com",
  projectId: "hallarc",
  storageBucket: "hallarc.firebasestorage.app",
  messagingSenderId: "1057782930491",
  appId: "1:1057782930491:web:b54109ac07001be634501e",
  measurementId: "G-RDCJCLSQ5X"
};

const fbApp  = initializeApp(firebaseConfig);
const db     = getFirestore(fbApp);
const auth   = getAuth(fbApp);
const HH_DOC = "household/main";

// ─── Theme ────────────────────────────────────────────────────────────────────
const B       = '#007AFF';
const HOLD_MS = 380;

// ─── Default Data ─────────────────────────────────────────────────────────────
const DEFAULT_SECTIONS = [
  'Bakery','Produce','Frozen Foods','Dairy','Meat','Deli',
  'Grains, Pasta & Sides','Pantry','Beverages','Health & Beauty','Not Urgent'
];

const COMMON_ITEMS = [
  'Milk','Whole Milk','2% Milk','Skim Milk','Chocolate Milk','Soy Milk','Almond Milk','Oat Milk',
  'Eggs','Eggs Extra Large','Eggs Large','Butter','Cream Cheese','Sour Cream','Heavy Cream',
  'Cheddar Cheese','Mozzarella','Parmesan','Greek Yogurt','Yogurt',
  'Bread','Sourdough','Whole Wheat Bread','Bagels','English Muffins','Pita Bread','Tortillas',
  'Chicken Breasts','Chicken Legs','Chicken Thighs','Ground Beef','Ground Turkey','Salmon','Tilapia',
  'Bacon','Sausage','Ham','Pork Chops','Steak',
  'Apples','Bananas','Oranges','Strawberries','Blueberries','Grapes','Lemons','Limes',
  'Avocado','Tomatoes','Spinach','Arugula','Kale','Romaine Lettuce','Broccoli','Cauliflower',
  'Carrots','Celery','Cucumber','Bell Peppers','Mushrooms','Onions','Garlic','Potatoes',
  'Sweet Potatoes','Corn','Zucchini','Asparagus',
  'Orange Juice','Apple Juice','Lemonade','Sparkling Water','Coffee','Tea','Kombucha',
  'Pasta','Rice','Quinoa','Oatmeal','Cereal','Granola','Bread Crumbs',
  'Olive Oil','Vegetable Oil','Coconut Oil','Vinegar','Soy Sauce','Hot Sauce',
  'Ketchup','Mustard','Mayonnaise','Salsa','Peanut Butter','Jam','Honey','Maple Syrup',
  'Frozen Pizza','Frozen Peas','Frozen Corn','Frozen Berries','Frozen Pineapple','Ice Cream',
  'Chips','Crackers','Pretzels','Popcorn','Nuts','Trail Mix',
  'Dish Soap','Laundry Detergent','Paper Towels','Toilet Paper','Zip Lock Bags',
  'Shampoo','Conditioner','Body Wash','Toothpaste','Deodorant',
  'Raspberry Jam','Cherry Juice','Condensed Milk','Canned Tomatoes','Chicken Broth',
];

// ─── Smart category guesser ───────────────────────────────────────────────────
// Maps keywords → section names (matches DEFAULT_SECTIONS)
const CATEGORY_KEYWORDS = {
  'Produce':              ['apple','banana','orange','strawberr','blueberr','grape','lemon','lime','avocado','tomato','spinach','arugula','kale','lettuce','broccoli','cauliflower','carrot','celery','cucumber','pepper','mushroom','onion','garlic','potato','sweet potato','corn','zucchini','asparagus','mango','pineapple','peach','plum','pear','berry','berries','herb','ginger','beet','radish','leek','shallot','fennel','cabbage','brussels','artichoke','eggplant','squash','cantaloupe','watermelon','melon','cilantro','parsley','basil','mint','thyme','rosemary','dill','chive'],
  'Dairy':                ['milk','cheese','butter','cream','yogurt','egg','sour cream','cheddar','mozzarella','parmesan','brie','feta','gouda','ricotta','cottage','half and half','whipping'],
  'Meat':                 ['chicken','beef','turkey','pork','steak','bacon','sausage','ham','lamb','veal','bison','venison','ground','roast','rib','loin','filet','pepperoni','salami','prosciutto'],
  'Deli':                 ['deli','cold cut','hot dog','wiener','bologna','pastrami','corned beef','rotisserie','sliced'],
  'Bakery':               ['bread','sourdough','bagel','muffin','croissant','bun','roll','loaf','cake','pie','donut','cookie','pastry','pita','tortilla','naan','crumpet','baguette'],
  'Frozen Foods':         ['frozen','ice cream','popsicle','pizza','edamame'],
  'Beverages':            ['juice','water','coffee','tea','soda','pop','lemonade','kombucha','sparkling','energy drink','beer','wine','cider','milk alternative','oat milk','almond milk','soy milk'],
  'Grains, Pasta & Sides':['pasta','rice','quinoa','oatmeal','cereal','granola','bread crumb','noodle','couscous','barley','lentil','oat','flour','cornmeal','grits','polenta','cracker','pretzel','chip'],
  'Pantry':               ['oil','vinegar','sauce','ketchup','mustard','mayo','salsa','peanut butter','jam','honey','maple','syrup','spice','salt','pepper','sugar','baking','vanilla','yeast','cocoa','broth','stock','soup','can','canned','jar','condiment','dressing','seasoning','seasoning','hot sauce','soy sauce','coconut aminos','worcestershire','pickle','olive','relish','capers'],
  'Health & Beauty':      ['shampoo','conditioner','body wash','toothpaste','deodorant','soap','lotion','sunscreen','vitamin','supplement','medicine','advil','tylenol','razor','floss','mouthwash','toilet paper','paper towel','tissue','tampon','pad','bandage','laundry','dish soap','detergent','cleaner','spray','bleach','zip lock','bag','wrap','foil','saran'],
};

function guessSection(name, sections) {
  if (!name || !name.trim()) return '';
  const lower = name.toLowerCase();
  for (const [section, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    // Only suggest if that section actually exists in the store's sections list
    const match = sections.find(s => s === section);
    if (!match) continue;
    if (keywords.some(kw => lower.includes(kw))) return match;
  }
  return ''; // blank if no good guess
}

// Seed data — only used once when Firebase doc doesn't exist yet
const INITIAL_STORES = [
  {
    id: 's1', name: 'Costco Langley', color: '#007AFF', icon: '🛒',
    sections: [...DEFAULT_SECTIONS],
    items: [
      {id:1,name:'Bread',qty:1,size:'',section:'Bakery',price:null,discount:0,saleEnd:'',weekly:false,watch:false,barcode:'',bought:false},
      {id:2,name:'Bananas',qty:1,size:'',section:'Produce',price:1.99,discount:0,saleEnd:'',weekly:true,watch:false,barcode:'',bought:false},
      {id:3,name:'Frozen Pineapple',qty:1,size:'',section:'Frozen Foods',price:11.49,discount:0,saleEnd:'',weekly:false,watch:false,barcode:'',bought:false},
      {id:4,name:'Eggs Extra Large',qty:4,size:'',section:'Dairy',price:9.99,discount:0,saleEnd:'',weekly:true,watch:false,barcode:'',bought:false},
      {id:5,name:'Greek Yogurt',qty:2,size:'1.36kg',section:'Dairy',price:8.99,discount:0,saleEnd:'',weekly:false,watch:false,barcode:'',bought:false},
    ],
    trips: [],
    memory: {}
  },
  {
    id: 's2', name: 'Superstore', color: '#FF9500', icon: '🏪',
    sections: [...DEFAULT_SECTIONS],
    items: [
      {id:101,name:'Milk 3.25%',qty:2,size:'4L',section:'Dairy',price:6.99,discount:0,saleEnd:'',weekly:true,watch:false,barcode:'',bought:false},
      {id:102,name:'Sourdough',qty:1,size:'',section:'Bakery',price:4.49,discount:0,saleEnd:'',weekly:false,watch:false,barcode:'',bought:false},
    ],
    trips: [],
    memory: {}
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function effectivePrice(item) {
  if (!item.price) return null;
  // Fix 7: if sale has expired, ignore discount
  if (item.discount && item.saleEnd) {
    const today = new Date(); today.setHours(0,0,0,0);
    const end   = new Date(item.saleEnd); end.setHours(0,0,0,0);
    if (end < today) return item.price; // sale expired
  }
  return item.discount ? Math.max(0, item.price - item.discount) : item.price;
}

// Fix 3: totalCost excludes 'Not Urgent' section
function totalCost(items, excludeSection = 'Not Urgent') {
  return items
    .filter(i => i.price && !i.bought && i.section !== excludeSection)
    .reduce((s, i) => s + effectivePrice(i) * i.qty, 0);
}

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

// Fix 7: strip expired sales from a store's items
function stripExpiredSales(items) {
  const today = new Date(); today.setHours(0,0,0,0);
  return items.map(item => {
    if (item.discount && item.saleEnd) {
      const end = new Date(item.saleEnd); end.setHours(0,0,0,0);
      if (end < today) {
        return { ...item, discount: 0, saleEnd: '' };
      }
    }
    return item;
  });
}

// Fix 9: add next-week instances of weekly items that were bought
function rePopulateWeeklyItems(store) {
  const today = new Date(); today.setHours(0,0,0,0);
  const nextId = Date.now();
  let counter = 0;

  // Weekly items that are bought and not already re-scheduled
  const boughtWeekly = store.items.filter(i => i.bought && i.weekly);
  if (!boughtWeekly.length) return store;

  const existing = store.items.filter(i => !i.bought);
  const newItems = [...store.items];

  boughtWeekly.forEach(item => {
    // Check if a non-bought copy already exists (avoid duplicates)
    const alreadyPending = existing.some(e => e.name === item.name && e.weekly);
    if (!alreadyPending) {
      // Compute next occurrence: next calendar week same weekday, or simply +7 days from today
      const nextDate = new Date(today);
      nextDate.setDate(nextDate.getDate() + 7);
      newItems.push({
        ...item,
        id: nextId + (counter++),
        bought: false,
        // tag with nextDue so UI can show it; strip discount if expired
        discount: effectivePrice(item) !== item.price ? 0 : item.discount,
        saleEnd: effectivePrice(item) !== item.price ? '' : item.saleEnd,
      });
    }
  });

  return { ...store, items: newItems };
}

// ─── CSV Export Helper ────────────────────────────────────────────────────────
function exportToCSV(items, sections, storeName) {
  const rows = [['Store','Section','Item','Qty','Size','Regular Price','Discount','Sale Price','Line Total','Weekly','On Sale','Watch','Barcode']];
  sections.forEach(sec => {
    const its = items.filter(i => !i.bought && i.section === sec);
    its.forEach(item => {
      const eff = effectivePrice(item);
      rows.push([
        storeName, sec, item.name, item.qty, item.size || '',
        item.price != null ? item.price.toFixed(2) : '',
        item.discount ? item.discount.toFixed(2) : '',
        eff != null ? eff.toFixed(2) : '',
        eff != null ? (eff * item.qty).toFixed(2) : '',
        item.weekly ? 'Yes' : '',
        item.discount > 0 ? 'Yes' : '',
        item.watch ? 'Yes' : '',
        item.barcode || '',
      ]);
    });
  });
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `${storeName.replace(/\s+/g,'-')}-grocery-list.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Global Styles ────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #f2f2f7; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif; }
  #root { height: 100%; overflow: hidden; }
  input, select, button, textarea { font-family: inherit; }
  ::-webkit-scrollbar { display: none; }
  .ios-scroll { -webkit-overflow-scrolling: touch; overflow-y: auto; overscroll-behavior-y: contain; }
  @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
  .sheet { animation: slideUp 0.32s cubic-bezier(0.32,0.72,0,1); }
  .fade  { animation: fadeIn  0.18s ease; }
  /* Fix 1: swipe-row must never overflow horizontally */
  .swipe-row { position: relative; overflow: hidden; max-width: 100%; }
  .swipe-content { will-change: transform; transition: none; max-width: 100%; }
  .swipe-content.snapping { transition: transform 0.2s cubic-bezier(0.34,1,0.64,1); }
  /* Fix 2: delete action is now a confirm button, revealed on swipe but stays open */
  .swipe-action-delete { position:absolute; right:0; top:0; bottom:0; width:80px; background:#FF3B30; display:flex; align-items:center; justify-content:center; color:#fff; font-size:13px; font-weight:600; flex-direction:column; gap:2px; cursor:pointer; }
  .swipe-action-check  { position:absolute; left:0;  top:0; bottom:0; width:80px; background:#34C759; display:flex; align-items:center; justify-content:center; color:#fff; font-size:13px; font-weight:600; flex-direction:column; gap:2px; }
  .safe-top    { padding-top: env(safe-area-inset-top, 0px); }
  .safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
  input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus {
    -webkit-text-fill-color: #000 !important;
    -webkit-box-shadow: 0 0 0 1000px #f2f2f7 inset !important;
    transition: background-color 5000s ease-in-out 0s;
  }
  /* Fix 8: lock to portrait */
  @media screen and (orientation: landscape) {
    body::before {
      content: 'Please rotate your device to portrait';
      position: fixed; inset: 0; background: #f2f2f7;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 600; color: #3c3c43;
      z-index: 9999; text-align: center; padding: 20px;
    }
    #root { display: none; }
  }
`;

// ─── Shared Components ────────────────────────────────────────────────────────
function Tag({ bg, color, children }) {
  return (
    <span style={{background:bg,color,borderRadius:4,padding:'1px 5px',fontSize:10,fontWeight:600,letterSpacing:0.2,whiteSpace:'nowrap'}}>
      {children}
    </span>
  );
}

function Toggle({ on, onToggle }) {
  return (
    <button onClick={onToggle} style={{
      width:51,height:31,borderRadius:16,border:'none',cursor:'pointer',flexShrink:0,
      background:on?'#34C759':'#e5e5ea',position:'relative',transition:'background 0.22s',padding:0
    }}>
      <span style={{
        position:'absolute',width:27,height:27,background:'#fff',borderRadius:'50%',
        top:2,left:on?22:2,transition:'left 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow:'0 2px 6px rgba(0,0,0,0.22)'
      }}/>
    </button>
  );
}

function Sheet({ open, onClose, title, children, height='92vh' }) {
  if (!open) return null;
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} className="fade" style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:300,
      display:'flex',alignItems:'flex-end',justifyContent:'center'
    }}>
      <div className="sheet" style={{
        background:'#fff',borderRadius:'13px 13px 0 0',width:'100%',
        maxHeight:height,display:'flex',flexDirection:'column',paddingBottom:'env(safe-area-inset-bottom,16px)'
      }}>
        <div style={{display:'flex',justifyContent:'center',padding:'10px 0 0'}}>
          <div style={{width:36,height:5,borderRadius:3,background:'#d1d1d6'}}/>
        </div>
        <div style={{
          display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'8px 16px 10px',borderBottom:'0.5px solid #e5e5ea',flexShrink:0
        }}>
          <span style={{fontSize:17,fontWeight:600,color:'#000'}}>{title}</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:B,fontSize:17,fontWeight:400,cursor:'pointer',padding:'0 0 0 8px'}}>Done</button>
        </div>
        <div className="ios-scroll" style={{flex:1,overflowY:'auto'}}>
          {children}
        </div>
      </div>
    </div>
  );
}

function SaleTag({ item }) {
  if (!item.discount) return null;
  // Fix 7: show as expired if past end date
  const today = new Date(); today.setHours(0,0,0,0);
  const end   = item.saleEnd ? new Date(item.saleEnd) : null;
  if (end) { end.setHours(0,0,0,0); }
  const expired  = end && end < today;
  const expiring = !expired && end && ((end - today) / 864e5 < 7);
  const endStr   = item.saleEnd ? ' ' + item.saleEnd.slice(5).replace('-','/') : '';
  if (expired) return <Tag bg="#f2f2f7" color="#aeaeb2">sale ended</Tag>;
  return <Tag bg={expiring?'#fff3e0':'#e8f5e9'} color={expiring?'#C1440E':'#1a7a3a'}>-${item.discount.toFixed(2)}{endStr}</Tag>;
}

// ─── Swipeable Item Row (Fix 2: left=check immediate, right=reveal+confirm delete) ──
function SwipeRow({ children, onDelete, onToggleBought, bought }) {
  const rowRef   = useRef(null);
  const startX   = useRef(null);
  const currentX = useRef(0);
  const [revealed, setRevealed] = useState(null); // null | 'check' | 'delete'

  function getContent() { return rowRef.current?.querySelector('.swipe-content'); }

  function snapBack() {
    const c = getContent();
    if (!c) return;
    c.classList.add('snapping');
    c.style.transform = 'translateX(0)';
  }

  function onTouchStart(e) {
    // If delete is already revealed, touches on the delete button are handled by its onClick
    startX.current  = e.touches[0].clientX;
    currentX.current = 0;
    const c = getContent();
    if (c) c.classList.remove('snapping');
  }

  function onTouchMove(e) {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    currentX.current = dx;
    const c = getContent();
    if (!c) return;
    // Right swipe (check): full range; left swipe (delete): clamp to -80 to reveal panel
    const clamped = Math.max(-80, Math.min(80, dx));
    c.style.transform = `translateX(${clamped}px)`;
    if (dx < -12) setRevealed('delete');
    else if (dx > 12) setRevealed('check');
    else setRevealed(null);
  }

  function onTouchEnd() {
    const c = getContent();
    if (!c) return;
    const dx = currentX.current;

    if (dx > 60) {
      // Right swipe far enough → immediate check/uncheck
      c.classList.add('snapping');
      c.style.transform = 'translateX(0)';
      setRevealed(null);
      onToggleBought();
    } else if (dx < -60) {
      // Left swipe far enough → REVEAL delete panel, stay open, wait for tap
      c.classList.add('snapping');
      c.style.transform = 'translateX(-80px)';
      setRevealed('delete');
    } else {
      // Not far enough → snap back
      snapBack();
      setRevealed(null);
    }
    startX.current  = null;
    currentX.current = 0;
  }

  function handleDeleteConfirm(e) {
    e.stopPropagation();
    const c = getContent();
    if (c) { c.classList.add('snapping'); c.style.transform = 'translateX(-100%)'; }
    setTimeout(() => onDelete(), 180);
  }

  // Tapping anywhere else on the row when delete is revealed snaps it back
  function handleContentClick(e) {
    if (revealed === 'delete') { snapBack(); setRevealed(null); }
  }

  return (
    <div ref={rowRef} className="swipe-row"
      onTouchStart={onTouchStart} onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd} onTouchCancel={()=>{ snapBack(); setRevealed(null); startX.current=null; }}>
      <div className="swipe-action-check" style={{opacity:revealed==='check'?1:0,transition:'opacity 0.1s'}}>
        <span style={{fontSize:20}}>{bought?'↩':'✓'}</span>
        <span>{bought?'Undo':'Done'}</span>
      </div>
      {/* Delete panel: always rendered when revealed so tap works */}
      <div className="swipe-action-delete"
        onClick={revealed==='delete' ? handleDeleteConfirm : undefined}
        style={{opacity:revealed==='delete'?1:0,transition:'opacity 0.1s',pointerEvents:revealed==='delete'?'auto':'none'}}>
        <span style={{fontSize:20}}>🗑</span>
        <span>Delete</span>
      </div>
      <div className="swipe-content" onClick={handleContentClick}>{children}</div>
    </div>
  );
}

// ─── Barcode Scanner (Fix 4: camera loads in a full-screen overlay properly) ──
function BarcodeScanner({ onResult, onClose }) {
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const detectorRef = useRef(null);
  const frameRef    = useRef(null);
  const [status, setStatus]         = useState('starting');
  const [manualCode, setManualCode] = useState('');
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function start() {
      // Small delay so the DOM has painted the video element
      await new Promise(r => setTimeout(r, 100));
      if (!active) return;

      if (!navigator.mediaDevices?.getUserMedia) {
        if (active) setStatus('manual');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.onloadedmetadata = () => {
            if (!active) return;
            video.play()
              .then(() => { if (active) setCameraReady(true); })
              .catch(() => { if (active) setCameraReady(true); }); // some browsers auto-play without promise resolve
          };
        }

        if ('BarcodeDetector' in window) {
          detectorRef.current = new window.BarcodeDetector({
            formats: ['ean_13','ean_8','upc_a','upc_e','code_128','code_39','qr_code']
          });
          if (active) setStatus('scanning');
        } else {
          if (active) setStatus('manual');
        }
      } catch (err) {
        console.warn('Camera error:', err);
        if (active) setStatus('error');
      }
    }

    start();
    return () => {
      active = false;
      cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    if (status !== 'scanning' || !cameraReady) return;
    let active = true;

    async function detect() {
      if (!active) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && detectorRef.current) {
        try {
          const codes = await detectorRef.current.detect(video);
          if (codes.length > 0) {
            cancelAnimationFrame(frameRef.current);
            streamRef.current?.getTracks().forEach(t => t.stop());
            lookupBarcode(codes[0].rawValue);
            return;
          }
        } catch {}
      }
      if (active) frameRef.current = requestAnimationFrame(detect);
    }

    frameRef.current = requestAnimationFrame(detect);
    return () => { active = false; cancelAnimationFrame(frameRef.current); };
  }, [status, cameraReady]);

  async function lookupBarcode(code) {
    setStatus('looking');
    try {
      const res  = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
      const data = await res.json();
      if (data.status === 1) {
        const p = data.product;
        onResult({ barcode: code, name: p.product_name || '', size: p.quantity || '' });
      } else {
        onResult({ barcode: code, name: '', size: '' });
      }
    } catch {
      onResult({ barcode: code, name: '', size: '' });
    }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#000'}}>
      {/* Camera viewport — always in DOM so stream can attach */}
      <div style={{
        position:'relative',
        flex: (status==='starting'||status==='scanning') ? 1 : '0 0 0px',
        overflow:'hidden',
        background:'#000',
        display: (status==='starting'||status==='scanning') ? 'block' : 'none',
        minHeight: (status==='starting'||status==='scanning') ? 260 : 0,
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}
        />
        {status==='scanning' && (
          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
            <div style={{width:'65%',height:'30%',border:'2px solid rgba(255,255,255,0.85)',borderRadius:10,boxShadow:'0 0 0 9999px rgba(0,0,0,0.38)'}}/>
          </div>
        )}
        {!cameraReady && status==='starting' && (
          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'#000'}}>
            <span style={{color:'#fff',fontSize:14}}>Starting camera…</span>
          </div>
        )}
      </div>

      <div style={{background:'#fff',padding:16,flex:1,overflowY:'auto'}}>
        {status==='looking' && (
          <p style={{textAlign:'center',padding:30,color:'#888'}}>Looking up barcode…</p>
        )}
        {status==='error' && (
          <p style={{textAlign:'center',color:'#FF3B30',marginBottom:12,fontSize:14}}>
            Camera unavailable — enter barcode below.
          </p>
        )}

        {(status==='manual'||status==='error'||status==='scanning') && (
          <div style={{marginBottom:8}}>
            <p style={{fontSize:12,color:'#8e8e93',marginBottom:6}}>
              {status==='scanning' ? 'Or type barcode manually:' : 'Enter barcode:'}
            </p>
            <div style={{display:'flex',gap:8}}>
              <input
                value={manualCode}
                onChange={e=>setManualCode(e.target.value)}
                placeholder="0123456789012"
                inputMode="numeric"
                style={{flex:1,border:'1px solid #e5e5ea',borderRadius:10,padding:'9px 12px',fontSize:15,background:'#f2f2f7',outline:'none'}}
              />
              <button
                onClick={()=>manualCode.trim()&&lookupBarcode(manualCode.trim())}
                style={{background:B,color:'#fff',border:'none',borderRadius:10,padding:'0 16px',cursor:'pointer',fontSize:15,fontWeight:600}}>
                Go
              </button>
            </div>
          </div>
        )}

        <button onClick={onClose} style={{
          width:'100%',marginTop:8,background:'#f2f2f7',border:'none',
          borderRadius:10,padding:12,fontSize:15,cursor:'pointer',color:'#3c3c43',fontWeight:500
        }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Item Form (Fix 6: blank section default + smart guess) ──────────────────
function ItemForm({ item, sections, memory, onSave, onDelete, defaultFilter }) {
  const notUrgent = sections.includes('Not Urgent') ? 'Not Urgent' : (sections[sections.length-1]||sections[0]||'');
  const defaultSection = (() => {
    if (defaultFilter === 'watchlist') return notUrgent;
    return ''; // Fix 6: blank — user must pick or it's guessed on name entry
  })();

  const blank = {
    name:'', qty:1, size:'', section:defaultSection, price:'',
    discount:'', saleEnd:'', weekly: defaultFilter==='weekly', watch: defaultFilter==='watchlist',
    barcode:''
  };
  const init = item
    ? {...item, price:item.price??'', discount:item.discount||'', saleEnd:item.saleEnd||''}
    : blank;

  const [f, setF]           = useState(init);
  const [saleOn, setSaleOn] = useState(item ? item.discount>0 : defaultFilter==='sale');
  const [showScanner, setShowScanner] = useState(false);
  const [expandedField, setExpandedField] = useState(null);

  const set = (k,v) => setF(p=>({...p,[k]:v}));

  // Fix 6: auto-guess section when name changes (only if not already set by user)
  function handleNameChange(val) {
    set('name', val);
    if (!item) { // only for new items
      const guess = guessSection(val, sections);
      if (guess) set('section', guess);
    }
  }

  function handleBarcodeResult({barcode,name,size}) {
    setShowScanner(false);
    setF(p => {
      const newName = name || p.name;
      const guess   = (!item && name) ? guessSection(name, sections) : p.section;
      return { ...p, barcode, name: newName, size: size||p.size, section: guess||p.section };
    });
  }

  function handleSave() {
    if (!f.name.trim()) return;
    // Fix 7: if sale is on but end date is past, turn off
    let finalDiscount = saleOn ? (parseFloat(f.discount)||0) : 0;
    let finalSaleEnd  = saleOn ? f.saleEnd : '';
    if (finalDiscount && finalSaleEnd) {
      const today = new Date(); today.setHours(0,0,0,0);
      const end   = new Date(finalSaleEnd); end.setHours(0,0,0,0);
      if (end < today) { finalDiscount = 0; finalSaleEnd = ''; }
    }
    onSave({
      ...f,
      qty:      parseInt(f.qty)||1,
      price:    parseFloat(f.price)||null,
      discount: finalDiscount,
      saleEnd:  finalSaleEnd,
    });
  }

  const rowStyle   = {display:'flex',alignItems:'center',justifyContent:'space-between',padding:'13px 16px',borderBottom:'0.5px solid #e5e5ea',background:'#fff',minHeight:50};
  const labelStyle = {fontSize:15,color:'#000',display:'flex',alignItems:'center',gap:10};
  const valueStyle = {fontSize:15,color:'#8e8e93',display:'flex',alignItems:'center',gap:6};

  if (showScanner) return <BarcodeScanner onResult={handleBarcodeResult} onClose={()=>setShowScanner(false)} />;

  return (
    <div style={{paddingBottom:24}}>
      {/* Name hero */}
      <div style={{background:'#fff',borderRadius:12,margin:'12px 16px',padding:'14px 14px',display:'flex',alignItems:'flex-start',gap:12,boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
        <button onClick={()=>setShowScanner(true)} style={{
          width:56,height:56,borderRadius:10,background:'#f2f2f7',border:'none',cursor:'pointer',
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,
          flexShrink:0,color:'#007AFF',fontSize:10,fontWeight:600
        }}>
          <span style={{fontSize:22}}>📷</span>
          <span>Scan</span>
        </button>
        <div style={{flex:1,minWidth:0}}>
          <input
            value={f.name}
            onChange={e=>handleNameChange(e.target.value)}
            placeholder="Item name"
            autoFocus={!item}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="words"
            spellCheck="false"
            style={{width:'100%',border:'none',outline:'none',fontSize:19,fontWeight:600,color:'#000',background:'transparent',padding:0,marginBottom:4}}
          />
          <input
            value={f.size}
            onChange={e=>set('size',e.target.value)}
            placeholder="Size / note (e.g. 1.36kg)"
            autoComplete="off"
            style={{width:'100%',border:'none',outline:'none',fontSize:13,color:'#007AFF',background:'transparent',padding:0}}
          />
        </div>
        <button onClick={()=>set('watch',!f.watch)} style={{background:'none',border:'none',cursor:'pointer',padding:4,fontSize:22,opacity:f.watch?1:0.3,flexShrink:0}}>★</button>
      </div>

      {/* Info section */}
      <div style={{margin:'0 16px 8px',fontSize:12,color:'#8e8e93',fontWeight:600,textTransform:'uppercase',letterSpacing:0.5}}>Info</div>
      <div style={{background:'#fff',borderRadius:12,margin:'0 16px',overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>

        {/* Category */}
        <div style={rowStyle} onClick={()=>setExpandedField(expandedField==='section'?null:'section')}>
          <div style={labelStyle}><span style={{fontSize:20}}>🗂</span><span>Category</span></div>
          <div style={valueStyle}>
            <span style={{color:f.section?'#8e8e93':'#FF3B30'}}>{f.section||'Pick a category'}</span>
            <span style={{color:'#c7c7cc',fontSize:13}}>{expandedField==='section'?'▲':'▶'}</span>
          </div>
        </div>
        {expandedField==='section' && (
          <div style={{background:'#f9f9f9',borderBottom:'0.5px solid #e5e5ea',maxHeight:200,overflowY:'auto'}}>
            {sections.map(s=>(
              <div key={s} onClick={()=>{set('section',s);setExpandedField(null);}}
                style={{padding:'10px 16px 10px 52px',fontSize:15,color:f.section===s?B:'#000',borderBottom:'0.5px solid #f2f2f7',
                  fontWeight:f.section===s?600:400,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                {s}{f.section===s&&<span style={{color:B}}>✓</span>}
              </div>
            ))}
          </div>
        )}

        {/* Quantity */}
        <div style={rowStyle}>
          <div style={labelStyle}><span style={{fontSize:20}}>🔢</span><span>Quantity</span></div>
          <div style={{display:'flex',alignItems:'center',gap:0}}>
            <button onClick={()=>set('qty',Math.max(1,(parseInt(f.qty)||1)-1))}
              style={{width:32,height:32,borderRadius:'50%',background:'#e5e5ea',border:'none',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',color:'#3c3c43'}}>−</button>
            <span style={{fontSize:17,fontWeight:600,color:'#000',minWidth:28,textAlign:'center'}}>{f.qty}</span>
            <button onClick={()=>set('qty',(parseInt(f.qty)||1)+1)}
              style={{width:32,height:32,borderRadius:'50%',background:B,border:'none',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff'}}>+</button>
          </div>
        </div>

        {/* Price */}
        <div style={rowStyle} onClick={()=>setExpandedField(expandedField==='price'?null:'price')}>
          <div style={labelStyle}><span style={{fontSize:20}}>💰</span><span>Price</span></div>
          <div style={valueStyle}>
            <span>{f.price?`$${parseFloat(f.price).toFixed(2)}`:'Not set'}</span>
            <span style={{color:'#c7c7cc',fontSize:13}}>{expandedField==='price'?'▲':'▶'}</span>
          </div>
        </div>
        {expandedField==='price' && (
          <div style={{background:'#f9f9f9',padding:'10px 16px',borderBottom:'0.5px solid #e5e5ea',display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:15,color:'#8e8e93',flexShrink:0}}>$</span>
            <input type="number" step="0.01" value={f.price} onChange={e=>set('price',e.target.value)}
              placeholder="0.00" autoFocus inputMode="decimal"
              style={{flex:1,border:'1px solid #e5e5ea',borderRadius:8,padding:'8px 10px',fontSize:15,background:'#fff',outline:'none'}} />
          </div>
        )}

        {/* Barcode */}
        <div style={{...rowStyle,borderBottom:'none'}} onClick={()=>setExpandedField(expandedField==='barcode'?null:'barcode')}>
          <div style={labelStyle}><span style={{fontSize:20}}>▋▋</span><span>Barcode</span></div>
          <div style={valueStyle}>
            <span>{f.barcode||'Not set'}</span>
            <span style={{color:'#c7c7cc',fontSize:13}}>{expandedField==='barcode'?'▲':'▶'}</span>
          </div>
        </div>
        {expandedField==='barcode' && (
          <div style={{background:'#f9f9f9',padding:'10px 16px',display:'flex',gap:8}}>
            <input value={f.barcode} onChange={e=>set('barcode',e.target.value)} placeholder="Scan or type"
              inputMode="numeric" autoComplete="off"
              style={{flex:1,border:'1px solid #e5e5ea',borderRadius:8,padding:'8px 10px',fontSize:15,background:'#fff',outline:'none'}} />
            <button onClick={()=>setShowScanner(true)}
              style={{background:B,color:'#fff',border:'none',borderRadius:8,padding:'0 12px',cursor:'pointer',fontSize:18}}>📷</button>
          </div>
        )}
      </div>

      {/* Options */}
      <div style={{margin:'16px 16px 8px',fontSize:12,color:'#8e8e93',fontWeight:600,textTransform:'uppercase',letterSpacing:0.5}}>Options</div>
      <div style={{background:'#fff',borderRadius:12,margin:'0 16px',overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
        {[
          ['🏷','On Sale',saleOn,()=>setSaleOn(v=>!v)],
          ['🔁','Weekly / Regular Buy',f.weekly,()=>set('weekly',!f.weekly)],
          ['★','Watch List',f.watch,()=>set('watch',!f.watch)],
        ].map(([icon,label,val,toggle],i,arr)=>(
          <div key={label} style={{...rowStyle,borderBottom:i<arr.length-1?'0.5px solid #e5e5ea':'none'}}>
            <div style={labelStyle}><span style={{fontSize:20}}>{icon}</span><span>{label}</span></div>
            <Toggle on={val} onToggle={toggle} />
          </div>
        ))}
        {saleOn && (
          <div style={{background:'#f9f9f9',padding:'10px 16px 12px',borderTop:'0.5px solid #e5e5ea'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <div style={{fontSize:11,color:'#8e8e93',fontWeight:600,textTransform:'uppercase',letterSpacing:0.4,marginBottom:4}}>Discount</div>
                <div style={{display:'flex',alignItems:'center',gap:4}}>
                  <span style={{color:'#8e8e93',fontSize:14}}>-$</span>
                  <input type="number" step="0.01" value={f.discount} onChange={e=>set('discount',e.target.value)}
                    placeholder="0.00" inputMode="decimal"
                    style={{flex:1,border:'1px solid #e5e5ea',borderRadius:8,padding:'7px 8px',fontSize:14,background:'#fff',outline:'none'}} />
                </div>
              </div>
              <div>
                <div style={{fontSize:11,color:'#8e8e93',fontWeight:600,textTransform:'uppercase',letterSpacing:0.4,marginBottom:4}}>Sale Ends</div>
                <input type="date" value={f.saleEnd} onChange={e=>set('saleEnd',e.target.value)}
                  style={{width:'100%',border:'1px solid #e5e5ea',borderRadius:8,padding:'7px 8px',fontSize:14,background:'#fff',outline:'none',boxSizing:'border-box'}} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{padding:'20px 16px 0'}}>
        <button onClick={handleSave} style={{
          width:'100%',background:B,color:'#fff',border:'none',borderRadius:12,
          padding:14,fontSize:17,fontWeight:600,cursor:'pointer',marginBottom:10,
          boxShadow:'0 2px 8px rgba(0,122,255,0.3)'
        }}>
          {item?'Save Changes':'Add Item'}
        </button>
        {item && (
          <button onClick={()=>onDelete(item.id)} style={{
            width:'100%',background:'none',color:'#FF3B30',border:'1px solid #FF3B30',
            borderRadius:12,padding:12,fontSize:15,cursor:'pointer'
          }}>Remove Item</button>
        )}
      </div>
    </div>
  );
}

// ─── Quick Add Bar (Fix 5: Est. moved to search row) ─────────────────────────
// Note: estTotal is now passed in and shown inside the search bar row
function QuickAdd({ sections, memory, onQuickAdd, onOpenEdit, onScanBarcode, activeFilter, estTotal, storeColor }) {
  const [query,   setQuery]   = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const suggestions = (() => {
    if (!query.trim()) return [];
    const q   = query.toLowerCase();
    const mem = Object.keys(memory||{});
    return [...new Set([...mem, ...COMMON_ITEMS])].filter(n=>n.toLowerCase().includes(q)&&n.toLowerCase()!==q).slice(0,8);
  })();

  const notUrgent = sections.includes('Not Urgent') ? 'Not Urgent' : (sections[sections.length-1]||sections[0]||'');

  function buildItem(name, mem) {
    const isWatchlist = activeFilter==='watchlist';
    const baseSection = mem?.section || guessSection(name, sections) || sections[0] || '';
    return {
      id: Date.now(), name, qty:1,
      size:    mem?.size||'',
      section: isWatchlist ? notUrgent : baseSection,
      price:   mem?.price||null,
      discount: 0, saleEnd: '',
      weekly:  activeFilter==='weekly',
      watch:   isWatchlist,
      barcode: mem?.barcode||'',
      bought:  false,
    };
  }

  function quickAdd(name) {
    const mem = (memory||{})[name];
    onQuickAdd(buildItem(name, mem));
    setQuery(''); setFocused(false); inputRef.current?.blur();
  }

  function handleAddCustom() {
    if (!query.trim()) return;
    quickAdd(query.trim());
  }

  return (
    <div style={{position:'relative',zIndex:50}}>
      {/* Fix 5: single row with camera | search | est. cost */}
      <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 10px',background:'#fff',borderBottom:'0.5px solid #e5e5ea'}}>
        <button onClick={onScanBarcode} style={{
          background:B,color:'#fff',border:'none',borderRadius:8,
          width:32,height:32,cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0
        }}>📷</button>
        <span style={{color:'#c7c7cc',fontSize:16,lineHeight:1,fontWeight:300,flexShrink:0}}>|</span>
        <input
          ref={inputRef}
          value={query}
          onChange={e=>setQuery(e.target.value)}
          onFocus={()=>setFocused(true)}
          onBlur={()=>setTimeout(()=>setFocused(false),150)}
          onKeyDown={e=>{
            if(e.key==='Enter'&&query.trim()) handleAddCustom();
            if(e.key==='Escape'){setQuery('');setFocused(false);inputRef.current?.blur();}
          }}
          placeholder="Add item…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          style={{flex:1,border:'none',outline:'none',fontSize:15,color:'#000',background:'transparent',padding:'4px 0',minWidth:0}}
        />
        {query.trim() ? (
          <button onClick={()=>{setQuery('');inputRef.current?.focus();}}
            style={{background:'none',border:'none',color:'#8e8e93',fontSize:18,cursor:'pointer',padding:'0 2px',lineHeight:1,flexShrink:0}}>✕</button>
        ) : (
          <button onClick={()=>onOpenEdit({id:null,name:'',qty:1,size:'',section:'',price:'',discount:'',saleEnd:'',weekly:activeFilter==='weekly',watch:activeFilter==='watchlist',barcode:''})}
            style={{background:B,color:'#fff',border:'none',borderRadius:8,width:32,height:32,cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontWeight:300}}>
            +
          </button>
        )}
        <span style={{color:'#c7c7cc',fontSize:16,lineHeight:1,fontWeight:300,flexShrink:0}}>|</span>
        {/* Fix 5: Est. cost here */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',flexShrink:0}}>
          <span style={{fontSize:9,color:'#8e8e93',lineHeight:1}}>Est.</span>
          <span style={{fontSize:13,fontWeight:700,color:storeColor||B,lineHeight:1.2}}>${estTotal.toFixed(2)}</span>
        </div>
      </div>

      {focused && query.trim().length > 0 && (
        <div style={{
          position:'absolute',top:'100%',left:0,right:0,background:'#fff',
          borderBottom:'0.5px solid #e5e5ea',boxShadow:'0 4px 16px rgba(0,0,0,0.10)',
          zIndex:60,maxHeight:300,overflowY:'auto'
        }}>
          <div
            style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 14px',borderBottom:'0.5px solid #f2f2f7',cursor:'pointer'}}
            onPointerDown={e=>{e.preventDefault();handleAddCustom();}}>
            <span style={{fontSize:15,color:B,fontWeight:500}}>Add "{query.trim()}"</span>
            <button
              onPointerDown={e=>{e.stopPropagation();e.preventDefault();
                onOpenEdit({id:null,name:query.trim(),qty:1,size:'',section:guessSection(query.trim(),sections)||'',price:'',discount:'',saleEnd:'',weekly:activeFilter==='weekly',watch:activeFilter==='watchlist',barcode:''});
                setQuery('');setFocused(false);
              }}
              style={{background:'none',border:'none',cursor:'pointer',padding:'4px 6px',fontSize:16,color:'#c7c7cc'}}>✏️</button>
          </div>
          {suggestions.map(name=>{
            const mem = (memory||{})[name];
            const inMemory = !!mem;
            return (
              <div key={name}
                style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderBottom:'0.5px solid #f2f2f7',cursor:'pointer'}}
                onPointerDown={e=>{e.preventDefault();quickAdd(name);}}>
                <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
                  <span style={{fontSize:14,color:inMemory?'#8e8e93':'#c7c7cc'}}>{inMemory?'🗂':'📋'}</span>
                  <span style={{fontSize:15,color:'#000'}}>{name}</span>
                  {mem?.price && <span style={{fontSize:13,color:'#8e8e93'}}>${mem.price.toFixed(2)}</span>}
                  {mem?.size  && <span style={{fontSize:12,color:'#c7c7cc'}}>{mem.size}</span>}
                </div>
                <button
                  onPointerDown={e=>{e.stopPropagation();e.preventDefault();
                    const existing = mem
                      ? {id:null,name,qty:1,size:mem.size||'',section:mem.section||guessSection(name,sections)||'',price:mem.price||'',discount:'',saleEnd:'',weekly:activeFilter==='weekly',watch:activeFilter==='watchlist',barcode:mem.barcode||''}
                      : {id:null,name,qty:1,size:'',section:guessSection(name,sections)||'',price:'',discount:'',saleEnd:'',weekly:activeFilter==='weekly',watch:activeFilter==='watchlist',barcode:''};
                    onOpenEdit(existing);
                    setQuery('');setFocused(false);
                  }}
                  style={{background:'none',border:'none',cursor:'pointer',padding:'4px 6px',fontSize:16,color:'#c7c7cc',flexShrink:0}}>✏️</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sections Manager ─────────────────────────────────────────────────────────
function SectionsManager({ sections, onUpdate, onRemove, onAdd }) {
  const [newSec,  setNewSec]  = useState('');
  const dragIdx  = useRef(null);
  const [overIdx, setOverIdx] = useState(null);

  function handleDragStart(i) { dragIdx.current = i; }
  function handleDragOver(e, i) { e.preventDefault(); setOverIdx(i); }
  function handleDrop(i) {
    if (dragIdx.current===null||dragIdx.current===i) { setOverIdx(null); return; }
    const arr = [...sections];
    const [moved] = arr.splice(dragIdx.current, 1);
    arr.splice(i, 0, moved);
    onUpdate(arr); dragIdx.current=null; setOverIdx(null);
  }

  return (
    <div style={{padding:'0 16px 16px'}}>
      <p style={{fontSize:13,color:'#8e8e93',margin:'8px 0 4px'}}>Drag to reorder. Order matches your store layout.</p>
      <p style={{fontSize:12,color:'#8e8e93',margin:'0 0 12px'}}>💡 Tip: For stores with fixed aisles (like Superstore), name sections "Aisle 1 – Produce", "Aisle 3 – Dairy", etc.</p>
      <div style={{background:'#fff',borderRadius:12,overflow:'hidden',marginBottom:12}}>
        {sections.map((sec,i)=>(
          <div key={sec} draggable
            onDragStart={()=>handleDragStart(i)}
            onDragOver={e=>handleDragOver(e,i)}
            onDrop={()=>handleDrop(i)}
            style={{
              display:'flex',alignItems:'center',gap:10,padding:'10px 14px',
              borderBottom:i<sections.length-1?'0.5px solid #e5e5ea':'none',
              borderTop:overIdx===i?`2px solid ${B}`:'2px solid transparent',
              background:'#fff',cursor:'grab'
            }}>
            <span style={{color:'#c7c7cc',fontSize:18,lineHeight:1}}>≡</span>
            <span style={{flex:1,fontSize:15,color:'#000'}}>{sec}</span>
            <button onClick={()=>onRemove(sec)} style={{background:'none',border:'none',color:'#FF3B30',fontSize:13,cursor:'pointer',padding:'4px 6px'}}>Remove</button>
          </div>
        ))}
      </div>
      <div style={{fontSize:12,color:'#8e8e93',marginBottom:6,fontWeight:500,textTransform:'uppercase',letterSpacing:0.4}}>New Section / Aisle</div>
      <div style={{display:'flex',gap:8}}>
        <input value={newSec} onChange={e=>setNewSec(e.target.value)} placeholder="e.g. Aisle 5 – Canned Goods"
          autoComplete="off"
          onKeyDown={e=>{if(e.key==='Enter'&&newSec.trim()){onAdd(newSec.trim());setNewSec('');}}}
          style={{flex:1,border:'1px solid #e5e5ea',borderRadius:10,padding:'9px 12px',fontSize:15,background:'#f2f2f7',outline:'none'}} />
        <button onClick={()=>{if(newSec.trim()){onAdd(newSec.trim());setNewSec('');}}}
          style={{background:B,color:'#fff',border:'none',borderRadius:10,padding:'0 16px',cursor:'pointer',fontSize:15,fontWeight:600}}>Add</button>
      </div>
    </div>
  );
}

// ─── Export View ──────────────────────────────────────────────────────────────
function ExportView({ items, sections, storeName }) {
  const unbought = items.filter(i=>!i.bought);
  const grand    = totalCost(unbought.map(i=>({...i,bought:false})));

  function copyText() {
    let t = `Shopping List — ${storeName}\n\n`;
    sections.forEach(sec=>{
      const its = unbought.filter(i=>i.section===sec);
      if(!its.length) return;
      t += sec + '\n';
      its.forEach(i=>{ const p=effectivePrice(i); t+=`  ${i.name}${i.qty>1?' x'+i.qty:''}${p?' $'+(p*i.qty).toFixed(2):''}\n`; });
      t += '\n';
    });
    t += 'Total: $' + grand.toFixed(2);
    navigator.clipboard.writeText(t).then(()=>alert('Copied!')).catch(()=>alert('Copy failed'));
  }

  return (
    <div style={{padding:'8px 16px 16px'}}>
      {sections.map(sec=>{
        const its = unbought.filter(i=>i.section===sec);
        if(!its.length) return null;
        return (
          <div key={sec}>
            <div style={{fontSize:12,color:'#8e8e93',padding:'10px 0 4px',fontWeight:600,textTransform:'uppercase',letterSpacing:0.4}}>{sec}</div>
            {its.map(i=>{
              const p = effectivePrice(i);
              return (
                <div key={i.id} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'0.5px solid #e5e5ea',fontSize:15}}>
                  <span style={{color:'#000'}}>{i.name}{i.qty>1?` ×${i.qty}`:''}</span>
                  <span style={{color:i.discount?'#1a7a3a':'#000'}}>{p?'$'+(p*i.qty).toFixed(2):'—'}</span>
                </div>
              );
            })}
          </div>
        );
      })}
      <div style={{display:'flex',justifyContent:'space-between',padding:'14px 0',fontSize:17,fontWeight:700,borderTop:'1px solid #000',marginTop:8}}>
        <span>Estimated Total</span><span>${grand.toFixed(2)}</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:4}}>
        <button onClick={copyText} style={{background:'#f2f2f7',color:'#000',border:'none',borderRadius:12,padding:14,fontSize:15,fontWeight:600,cursor:'pointer'}}>
          📋 Copy Text
        </button>
        <button onClick={()=>exportToCSV(unbought, sections, storeName)} style={{background:B,color:'#fff',border:'none',borderRadius:12,padding:14,fontSize:15,fontWeight:600,cursor:'pointer'}}>
          📊 Export CSV
        </button>
      </div>
    </div>
  );
}

// ─── Trips Screen ─────────────────────────────────────────────────────────────
function TripsScreen({ store, onUpdateStore }) {
  const [view,         setView]         = useState('list');
  const [activeTripId, setActiveTripId] = useState(null);
  const [editingMeta,  setEditingMeta]  = useState(null);
  const [metaLabel,    setMetaLabel]    = useState('');
  const [metaDate,     setMetaDate]     = useState('');

  const trips = store.trips || [];

  function saveTrips(updated) { onUpdateStore({...store, trips: updated}); }

  function createTrip() {
    const label  = metaLabel.trim() || `${store.name} — ${metaDate.slice(5).replace('-','/')}`;
    const date   = metaDate || new Date().toISOString().slice(0,10);
    const cloned = store.items.filter(i=>!i.bought).map(i=>({...i, bought:false}));
    saveTrips([...trips, { id: uid(), label, date, items: cloned }]);
    setView('list');
  }

  function updateTripMeta() {
    const label = metaLabel.trim() || editingMeta.label;
    saveTrips(trips.map(t=>t.id===editingMeta.id?{...t,label,date:metaDate||t.date}:t));
    setView('list'); setEditingMeta(null);
  }

  function deleteTrip(id) { saveTrips(trips.filter(t=>t.id!==id)); setView('list'); }
  function updateTripItems(tripId, newItems) { saveTrips(trips.map(t=>t.id===tripId?{...t,items:newItems}:t)); }

  const activeTrip = trips.find(t=>t.id===activeTripId);

  if (view==='shopping' && activeTrip) {
    const sections  = store.sections;
    const items     = activeTrip.items;
    const remaining = items.filter(i=>!i.bought).length;

    function toggleBought(id) { updateTripItems(activeTrip.id, items.map(i=>i.id===id?{...i,bought:!i.bought}:i)); }
    function deleteItem(id)   { updateTripItems(activeTrip.id, items.filter(i=>i.id!==id)); }

    return (
      <div style={{paddingBottom:16}}>
        <div style={{padding:'10px 16px 0',display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>setView('list')} style={{background:'none',border:'none',color:B,fontSize:15,cursor:'pointer',padding:0}}>‹ Back</button>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:600,color:'#000'}}>{activeTrip.label}</div>
            <div style={{fontSize:12,color:'#8e8e93'}}>{remaining} of {items.length} remaining · Est. ${totalCost(items).toFixed(2)}</div>
          </div>
          <button onClick={()=>exportToCSV(items.filter(i=>!i.bought),sections,activeTrip.label)}
            style={{background:'#f2f2f7',border:'none',borderRadius:8,padding:'5px 10px',fontSize:12,cursor:'pointer',color:'#3c3c43'}}>CSV</button>
        </div>
        <div style={{marginTop:8}}>
          {sections.map(sec=>{
            const its = items.filter(i=>i.section===sec);
            if(!its.length) return null;
            return (
              <div key={sec}>
                <div style={{background:store.color,padding:'5px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span style={{fontSize:12,fontWeight:700,color:'#fff',textTransform:'uppercase',letterSpacing:0.6}}>{sec}</span>
                  <span style={{fontSize:11,color:'rgba(255,255,255,0.75)'}}>{its.filter(i=>!i.bought).length}</span>
                </div>
                {its.map(item=>{
                  const eff = effectivePrice(item);
                  return (
                    <SwipeRow key={item.id} bought={item.bought} onDelete={()=>deleteItem(item.id)} onToggleBought={()=>toggleBought(item.id)}>
                      <div onClick={()=>toggleBought(item.id)} style={{
                        background:item.bought?'#f9f9f9':'#fff',padding:'10px 14px',borderBottom:'0.5px solid #f2f2f7',
                        display:'flex',alignItems:'center',gap:10,cursor:'pointer'
                      }}>
                        <div style={{width:22,height:22,borderRadius:'50%',border:`2px solid ${item.bought?'#34C759':'#c7c7cc'}`,
                          background:item.bought?'#34C759':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          {item.bought&&<span style={{color:'#fff',fontSize:13,fontWeight:700}}>✓</span>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <span style={{fontSize:15,fontWeight:500,color:item.bought?'#aeaeb2':'#000',textDecoration:item.bought?'line-through':'none'}}>{item.name}</span>
                          {item.qty>1&&<span style={{fontSize:12,color:'#8e8e93',marginLeft:4}}>×{item.qty}</span>}
                          {item.size&&<span style={{fontSize:11,color:'#8e8e93',marginLeft:4}}>{item.size}</span>}
                        </div>
                        {eff&&<span style={{fontSize:13,color:item.discount?'#1a7a3a':'#000',fontWeight:500}}>${(eff*item.qty).toFixed(2)}</span>}
                      </div>
                    </SwipeRow>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (view==='edit-meta') {
    const isNew = !editingMeta;
    return (
      <div style={{padding:'8px 16px 24px'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
          <button onClick={()=>setView('list')} style={{background:'none',border:'none',color:B,fontSize:15,cursor:'pointer',padding:0}}>‹ Back</button>
          <span style={{fontSize:17,fontWeight:600}}>{isNew?'New Trip':'Edit Trip'}</span>
        </div>
        <div style={{fontSize:12,color:'#8e8e93',marginBottom:4,fontWeight:500,textTransform:'uppercase',letterSpacing:0.4}}>Trip Name</div>
        <input value={metaLabel} onChange={e=>setMetaLabel(e.target.value)}
          placeholder={`e.g. ${store.name} — Big Stock-up`} autoComplete="off" autoCorrect="off"
          style={{width:'100%',border:'1px solid #e5e5ea',borderRadius:10,padding:'9px 12px',fontSize:15,marginBottom:12,background:'#f2f2f7',outline:'none',boxSizing:'border-box'}} />
        <div style={{fontSize:12,color:'#8e8e93',marginBottom:4,fontWeight:500,textTransform:'uppercase',letterSpacing:0.4}}>Date</div>
        <input type="date" value={metaDate} onChange={e=>setMetaDate(e.target.value)}
          style={{width:'100%',border:'1px solid #e5e5ea',borderRadius:10,padding:'9px 12px',fontSize:15,marginBottom:16,background:'#f2f2f7',outline:'none',boxSizing:'border-box'}} />
        {isNew && <p style={{fontSize:13,color:'#8e8e93',margin:'0 0 16px'}}>Your current active items will be copied into this trip as a starting point.</p>}
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setView('list')} style={{flex:1,background:'#f2f2f7',border:'none',borderRadius:10,padding:12,fontSize:15,cursor:'pointer',color:'#3c3c43'}}>Cancel</button>
          <button onClick={isNew?createTrip:updateTripMeta} style={{flex:2,background:B,color:'#fff',border:'none',borderRadius:10,padding:12,fontSize:15,fontWeight:600,cursor:'pointer'}}>
            {isNew?'Create Trip':'Save'}
          </button>
        </div>
        {!isNew && (
          <button onClick={()=>deleteTrip(editingMeta.id)} style={{width:'100%',marginTop:10,background:'none',color:'#FF3B30',border:'1px solid #FF3B30',borderRadius:10,padding:12,fontSize:15,cursor:'pointer'}}>
            Delete Trip
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{padding:'8px 16px 16px'}}>
      <p style={{fontSize:13,color:'#8e8e93',margin:'0 0 12px'}}>Each trip is an independent list. Creating a trip copies your current active items as a starting point.</p>
      {trips.length===0&&<p style={{textAlign:'center',color:'#8e8e93',fontSize:14,padding:'20px 0'}}>No trips yet. Create one below!</p>}
      <div style={{background:'#fff',borderRadius:12,overflow:'hidden',marginBottom:12}}>
        {trips.map((t,i)=>{
          const rem = (t.items||[]).filter(i=>!i.bought).length;
          const est = totalCost(t.items||[]);
          return (
            <div key={t.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderBottom:i<trips.length-1?'0.5px solid #e5e5ea':'none'}}>
              <div style={{flex:1,cursor:'pointer'}} onClick={()=>{setActiveTripId(t.id);setView('shopping');}}>
                <div style={{fontSize:15,fontWeight:600,color:'#000'}}>{t.label}</div>
                <div style={{fontSize:12,color:'#8e8e93',marginTop:2}}>{t.date} · {rem} item{rem!==1?'s':''} · Est. ${est.toFixed(2)}</div>
              </div>
              <button onClick={()=>{setEditingMeta(t);setMetaLabel(t.label);setMetaDate(t.date);setView('edit-meta');}}
                style={{background:'#f2f2f7',border:'none',borderRadius:8,padding:'5px 10px',fontSize:13,cursor:'pointer',color:'#3c3c43',fontWeight:500}}>Edit</button>
              <span onClick={()=>{setActiveTripId(t.id);setView('shopping');}} style={{color:'#c7c7cc',fontSize:18,cursor:'pointer'}}>›</span>
            </div>
          );
        })}
      </div>
      <button onClick={()=>{setMetaLabel('');setMetaDate(new Date().toISOString().slice(0,10));setEditingMeta(null);setView('edit-meta');}}
        style={{width:'100%',background:'none',border:'1.5px dashed #c7c7cc',borderRadius:12,padding:12,color:B,fontSize:15,cursor:'pointer',fontWeight:500}}>
        + Create New Trip
      </button>
    </div>
  );
}

// ─── Store Picker ─────────────────────────────────────────────────────────────
function StorePicker({ stores, onClose, onCreateTrip }) {
  const [step, setStep]             = useState('pick');
  const [chosenStore, setChosenStore] = useState(null);
  const [tripDate,    setTripDate]    = useState(new Date().toISOString().slice(0,10));
  const [tripLabel,   setTripLabel]   = useState('');

  if (step==='date' && chosenStore) {
    const store = stores.find(s=>s.id===chosenStore);
    return (
      <div style={{padding:'8px 16px 24px'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 0 16px'}}>
          <div style={{width:40,height:40,borderRadius:10,background:store.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{store.icon}</div>
          <span style={{fontSize:17,fontWeight:600,color:'#000'}}>{store.name}</span>
        </div>
        <div style={{fontSize:12,color:'#8e8e93',marginBottom:6,fontWeight:500,textTransform:'uppercase',letterSpacing:0.4}}>Trip Name</div>
        <input value={tripLabel} onChange={e=>setTripLabel(e.target.value)}
          placeholder={`${store.name} — ${tripDate.slice(5).replace('-','/')}`} autoComplete="off" autoCorrect="off"
          style={{width:'100%',border:'1px solid #e5e5ea',borderRadius:10,padding:'9px 12px',fontSize:15,marginBottom:12,background:'#f2f2f7',outline:'none',boxSizing:'border-box'}} />
        <div style={{fontSize:12,color:'#8e8e93',marginBottom:6,fontWeight:500,textTransform:'uppercase',letterSpacing:0.4}}>Trip Date</div>
        <input type="date" value={tripDate} onChange={e=>setTripDate(e.target.value)}
          style={{width:'100%',border:'1px solid #e5e5ea',borderRadius:10,padding:'10px 12px',fontSize:16,background:'#f2f2f7',outline:'none',marginBottom:16,boxSizing:'border-box'}} />
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setStep('pick')} style={{flex:1,background:'#f2f2f7',border:'none',borderRadius:10,padding:12,fontSize:15,cursor:'pointer',color:'#3c3c43'}}>Back</button>
          <button onClick={()=>{onCreateTrip(chosenStore,tripDate,tripLabel.trim());onClose();}}
            style={{flex:2,background:B,color:'#fff',border:'none',borderRadius:10,padding:12,fontSize:15,fontWeight:600,cursor:'pointer'}}>Create Trip</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{padding:'8px 0 16px'}}>
      <div style={{background:'#fff',overflow:'hidden'}}>
        {stores.map((store,i)=>(
          <div key={store.id}
            style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:i<stores.length-1?'0.5px solid #e5e5ea':'none',cursor:'pointer'}}
            onPointerDown={e=>{e.currentTarget.style.background='#f2f2f7';}}
            onPointerUp={e=>{e.currentTarget.style.background='#fff';setChosenStore(store.id);setStep('date');}}
            onPointerLeave={e=>{e.currentTarget.style.background='#fff';}}>
            <div style={{width:40,height:40,borderRadius:10,background:store.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{store.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:16,fontWeight:500,color:'#000'}}>{store.name}</div>
              <div style={{fontSize:12,color:'#8e8e93'}}>{store.items.filter(i=>!i.bought).length} items</div>
            </div>
            <span style={{color:'#c7c7cc',fontSize:18}}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Store List Screen ────────────────────────────────────────────────────────
function StoreListScreen({ stores, onSelectStore, onAddStore, onEditStore, onCreateTrip }) {
  const [editingStore, setEditingStore]   = useState(null);
  const [showTripPicker, setShowTripPicker] = useState(false);

  const STORE_COLORS = ['#007AFF','#FF9500','#FF3B30','#34C759','#AF52DE','#FF2D55','#5AC8FA','#FF6B35'];
  const STORE_ICONS  = ['🛒','🏪','🏬','🍎','🥩','🥖','🏠','🔧'];

  function StoreForm({ store, onSave, onDelete }) {
    const blank = {id:uid(),name:'',color:STORE_COLORS[0],icon:'🛒',sections:[...DEFAULT_SECTIONS],items:[],trips:[],memory:{}};
    const [f,setF] = useState(store?{...store}:blank);
    return (
      <div style={{padding:'8px 16px 24px'}}>
        <div style={{fontSize:12,color:'#8e8e93',marginBottom:4,fontWeight:500,textTransform:'uppercase',letterSpacing:0.4}}>Store Name</div>
        <input value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} placeholder="e.g. Costco Burnaby"
          autoComplete="off" autoCorrect="off" autoCapitalize="words" spellCheck="false"
          style={{width:'100%',border:'1px solid #e5e5ea',borderRadius:10,padding:'9px 12px',fontSize:15,marginBottom:12,background:'#f2f2f7',outline:'none',boxSizing:'border-box',color:'#000'}}
          autoFocus />
        <div style={{fontSize:12,color:'#8e8e93',marginBottom:6,fontWeight:500,textTransform:'uppercase',letterSpacing:0.4}}>Color</div>
        <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
          {STORE_COLORS.map(c=>(
            <button key={c} onClick={()=>setF(p=>({...p,color:c}))}
              style={{width:32,height:32,borderRadius:'50%',background:c,border:`3px solid ${f.color===c?'#000':'transparent'}`,cursor:'pointer',padding:0}} />
          ))}
        </div>
        <div style={{fontSize:12,color:'#8e8e93',marginBottom:6,fontWeight:500,textTransform:'uppercase',letterSpacing:0.4}}>Icon</div>
        <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
          {STORE_ICONS.map(ic=>(
            <button key={ic} onClick={()=>setF(p=>({...p,icon:ic}))}
              style={{width:40,height:40,borderRadius:10,background:f.icon===ic?'#e5e5ea':'#f2f2f7',border:'none',cursor:'pointer',fontSize:20}}>
              {ic}
            </button>
          ))}
        </div>
        <button onClick={()=>{if(!f.name.trim())return;onSave(f);}}
          style={{width:'100%',background:B,color:'#fff',border:'none',borderRadius:12,padding:14,fontSize:17,fontWeight:600,cursor:'pointer',marginBottom:10}}>
          {store?'Save Changes':'Add Store'}
        </button>
        {store&&(
          <button onClick={()=>onDelete(store.id)}
            style={{width:'100%',background:'none',color:'#FF3B30',border:'1px solid #FF3B30',borderRadius:12,padding:12,fontSize:15,cursor:'pointer'}}>
            Delete Store
          </button>
        )}
      </div>
    );
  }

  if (editingStore !== null) {
    const existing = editingStore==='new' ? null : stores.find(s=>s.id===editingStore);
    return (
      <div style={{background:'#f2f2f7',height:'100%',display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <style>{GLOBAL_CSS}</style>
        <div style={{background:'#fff',padding:'0 16px 12px',borderBottom:'0.5px solid #e5e5ea',flexShrink:0,
          paddingTop:'calc(env(safe-area-inset-top, 0px) + 12px)'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,paddingTop:8}}>
            <button onClick={()=>setEditingStore(null)} style={{background:'none',border:'none',color:B,fontSize:17,cursor:'pointer',padding:'4px 0'}}>‹ Back</button>
            <span style={{fontSize:17,fontWeight:600,flex:1,textAlign:'center'}}>{existing?'Edit Store':'New Store'}</span>
            <div style={{width:60}}/>
          </div>
        </div>
        <div className="ios-scroll" style={{flex:1,overflowY:'auto',paddingBottom:80}}>
          <StoreForm
            store={existing}
            onSave={s=>{if(existing)onEditStore(s);else onAddStore(s);setEditingStore(null);}}
            onDelete={()=>{onEditStore({...existing,_delete:true});setEditingStore(null);}}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{background:'#f2f2f7',height:'100%',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <style>{GLOBAL_CSS}</style>
      <div style={{
        background:'rgba(255,255,255,0.92)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
        borderBottom:'0.5px solid rgba(60,60,67,0.18)',flexShrink:0,
        paddingTop:'calc(env(safe-area-inset-top, 0px) + 8px)',
        paddingBottom:10, paddingLeft:16, paddingRight:16
      }}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:6}}>
          <span style={{fontSize:28,fontWeight:700,color:'#000',letterSpacing:-0.5}}>Lists</span>
          <button onClick={()=>setEditingStore('new')} style={{background:'none',border:'none',color:B,fontSize:28,cursor:'pointer',lineHeight:1,padding:'0 4px'}}>+</button>
        </div>
      </div>

      <div className="ios-scroll" style={{flex:1,overflowY:'auto',padding:'12px 16px',paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 80px)'}}>
        <div style={{background:'#fff',borderRadius:12,overflow:'hidden'}}>
          {stores.map((store,i)=>{
            const remaining = store.items.filter(it=>!it.bought).length;
            return (
              <div key={store.id}
                style={{display:'flex',alignItems:'center',gap:14,padding:'12px 14px',
                  borderBottom:i<stores.length-1?'0.5px solid #e5e5ea':'none',cursor:'pointer',background:'#fff'}}
                onClick={()=>onSelectStore(store.id)}
                onTouchStart={e=>e.currentTarget.style.background='#f2f2f7'}
                onTouchEnd={e=>e.currentTarget.style.background='#fff'}>
                <div style={{width:44,height:44,borderRadius:10,background:store.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>
                  {store.icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:16,fontWeight:600,color:'#000'}}>{store.name}</div>
                  <div style={{fontSize:13,color:'#8e8e93'}}>
                    {remaining>0?`${remaining} item${remaining!==1?'s':''} remaining`:'All done ✓'}
                    {store.trips?.length>0&&` · ${store.trips.length} trip${store.trips.length!==1?'s':''}`}
                  </div>
                </div>
                <span style={{color:'#c7c7cc',fontSize:18,fontWeight:300}}>›</span>
                <button onClick={e=>{e.stopPropagation();setEditingStore(store.id);}}
                  style={{background:'none',border:'none',color:'#c7c7cc',fontSize:18,cursor:'pointer',padding:'4px 0 4px 4px'}}>
                  ···
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{
        background:'rgba(255,255,255,0.92)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
        borderTop:'0.5px solid rgba(60,60,67,0.2)',
        display:'flex',zIndex:100,flexShrink:0,
        paddingBottom:'env(safe-area-inset-bottom,8px)',paddingTop:8
      }}>
        {[
          {icon:'🛒',label:'Lists',  action:()=>{}},
          {icon:'📅',label:'New Trip',action:()=>setShowTripPicker(true)},
          {icon:'⚙️',label:'Settings',action:()=>{}},
        ].map(({icon,label,action},i)=>(
          <div key={label} onClick={action} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,opacity:i===0?1:0.5,cursor:'pointer'}}>
            <span style={{fontSize:22}}>{icon}</span>
            <span style={{fontSize:10,fontWeight:500,color:i===0?B:'#8e8e93'}}>{label}</span>
          </div>
        ))}
      </div>

      <Sheet open={showTripPicker} onClose={()=>setShowTripPicker(false)} title="New Shopping Trip">
        <StorePicker stores={stores} onClose={()=>setShowTripPicker(false)} onCreateTrip={onCreateTrip} />
      </Sheet>
    </div>
  );
}

// ─── Shopping List Screen ─────────────────────────────────────────────────────
const LIST_VIEWS   = ['Active','All','Done'];
const CHIP_FILTERS = [{k:'all',l:'All'},{k:'weekly',l:'Weekly'},{k:'sale',l:'On Sale'},{k:'watchlist',l:'Watch List'}];

function ShoppingListScreen({ store, onBack, onUpdateStore }) {
  const [listView,  setListView]  = useState('Active');
  const [filter,    setFilter]    = useState('all');
  const [sheet,     setSheet]     = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const nextId = useRef(Date.now());

  const holdTimer  = useRef(null);
  const dragId     = useRef(null);
  const isDragging = useRef(false);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const tapCounts = useRef({});
  const tapTimers = useRef({});

  // Fix 7: strip expired sales on mount and when store changes
  useEffect(() => {
    const cleaned = stripExpiredSales(store.items);
    const changed = cleaned.some((item,i) => item.discount !== store.items[i].discount);
    if (changed) onUpdateStore({...store, items: cleaned});
  }, [store.id]); // run once per store load

  // Fix 9: auto re-populate weekly items on app open
  useEffect(() => {
    const repopulated = rePopulateWeeklyItems(store);
    if (repopulated.items.length !== store.items.length) {
      onUpdateStore(repopulated);
    }
  }, [store.id]);

  const items    = store.items;
  const sections = store.sections;

  function updateStore(patch) { onUpdateStore({...store,...patch}); }

  function handleRowTap(id) {
    const cur = (tapCounts.current[id]||0)+1;
    tapCounts.current[id] = cur;
    clearTimeout(tapTimers.current[id]);
    if (cur>=2) {
      tapCounts.current[id]=0;
      updateStore({items:items.map(i=>i.id===id?{...i,bought:!i.bought}:i)});
    } else {
      tapTimers.current[id]=setTimeout(()=>{tapCounts.current[id]=0;},380);
    }
  }

  function onPointerDown(e,id) {
    if(e.target.closest('button')) return;
    holdTimer.current=setTimeout(()=>{
      isDragging.current=true;dragId.current=id;setDraggingId(id);
      if(navigator.vibrate) navigator.vibrate(30);
    },HOLD_MS);
  }
  function onPointerUp(e,id) {
    clearTimeout(holdTimer.current);
    if(isDragging.current) {
      if(dragOverId!=null&&dragOverId!==dragId.current) {
        const arr=[...items];
        const fi=arr.findIndex(i=>i.id===dragId.current);
        const ti=arr.findIndex(i=>i.id===dragOverId);
        if(fi>=0&&ti>=0){
          const moved={...arr[fi],section:arr[ti].section};
          arr.splice(fi,1);arr.splice(ti,0,moved);
          updateStore({items:arr});
        }
      }
      isDragging.current=false;dragId.current=null;setDraggingId(null);setDragOverId(null);
    }
  }
  function onPointerMove(e,id) { if(isDragging.current) setDragOverId(id); }
  function onPointerCancel() { clearTimeout(holdTimer.current);isDragging.current=false;dragId.current=null;setDraggingId(null);setDragOverId(null); }

  const visibleItems = (() => {
    let base = items;
    if(listView==='Active')  base=base.filter(i=>!i.bought);
    if(listView==='Done')    base=base.filter(i=>i.bought);
    if(filter==='weekly')    base=base.filter(i=>i.weekly);
    if(filter==='sale')      base=base.filter(i=>i.discount>0);
    if(filter==='watchlist') base=base.filter(i=>i.watch);
    return base;
  })();

  const remaining = items.filter(i=>!i.bought).length;
  // Fix 3: est total excludes Not Urgent
  const estTotal  = totalCost(items);

  const notUrgent = sections.includes('Not Urgent') ? 'Not Urgent' : (sections[sections.length-1]||sections[0]||'');

  function saveItem(data) {
    const isNew = !data.id || !items.find(i=>i.id===data.id);
    let finalData = {...data};
    if(filter==='weekly')    finalData.weekly = true;
    if(filter==='sale')      finalData.discount = finalData.discount || 0;
    if(filter==='watchlist') { finalData.watch = true; finalData.section = finalData.section || notUrgent; }

    const saved = isNew
      ? {...finalData, id:nextId.current++, bought:false}
      : {...editingItem,...finalData};
    const newItems = isNew ? [...items,saved] : items.map(i=>i.id===saved.id?saved:i);
    const newMemory = data.name.trim() ? {
      ...store.memory,
      [data.name.trim()]: {size:data.size||'',price:data.price||null,section:data.section,barcode:data.barcode||''}
    } : store.memory;
    updateStore({items:newItems,memory:newMemory});
    setSheet(null); setEditingItem(null);
  }

  function deleteItem(id) {
    updateStore({items:items.filter(i=>i.id!==id)});
    setSheet(null); setEditingItem(null);
  }

  function handleQuickAdd(newItem) {
    let item = {...newItem};
    if(filter==='weekly')    item.weekly=true;
    if(filter==='watchlist') { item.watch=true; item.section=notUrgent; }
    const newMemory = item.name.trim() ? {
      ...store.memory,
      [item.name.trim()]: {size:item.size||'',price:item.price||null,section:item.section,barcode:item.barcode||''}
    } : store.memory;
    updateStore({items:[...items,item],memory:newMemory});
  }

  function handleOpenEditFromQuick(partialItem) { setEditingItem(partialItem); setSheet('edit'); }

  function reAddWeekly(item) {
    const fresh = {...item,id:nextId.current++,bought:false};
    updateStore({items:[...items,fresh]});
  }

  function handleBarcodeForQuickAdd(result) {
    setShowBarcodeScanner(false);
    if(result.name) {
      const mem = store.memory[result.name];
      handleQuickAdd({
        id:Date.now(),name:result.name,qty:1,
        size:result.size||mem?.size||'',
        section:mem?.section||guessSection(result.name,sections)||sections[0]||'',
        price:mem?.price||null,discount:0,saleEnd:'',weekly:false,watch:false,
        barcode:result.barcode||'',bought:false,
      });
    } else {
      setEditingItem({id:null,name:'',qty:1,size:result.size||'',section:'',price:'',discount:'',saleEnd:'',weekly:false,watch:false,barcode:result.barcode});
      setSheet('edit');
    }
  }

  // Fix 4: barcode scanner as full-screen overlay, not a page swap
  return (
    <div style={{background:'#f2f2f7',height:'100%',display:'flex',flexDirection:'column',overflow:'hidden',width:'100%',maxWidth:'100%',position:'relative'}}>
      <style>{GLOBAL_CSS}</style>

      {/* Fix 4: Camera overlay rendered on top when active */}
      {showBarcodeScanner && (
        <div style={{position:'absolute',inset:0,zIndex:500,background:'#000',display:'flex',flexDirection:'column'}}>
          <div style={{
            background:'rgba(0,0,0,0.85)',
            padding:'calc(env(safe-area-inset-top,0px) + 12px) 16px 12px',
            display:'flex',alignItems:'center',gap:8,flexShrink:0
          }}>
            <button onClick={()=>setShowBarcodeScanner(false)} style={{background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',fontSize:15,cursor:'pointer',padding:'6px 14px',borderRadius:8}}>✕ Cancel</button>
            <span style={{color:'rgba(255,255,255,0.7)',fontSize:13}}>Point camera at barcode</span>
          </div>
          <div style={{flex:1,overflow:'hidden'}}>
            <BarcodeScanner onResult={handleBarcodeForQuickAdd} onClose={()=>setShowBarcodeScanner(false)} />
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        background:'rgba(255,255,255,0.96)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
        borderBottom:'0.5px solid rgba(60,60,67,0.18)',flexShrink:0,
        width:'100%',maxWidth:'100%',
        paddingTop:'calc(env(safe-area-inset-top, 0px) + 4px)'
      }}>
        {/* Title row */}
        <div style={{display:'flex',alignItems:'center',padding:'6px 12px 4px',width:'100%',boxSizing:'border-box'}}>
          <button onClick={onBack} style={{background:'none',border:'none',color:B,fontSize:15,cursor:'pointer',padding:'4px 8px 4px 0',display:'flex',alignItems:'center',gap:2,flexShrink:0}}>
            <span style={{fontSize:18,lineHeight:1}}>‹</span> Lists
          </button>
          <div style={{flex:1,textAlign:'center',minWidth:0,overflow:'hidden'}}>
            <div style={{fontSize:16,fontWeight:600,color:'#000',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
              {store.icon} {store.name}
            </div>
            <div style={{fontSize:11,color:'#8e8e93'}}>{remaining} of {items.length} remaining</div>
          </div>
          <button onClick={()=>setSheet('export')} style={{background:'none',border:'none',color:B,fontSize:14,fontWeight:500,cursor:'pointer',padding:'4px 0 4px 8px',flexShrink:0}}>Export</button>
        </div>

        {/* Fix 5: Filter chips row — Est. cost removed from here, moved into QuickAdd */}
        <div style={{display:'flex',alignItems:'center',padding:'2px 10px 6px',gap:6,width:'100%',boxSizing:'border-box',overflowX:'auto'}}>
          <select value={listView} onChange={e=>setListView(e.target.value)}
            style={{
              border:'none',background:'none',color:B,fontSize:14,fontWeight:700,cursor:'pointer',outline:'none',
              padding:'2px 18px 2px 0',WebkitAppearance:'none',appearance:'none',flexShrink:0,
              backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23007AFF'/%3E%3C/svg%3E")`,
              backgroundRepeat:'no-repeat',backgroundPosition:'right 2px center',
            }}>
            {LIST_VIEWS.map(v=><option key={v} value={v}>{v}</option>)}
          </select>
          <span style={{color:'#e5e5ea',fontSize:16,flexShrink:0}}>|</span>
          <div style={{display:'flex',gap:5,flex:1,overflowX:'auto'}}>
            {CHIP_FILTERS.map(cf=>(
              <button key={cf.k} onClick={()=>setFilter(cf.k)} style={{
                border:filter===cf.k?'none':'0.5px solid #c7c7cc',
                borderRadius:20,padding:'3px 10px',fontSize:12,fontWeight:500,
                background:filter===cf.k?B:'none',
                color:filter===cf.k?'#fff':'#3c3c43',
                cursor:'pointer',whiteSpace:'nowrap',flexShrink:0
              }}>{cf.l}</button>
            ))}
          </div>
        </div>

        {/* Fix 5: QuickAdd row now contains Est. cost */}
        <QuickAdd
          sections={sections}
          memory={store.memory}
          onQuickAdd={handleQuickAdd}
          onOpenEdit={handleOpenEditFromQuick}
          onScanBarcode={()=>setShowBarcodeScanner(true)}
          activeFilter={filter}
          estTotal={estTotal}
          storeColor={store.color}
        />
      </div>

      {/* Fix 1: List scroll area — strict width containment */}
      <div className="ios-scroll" style={{
        flex:1,overflowY:'auto',overflowX:'hidden',
        paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 60px)',
        width:'100%',maxWidth:'100%',boxSizing:'border-box'
      }}>
        {visibleItems.length===0&&(
          <div style={{textAlign:'center',padding:'40px 24px',color:'#8e8e93',fontSize:15}}>
            {filter!=='all'
              ? `No ${filter==='watchlist'?'watched':filter} items yet.\nAdd items above — they'll appear here.`
              : listView==='Done'
                ? 'Nothing checked off yet.\nSwipe right on any item to mark it done.'
                : 'No items — type above to add one.'}
          </div>
        )}

        {sections.map(sec=>{
          const its = visibleItems.filter(i=>i.section===sec);
          if(!its.length) return null;
          return (
            <div key={sec} style={{width:'100%',maxWidth:'100%',overflow:'hidden'}}>
              <div style={{background:store.color,padding:'5px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{fontSize:12,fontWeight:700,color:'#fff',textTransform:'uppercase',letterSpacing:0.6}}>{sec}</span>
                <span style={{fontSize:11,color:'rgba(255,255,255,0.75)',fontWeight:500}}>{its.length}</span>
              </div>
              {its.map((item,idx)=>{
                const eff       = effectivePrice(item);
                const lineTotal = eff ? eff*item.qty : null;
                const isDrag    = draggingId===item.id;
                const isOver    = dragOverId===item.id && draggingId!==null;
                return (
                  <SwipeRow key={item.id} bought={item.bought}
                    onDelete={()=>deleteItem(item.id)}
                    onToggleBought={()=>updateStore({items:items.map(i=>i.id===item.id?{...i,bought:!i.bought}:i)})}>
                    <div
                      onPointerDown={e=>onPointerDown(e,item.id)}
                      onPointerUp={e=>onPointerUp(e,item.id)}
                      onPointerMove={e=>onPointerMove(e,item.id)}
                      onPointerCancel={onPointerCancel}
                      onClick={()=>{if(!isDragging.current)handleRowTap(item.id);}}
                      style={{
                        background:isDrag?'#e5f0ff':isOver?'#f0f8ff':'#fff',
                        borderBottom:idx<its.length-1?'0.5px solid #f2f2f7':'none',
                        borderTop:isOver?`2px solid ${B}`:'2px solid transparent',
                        padding:'9px 12px 9px 14px',
                        display:'flex',alignItems:'center',gap:10,
                        opacity:isDrag?0.6:1,
                        transform:isDrag?'scale(1.01)':'scale(1)',
                        transition:'transform 0.1s, opacity 0.1s',
                        touchAction:'pan-y',userSelect:'none',cursor:'pointer',
                        width:'100%',maxWidth:'100%',boxSizing:'border-box',minWidth:0,
                      }}>
                      <div style={{flex:1,minWidth:0,overflow:'hidden'}}>
                        <div style={{
                          fontSize:15,fontWeight:item.bought?400:500,
                          display:'flex',alignItems:'center',gap:5,flexWrap:'wrap',
                          textDecoration:item.bought?'line-through':'none',
                          color:item.bought?'#aeaeb2':'#000',
                        }}>
                          {item.name}
                          {item.qty>1&&<span style={{fontSize:12,color:'#8e8e93',fontWeight:400}}>×{item.qty}</span>}
                        </div>
                        {(item.size||item.discount||item.weekly||item.watch)&&(
                          <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:2,alignItems:'center'}}>
                            {item.size&&<span style={{fontSize:11,color:'#8e8e93'}}>{item.size}</span>}
                            <SaleTag item={item} />
                            {item.weekly&&<Tag bg="#f3e5f5" color="#7b1fa2">weekly</Tag>}
                            {item.watch&&<Tag bg="#e3f2fd" color="#1565c0">watch</Tag>}
                          </div>
                        )}
                      </div>
                      {item.bought&&item.weekly&&listView==='Done'&&(
                        <button onClick={e=>{e.stopPropagation();reAddWeekly(item);}}
                          style={{background:'#f3e5f5',color:'#7b1fa2',border:'none',borderRadius:8,padding:'4px 8px',fontSize:11,fontWeight:600,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap'}}>
                          + Re-add
                        </button>
                      )}
                      {item.price!=null&&(
                        <div style={{textAlign:'right',flexShrink:0,fontSize:13,fontWeight:500}}>
                          {item.discount>0&&<div style={{fontSize:10,color:'#aeaeb2',textDecoration:'line-through'}}>${(item.price*item.qty).toFixed(2)}</div>}
                          <span style={{color:item.discount?'#1a7a3a':(item.bought?'#aeaeb2':'#000')}}>${lineTotal.toFixed(2)}</span>
                        </div>
                      )}
                      <button onClick={e=>{e.stopPropagation();setEditingItem(item);setSheet('edit');}}
                        style={{background:'none',border:'none',color:'#c7c7cc',fontSize:15,cursor:'pointer',flexShrink:0,padding:'4px 2px'}}>✏️</button>
                    </div>
                  </SwipeRow>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Bottom tabs */}
      <div style={{
        background:'rgba(255,255,255,0.92)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
        borderTop:'0.5px solid rgba(60,60,67,0.2)',
        display:'flex',flexShrink:0,
        paddingBottom:'env(safe-area-inset-bottom,8px)',paddingTop:8,zIndex:10
      }}>
        {[['☰','List',null],['📅','Trips','trips'],['⚙️','Sections','sections']].map(([icon,label,v])=>(
          <button key={label} onClick={()=>setSheet(v)} style={{
            flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:1,
            background:'none',border:'none',cursor:'pointer',
            color:sheet===v?B:'#8e8e93',fontSize:10,fontWeight:sheet===v?600:400,padding:'2px 0'
          }}>
            <span style={{fontSize:20}}>{icon}</span>{label}
          </button>
        ))}
      </div>

      {/* Sheets */}
      <Sheet open={sheet==='edit'} onClose={()=>{setSheet(null);setEditingItem(null);}} title={editingItem?.id?'Edit Item':'Add Item'}>
        <ItemForm
          key={editingItem?.id??'new'}
          item={editingItem?.id?editingItem:null}
          sections={sections}
          memory={store.memory}
          onSave={saveItem}
          onDelete={deleteItem}
          defaultFilter={filter}
        />
      </Sheet>

      <Sheet open={sheet==='sections'} onClose={()=>setSheet(null)} title="Sections / Aisles">
        <SectionsManager
          sections={sections}
          onUpdate={secs=>updateStore({sections:secs})}
          onRemove={sec=>{
            if(sections.length<=1)return;
            updateStore({sections:sections.filter(s=>s!==sec),items:items.map(i=>i.section===sec?{...i,section:sections[0]}:i)});
          }}
          onAdd={sec=>{if(!sec||sections.includes(sec))return;updateStore({sections:[...sections,sec]});}}
        />
      </Sheet>

      <Sheet open={sheet==='trips'} onClose={()=>setSheet(null)} title="Shopping Trips" height="96vh">
        <TripsScreen store={store} onUpdateStore={onUpdateStore} />
      </Sheet>

      <Sheet open={sheet==='export'} onClose={()=>setSheet(null)} title="Export List">
        <ExportView items={items} sections={sections} storeName={store.name} />
      </Sheet>
    </div>
  );
}

// ─── Loading Screen ───────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#f2f2f7',gap:16}}>
      <span style={{fontSize:48}}>🛒</span>
      <div style={{fontSize:17,fontWeight:600,color:'#000'}}>Grocery List</div>
      <div style={{fontSize:14,color:'#8e8e93'}}>Loading…</div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [stores,        setStores]        = useState(null);
  const [activeStoreId, setActiveStoreId] = useState(null);
  const [fbReady,       setFbReady]       = useState(false);
  const unsubRef = useRef(null);

  useEffect(() => {
    async function init() {
      try {
        await signInAnonymously(auth);
        const ref  = doc(db, HH_DOC);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, { stores: INITIAL_STORES });
        }
        unsubRef.current = onSnapshot(ref, docSnap => {
          if (docSnap.exists()) setStores(docSnap.data().stores || []);
        });
        setFbReady(true);
      } catch (err) {
        console.error('Firebase init error:', err);
        setStores(INITIAL_STORES);
        setFbReady(true);
      }
    }
    init();
    return () => unsubRef.current?.();
  }, []);

  const isFirstWrite = useRef(true);
  useEffect(() => {
    if (!fbReady || stores === null) return;
    if (isFirstWrite.current) { isFirstWrite.current = false; return; }
    const ref = doc(db, HH_DOC);
    setDoc(ref, { stores }).catch(err => console.error('Firebase write error:', err));
  }, [stores, fbReady]);

  if (stores === null) return <><style>{GLOBAL_CSS}</style><LoadingScreen /></>;

  const activeStore = stores.find(s=>s.id===activeStoreId);

  function updateStore(updated) {
    if(updated._delete) {
      setStores(prev=>prev.filter(s=>s.id!==updated.id));
      setActiveStoreId(null);
    } else {
      setStores(prev=>prev.map(s=>s.id===updated.id?updated:s));
    }
  }

  function addStore(store) { setStores(prev=>[...prev,store]); }

  function createTrip(storeId, date, label) {
    setStores(prev=>prev.map(s=>{
      if(s.id!==storeId) return s;
      const tripLabel = label || `${s.name} — ${date.slice(5).replace('-','/')}`;
      const cloned    = s.items.filter(i=>!i.bought).map(i=>({...i,bought:false}));
      return {...s, trips:[...(s.trips||[]), {id:uid(),label:tripLabel,date,items:cloned}]};
    }));
  }

  if(activeStore) {
    return (
      <ShoppingListScreen
        store={activeStore}
        onBack={()=>setActiveStoreId(null)}
        onUpdateStore={updateStore}
      />
    );
  }

  return (
    <StoreListScreen
      stores={stores}
      onSelectStore={id=>setActiveStoreId(id)}
      onAddStore={addStore}
      onEditStore={updateStore}
      onCreateTrip={createTrip}
    />
  );
}
