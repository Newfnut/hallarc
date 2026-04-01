import { useState, useRef, useEffect } from "react";

// ─── Theme ────────────────────────────────────────────────────────────────────
const B = '#007AFF';
const HOLD_MS = 400;

// ─── Default Data ─────────────────────────────────────────────────────────────
const DEFAULT_SECTIONS = [
  'Bakery','Produce','Frozen Foods','Dairy','Meat','Deli',
  'Grains, Pasta & Sides','Pantry','Beverages','Health & Beauty','Not Urgent'
];

// A flat list of common grocery item names for search suggestions
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

const INITIAL_STORES = [
  {
    id: 's1',
    name: 'Costco Langley',
    color: '#007AFF',
    icon: '🛒',
    sections: [...DEFAULT_SECTIONS],
    items: [
      {id:1,name:'Bread',qty:1,size:'',section:'Bakery',price:null,discount:0,saleEnd:'',weekly:false,watch:false,barcode:'',bought:false},
      {id:2,name:'Bananas',qty:1,size:'',section:'Produce',price:1.99,discount:0,saleEnd:'',weekly:true,watch:false,barcode:'',bought:false},
      {id:3,name:'Frozen Pineapple',qty:1,size:'',section:'Frozen Foods',price:11.49,discount:0,saleEnd:'',weekly:false,watch:false,barcode:'',bought:false},
      {id:4,name:'Eggs Extra Large',qty:4,size:'',section:'Dairy',price:9.99,discount:0,saleEnd:'',weekly:true,watch:false,barcode:'',bought:false},
      {id:5,name:'Greek Yogurt',qty:2,size:'1.36kg',section:'Dairy',price:8.99,discount:0,saleEnd:'',weekly:false,watch:false,barcode:'',bought:false},
      {id:6,name:'Raspberry Jam',qty:2,size:'',section:'Grains, Pasta & Sides',price:8.99,discount:2,saleEnd:'2026-04-12',weekly:false,watch:false,barcode:'',bought:false},
      {id:7,name:'Frozen Peas',qty:1,size:'',section:'Not Urgent',price:11.49,discount:0,saleEnd:'',weekly:false,watch:false,barcode:'',bought:false},
      {id:8,name:'Cherry Juice',qty:2,size:'',section:'Not Urgent',price:12.99,discount:0,saleEnd:'',weekly:false,watch:false,barcode:'',bought:false},
      {id:9,name:'Arugula',qty:1,size:'',section:'Not Urgent',price:null,discount:0,saleEnd:'',weekly:false,watch:true,barcode:'',bought:false},
      {id:10,name:'Chicken Legs',qty:2,size:'',section:'Meat',price:null,discount:0,saleEnd:'',weekly:true,watch:false,barcode:'',bought:false},
    ],
    trips: [
      {id:'t1',label:'Costco — April 1',date:'2026-04-01'},
      {id:'t2',label:'Costco — April 16',date:'2026-04-16'},
    ],
    memory: {
      'Bread':            {size:'',       price:null,  section:'Bakery',                barcode:''},
      'Bananas':          {size:'',       price:1.99,  section:'Produce',               barcode:''},
      'Frozen Pineapple': {size:'',       price:11.49, section:'Frozen Foods',          barcode:''},
      'Eggs Extra Large': {size:'',       price:9.99,  section:'Dairy',                 barcode:''},
      'Greek Yogurt':     {size:'1.36kg', price:8.99,  section:'Dairy',                 barcode:''},
      'Raspberry Jam':    {size:'',       price:8.99,  section:'Grains, Pasta & Sides', barcode:''},
      'Frozen Peas':      {size:'',       price:11.49, section:'Not Urgent',            barcode:''},
      'Cherry Juice':     {size:'',       price:12.99, section:'Not Urgent',            barcode:''},
      'Arugula':          {size:'',       price:null,  section:'Not Urgent',            barcode:''},
      'Chicken Legs':     {size:'',       price:null,  section:'Meat',                  barcode:''},
    }
  },
  {
    id: 's2',
    name: 'Superstore',
    color: '#FF9500',
    icon: '🏪',
    sections: [...DEFAULT_SECTIONS],
    items: [
      {id:101,name:'Milk 3.25%',qty:2,size:'4L',section:'Dairy',price:6.99,discount:0,saleEnd:'',weekly:true,watch:false,barcode:'',bought:false},
      {id:102,name:'Sourdough',qty:1,size:'',section:'Bakery',price:4.49,discount:0,saleEnd:'',weekly:false,watch:false,barcode:'',bought:false},
      {id:103,name:'Spinach',qty:1,size:'311g',section:'Produce',price:5.99,discount:1,saleEnd:'2026-04-05',weekly:false,watch:false,barcode:'',bought:false},
      {id:104,name:'Butter',qty:1,size:'454g',section:'Dairy',price:7.49,discount:0,saleEnd:'',weekly:true,watch:false,barcode:'',bought:false},
      {id:105,name:'Orange Juice',qty:1,size:'1.75L',section:'Beverages',price:5.99,discount:0,saleEnd:'',weekly:false,watch:false,barcode:'',bought:false},
    ],
    trips: [],
    memory: {
      'Milk 3.25%': {size:'4L',  price:6.99, section:'Dairy',   barcode:''},
      'Sourdough':  {size:'',    price:4.49, section:'Bakery',   barcode:''},
      'Spinach':    {size:'311g',price:5.99, section:'Produce',  barcode:''},
    }
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function effectivePrice(item) {
  if (!item.price) return null;
  return item.discount ? Math.max(0, item.price - item.discount) : item.price;
}
function totalCost(items) {
  return items.filter(i => i.price && !i.bought).reduce((s, i) => s + effectivePrice(i) * i.qty, 0);
}
function uid() { return Math.random().toString(36).slice(2); }

// ─── Global Styles ────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
  body { margin: 0; background: #f2f2f7; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif; }
  input, select, button { font-family: inherit; }
  ::-webkit-scrollbar { display: none; }
  .ios-scroll {
    -webkit-overflow-scrolling: touch;
    overflow-y: auto;
    overscroll-behavior-y: contain;
  }
  @keyframes slideUp {
    from { transform: translateY(100%); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .sheet { animation: slideUp 0.32s cubic-bezier(0.32,0.72,0,1); }
  .fade  { animation: fadeIn  0.18s ease; }
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

function Sheet({ open, onClose, title, children, height = '92vh' }) {
  if (!open) return null;
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} className="fade" style={{
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
  const today = new Date();
  const end = item.saleEnd ? new Date(item.saleEnd) : null;
  const expiring = end && ((end - today) / 864e5 < 7);
  const endStr = item.saleEnd ? ' ' + item.saleEnd.slice(5).replace('-','/') : '';
  return <Tag bg={expiring?'#fff3e0':'#e8f5e9'} color={expiring?'#C1440E':'#1a7a3a'}>-${item.discount.toFixed(2)}{endStr}</Tag>;
}

// ─── Barcode Scanner ──────────────────────────────────────────────────────────
function BarcodeScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('starting');
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    let active = true;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t=>t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStatus('scanning');
      })
      .catch(() => setStatus('error'));
    return () => { active = false; streamRef.current?.getTracks().forEach(t=>t.stop()); };
  }, []);

  useEffect(() => {
    if (status !== 'scanning') return;
    if (!('BarcodeDetector' in window)) { setStatus('manual'); return; }
    const detector = new window.BarcodeDetector({ formats: ['ean_13','ean_8','upc_a','upc_e','code_128','code_39'] });
    let frame;
    async function detect() {
      if (videoRef.current?.readyState === 4) {
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) { streamRef.current?.getTracks().forEach(t=>t.stop()); lookupBarcode(codes[0].rawValue); return; }
        } catch {}
      }
      frame = requestAnimationFrame(detect);
    }
    frame = requestAnimationFrame(detect);
    return () => cancelAnimationFrame(frame);
  }, [status]);

  async function lookupBarcode(code) {
    setStatus('looking');
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
      const data = await res.json();
      if (data.status === 1) {
        const p = data.product;
        onResult({ barcode: code, name: p.product_name || '', size: p.quantity || '' });
      } else { onResult({ barcode: code, name: '', size: '' }); }
    } catch { onResult({ barcode: code, name: '', size: '' }); }
  }

  return (
    <div style={{padding:16}}>
      {(status==='starting'||status==='scanning') && (
        <div style={{borderRadius:12,overflow:'hidden',background:'#000',aspectRatio:'4/3',marginBottom:12}}>
          <video ref={videoRef} autoPlay playsInline muted style={{width:'100%',height:'100%',objectFit:'cover'}} />
        </div>
      )}
      {status==='looking' && <p style={{textAlign:'center',padding:40,color:'#888'}}>Looking up barcode…</p>}
      {status==='error' && <p style={{textAlign:'center',color:'#FF3B30',marginBottom:12,fontSize:14}}>Camera unavailable. Enter barcode manually.</p>}
      {(status==='manual'||status==='error'||status==='scanning') && (
        <div style={{marginTop:8}}>
          <p style={{fontSize:12,color:'#8e8e93',marginBottom:6}}>{status==='scanning'?'Or type manually:':'Enter barcode:'}</p>
          <div style={{display:'flex',gap:8}}>
            <input value={manualCode} onChange={e=>setManualCode(e.target.value)} placeholder="0123456789012"
              style={{flex:1,border:'1px solid #e5e5ea',borderRadius:10,padding:'9px 12px',fontSize:15,background:'#f2f2f7'}} />
            <button onClick={()=>manualCode.trim()&&lookupBarcode(manualCode.trim())}
              style={{background:B,color:'#fff',border:'none',borderRadius:10,padding:'0 16px',cursor:'pointer',fontSize:15,fontWeight:600}}>
              Look up
            </button>
          </div>
        </div>
      )}
      <button onClick={onClose} style={{width:'100%',marginTop:14,background:'#f2f2f7',border:'none',
        borderRadius:10,padding:12,fontSize:15,cursor:'pointer',color:'#3c3c43',fontWeight:500}}>
        Cancel
      </button>
    </div>
  );
}

