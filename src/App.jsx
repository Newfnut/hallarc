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
const CATEGORY_KEYWORDS = {
  'Produce':              ['apple','banana','orange','strawberr','blueberr','grape','lemon','lime','avocado','tomato','spinach','arugula','kale','lettuce','broccoli','cauliflower','carrot','celery','cucumber','pepper','mushroom','onion','garlic','potato','sweet potato','corn','zucchini','asparagus','mango','pineapple','peach','plum','pear','berry','berries','herb','ginger','beet','radish','leek','shallot','fennel','cabbage','brussels','artichoke','eggplant','squash','cantaloupe','watermelon','melon','cilantro','parsley','basil','mint','thyme','rosemary','dill','chive'],
  'Dairy':                ['milk','cheese','butter','cream','yogurt','egg','sour cream','cheddar','mozzarella','parmesan','brie','feta','gouda','ricotta','cottage','half and half','whipping'],
  'Meat':                 ['chicken','beef','turkey','pork','steak','bacon','sausage','ham','lamb','veal','bison','venison','ground','roast','rib','loin','filet','pepperoni','salami','prosciutto'],
  'Deli':                 ['deli','cold cut','hot dog','wiener','bologna','pastrami','corned beef','rotisserie','sliced'],
  'Bakery':               ['bread','sourdough','bagel','muffin','croissant','bun','roll','loaf','cake','pie','donut','cookie','pastry','pita','tortilla','naan','crumpet','baguette'],
  'Frozen Foods':         ['frozen','ice cream','popsicle','pizza','edamame'],
  'Beverages':            ['juice','water','coffee','tea','soda','pop','lemonade','kombucha','sparkling','energy drink','beer','wine','cider','milk alternative','oat milk','almond milk','soy milk'],
  'Grains, Pasta & Sides':['pasta','rice','quinoa','oatmeal','cereal','granola','bread crumb','noodle','couscous','barley','lentil','oat','flour','cornmeal','grits','polenta','cracker','pretzel','chip'],
  'Pantry':               ['oil','vinegar','sauce','ketchup','mustard','mayo','salsa','peanut butter','jam','honey','maple','syrup','spice','salt','pepper','sugar','baking','vanilla','yeast','cocoa','broth','stock','soup','can','canned','jar','condiment','dressing','seasoning','hot sauce','soy sauce','coconut aminos','worcestershire','pickle','olive','relish','capers'],
  'Health & Beauty':      ['shampoo','conditioner','body wash','toothpaste','deodorant','soap','lotion','sunscreen','vitamin','supplement','medicine','advil','tylenol','razor','floss','mouthwash','toilet paper','paper towel','tissue','tampon','pad','bandage','laundry','dish soap','detergent','cleaner','spray','bleach','zip lock','bag','wrap','foil','saran'],
};