// ─── Item Form (full edit) ────────────────────────────────────────────────────
function ItemForm({ item, sections, memory, onSave, onDelete }) {
  const blank = {name:'',qty:1,size:'',section:sections[0]||'',price:'',discount:'',saleEnd:'',weekly:false,watch:false,barcode:''};
  const init = item ? {...item,price:item.price??'',discount:item.discount||'',saleEnd:item.saleEnd||''} : blank;
  const [f, setF] = useState(init);
  const [saleOn, setSaleOn] = useState(item ? item.discount > 0 : false);
  const [showScanner, setShowScanner] = useState(false);

  const set = (k,v) => setF(p=>({...p,[k]:v}));

  function handleBarcodeResult({barcode,name,size}) {
    setShowScanner(false);
    setF(p=>({...p,barcode,name:name||p.name,size:size||p.size}));
  }

  function handleSave() {
    if (!f.name.trim()) return;
    onSave({...f,qty:parseInt(f.qty)||1,price:parseFloat(f.price)||null,discount:saleOn?(parseFloat(f.discount)||0):0,saleEnd:saleOn?f.saleEnd:''});
  }

  const inp = {
    width:'100%',border:'1px solid #e5e5ea',borderRadius:10,padding:'9px 12px',
    fontSize:15,marginBottom:8,boxSizing:'border-box',color:'#000',background:'#f2f2f7',outline:'none'
  };

  if (showScanner) return <BarcodeScanner onResult={handleBarcodeResult} onClose={()=>setShowScanner(false)} />;

  return (
    <div style={{padding:'8px 16px 24px'}}>
      <div style={{fontSize:12,color:'#8e8e93',marginBottom:4,fontWeight:500,textTransform:'uppercase',letterSpacing:0.4}}>Item Name</div>
      <input style={inp} value={f.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Greek Yogurt" autoFocus />

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:4}}>
        <div>
          <div style={{fontSize:12,color:'#8e8e93',marginBottom:4,fontWeight:500,textTransform:'uppercase',letterSpacing:0.4}}>Qty</div>
          <input style={inp} type="number" min="1" value={f.qty} onChange={e=>set('qty',e.target.value)} />
        </div>
        <div>
          <div style={{fontSize:12,color:'#8e8e93',marginBottom:4,fontWeight:500,textTransform:'uppercase',letterSpacing:0.4}}>Package Size</div>
          <input style={inp} value={f.size} onChange={e=>set('size',e.target.value)} placeholder="1.36kg" />
        </div>
      </div>

      <div style={{fontSize:12,color:'#8e8e93',marginBottom:4,fontWeight:500,textTransform:'uppercase',letterSpacing:0.4}}>Section</div>
      <select style={{...inp,appearance:'none',WebkitAppearance:'none'}} value={f.section} onChange={e=>set('section',e.target.value)}>
        {sections.map(s=><option key={s} value={s}>{s}</option>)}
      </select>

      <div style={{fontSize:12,color:'#8e8e93',marginBottom:4,fontWeight:500,textTransform:'uppercase',letterSpacing:0.4}}>Price ($)</div>
      <input style={inp} type="number" step="0.01" value={f.price} onChange={e=>set('price',e.target.value)} placeholder="0.00" />

      <div style={{background:'#f2f2f7',borderRadius:12,overflow:'hidden',marginBottom:10}}>
        {[
          ['On Sale', saleOn, ()=>setSaleOn(v=>!v)],
          ['Weekly / Regular Buy', f.weekly, ()=>set('weekly',!f.weekly)],
          ['Watch List', f.watch, ()=>set('watch',!f.watch)],
        ].map(([label,val,toggle],i,arr)=>(
          <div key={label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 14px',borderBottom:i<arr.length-1?'0.5px solid #e5e5ea':'none',background:'#fff'}}>
            <span style={{fontSize:15,color:'#000'}}>{label}</span>
            <Toggle on={val} onToggle={toggle} />
          </div>
        ))}
      </div>

      {saleOn && (
        <div style={{background:'#f2f2f7',borderRadius:12,padding:'12px 14px',marginBottom:10}}>
          <div style={{fontSize:12,color:'#8e8e93',marginBottom:4,fontWeight:500,textTransform:'uppercase',letterSpacing:0.4}}>Discount ($)</div>
          <input style={inp} type="number" step="0.01" value={f.discount} onChange={e=>set('discount',e.target.value)} placeholder="2.00" />
          <div style={{fontSize:12,color:'#8e8e93',marginBottom:4,fontWeight:500,textTransform:'uppercase',letterSpacing:0.4}}>Sale Ends</div>
          <input style={{...inp,marginBottom:0}} type="date" value={f.saleEnd} onChange={e=>set('saleEnd',e.target.value)} />
        </div>
      )}

      <div style={{fontSize:12,color:'#8e8e93',marginBottom:4,fontWeight:500,textTransform:'uppercase',letterSpacing:0.4}}>Barcode</div>
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        <input style={{...inp,marginBottom:0,flex:1}} value={f.barcode} onChange={e=>set('barcode',e.target.value)} placeholder="Scan or type" />
        <button onClick={()=>setShowScanner(true)} style={{background:B,color:'#fff',border:'none',borderRadius:10,padding:'0 14px',cursor:'pointer',fontSize:18,flexShrink:0}}>📷</button>
      </div>

      <button onClick={handleSave} style={{width:'100%',background:B,color:'#fff',border:'none',borderRadius:12,padding:14,fontSize:17,fontWeight:600,cursor:'pointer',marginBottom:10}}>
        {item ? 'Save Changes' : 'Add Item'}
      </button>
      {item && (
        <button onClick={()=>onDelete(item.id)} style={{width:'100%',background:'none',color:'#FF3B30',border:'1px solid #FF3B30',borderRadius:12,padding:12,fontSize:15,cursor:'pointer'}}>
          Remove Item
        </button>
      )}
    </div>
  );
}