function guessSection(name, sections) {
  if (!name || !name.trim()) return '';
  const lower = name.toLowerCase();
  for (const [section, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const match = sections.find(s => s === section);
    if (!match) continue;
    if (keywords.some(kw => lower.includes(kw))) return match;
  }
  return '';
}

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
    memory: {}
  },
  {
    id: 's2', name: 'Superstore', color: '#FF9500', icon: '🏪',
    sections: [...DEFAULT_SECTIONS],
    items: [
      {id:101,name:'Milk 3.25%',qty:2,size:'4L',section:'Dairy',price:6.99,discount:0,saleEnd:'',weekly:true,watch:false,barcode:'',bought:false},
      {id:102,name:'Sourdough',qty:1,size:'',section:'Bakery',price:4.49,discount:0,saleEnd:'',weekly:false,watch:false,barcode:'',bought:false},
    ],
    memory: {}
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function effectivePrice(item) {
  if (!item.price) return null;
  if (item.discount && item.saleEnd) {
    const today = new Date(); today.setHours(0,0,0,0);
    const end   = new Date(item.saleEnd); end.setHours(0,0,0,0);
    if (end < today) return item.price;
  }
  return item.discount ? Math.max(0, item.price - item.discount) : item.price;
}

function totalCost(items, excludeSection = 'Not Urgent') {
  return items
    .filter(i => i.price && !i.bought && i.section !== excludeSection)
    .reduce((s, i) => s + effectivePrice(i) * i.qty, 0);
}

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function stripExpiredSales(items) {
  const today = new Date(); today.setHours(0,0,0,0);
  return items.map(item => {
    if (item.discount && item.saleEnd) {
      const end = new Date(item.saleEnd); end.setHours(0,0,0,0);
      if (end < today) return { ...item, discount: 0, saleEnd: '' };
    }
    return item;
  });
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
  .swipe-row { position: relative; overflow: hidden; width: 100%; }
  .swipe-content { will-change: transform; transition: none; width: 100%; }
  .swipe-content.snapping { transition: transform 0.2s cubic-bezier(0.34,1,0.64,1); }
  .swipe-action-delete { position:absolute; right:0; top:0; bottom:0; width:20vw; min-width:72px; background:#FF3B30; display:flex; align-items:center; justify-content:center; color:#fff; font-size:13px; font-weight:600; flex-direction:column; gap:2px; cursor:pointer; }
  .swipe-action-check  { position:absolute; left:0;  top:0; bottom:0; width:20vw; min-width:72px; background:#34C759; display:flex; align-items:center; justify-content:center; color:#fff; font-size:13px; font-weight:600; flex-direction:column; gap:2px; }
  .safe-top    { padding-top: env(safe-area-inset-top, 0px); }
  .safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
  input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus {
    -webkit-text-fill-color: #000 !important;
    -webkit-box-shadow: 0 0 0 1000px #f2f2f7 inset !important;
    transition: background-color 5000s ease-in-out 0s;
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
  const today = new Date(); today.setHours(0,0,0,0);
  const end   = item.saleEnd ? new Date(item.saleEnd) : null;
  if (end) { end.setHours(0,0,0,0); }
  const expired  = end && end < today;
  const expiring = !expired && end && ((end - today) / 864e5 < 7);
  const endStr   = item.saleEnd ? ' ' + item.saleEnd.slice(5).replace('-','/') : '';
  if (expired) return <Tag bg="#f2f2f7" color="#aeaeb2">sale ended</Tag>;
  return <Tag bg={expiring?'#fff3e0':'#e8f5e9'} color={expiring?'#C1440E':'#1a7a3a'}>-${item.discount.toFixed(2)}{endStr}</Tag>;
}

// ─── Swipeable Item Row ────────────────────────────────────────────────────────
// Delete panel is 20vw wide, revealed on left swipe, tappable to confirm delete
function SwipeRow({ children, onDelete, onToggleBought, bought }) {
  const rowRef   = useRef(null);
  const startX   = useRef(null);
  const currentX = useRef(0);
  const [revealed, setRevealed] = useState(null);
  const DELETE_W = Math.max(72, Math.round(window.innerWidth * 0.20));

  function getContent() { return rowRef.current?.querySelector('.swipe-content'); }

  function snapBack() {
    const c = getContent();
    if (!c) return;
    c.classList.add('snapping');
    c.style.transform = 'translateX(0)';
    setRevealed(null);
  }

  function onTouchStart(e) {
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
    const clamped = Math.max(-DELETE_W, Math.min(DELETE_W, dx));
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
      c.classList.add('snapping');
      c.style.transform = 'translateX(0)';
      setRevealed(null);
      onToggleBought();
    } else if (dx < -(DELETE_W * 0.6)) {
      c.classList.add('snapping');
      c.style.transform = `translateX(-${DELETE_W}px)`;
      setRevealed('delete');
    } else {
      snapBack();
    }
    startX.current  = null;
    currentX.current = 0;
  }

  function handleDeleteConfirm(e) {
    e.stopPropagation();
    e.preventDefault();
    const c = getContent();
    if (c) { c.classList.add('snapping'); c.style.transform = 'translateX(-100%)'; }
    setTimeout(() => onDelete(), 180);
  }

  function handleContentClick() {
    if (revealed === 'delete') { snapBack(); }
  }

  return (
    <div ref={rowRef} className="swipe-row"
      onTouchStart={onTouchStart} onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => { snapBack(); startX.current = null; }}>
      <div className="swipe-action-check" style={{opacity:revealed==='check'?1:0,transition:'opacity 0.1s'}}>
        <span style={{fontSize:22}}>{bought?'↩':'✓'}</span>
        <span>{bought?'Undo':'Done'}</span>
      </div>
      <div
        className="swipe-action-delete"
        onTouchEnd={revealed === 'delete' ? handleDeleteConfirm : undefined}
        onClick={revealed === 'delete' ? handleDeleteConfirm : undefined}
        style={{
          opacity: revealed === 'delete' ? 1 : 0,
          transition: 'opacity 0.1s',
          pointerEvents: revealed === 'delete' ? 'auto' : 'none',
        }}>
        <span style={{fontSize:24}}>🗑</span>
        <span>Delete</span>
      </div>
      <div className="swipe-content" onClick={handleContentClick}>{children}</div>
    </div>
  );
}

// ─── Barcode Scanner ──────────────────────────────────────────────────────────
// Uses a visible <video> element; iOS Safari requires the video to be in the DOM
// with autoPlay + playsInline + muted to allow getUserMedia to work.
function BarcodeScanner({ onResult, onClose }) {
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const detectorRef = useRef(null);
  const frameRef    = useRef(null);
  const [status, setStatus]           = useState('starting');
  const [manualCode, setManualCode]   = useState('');
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function start() {
      // Give DOM time to paint the video element
      await new Promise(r => setTimeout(r, 200));
      if (!active) return;

      if (!navigator.mediaDevices?.getUserMedia) {
        if (active) setStatus('manual');
        return;
      }

      try {
        const constraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width:  { ideal: 1280 },
            height: { ideal: 720 },
          }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          // iOS Safari needs explicit play() call after srcObject is set
          video.onloadedmetadata = async () => {
            if (!active) return;
            try { await video.play(); } catch {}
            if (active) setCameraReady(true);
          };
          // Fallback: some browsers fire oncanplay instead
          video.oncanplay = async () => {
            if (!active || cameraReady) return;
            try { await video.play(); } catch {}
            if (active) setCameraReady(true);
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

  const showCamera = status === 'starting' || status === 'scanning';

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#000'}}>
      {/* Video element — always in DOM so stream can attach; hidden only when not needed */}
      <div style={{
        position:'relative',
        flex: showCamera ? 1 : '0 0 0px',
        overflow:'hidden',
        background:'#000',
        minHeight: showCamera ? 260 : 0,
        display: showCamera ? 'block' : 'none',
      }}>
        {/* CRITICAL for iOS: autoPlay playsInline muted must all be present */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}
        />
        {status === 'scanning' && (
          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
            <div style={{width:'65%',height:'30%',border:'2px solid rgba(255,255,255,0.85)',borderRadius:10,boxShadow:'0 0 0 9999px rgba(0,0,0,0.38)'}}/>
          </div>
        )}
        {!cameraReady && status === 'starting' && (
          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.7)'}}>
            <span style={{color:'#fff',fontSize:14}}>Starting camera…</span>
          </div>
        )}
      </div>

      <div style={{background:'#fff',padding:16,flex:1,overflowY:'auto'}}>
        {status === 'looking' && (
          <p style={{textAlign:'center',padding:30,color:'#888'}}>Looking up barcode…</p>
        )}
        {status === 'error' && (
          <p style={{textAlign:'center',color:'#FF3B30',marginBottom:12,fontSize:14}}>
            Camera unavailable — enter barcode below.
          </p>
        )}

        {(status === 'manual' || status === 'error' || status === 'scanning') && (
          <div style={{marginBottom:8}}>
            <p style={{fontSize:12,color:'#8e8e93',marginBottom:6}}>
              {status === 'scanning' ? 'Or type barcode manually:' : 'Enter barcode:'}
            </p>
            <div style={{display:'flex',gap:8}}>
              <input
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="0123456789012"
                inputMode="numeric"
                style={{flex:1,border:'1px solid #e5e5ea',borderRadius:10,padding:'9px 12px',fontSize:15,background:'#f2f2f7',outline:'none'}}
              />
              <button
                onClick={() => manualCode.trim() && lookupBarcode(manualCode.trim())}
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

// ─── Item Form ────────────────────────────────────────────────────────────────
function ItemForm({ item, sections, memory, onSave, onDelete, defaultFilter }) {
  const notUrgent = sections.includes('Not Urgent') ? 'Not Urgent' : (sections[sections.length-1]||sections[0]||'');
  const defaultSection = defaultFilter === 'watchlist' ? notUrgent : '';

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

  function handleNameChange(val) {
    set('name', val);
    if (!item) {
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

      <div style={{margin:'0 16px 8px',fontSize:12,color:'#8e8e93',fontWeight:600,textTransform:'uppercase',letterSpacing:0.5}}>Info</div>
      <div style={{background:'#fff',borderRadius:12,margin:'0 16px',overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
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

// ─── Quick Add Bar ────────────────────────────────────────────────────────────
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

// ─── Store List Screen ────────────────────────────────────────────────────────
// Stores displayed as draggable tiles (2-column grid)
function StoreListScreen({ stores, onSelectStore, onAddStore, onEditStore }) {
  const [editingStore, setEditingStore] = useState(null);
  const [dragIdx,      setDragIdx]      = useState(null);
  const [overIdx,      setOverIdx]      = useState(null);
  const [storeOrder,   setStoreOrder]   = useState(() => stores.map(s => s.id));

  // Keep storeOrder in sync if stores change externally
  useEffect(() => {
    setStoreOrder(prev => {
      const existingIds = stores.map(s => s.id);
      const filtered = prev.filter(id => existingIds.includes(id));
      const newIds = existingIds.filter(id => !prev.includes(id));
      return [...filtered, ...newIds];
    });
  }, [stores]);

  const orderedStores = storeOrder.map(id => stores.find(s => s.id === id)).filter(Boolean);

  const STORE_COLORS = ['#007AFF','#FF9500','#FF3B30','#34C759','#AF52DE','#FF2D55','#5AC8FA','#FF6B35'];
  const STORE_ICONS  = ['🛒','🏪','🏬','🍎','🥩','🥖','🏠','🔧'];

  function handleDragStart(e, i) {
    setDragIdx(i);
    e.dataTransfer.effectAllowed = 'move';
  }
  function handleDragOver(e, i) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIdx(i);
  }
  function handleDrop(i) {
    if (dragIdx === null || dragIdx === i) { setOverIdx(null); return; }
    const arr = [...storeOrder];
    const [moved] = arr.splice(dragIdx, 1);
    arr.splice(i, 0, moved);
    setStoreOrder(arr);
    setDragIdx(null);
    setOverIdx(null);
  }
  function handleDragEnd() { setDragIdx(null); setOverIdx(null); }

  function StoreForm({ store, onSave, onDelete }) {
    const blank = {id:uid(),name:'',color:STORE_COLORS[0],icon:'🛒',sections:[...DEFAULT_SECTIONS],items:[],memory:{}};
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
          <span style={{fontSize:28,fontWeight:700,color:'#000',letterSpacing:-0.5}}>My Lists</span>
          <button onClick={()=>setEditingStore('new')} style={{background:B,color:'#fff',border:'none',borderRadius:10,width:36,height:36,cursor:'pointer',fontSize:22,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
        </div>
        <p style={{fontSize:12,color:'#8e8e93',margin:'4px 0 0'}}>Tap to open · Drag to reorder</p>
      </div>

      <div className="ios-scroll" style={{flex:1,overflowY:'auto',padding:'16px',paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 16px)'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {orderedStores.map((store, i) => {
            const remaining = store.items.filter(it=>!it.bought).length;
            const isDragging = dragIdx === i;
            const isOver = overIdx === i && dragIdx !== null && dragIdx !== i;
            return (
              <div
                key={store.id}
                draggable
                onDragStart={e => handleDragStart(e, i)}
                onDragOver={e => handleDragOver(e, i)}
                onDrop={() => handleDrop(i)}
                onDragEnd={handleDragEnd}
                style={{
                  background:'#fff',
                  borderRadius:16,
                  overflow:'hidden',
                  boxShadow: isOver
                    ? `0 0 0 3px ${B}, 0 4px 16px rgba(0,0,0,0.12)`
                    : '0 2px 8px rgba(0,0,0,0.08)',
                  opacity: isDragging ? 0.5 : 1,
                  transform: isDragging ? 'scale(0.97)' : 'scale(1)',
                  transition:'transform 0.15s, opacity 0.15s, box-shadow 0.15s',
                  cursor:'grab',
                  userSelect:'none',
                }}>
                {/* Color bar */}
                <div style={{height:6,background:store.color}} />
                {/* Tile body */}
                <div
                  onClick={() => onSelectStore(store.id)}
                  style={{padding:'14px 12px 10px',cursor:'pointer'}}>
                  <div style={{fontSize:32,marginBottom:6,lineHeight:1}}>{store.icon}</div>
                  <div style={{fontSize:15,fontWeight:700,color:'#000',marginBottom:2,lineHeight:1.2}}>{store.name}</div>
                  <div style={{fontSize:12,color:'#8e8e93'}}>
                    {remaining>0?`${remaining} item${remaining!==1?'s':''}`:'All done ✓'}
                  </div>
                </div>
                {/* Edit button */}
                <div style={{borderTop:'0.5px solid #f2f2f7',padding:'6px 12px',display:'flex',justifyContent:'flex-end'}}>
                  <button
                    onClick={e=>{e.stopPropagation();setEditingStore(store.id);}}
                    style={{background:'none',border:'none',color:'#8e8e93',fontSize:12,cursor:'pointer',padding:'2px 4px',fontWeight:500}}>
                    Edit ···
                  </button>
                </div>
              </div>
            );
          })}
          {/* Add new store tile */}
          <div
            onClick={() => setEditingStore('new')}
            style={{
              background:'#fff',borderRadius:16,
              border:'2px dashed #c7c7cc',
              display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
              minHeight:130,cursor:'pointer',gap:6,color:'#8e8e93',
            }}>
            <span style={{fontSize:32}}>+</span>
            <span style={{fontSize:13,fontWeight:500}}>Add Store</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shopping List Screen ─────────────────────────────────────────────────────
// Bottom tabs: Active | All | Done (replaces the dropdown)
// Top right: Sections button (was bottom)
// Bottom right tab area: Export
const CHIP_FILTERS = [{k:'all',l:'All'},{k:'weekly',l:'Weekly'},{k:'sale',l:'On Sale'},{k:'watchlist',l:'Watch List'}];

function ShoppingListScreen({ store, onBack, onUpdateStore }) {
  const [listView,  setListView]  = useState('Active'); // 'Active' | 'All' | 'Done'
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

  // Strip expired sales on store load
  useEffect(() => {
    const cleaned = stripExpiredSales(store.items);
    const changed = cleaned.some((item,i) => item.discount !== store.items[i].discount);
    if (changed) onUpdateStore({...store, items: cleaned});
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
    if (listView==='Active') base = base.filter(i=>!i.bought);
    if (listView==='Done')   base = base.filter(i=>i.bought);
    // For Done view: deduplicate by name — show each item name only once
    if (listView==='Done') {
      const seen = new Set();
      base = base.filter(i => {
        if (seen.has(i.name)) return false;
        seen.add(i.name);
        return true;
      });
    }
    if (filter==='weekly')    base = base.filter(i=>i.weekly);
    if (filter==='sale')      base = base.filter(i=>i.discount>0);
    if (filter==='watchlist') base = base.filter(i=>i.watch);
    return base;
  })();

  const remaining = items.filter(i=>!i.bought).length;
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

  return (
    <div style={{
      background:'#f2f2f7',height:'100%',display:'flex',flexDirection:'column',
      overflow:'hidden',width:'100%',position:'relative',
      // Ensure nothing overflows the viewport
      maxWidth:'100vw',
    }}>
      <style>{GLOBAL_CSS}</style>

      {/* Camera overlay */}
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
        width:'100%',
        paddingTop:'calc(env(safe-area-inset-top, 0px) + 4px)'
      }}>
        {/* Title row — Sections button moved here (top right), no Export here */}
        <div style={{display:'flex',alignItems:'center',padding:'6px 12px 4px',boxSizing:'border-box'}}>
          <button onClick={onBack} style={{background:'none',border:'none',color:B,fontSize:15,cursor:'pointer',padding:'4px 8px 4px 0',display:'flex',alignItems:'center',gap:2,flexShrink:0}}>
            <span style={{fontSize:18,lineHeight:1}}>‹</span> Lists
          </button>
          <div style={{flex:1,textAlign:'center',minWidth:0,overflow:'hidden'}}>
            <div style={{fontSize:16,fontWeight:600,color:'#000',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
              {store.icon} {store.name}
            </div>
            <div style={{fontSize:11,color:'#8e8e93'}}>{remaining} of {items.length} remaining</div>
          </div>
          {/* Sections — now top right */}
          <button onClick={()=>setSheet('sections')} style={{background:'none',border:'none',color:B,fontSize:14,fontWeight:500,cursor:'pointer',padding:'4px 0 4px 8px',flexShrink:0}}>
            Sections
          </button>
        </div>

        {/* Filter chips row */}
        <div style={{display:'flex',alignItems:'center',padding:'2px 10px 6px',gap:6,boxSizing:'border-box',overflowX:'auto',width:'100%'}}>
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

        {/* QuickAdd row */}
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

      {/* List scroll area */}
      <div className="ios-scroll" style={{
        flex:1,overflowY:'auto',overflowX:'hidden',
        paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 60px)',
        width:'100%',boxSizing:'border-box',
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
            <div key={sec} style={{width:'100%',overflow:'hidden'}}>
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
                        padding:'9px 10px 9px 14px',
                        display:'flex',alignItems:'center',gap:8,
                        opacity:isDrag?0.6:1,
                        transform:isDrag?'scale(1.01)':'scale(1)',
                        transition:'transform 0.1s, opacity 0.1s',
                        touchAction:'pan-y',userSelect:'none',cursor:'pointer',
                        width:'100%',boxSizing:'border-box',minWidth:0,
                        overflow:'hidden',
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
                      {item.price!=null&&(
                        <div style={{textAlign:'right',flexShrink:0,fontSize:13,fontWeight:500,minWidth:0}}>
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

      {/* Bottom tabs — Active | All | Done | Export */}
      <div style={{
        background:'rgba(255,255,255,0.92)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
        borderTop:'0.5px solid rgba(60,60,67,0.2)',
        display:'flex',flexShrink:0,
        paddingBottom:'env(safe-area-inset-bottom,8px)',paddingTop:6,zIndex:10,
      }}>
        {/* Active / All / Done as tap targets */}
        {['Active','All','Done'].map(v=>(
          <button key={v} onClick={()=>setListView(v)} style={{
            flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:1,
            background:'none',border:'none',cursor:'pointer',
            color:listView===v?B:'#8e8e93',fontSize:10,fontWeight:listView===v?700:400,padding:'4px 0',
            borderTop:listView===v?`2px solid ${B}`:'2px solid transparent',
          }}>
            <span style={{fontSize:18}}>
              {v==='Active'?'☐':v==='All'?'☰':'☑'}
            </span>
            {v}
          </button>
        ))}
        {/* Divider */}
        <div style={{width:'0.5px',background:'#e5e5ea',margin:'4px 0'}}/>
        {/* Export — now bottom right */}
        <button onClick={()=>setSheet('export')} style={{
          flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:1,
          background:'none',border:'none',cursor:'pointer',
          color:sheet==='export'?B:'#8e8e93',fontSize:10,fontWeight:400,padding:'4px 0',
          borderTop:'2px solid transparent',
        }}>
          <span style={{fontSize:18}}>📤</span>
          Export
        </button>
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
          if (docSnap.exists()) {
            // Strip trips from data coming in (migration: remove old trips field)
            const rawStores = (docSnap.data().stores || []).map(s => {
              const { trips, ...rest } = s;
              return rest;
            });
            setStores(rawStores);
          }
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
    />
  );
}