// ─── Quick Add Bar ────────────────────────────────────────────────────────────
// Shows inline search results from memory + common items + "Add X" option.
// Tapping a result adds it immediately; pencil icon opens full ItemForm.
function QuickAdd({ sections, memory, onQuickAdd, onOpenEdit }) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const suggestions = (() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const memKeys = Object.keys(memory || {});
    const combined = [...new Set([...memKeys, ...COMMON_ITEMS])];
    const matches = combined.filter(n => n.toLowerCase().includes(q) && n.toLowerCase() !== q);
    return matches.slice(0, 8);
  })();

  const showDropdown = focused && (query.trim().length > 0);

  function quickAdd(name, fromMemory) {
    const mem = (memory || {})[name];
    const newItem = {
      id: Date.now(),
      name,
      qty: 1,
      size: mem?.size || '',
      section: mem?.section || sections[0] || '',
      price: mem?.price || null,
      discount: 0,
      saleEnd: '',
      weekly: false,
      watch: false,
      barcode: mem?.barcode || '',
      bought: false,
    };
    onQuickAdd(newItem);
    setQuery('');
    setFocused(false);
    inputRef.current?.blur();
  }

  function handleAddCustom() {
    if (!query.trim()) return;
    const name = query.trim();
    quickAdd(name, false);
  }

  return (
    <div style={{position:'relative',zIndex:50}}>
      {/* Input row */}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'#fff',borderBottom:'0.5px solid #e5e5ea'}}>
        <span style={{color:'#8e8e93',fontSize:20,lineHeight:1,fontWeight:300}}>+</span>
        <input
          ref={inputRef}
          value={query}
          onChange={e=>setQuery(e.target.value)}
          onFocus={()=>setFocused(true)}
          onBlur={()=>setTimeout(()=>setFocused(false),150)}
          onKeyDown={e=>{ if(e.key==='Enter'&&query.trim()) handleAddCustom(); if(e.key==='Escape'){setQuery('');setFocused(false);inputRef.current?.blur();} }}
          placeholder="Add item…"
          style={{flex:1,border:'none',outline:'none',fontSize:15,color:'#000',background:'transparent',padding:'4px 0'}}
        />
        {query.trim() && (
          <button onClick={()=>{setQuery('');inputRef.current?.focus();}}
            style={{background:'none',border:'none',color:'#8e8e93',fontSize:18,cursor:'pointer',padding:'0 2px',lineHeight:1}}>✕</button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div style={{
          position:'absolute',top:'100%',left:0,right:0,
          background:'#fff',borderBottom:'0.5px solid #e5e5ea',
          boxShadow:'0 4px 16px rgba(0,0,0,0.10)',zIndex:60,maxHeight:320,overflowY:'auto'
        }}>
          {/* Add custom at top */}
          <div
            style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 14px',borderBottom:'0.5px solid #f2f2f7',cursor:'pointer',background:'#fff'}}
            onPointerDown={e=>{e.preventDefault();handleAddCustom();}}>
            <span style={{fontSize:15,color:B,fontWeight:500}}>Add "{query.trim()}"</span>
            <button
              onPointerDown={e=>{e.stopPropagation();e.preventDefault();
                onOpenEdit({id:null,name:query.trim(),qty:1,size:'',section:sections[0]||'',price:'',discount:'',saleEnd:'',weekly:false,watch:false,barcode:''});
                setQuery(''); setFocused(false);
              }}
              style={{background:'none',border:'none',cursor:'pointer',padding:'4px 6px',fontSize:16,color:'#c7c7cc'}}>✏️</button>
          </div>

          {/* Matching items */}
          {suggestions.map(name => {
            const mem = (memory||{})[name];
            const inMemory = !!(memory||{})[name];
            return (
              <div key={name}
                style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderBottom:'0.5px solid #f2f2f7',cursor:'pointer',background:'#fff'}}
                onPointerDown={e=>{e.preventDefault();quickAdd(name,inMemory);}}>
                <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
                  {inMemory
                    ? <span style={{fontSize:14,color:'#8e8e93'}}>🗂</span>
                    : <span style={{fontSize:14,color:'#c7c7cc'}}>📋</span>}
                  <span style={{fontSize:15,color:'#000'}}>{name}</span>
                  {mem?.price && <span style={{fontSize:13,color:'#8e8e93',marginLeft:4}}>${mem.price.toFixed(2)}</span>}
                  {mem?.size  && <span style={{fontSize:12,color:'#c7c7cc'}}>{mem.size}</span>}
                </div>
                <button
                  onPointerDown={e=>{e.stopPropagation();e.preventDefault();
                    const existing = mem ? {id:null,name,qty:1,size:mem.size||'',section:mem.section||sections[0]||'',price:mem.price||'',discount:'',saleEnd:'',weekly:false,watch:false,barcode:mem.barcode||''} : {id:null,name,qty:1,size:'',section:sections[0]||'',price:'',discount:'',saleEnd:'',weekly:false,watch:false,barcode:''};
                    onOpenEdit(existing);
                    setQuery(''); setFocused(false);
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
  const [newSec, setNewSec] = useState('');
  const dragIdx = useRef(null);
  const [overIdx, setOverIdx] = useState(null);

  function handleDragStart(i) { dragIdx.current = i; }
  function handleDragOver(e, i) { e.preventDefault(); setOverIdx(i); }
  function handleDrop(i) {
    if (dragIdx.current === null || dragIdx.current === i) { setOverIdx(null); return; }
    const arr = [...sections];
    const [moved] = arr.splice(dragIdx.current, 1);
    arr.splice(i, 0, moved);
    onUpdate(arr);
    dragIdx.current = null;
    setOverIdx(null);
  }

  return (
    <div style={{padding:'0 16px 16px'}}>
      <p style={{fontSize:13,color:'#8e8e93',margin:'8px 0 12px'}}>Drag to reorder sections. Order matches your store layout.</p>
      <div style={{background:'#fff',borderRadius:12,overflow:'hidden',marginBottom:12}}>
        {sections.map((sec,i)=>(
          <div key={sec} draggable
            onDragStart={()=>handleDragStart(i)}
            onDragOver={e=>handleDragOver(e,i)}
            onDrop={()=>handleDrop(i)}
            style={{
              display:'flex',alignItems:'center',gap:10,padding:'10px 14px',
              borderBottom: i<sections.length-1 ? '0.5px solid #e5e5ea' : 'none',
              borderTop: overIdx===i ? `2px solid ${B}` : '2px solid transparent',
              background:'#fff',cursor:'grab'
            }}>
            <span style={{color:'#c7c7cc',fontSize:18,lineHeight:1}}>≡</span>
            <span style={{flex:1,fontSize:15,color:'#000'}}>{sec}</span>
            <button onClick={()=>onRemove(sec)} style={{background:'none',border:'none',color:'#FF3B30',fontSize:13,cursor:'pointer',padding:'4px 6px'}}>Remove</button>
          </div>
        ))}
      </div>
      <div style={{fontSize:12,color:'#8e8e93',marginBottom:6,fontWeight:500,textTransform:'uppercase',letterSpacing:0.4}}>New Section</div>
      <div style={{display:'flex',gap:8}}>
        <input value={newSec} onChange={e=>setNewSec(e.target.value)} placeholder="e.g. Electronics"
          onKeyDown={e=>{ if(e.key==='Enter'&&newSec.trim()){ onAdd(newSec.trim()); setNewSec(''); }}}
          style={{flex:1,border:'1px solid #e5e5ea',borderRadius:10,padding:'9px 12px',fontSize:15,background:'#f2f2f7',outline:'none'}} />
        <button onClick={()=>{ if(newSec.trim()){ onAdd(newSec.trim()); setNewSec(''); }}}
          style={{background:B,color:'#fff',border:'none',borderRadius:10,padding:'0 16px',cursor:'pointer',fontSize:15,fontWeight:600}}>Add</button>
      </div>
    </div>
  );
}

// ─── Export View ──────────────────────────────────────────────────────────────
function ExportView({ items, sections }) {
  const unbought = items.filter(i => !i.bought);
  const grand = totalCost(unbought.map(i=>({...i,bought:false})));

  function copyText() {
    let t = 'Shopping List\n\n';
    sections.forEach(sec => {
      const its = unbought.filter(i => i.section === sec);
      if (!its.length) return;
      t += sec + '\n';
      its.forEach(i => { const p=effectivePrice(i); t+=`  ${i.name}${i.qty>1?' x'+i.qty:''}${p?' $'+(p*i.qty).toFixed(2):''}\n`; });
      t += '\n';
    });
    t += 'Total: $' + grand.toFixed(2);
    navigator.clipboard.writeText(t).then(()=>alert('Copied!')).catch(()=>alert('Copy failed'));
  }

  return (
    <div style={{padding:'8px 16px 16px'}}>
      {sections.map(sec => {
        const its = unbought.filter(i => i.section === sec);
        if (!its.length) return null;
        return (
          <div key={sec}>
            <div style={{fontSize:12,color:'#8e8e93',padding:'10px 0 4px',fontWeight:600,textTransform:'uppercase',letterSpacing:0.4}}>{sec}</div>
            {its.map(i => {
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
      <button onClick={copyText} style={{width:'100%',background:B,color:'#fff',border:'none',borderRadius:12,padding:14,fontSize:16,fontWeight:600,cursor:'pointer'}}>
        Copy to Clipboard
      </button>
    </div>
  );
}

// ─── Store Picker (for trip creation from Lists tab) ──────────────────────────
function StorePicker({ stores, onClose, onCreateTrip }) {
  const [step, setStep] = useState('pick'); // 'pick' | 'date'
  const [chosenStore, setChosenStore] = useState(null);
  const [tripDate, setTripDate] = useState(new Date().toISOString().slice(0,10));

  if (step === 'date' && chosenStore) {
    const store = stores.find(s=>s.id===chosenStore);
    return (
      <div style={{padding:'8px 16px 24px'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 0 16px'}}>
          <div style={{width:40,height:40,borderRadius:10,background:store.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{store.icon}</div>
          <span style={{fontSize:17,fontWeight:600,color:'#000'}}>{store.name}</span>
        </div>
        <div style={{fontSize:12,color:'#8e8e93',marginBottom:6,fontWeight:500,textTransform:'uppercase',letterSpacing:0.4}}>Trip Date</div>
        <input type="date" value={tripDate} onChange={e=>setTripDate(e.target.value)}
          style={{width:'100%',border:'1px solid #e5e5ea',borderRadius:10,padding:'10px 12px',fontSize:16,background:'#f2f2f7',outline:'none',marginBottom:16,boxSizing:'border-box'}} />
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setStep('pick')} style={{flex:1,background:'#f2f2f7',border:'none',borderRadius:10,padding:12,fontSize:15,cursor:'pointer',color:'#3c3c43'}}>Back</button>
          <button onClick={()=>{ onCreateTrip(chosenStore, tripDate); onClose(); }}
            style={{flex:2,background:B,color:'#fff',border:'none',borderRadius:10,padding:12,fontSize:15,fontWeight:600,cursor:'pointer'}}>
            Create Trip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{padding:'8px 0 16px'}}>
      <p style={{fontSize:13,color:'#8e8e93',margin:'0 16px 12px'}}>Choose a store to create a dated shopping trip.</p>
      <div style={{background:'#fff',borderRadius:0,overflow:'hidden'}}>
        {stores.map((store,i)=>(
          <div key={store.id}
            style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:i<stores.length-1?'0.5px solid #e5e5ea':'none',cursor:'pointer',background:'#fff'}}
            onPointerDown={e=>e.currentTarget.style.background='#f2f2f7'}
            onPointerUp={e=>{e.currentTarget.style.background='#fff'; setChosenStore(store.id); setStep('date');}}
            onPointerLeave={e=>e.currentTarget.style.background='#fff'}>
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
  const [editingStore, setEditingStore] = useState(null);
  const [showTripPicker, setShowTripPicker] = useState(false);

  const STORE_COLORS = ['#007AFF','#FF9500','#FF3B30','#34C759','#AF52DE','#FF2D55','#5AC8FA','#FF6B35'];
  const STORE_ICONS  = ['🛒','🏪','🏬','🍎','🥩','🥖','🏠','🔧'];

  function StoreForm({ store, onSave, onDelete }) {
    const blank = {id:uid(),name:'',color:STORE_COLORS[0],icon:'🛒',sections:[...DEFAULT_SECTIONS],items:[],trips:[],memory:{}};
    const [f,setF] = useState(store ? {...store} : blank);
    return (
      <div style={{padding:'8px 16px 24px'}}>
        <div style={{fontSize:12,color:'#8e8e93',marginBottom:4,fontWeight:500,textTransform:'uppercase',letterSpacing:0.4}}>Store Name</div>
        <input value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} placeholder="e.g. Costco Burnaby"
          style={{width:'100%',border:'1px solid #e5e5ea',borderRadius:10,padding:'9px 12px',fontSize:15,marginBottom:12,background:'#f2f2f7',outline:'none',boxSizing:'border-box'}} autoFocus />
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
        <button onClick={()=>{ if(!f.name.trim())return; onSave(f); }}
          style={{width:'100%',background:B,color:'#fff',border:'none',borderRadius:12,padding:14,fontSize:17,fontWeight:600,cursor:'pointer',marginBottom:10}}>
          {store?'Save Changes':'Add Store'}
        </button>
        {store && (
          <button onClick={()=>onDelete(store.id)}
            style={{width:'100%',background:'none',color:'#FF3B30',border:'1px solid #FF3B30',borderRadius:12,padding:12,fontSize:15,cursor:'pointer'}}>
            Delete Store
          </button>
        )}
      </div>
    );
  }

  if (editingStore !== null) {
    const existing = editingStore === 'new' ? null : stores.find(s=>s.id===editingStore);
    return (
      <div style={{background:'#f2f2f7',minHeight:'100vh'}}>
        <style>{GLOBAL_CSS}</style>
        <div style={{background:'#fff',padding:'56px 16px 12px',borderBottom:'0.5px solid #e5e5ea',position:'sticky',top:0,zIndex:10}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button onClick={()=>setEditingStore(null)} style={{background:'none',border:'none',color:B,fontSize:17,cursor:'pointer',padding:'4px 0'}}>‹ Back</button>
            <span style={{fontSize:17,fontWeight:600,flex:1,textAlign:'center'}}>{existing?'Edit Store':'New Store'}</span>
            <div style={{width:60}}/>
          </div>
        </div>
        <div style={{padding:'0 0 80px'}}>
          <StoreForm
            store={existing}
            onSave={s=>{ if(existing) onEditStore(s); else onAddStore(s); setEditingStore(null); }}
            onDelete={()=>{ onEditStore({...existing,_delete:true}); setEditingStore(null); }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{background:'#f2f2f7',minHeight:'100vh',display:'flex',flexDirection:'column'}}>
      <style>{GLOBAL_CSS}</style>
      {/* Header */}
      <div style={{background:'rgba(255,255,255,0.92)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',padding:'56px 16px 12px',borderBottom:'0.5px solid rgba(60,60,67,0.18)',position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:28,fontWeight:700,color:'#000',letterSpacing:-0.5}}>Lists</span>
          <button onClick={()=>setEditingStore('new')} style={{background:'none',border:'none',color:B,fontSize:28,cursor:'pointer',lineHeight:1,padding:'0 4px'}}>+</button>
        </div>
      </div>

      {/* Search bar */}
      <div style={{padding:'10px 16px 6px',background:'rgba(255,255,255,0.92)',borderBottom:'0.5px solid rgba(60,60,67,0.1)'}}>
        <div style={{background:'rgba(118,118,128,0.12)',borderRadius:10,display:'flex',alignItems:'center',padding:'7px 12px',gap:6}}>
          <span style={{color:'#8e8e93',fontSize:15}}>🔍</span>
          <span style={{color:'#8e8e93',fontSize:15}}>Search Lists</span>
        </div>
      </div>

      {/* Store list */}
      <div className="ios-scroll" style={{flex:1,overflowY:'auto',padding:'12px 16px',paddingBottom:90}}>
        <div style={{background:'#fff',borderRadius:12,overflow:'hidden'}}>
          {stores.map((store, i) => {
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
                    {remaining > 0 ? `${remaining} item${remaining!==1?'s':''} remaining` : 'No items remaining'}
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

      {/* Bottom tab bar */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,
        background:'rgba(255,255,255,0.92)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
        borderTop:'0.5px solid rgba(60,60,67,0.2)',padding:'8px 0',paddingBottom:'env(safe-area-inset-bottom,8px)',
        display:'flex',zIndex:100}}>
        {[
          {icon:'🛒',label:'Lists',action:()=>{}},
          {icon:'📅',label:'New Trip',action:()=>setShowTripPicker(true)},
          {icon:'🍽',label:'Recipes',action:()=>{}},
          {icon:'⚙️',label:'Settings',action:()=>{}},
        ].map(({icon,label,action},i)=>(
          <div key={label} onClick={action} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,opacity:i===0?1:0.5,cursor:'pointer'}}>
            <span style={{fontSize:22}}>{icon}</span>
            <span style={{fontSize:10,fontWeight:500,color:i===0?B:'#8e8e93'}}>{label}</span>
          </div>
        ))}
      </div>

      {/* Trip Picker Sheet */}
      <Sheet open={showTripPicker} onClose={()=>setShowTripPicker(false)} title="New Shopping Trip">
        <StorePicker stores={stores} onClose={()=>setShowTripPicker(false)} onCreateTrip={onCreateTrip} />
      </Sheet>
    </div>
  );
}

// ─── Trips Screen ─────────────────────────────────────────────────────────────
function TripsScreen({ store, onSave }) {
  const [trips, setTrips] = useState(store.trips);
  const [editing, setEditing] = useState(null);

  function saveTrip(t) {
    const updated = trips.find(x=>x.id===t.id) ? trips.map(x=>x.id===t.id?t:x) : [...trips,t];
    setTrips(updated);
    onSave(updated);
    setEditing(null);
  }
  function deleteTrip(id) {
    const updated = trips.filter(t=>t.id!==id);
    setTrips(updated);
    onSave(updated);
    setEditing(null);
  }
  function addTrip() {
    setEditing({id:uid(),label:`${store.name} — New Trip`,date:new Date().toISOString().slice(0,10)});
  }

  const inp = {width:'100%',border:'1px solid #e5e5ea',borderRadius:10,padding:'9px 12px',fontSize:15,background:'#f2f2f7',outline:'none',marginBottom:8,boxSizing:'border-box'};

  if (editing) {
    return (
      <div style={{padding:'8px 16px 24px'}}>
        <div style={{fontSize:12,color:'#8e8e93',marginBottom:4,fontWeight:500,textTransform:'uppercase',letterSpacing:0.4}}>Trip Name</div>
        <input style={inp} value={editing.label} onChange={e=>setEditing(p=>({...p,label:e.target.value}))} />
        <div style={{fontSize:12,color:'#8e8e93',marginBottom:4,fontWeight:500,textTransform:'uppercase',letterSpacing:0.4}}>Date</div>
        <input style={inp} type="date" value={editing.date} onChange={e=>setEditing(p=>({...p,date:e.target.value}))} />
        <div style={{display:'flex',gap:8,marginTop:4}}>
          <button onClick={()=>saveTrip(editing)} style={{flex:1,background:B,color:'#fff',border:'none',borderRadius:10,padding:'11px 0',fontSize:15,fontWeight:600,cursor:'pointer'}}>Save</button>
          <button onClick={()=>setEditing(null)} style={{flex:1,background:'#f2f2f7',border:'none',borderRadius:10,padding:'11px 0',fontSize:15,cursor:'pointer',color:'#3c3c43'}}>Cancel</button>
          {trips.find(t=>t.id===editing.id) && (
            <button onClick={()=>deleteTrip(editing.id)} style={{background:'none',border:'1px solid #FF3B30',borderRadius:10,padding:'11px 14px',fontSize:15,cursor:'pointer',color:'#FF3B30'}}>Delete</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{padding:'8px 16px 16px'}}>
      {trips.length === 0 && <p style={{textAlign:'center',color:'#8e8e93',fontSize:14,padding:'20px 0'}}>No trips scheduled yet.</p>}
      <div style={{background:'#fff',borderRadius:12,overflow:'hidden',marginBottom:12}}>
        {trips.map((t,i)=>(
          <div key={t.id} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 14px',borderBottom:i<trips.length-1?'0.5px solid #e5e5ea':'none'}}>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:600,color:'#000'}}>{t.label}</div>
              <div style={{fontSize:13,color:'#8e8e93'}}>{t.date}</div>
            </div>
            <span style={{color:store.color,fontSize:13,fontWeight:600}}>Est. ${totalCost(store.items).toFixed(2)}</span>
            <button onClick={()=>setEditing(t)}
              style={{background:'#f2f2f7',border:'none',borderRadius:8,padding:'5px 12px',fontSize:13,cursor:'pointer',color:'#3c3c43',fontWeight:500}}>
              Edit
            </button>
          </div>
        ))}
      </div>
      <button onClick={addTrip} style={{width:'100%',background:'none',border:'1.5px dashed #c7c7cc',borderRadius:12,padding:12,color:B,fontSize:15,cursor:'pointer',fontWeight:500}}>
        + Schedule New Trip
      </button>
    </div>
  );
}

// ─── Shopping List Screen ─────────────────────────────────────────────────────
const CHIP_FILTERS = [{k:'all',l:'All'},{k:'weekly',l:'Weekly'},{k:'sale',l:'On Sale'},{k:'watchlist',l:'Watch List'}];
const LIST_VIEWS = ['Active','All','Done'];

function ShoppingListScreen({ store, onBack, onUpdateStore }) {
  const [listView, setListView] = useState('Active');
  const [filter, setFilter] = useState('all');
  const [sheet, setSheet] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const nextId = useRef(Date.now());

  // Drag
  const holdTimer = useRef(null);
  const dragId = useRef(null);
  const isDragging = useRef(false);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  // Double-tap
  const tapCounts = useRef({});
  const tapTimers = useRef({});

  const items    = store.items;
  const sections = store.sections;

  function updateStore(patch) { onUpdateStore({...store, ...patch}); }

  function handleRowTap(id) {
    const cur = (tapCounts.current[id]||0)+1;
    tapCounts.current[id] = cur;
    clearTimeout(tapTimers.current[id]);
    if (cur >= 2) {
      tapCounts.current[id] = 0;
      updateStore({items: items.map(i=>i.id===id?{...i,bought:!i.bought}:i)});
    } else {
      tapTimers.current[id] = setTimeout(()=>{ tapCounts.current[id]=0; }, 380);
    }
  }

  function onPointerDown(e, id) {
    holdTimer.current = setTimeout(()=>{
      isDragging.current=true; dragId.current=id; setDraggingId(id);
      if(navigator.vibrate) navigator.vibrate(30);
    }, HOLD_MS);
  }
  function onPointerUp(e, id) {
    clearTimeout(holdTimer.current);
    if (isDragging.current) {
      if (dragOverId != null && dragOverId !== dragId.current) {
        const arr = [...items];
        const fi = arr.findIndex(i=>i.id===dragId.current);
        const ti = arr.findIndex(i=>i.id===dragOverId);
        if (fi>=0&&ti>=0) {
          const moved = {...arr[fi], section: arr[ti].section};
          arr.splice(fi,1); arr.splice(ti,0,moved);
          updateStore({items:arr});
        }
      }
      isDragging.current=false; dragId.current=null; setDraggingId(null); setDragOverId(null);
    }
  }
  function onPointerMove(e, id) { if(isDragging.current) setDragOverId(id); }
  function onPointerLeave() { clearTimeout(holdTimer.current); }

  const visibleItems = (() => {
    let base = items;
    if (listView==='Active') base = base.filter(i=>!i.bought);
    if (listView==='Done')   base = base.filter(i=>i.bought);
    if (filter==='weekly')   base = base.filter(i=>i.weekly);
    if (filter==='sale')     base = base.filter(i=>i.discount>0);
    if (filter==='watchlist')base = base.filter(i=>i.watch);
    return base;
  })();

  const remaining = items.filter(i=>!i.bought).length;
  const estTotal  = totalCost(items);

  function saveItem(data) {
    const isNew = !data.id || !items.find(i=>i.id===data.id);
    const saved = isNew
      ? {...data, id: nextId.current++, bought: false}
      : {...editingItem, ...data};
    const newItems = isNew
      ? [...items, saved]
      : items.map(i=>i.id===saved.id?saved:i);
    const newMemory = data.name.trim() ? {
      ...store.memory,
      [data.name.trim()]: {size:data.size||'',price:data.price||null,section:data.section,barcode:data.barcode||''}
    } : store.memory;
    updateStore({items:newItems, memory:newMemory});
    setSheet(null); setEditingItem(null);
  }

  function deleteItem(id) {
    updateStore({items:items.filter(i=>i.id!==id)});
    setSheet(null); setEditingItem(null);
  }

  // Quick add from inline bar
  function handleQuickAdd(newItem) {
    const newMemory = newItem.name.trim() ? {
      ...store.memory,
      [newItem.name.trim()]: {size:newItem.size||'',price:newItem.price||null,section:newItem.section,barcode:newItem.barcode||''}
    } : store.memory;
    updateStore({items:[...items, newItem], memory:newMemory});
  }

  // Open full edit from quick-add pencil
  function handleOpenEditFromQuick(partialItem) {
    setEditingItem(partialItem.id ? items.find(i=>i.id===partialItem.id) || null : null);
    // Pre-fill form with partial data
    setEditingItem(partialItem);
    setSheet('edit');
  }

  return (
    <div style={{background:'#f2f2f7',minHeight:'100vh',display:'flex',flexDirection:'column'}}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Sticky header ── */}
      <div style={{background:'rgba(255,255,255,0.96)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
        borderBottom:'0.5px solid rgba(60,60,67,0.18)',position:'sticky',top:0,zIndex:20}}>

        {/* Nav row */}
        <div style={{display:'flex',alignItems:'center',padding:'52px 12px 6px'}}>
          <button onClick={onBack} style={{background:'none',border:'none',color:B,fontSize:17,cursor:'pointer',padding:'4px 8px 4px 0',display:'flex',alignItems:'center',gap:2}}>
            <span style={{fontSize:20,lineHeight:1}}>‹</span> Lists
          </button>
          <div style={{flex:1,textAlign:'center'}}>
            <div style={{fontSize:17,fontWeight:600,color:'#000'}}>{store.icon} {store.name}</div>
            <div style={{fontSize:12,color:'#8e8e93'}}>{remaining} of {items.length} remaining</div>
          </div>
          <button onClick={()=>setSheet('export')} style={{background:'none',border:'none',color:B,fontSize:14,fontWeight:500,cursor:'pointer',padding:'4px 0 4px 8px'}}>Export</button>
        </div>

        {/* View selector + total — single row */}
        <div style={{display:'flex',alignItems:'center',padding:'4px 12px 6px',gap:8}}>
          <select value={listView} onChange={e=>setListView(e.target.value)}
            style={{border:'none',background:'none',color:B,fontSize:14,fontWeight:600,cursor:'pointer',outline:'none',padding:'2px 0',WebkitAppearance:'none',appearance:'none',
            backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23007AFF'/%3E%3C/svg%3E")`,
            backgroundRepeat:'no-repeat',backgroundPosition:'right 4px center',paddingRight:18}}>
            {LIST_VIEWS.map(v=><option key={v} value={v}>{v}</option>)}
          </select>
          <div style={{flex:1}}/>
          <span style={{fontSize:12,color:'#8e8e93'}}>Est.</span>
          <span style={{fontSize:15,fontWeight:700,color:store.color}}>${estTotal.toFixed(2)}</span>
        </div>

        {/* Chip filters */}
        <div style={{display:'flex',gap:6,padding:'0 12px 8px',overflowX:'auto'}}>
          {CHIP_FILTERS.map(f=>(
            <button key={f.k} onClick={()=>setFilter(f.k)} style={{
              border:filter===f.k?'none':'0.5px solid #c7c7cc',
              borderRadius:20,padding:'3px 10px',fontSize:12,fontWeight:500,
              background:filter===f.k?B:'none',
              color:filter===f.k?'#fff':'#3c3c43',
              cursor:'pointer',whiteSpace:'nowrap',flexShrink:0
            }}>{f.l}</button>
          ))}
        </div>

        {/* Quick Add bar */}
        <QuickAdd
          sections={sections}
          memory={store.memory}
          onQuickAdd={handleQuickAdd}
          onOpenEdit={handleOpenEditFromQuick}
        />
      </div>

      {/* ── Scrollable list — full width ── */}
      <div className="ios-scroll" style={{flex:1,overflowY:'auto',paddingBottom:72}}>
        {visibleItems.length === 0 && (
          <div style={{textAlign:'center',padding:'40px 24px',color:'#8e8e93',fontSize:15}}>
            {listView==='Done'?'Nothing checked off yet.\nDouble-tap any item to mark it done.':'No items — type above to add one.'}
          </div>
        )}

        {sections.map(sec => {
          const its = visibleItems.filter(i=>i.section===sec);
          if (!its.length) return null;
          return (
            <div key={sec}>
              {/* Section header — full width solid tile */}
              <div style={{
                background: store.color,
                padding:'5px 14px',
                display:'flex',alignItems:'center',justifyContent:'space-between',
              }}>
                <span style={{fontSize:12,fontWeight:700,color:'#fff',textTransform:'uppercase',letterSpacing:0.6}}>{sec}</span>
                <span style={{fontSize:11,color:'rgba(255,255,255,0.75)',fontWeight:500}}>{its.length}</span>
              </div>

              {/* Item rows */}
              {its.map((item,idx)=>{
                const eff = effectivePrice(item);
                const lineTotal = eff ? eff * item.qty : null;
                const isDrag = draggingId===item.id;
                const isOver = dragOverId===item.id && draggingId!==null;
                return (
                  <div key={item.id}
                    onPointerDown={e=>onPointerDown(e,item.id)}
                    onPointerUp={e=>onPointerUp(e,item.id)}
                    onPointerMove={e=>onPointerMove(e,item.id)}
                    onPointerLeave={onPointerLeave}
                    onClick={()=>{ if(!isDragging.current) handleRowTap(item.id); }}
                    style={{
                      background: isDrag?'#e5f0ff':isOver?'#f0f8ff':'#fff',
                      borderBottom: idx<its.length-1 ? '0.5px solid #e5e5ea' : 'none',
                      borderTop: isOver ? `2px solid ${B}` : '2px solid transparent',
                      padding:'7px 12px',
                      display:'flex',alignItems:'center',gap:8,
                      opacity: isDrag?0.6:1,
                      transform: isDrag?'scale(1.01)':'scale(1)',
                      transition:'transform 0.1s, opacity 0.1s',
                      touchAction:'none',userSelect:'none',cursor:'pointer',
                    }}>

                    {/* Drag handle */}
                    <span style={{color:'#d1d1d6',fontSize:14,flexShrink:0,cursor:'grab'}}>≡</span>

                    {/* Info */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{
                        fontSize:15,fontWeight:item.bought?400:500,
                        display:'flex',alignItems:'center',gap:5,flexWrap:'wrap',
                        textDecoration:item.bought?'line-through':'none',
                        color:item.bought?'#aeaeb2':'#000',
                      }}>
                        {item.name}
                        {item.qty>1 && <span style={{fontSize:12,color:'#8e8e93',fontWeight:400}}>×{item.qty}</span>}
                      </div>
                      {(item.size || item.discount || item.weekly || item.watch) && (
                        <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:1,alignItems:'center'}}>
                          {item.size && <span style={{fontSize:11,color:'#8e8e93'}}>{item.size}</span>}
                          <SaleTag item={item} />
                          {item.weekly && <Tag bg="#f3e5f5" color="#7b1fa2">weekly</Tag>}
                          {item.watch  && <Tag bg="#e3f2fd" color="#1565c0">watch</Tag>}
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    {item.price && (
                      <div style={{textAlign:'right',flexShrink:0,fontSize:13,fontWeight:500}}>
                        {item.discount>0 && (
                          <div style={{fontSize:10,color:'#aeaeb2',textDecoration:'line-through'}}>${(item.price*item.qty).toFixed(2)}</div>
                        )}
                        <span style={{color:item.discount?'#1a7a3a':(item.bought?'#aeaeb2':'#000')}}>
                          ${lineTotal.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {/* Edit */}
                    <button onClick={e=>{e.stopPropagation();setEditingItem(item);setSheet('edit');}}
                      style={{background:'none',border:'none',color:'#c7c7cc',fontSize:15,cursor:'pointer',flexShrink:0,padding:'2px 4px'}}>
                      ✏️
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Bottom tab bar */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,
        background:'rgba(255,255,255,0.92)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
        borderTop:'0.5px solid rgba(60,60,67,0.2)',
        display:'flex',padding:'8px 0',paddingBottom:'env(safe-area-inset-bottom,8px)',zIndex:10}}>
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
        <ItemForm key={editingItem?.id??'new'} item={editingItem?.id?editingItem:null}
          sections={sections} memory={store.memory} onSave={saveItem} onDelete={deleteItem} />
      </Sheet>

      <Sheet open={sheet==='sections'} onClose={()=>setSheet(null)} title="Sections">
        <SectionsManager
          sections={sections}
          onUpdate={secs=>updateStore({sections:secs})}
          onRemove={sec=>{ if(sections.length<=1)return; updateStore({sections:sections.filter(s=>s!==sec),items:items.map(i=>i.section===sec?{...i,section:sections[0]}:i)}); }}
          onAdd={sec=>{ if(!sec||sections.includes(sec))return; updateStore({sections:[...sections,sec]}); }}
        />
      </Sheet>

      <Sheet open={sheet==='trips'} onClose={()=>setSheet(null)} title="Shopping Trips">
        <TripsScreen store={store} onSave={trips=>updateStore({trips})} />
      </Sheet>

      <Sheet open={sheet==='export'} onClose={()=>setSheet(null)} title="Export List">
        <ExportView items={items} sections={sections} />
      </Sheet>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [stores, setStores] = useState(INITIAL_STORES);
  const [activeStoreId, setActiveStoreId] = useState(null);

  const activeStore = stores.find(s=>s.id===activeStoreId);

  function updateStore(updated) {
    if (updated._delete) {
      setStores(prev=>prev.filter(s=>s.id!==updated.id));
      setActiveStoreId(null);
    } else {
      setStores(prev=>prev.map(s=>s.id===updated.id?updated:s));
    }
  }

  function addStore(store) { setStores(prev=>[...prev, store]); }

  // Create a trip for a store from the Lists screen
  function createTrip(storeId, date) {
    setStores(prev=>prev.map(s=>{
      if (s.id !== storeId) return s;
      const label = `${s.name} — ${date.slice(5).replace('-','/')}`;
      return {...s, trips:[...s.trips, {id:uid(), label, date}]};
    }));
  }

  if (activeStore) {
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
