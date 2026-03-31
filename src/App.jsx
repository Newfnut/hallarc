import { useState, useRef, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

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

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

// ─── Household ID ─────────────────────────────────────────────────────────────
// Everyone who uses the same URL shares the same list.
// The household ID is stored in localStorage so it persists across refreshes.
// To share: just share the URL — the household ID is embedded as a URL param.

function getHouseholdId() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('h');
  if (fromUrl) {
    localStorage.setItem('householdId', fromUrl);
    return fromUrl;
  }
  let id = localStorage.getItem('householdId');
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    localStorage.setItem('householdId', id);
    // Update URL so sharing is easy
    const url = new URL(window.location.href);
    url.searchParams.set('h', id);
    window.history.replaceState({}, '', url.toString());
  }
  return id;
}

const HOUSEHOLD_ID = getHouseholdId();

// ─── Constants ───────────────────────────────────────────────────────────────

const BLUE = '#1a8cdb';
const HOLD_MS = 450;

const INITIAL_SECTIONS = [
  'Bakery','Produce','Frozen Foods','Dairy','Meat','Deli',
  'Grains, Pasta & Sides','Pantry','Beverages','Health & Beauty','Not Urgent'
];

const INITIAL_ITEMS = [
  {id:1,name:'Bread',qty:1,size:'',section:'Bakery',price:null,discount:0,saleEnd:'',weekly:false,watch:false,barcode:'',bought:false,photo:null},
  {id:2,name:'Bananas',qty:1,size:'',section:'Produce',price:1.99,discount:0,saleEnd:'',weekly:true,watch:false,barcode:'',bought:false,photo:null},
  {id:3,name:'Frozen Pineapple',qty:1,size:'',section:'Frozen Foods',price:11.49,discount:0,saleEnd:'',weekly:false,watch:false,barcode:'',bought:false,photo:null},
  {id:4,name:'Eggs Extra Large',qty:4,size:'',section:'Dairy',price:9.99,discount:0,saleEnd:'',weekly:true,watch:false,barcode:'',bought:false,photo:null},
  {id:5,name:'Greek Yogurt',qty:2,size:'1.36kg',section:'Dairy',price:8.99,discount:0,saleEnd:'',weekly:false,watch:false,barcode:'',bought:false,photo:null},
  {id:6,name:'Raspberry Jam',qty:2,size:'',section:'Grains, Pasta & Sides',price:8.99,discount:2,saleEnd:'2026-04-12',weekly:false,watch:false,barcode:'',bought:false,photo:null},
  {id:7,name:'Frozen Peas',qty:1,size:'',section:'Not Urgent',price:11.49,discount:0,saleEnd:'',weekly:false,watch:false,barcode:'',bought:false,photo:null},
  {id:8,name:'Cherry Juice',qty:2,size:'',section:'Not Urgent',price:12.99,discount:0,saleEnd:'',weekly:false,watch:false,barcode:'',bought:false,photo:null},
  {id:9,name:'Arugula',qty:1,size:'',section:'Not Urgent',price:null,discount:0,saleEnd:'',weekly:false,watch:true,barcode:'',bought:false,photo:null},
  {id:10,name:'Chicken Legs',qty:2,size:'',section:'Meat',price:null,discount:0,saleEnd:'',weekly:true,watch:false,barcode:'',bought:false,photo:null},
];

const INITIAL_TRIPS = [
  {id:1,label:'Costco — April 1',date:'2026-04-01'},
  {id:2,label:'Costco — April 16',date:'2026-04-16'},
];

const INITIAL_MEMORY = {
  Costco: {
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
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function effectivePrice(item) {
  if (!item.price) return null;
  return item.discount ? Math.max(0, item.price - item.discount) : item.price;
}

function totalCost(items) {
  return items.filter(i => i.price).reduce((s, i) => s + effectivePrice(i) * i.qty, 0);
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Tag({ color, bg, children }) {
  return (
    <span style={{background:bg,color,borderRadius:4,padding:'1px 6px',fontSize:11,fontWeight:500,whiteSpace:'nowrap'}}>
      {children}
    </span>
  );
}

function Toggle({ on, onToggle }) {
  return (
    <button onClick={onToggle} style={{
      width:44,height:26,borderRadius:13,border:'none',cursor:'pointer',flexShrink:0,
      background:on?BLUE:'#ccc',position:'relative',transition:'background 0.2s'
    }}>
      <span style={{
        position:'absolute',width:22,height:22,background:'#fff',borderRadius:'50%',
        top:2,left:on?20:2,transition:'left 0.2s'
      }}/>
    </button>
  );
}

function Modal({ open, onClose, title, rightAction, children }) {
  if (!open) return null;
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:200,
      display:'flex',alignItems:'flex-end',justifyContent:'center'
    }}>
      <div style={{
        background:'#fff',borderRadius:'16px 16px 0 0',width:'100%',maxWidth:480,
        maxHeight:'92vh',overflowY:'auto',paddingBottom:24
      }}>
        <div style={{
          display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'16px 16px 12px',borderBottom:'0.5px solid #eee',
          position:'sticky',top:0,background:'#fff',zIndex:1
        }}>
          <span style={{fontSize:16,fontWeight:600,color:'#111'}}>{title}</span>
          {rightAction}
        </div>
        {children}
      </div>
    </div>
  );
}

function SaleTag({ item }) {
  if (!item.discount) return null;
  const today = new Date();
  const end = item.saleEnd ? new Date(item.saleEnd) : null;
  const expiring = end && ((end - today) / 864e5 < 7);
  const endStr = item.saleEnd ? ' until ' + item.saleEnd.slice(5).replace('-','/') : '';
  return <Tag bg={expiring?'#fff3e0':'#e8f5e9'} color={expiring?'#e65100':'#2e7d32'}>-${item.discount.toFixed(2)}{endStr}</Tag>;
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
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t=>t.stop());
    };
  }, []);

  useEffect(() => {
    if (status !== 'scanning') return;
    if (!('BarcodeDetector' in window)) { setStatus('manual'); return; }
    const detector = new window.BarcodeDetector({
      formats: ['ean_13','ean_8','upc_a','upc_e','code_128','code_39']
    });
    let frame;
    async function detect() {
      if (videoRef.current?.readyState === 4) {
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            streamRef.current?.getTracks().forEach(t=>t.stop());
            lookupBarcode(codes[0].rawValue);
            return;
          }
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
      } else {
        onResult({ barcode: code, name: '', size: '' });
      }
    } catch {
      onResult({ barcode: code, name: '', size: '' });
    }
  }

  return (
    <div style={{padding:16}}>
      {(status==='starting'||status==='scanning') && (
        <>
          <div style={{borderRadius:10,overflow:'hidden',background:'#000',aspectRatio:'4/3',
            display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12}}>
            <video ref={videoRef} autoPlay playsInline muted style={{width:'100%',height:'100%',objectFit:'cover'}} />
          </div>
          <p style={{fontSize:13,color:'#888',textAlign:'center',marginBottom:12}}>
            {status==='starting'?'Starting camera…':'Point at a barcode to scan'}
          </p>
        </>
      )}
      {status==='looking' && <p style={{textAlign:'center',padding:32,color:'#888'}}>Looking up barcode…</p>}
      {status==='error'   && <p style={{textAlign:'center',color:'#c62828',marginBottom:12}}>Camera not available. Enter barcode manually.</p>}
      {(status==='manual'||status==='error'||status==='scanning') && (
        <div style={{marginTop:8}}>
          <p style={{fontSize:12,color:'#888',marginBottom:6}}>{status==='scanning'?'Or type it manually:':'Enter barcode:'}</p>
          <div style={{display:'flex',gap:8}}>
            <input value={manualCode} onChange={e=>setManualCode(e.target.value)}
              placeholder="e.g. 0123456789012"
              style={{flex:1,border:'0.5px solid #ddd',borderRadius:8,padding:'9px 12px',fontSize:15}} />
            <button onClick={()=>manualCode.trim()&&lookupBarcode(manualCode.trim())}
              style={{background:BLUE,color:'#fff',border:'none',borderRadius:8,padding:'0 14px',cursor:'pointer',fontSize:14,fontWeight:600}}>
              Look up
            </button>
          </div>
        </div>
      )}
      <button onClick={onClose} style={{width:'100%',marginTop:14,background:'none',border:'0.5px solid #ddd',
        borderRadius:10,padding:12,fontSize:15,cursor:'pointer',color:'#666'}}>
        Cancel
      </button>
    </div>
  );
}

// ─── Item Form ────────────────────────────────────────────────────────────────

function ItemForm({ item, sections, memory, onSave, onDelete }) {
  const blank = {name:'',qty:1,size:'',section:sections[0]||'',price:'',discount:'',saleEnd:'',weekly:false,watch:false,barcode:'',photo:null};
  const init = item ? {...item,price:item.price||'',discount:item.discount||'',saleEnd:item.saleEnd||''} : blank;
  const [f, setF] = useState(init);
  const [saleOn, setSaleOn] = useState(item ? item.discount > 0 : false);
  const [suggestions, setSuggestions] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const photoRef = useRef(null);

  const set = (k, v) => setF(p => ({...p, [k]: v}));

  function handleNameChange(val) {
    set('name', val);
    if (!val.trim()) { setSuggestions([]); return; }
    const matches = Object.keys(memory || {})
      .filter(k => k.toLowerCase().startsWith(val.toLowerCase()) && k.toLowerCase() !== val.toLowerCase());
    setSuggestions(matches.slice(0, 6));
  }

  function applySuggestion(name) {
    const mem = memory[name];
    setF(p => ({
      ...p, name,
      size:    mem.size    || p.size,
      price:   mem.price  != null ? mem.price : p.price,
      section: mem.section || p.section,
      barcode: mem.barcode || p.barcode,
    }));
    setSuggestions([]);
  }

  function handleBarcodeResult({ barcode, name, size }) {
    setShowScanner(false);
    setF(p => ({...p, barcode, name: name||p.name, size: size||p.size}));
    const memMatch = Object.entries(memory||{}).find(([,v])=>v.barcode===barcode);
    if (memMatch) applySuggestion(memMatch[0]);
  }

  function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set('photo', ev.target.result);
    reader.readAsDataURL(file);
  }

  function handleSave() {
    if (!f.name.trim()) return;
    onSave({
      ...f,
      qty: parseInt(f.qty)||1,
      price: parseFloat(f.price)||null,
      discount: saleOn ? (parseFloat(f.discount)||0) : 0,
      saleEnd: saleOn ? f.saleEnd : '',
    });
  }

  const inp = {width:'100%',border:'0.5px solid #ddd',borderRadius:8,padding:'9px 12px',
    fontSize:15,marginBottom:10,boxSizing:'border-box',color:'#222',background:'#fff'};

  if (showScanner) {
    return <BarcodeScanner onResult={handleBarcodeResult} onClose={()=>setShowScanner(false)} />;
  }

  return (
    <div style={{padding:'0 16px'}}>

      {/* Photo */}
      <div style={{marginTop:14,marginBottom:10}}>
        {f.photo ? (
          <div style={{position:'relative'}}>
            <img src={f.photo} alt="item" style={{width:'100%',maxHeight:180,objectFit:'cover',borderRadius:10,display:'block'}} />
            <button onClick={()=>set('photo',null)} style={{
              position:'absolute',top:6,right:6,background:'rgba(0,0,0,0.55)',color:'#fff',
              border:'none',borderRadius:'50%',width:28,height:28,cursor:'pointer',fontSize:16,lineHeight:'28px'
            }}>×</button>
          </div>
        ) : (
          <button onClick={()=>photoRef.current?.click()} style={{
            width:'100%',border:'0.5px dashed #ccc',borderRadius:10,padding:14,
            background:'#fafafa',color:'#888',fontSize:14,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:8
          }}>
            <span style={{fontSize:20}}>📷</span> Add Photo (optional)
          </button>
        )}
        <input ref={photoRef} type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={handlePhoto} />
      </div>

      {/* Name + autocomplete */}
      <div style={{fontSize:12,color:'#888',marginBottom:4}}>Item Name</div>
      <div style={{position:'relative'}}>
        <input style={inp} value={f.name} onChange={e=>handleNameChange(e.target.value)}
          placeholder="e.g. Greek Yogurt" autoFocus />
        {suggestions.length > 0 && (
          <div style={{position:'absolute',top:'calc(100% - 10px)',left:0,right:0,background:'#fff',
            border:'0.5px solid #ddd',borderRadius:8,zIndex:50,boxShadow:'0 4px 16px rgba(0,0,0,0.12)'}}>
            {suggestions.map(s => (
              <div key={s} onClick={()=>applySuggestion(s)} style={{
                padding:'10px 12px',fontSize:14,cursor:'pointer',
                borderBottom:'0.5px solid #f0f0f0',color:'#111',
                display:'flex',justifyContent:'space-between',alignItems:'center'
              }}
                onMouseEnter={e=>e.currentTarget.style.background='#f5f5f5'}
                onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                <span>{s}</span>
                {memory[s]?.price!=null && <span style={{color:'#888',fontSize:12}}>${memory[s].price.toFixed(2)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <div>
          <div style={{fontSize:12,color:'#888',marginBottom:4}}>Quantity</div>
          <input style={inp} type="number" min="1" value={f.qty} onChange={e=>set('qty',e.target.value)} />
        </div>
        <div>
          <div style={{fontSize:12,color:'#888',marginBottom:4}}>Package Size</div>
          <input style={inp} value={f.size} onChange={e=>set('size',e.target.value)} placeholder="e.g. 1.36kg" />
        </div>
      </div>

      <div style={{fontSize:12,color:'#888',marginBottom:4}}>Section</div>
      <select style={inp} value={f.section} onChange={e=>set('section',e.target.value)}>
        {sections.map(s=><option key={s} value={s}>{s}</option>)}
      </select>

      <div style={{fontSize:12,color:'#888',marginBottom:4}}>Price ($)</div>
      <input style={inp} type="number" step="0.01" value={f.price} onChange={e=>set('price',e.target.value)} placeholder="0.00" />

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'0.5px solid #eee'}}>
        <span style={{fontSize:14,color:'#222'}}>On Sale</span>
        <Toggle on={saleOn} onToggle={()=>setSaleOn(v=>!v)} />
      </div>
      {saleOn && (
        <div style={{background:'#f5f5f5',borderRadius:8,padding:'10px 12px',marginBottom:4,marginTop:8}}>
          <div style={{fontSize:12,color:'#888',marginBottom:4}}>Discount ($)</div>
          <input style={inp} type="number" step="0.01" value={f.discount} onChange={e=>set('discount',e.target.value)} placeholder="2.00" />
          <div style={{fontSize:12,color:'#888',marginBottom:4}}>Sale Ends</div>
          <input style={{...inp,marginBottom:0}} type="date" value={f.saleEnd} onChange={e=>set('saleEnd',e.target.value)} />
        </div>
      )}

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'0.5px solid #eee'}}>
        <span style={{fontSize:14,color:'#222'}}>Weekly / Regular Buy</span>
        <Toggle on={f.weekly} onToggle={()=>set('weekly',!f.weekly)} />
      </div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'0.5px solid #eee'}}>
        <span style={{fontSize:14,color:'#222'}}>Watch List (buy if on sale)</span>
        <Toggle on={f.watch} onToggle={()=>set('watch',!f.watch)} />
      </div>

      <div style={{fontSize:12,color:'#888',marginBottom:4,marginTop:10}}>Barcode</div>
      <div style={{display:'flex',gap:8,marginBottom:10}}>
        <input style={{...inp,marginBottom:0,flex:1}} value={f.barcode}
          onChange={e=>set('barcode',e.target.value)} placeholder="Scan or type" />
        <button onClick={()=>setShowScanner(true)} title="Scan barcode"
          style={{background:BLUE,color:'#fff',border:'none',borderRadius:8,
            padding:'0 14px',cursor:'pointer',fontSize:18,flexShrink:0}}>
          📷
        </button>
      </div>

      <button onClick={handleSave} style={{width:'100%',background:BLUE,color:'#fff',border:'none',
        borderRadius:10,padding:14,fontSize:16,fontWeight:600,cursor:'pointer',marginTop:6}}>
        Save Item
      </button>
      {item && (
        <button onClick={()=>onDelete(item.id)} style={{width:'100%',background:'none',color:'#c62828',
          border:'0.5px solid #c62828',borderRadius:10,padding:12,fontSize:15,cursor:'pointer',
          marginTop:8,marginBottom:4}}>
          Remove Item
        </button>
      )}
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

function ExportView({ items, sections }) {
  const unbought = items.filter(i => !i.bought);
  const grand = totalCost(unbought);

  function copyText() {
    let t = 'Costco Shopping List\n\n';
    sections.forEach(sec => {
      const its = unbought.filter(i => i.section === sec);
      if (!its.length) return;
      t += sec + '\n';
      its.forEach(i => {
        const p = effectivePrice(i);
        t += `  ${i.name}${i.qty>1?' x'+i.qty:''}${p?' $'+(p*i.qty).toFixed(2):''}\n`;
      });
      t += '\n';
    });
    t += 'Total: $' + grand.toFixed(2);
    navigator.clipboard.writeText(t).then(()=>alert('Copied!')).catch(()=>alert('Copy failed'));
  }

  return (
    <div style={{padding:'0 16px'}}>
      {sections.map(sec => {
        const its = unbought.filter(i => i.section === sec);
        if (!its.length) return null;
        return (
          <div key={sec}>
            <div style={{fontSize:12,color:'#888',padding:'10px 0 4px',fontWeight:600}}>{sec}</div>
            {its.map(i => {
              const p = effectivePrice(i);
              return (
                <div key={i.id} style={{display:'flex',justifyContent:'space-between',
                  padding:'7px 0',borderBottom:'0.5px solid #eee',fontSize:14}}>
                  <span style={{color:'#111'}}>{i.name}{i.qty>1?` ×${i.qty}`:''}</span>
                  <span style={{color:i.discount?'#2e7d32':'#111'}}>{p?'$'+(p*i.qty).toFixed(2):'—'}</span>
                </div>
              );
            })}
          </div>
        );
      })}
      <div style={{display:'flex',justifyContent:'space-between',padding:'14px 0',
        fontSize:16,fontWeight:700,borderTop:'1.5px solid #222',marginTop:8}}>
        <span>Estimated Total</span><span>${grand.toFixed(2)}</span>
      </div>
      <button onClick={copyText} style={{width:'100%',background:BLUE,color:'#fff',border:'none',
        borderRadius:10,padding:13,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:8}}>
        Copy to Clipboard
      </button>
    </div>
  );
}

// ─── Trip Edit Row ────────────────────────────────────────────────────────────

function TripEditRow({ trip, onSave, onDelete, onCancel }) {
  const [label, setLabel] = useState(trip.label);
  const [date, setDate]   = useState(trip.date);
  const inp = {border:'0.5px solid #ddd',borderRadius:8,padding:'7px 10px',
    fontSize:14,color:'#111',background:'#fff',width:'100%',boxSizing:'border-box'};
  return (
    <div style={{padding:'12px 16px',borderBottom:'0.5px solid #eee',background:'#f9f9f9'}}>
      <div style={{fontSize:12,color:'#888',marginBottom:4}}>Trip Name</div>
      <input style={{...inp,marginBottom:8}} value={label} onChange={e=>setLabel(e.target.value)} />
      <div style={{fontSize:12,color:'#888',marginBottom:4}}>Date</div>
      <input style={{...inp,marginBottom:10}} type="date" value={date} onChange={e=>setDate(e.target.value)} />
      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>onSave({...trip,label,date})} style={{flex:1,background:BLUE,color:'#fff',border:'none',borderRadius:8,padding:'9px 0',fontSize:14,fontWeight:600,cursor:'pointer'}}>Save</button>
        <button onClick={onCancel} style={{flex:1,background:'none',border:'0.5px solid #ddd',borderRadius:8,padding:'9px 0',fontSize:14,cursor:'pointer',color:'#555'}}>Cancel</button>
        <button onClick={()=>onDelete(trip.id)} style={{background:'none',border:'0.5px solid #c62828',borderRadius:8,padding:'9px 12px',fontSize:14,cursor:'pointer',color:'#c62828'}}>Delete</button>
      </div>
    </div>
  );
}

// ─── Share Modal ──────────────────────────────────────────────────────────────

function ShareModal({ onClose }) {
  const shareUrl = window.location.href;
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{padding:'16px'}}>
      <p style={{fontSize:14,color:'#444',marginBottom:12,lineHeight:1.5}}>
        Share this link with your household. Anyone with the link sees and edits the same list in real time.
      </p>
      <div style={{background:'#f5f5f5',borderRadius:8,padding:'10px 12px',
        fontSize:13,color:'#333',wordBreak:'break-all',marginBottom:12}}>
        {shareUrl}
      </div>
      <button onClick={copy} style={{width:'100%',background:BLUE,color:'#fff',border:'none',
        borderRadius:10,padding:13,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:8}}>
        {copied ? '✓ Copied!' : 'Copy Link'}
      </button>
      <button onClick={onClose} style={{width:'100%',background:'none',border:'0.5px solid #ddd',
        borderRadius:10,padding:12,fontSize:15,cursor:'pointer',color:'#666'}}>
        Done
      </button>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

const LIST_VIEWS = ['All','Active','Done'];
const CHIP_FILTERS = [{k:'all',l:'All'},{k:'weekly',l:'Weekly'},{k:'sale',l:'On Sale'},{k:'watchlist',l:'Watch List'}];

export default function App() {
  const [sections,   setSections]   = useState(INITIAL_SECTIONS);
  const [items,      setItems]      = useState(INITIAL_ITEMS);
  const [trips,      setTrips]      = useState(INITIAL_TRIPS);
  const [memory,     setMemory]     = useState(INITIAL_MEMORY);
  const [listView,   setListView]   = useState('Active');
  const [filter,     setFilter]     = useState('all');
  const [modal,      setModal]      = useState(null);
  const [editingItem,setEditingItem]= useState(null);
  const [editingTrip,setEditingTrip]= useState(null);
  const [newSection, setNewSection] = useState('');
  const [syncStatus, setSyncStatus] = useState('connecting'); // connecting | synced | error
  const nextId    = useRef(11);
  const storeName = 'Costco';
  const isSaving  = useRef(false);
  const isFirstLoad = useRef(true);

  // ── Firebase Auth + Real-time Sync ─────────────────────────────────────────
  useEffect(() => {
    signInAnonymously(auth).catch(() => setSyncStatus('error'));

    const docRef = doc(db, 'households', HOUSEHOLD_ID);

    const unsub = onSnapshot(docRef, (snap) => {
      if (isSaving.current) return; // ignore echoes of our own saves
      if (snap.exists()) {
        const data = snap.data();
        if (data.items)    setItems(data.items);
        if (data.sections) setSections(data.sections);
        if (data.trips)    setTrips(data.trips);
        if (data.memory)   setMemory(data.memory);
        if (data.nextId)   nextId.current = data.nextId;
        setSyncStatus('synced');
      } else {
        // First time — write initial data to Firestore
        saveToFirestore({
          items: INITIAL_ITEMS,
          sections: INITIAL_SECTIONS,
          trips: INITIAL_TRIPS,
          memory: INITIAL_MEMORY,
          nextId: 11,
        });
      }
      isFirstLoad.current = false;
    }, () => setSyncStatus('error'));

    return () => unsub();
  }, []);

  async function saveToFirestore(data) {
    isSaving.current = true;
    try {
      await setDoc(doc(db, 'households', HOUSEHOLD_ID), data, { merge: true });
      setSyncStatus('synced');
    } catch {
      setSyncStatus('error');
    }
    setTimeout(() => { isSaving.current = false; }, 500);
  }

  function persistItems(newItems) {
    setItems(newItems);
    saveToFirestore({ items: newItems });
  }

  function persistSections(newSections) {
    setSections(newSections);
    saveToFirestore({ sections: newSections });
  }

  function persistTrips(newTrips) {
    setTrips(newTrips);
    saveToFirestore({ trips: newTrips });
  }

  function persistMemory(newMemory) {
    setMemory(newMemory);
    saveToFirestore({ memory: newMemory });
  }

  // ── Double-tap to toggle bought ─────────────────────────────────────────
  const tapCounts = useRef({});
  const tapTimers = useRef({});

  function handleRowTap(id) {
    const cur = (tapCounts.current[id] || 0) + 1;
    tapCounts.current[id] = cur;
    clearTimeout(tapTimers.current[id]);
    if (cur >= 2) {
      tapCounts.current[id] = 0;
      const newItems = items.map(i => i.id === id ? {...i, bought: !i.bought} : i);
      persistItems(newItems);
    } else {
      tapTimers.current[id] = setTimeout(() => { tapCounts.current[id] = 0; }, 400);
    }
  }

  // ── Press-hold to drag ──────────────────────────────────────────────────
  const holdTimer   = useRef(null);
  const dragId      = useRef(null);
  const dragging    = useRef(false);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  function onPointerDown(e, id) {
    holdTimer.current = setTimeout(() => {
      dragging.current = true;
      dragId.current = id;
      setDraggingId(id);
      if (navigator.vibrate) navigator.vibrate(40);
    }, HOLD_MS);
  }

  function onPointerUp(e, id) {
    clearTimeout(holdTimer.current);
    if (dragging.current) {
      if (dragOverId != null && dragOverId !== dragId.current) {
        const arr = [...items];
        const fi = arr.findIndex(i => i.id === dragId.current);
        const ti = arr.findIndex(i => i.id === dragOverId);
        if (fi >= 0 && ti >= 0) {
          const moved = {...arr[fi], section: arr[ti].section};
          arr.splice(fi, 1);
          arr.splice(ti, 0, moved);
          persistItems(arr);
        }
      }
      dragging.current = false;
      dragId.current = null;
      setDraggingId(null);
      setDragOverId(null);
    }
  }

  function onPointerMove(e, id) {
    if (dragging.current) setDragOverId(id);
  }

  function onPointerLeave() {
    clearTimeout(holdTimer.current);
  }

  // ── Visible items ───────────────────────────────────────────────────────
  const visibleItems = (() => {
    let base = items;
    if (listView === 'Active') base = base.filter(i => !i.bought);
    if (listView === 'Done')   base = base.filter(i => i.bought);
    if (filter === 'weekly')    base = base.filter(i => i.weekly);
    if (filter === 'sale')      base = base.filter(i => i.discount > 0);
    if (filter === 'watchlist') base = base.filter(i => i.watch);
    return base;
  })();

  const remaining  = items.filter(i => !i.bought).length;
  const estTotal   = totalCost(items.filter(i => !i.bought));
  const storeMemory = memory[storeName] || {};

  // ── Save item + update memory ───────────────────────────────────────────
  function saveItem(data) {
    const saved = editingItem
      ? {...editingItem, ...data}
      : {...data, id: nextId.current++, bought: false};

    const newItems = editingItem
      ? items.map(i => i.id === editingItem.id ? saved : i)
      : [...items, saved];

    const newMemory = data.name.trim() ? {
      ...memory,
      [storeName]: {
        ...(memory[storeName] || {}),
        [data.name.trim()]: {
          size: data.size || '',
          price: data.price || null,
          section: data.section,
          barcode: data.barcode || '',
        }
      }
    } : memory;

    persistItems(newItems);
    persistMemory(newMemory);
    saveToFirestore({ nextId: nextId.current });

    setModal(null);
    setEditingItem(null);
  }

  function deleteItem(id) {
    const newItems = items.filter(i => i.id !== id);
    persistItems(newItems);
    setModal(null);
    setEditingItem(null);
  }

  function addSectionFn() {
    const v = newSection.trim();
    if (!v || sections.includes(v)) return;
    persistSections([...sections, v]);
    setNewSection('');
  }

  function removeSection(sec) {
    if (sections.length <= 1) return;
    persistSections(sections.filter(s => s !== sec));
    persistItems(items.map(i => i.section === sec ? {...i, section: sections[0]} : i));
  }

  function saveTrip(trip) {
    const newTrips = trips.map(t => t.id === trip.id ? trip : t);
    persistTrips(newTrips);
    setEditingTrip(null);
  }

  function addTrip() {
    const id = Date.now();
    const t = {id, label:'Costco — New Trip', date: new Date().toISOString().slice(0,10)};
    const newTrips = [...trips, t];
    persistTrips(newTrips);
    setEditingTrip(t);
  }

  function deleteTrip(id) {
    persistTrips(trips.filter(t => t.id !== id));
    setEditingTrip(null);
  }

  // Sync status indicator
  const syncDot = syncStatus === 'synced' ? '🟢' : syncStatus === 'error' ? '🔴' : '🟡';

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{maxWidth:480,margin:'0 auto',fontFamily:'system-ui,sans-serif',
      background:'#f4f4f4',minHeight:'100vh',display:'flex',flexDirection:'column'}}>

      {/* Top bar */}
      <div style={{background:'#fff',borderBottom:'0.5px solid #eee',
        padding:'12px 16px 10px',position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <div>
            <div style={{fontSize:17,fontWeight:700,color:'#111',display:'flex',alignItems:'center',gap:6}}>
              {storeName}
              <span title={syncStatus} style={{fontSize:10}}>{syncDot}</span>
            </div>
            <div style={{fontSize:12,color:'#888'}}>{remaining} of {items.length} items remaining</div>
          </div>
          <div style={{display:'flex',gap:4}}>
            <button onClick={()=>setModal('share')} style={{background:'none',border:'none',color:BLUE,fontSize:13,fontWeight:600,cursor:'pointer',padding:'4px 8px'}}>Share</button>
            <button onClick={()=>setModal('trips')} style={{background:'none',border:'none',color:BLUE,fontSize:13,fontWeight:600,cursor:'pointer',padding:'4px 8px'}}>Trips</button>
            <button onClick={()=>setModal('export')} style={{background:'none',border:'none',color:BLUE,fontSize:13,fontWeight:600,cursor:'pointer',padding:'4px 8px'}}>Export</button>
          </div>
        </div>
        <div onClick={()=>{setEditingItem(null);setModal('add');}} style={{
          display:'flex',alignItems:'center',gap:8,background:'#f5f5f5',
          borderRadius:8,padding:'9px 12px',cursor:'pointer',border:'0.5px solid #e0e0e0'
        }}>
          <span style={{color:BLUE,fontSize:20,lineHeight:1}}>+</span>
          <span style={{fontSize:14,color:'#888'}}>Add Item</span>
        </div>
      </div>

      {/* All / Active / Done tabs */}
      <div style={{display:'flex',background:'#fff',borderBottom:'0.5px solid #eee'}}>
        {LIST_VIEWS.map(v => (
          <button key={v} onClick={()=>setListView(v)} style={{
            flex:1,padding:'10px 0',border:'none',background:'none',cursor:'pointer',
            fontSize:13,fontWeight:600,
            color: listView===v ? BLUE : '#999',
            borderBottom: listView===v ? `2px solid ${BLUE}` : '2px solid transparent',
          }}>{v}</button>
        ))}
      </div>

      {/* Chip filters */}
      <div style={{display:'flex',gap:6,padding:'8px 16px',overflowX:'auto',
        background:'#fff',borderBottom:'0.5px solid #eee'}}>
        {CHIP_FILTERS.map(f => (
          <button key={f.k} onClick={()=>setFilter(f.k)} style={{
            border: filter===f.k ? 'none' : '0.5px solid #ccc',
            borderRadius:20,padding:'4px 12px',fontSize:12,
            background: filter===f.k ? BLUE : 'none',
            color: filter===f.k ? '#fff' : '#666',
            cursor:'pointer',whiteSpace:'nowrap',flexShrink:0
          }}>{f.l}</button>
        ))}
      </div>

      {/* Total bar */}
      <div style={{background:BLUE,color:'#fff',padding:'8px 16px',
        display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13}}>
        <span>Est. Total (active)</span>
        <strong style={{fontSize:15}}>${estTotal.toFixed(2)}</strong>
      </div>

      {/* List */}
      <div style={{flex:1,overflowY:'auto',paddingBottom:80}}>
        {syncStatus === 'connecting' && (
          <div style={{textAlign:'center',padding:'32px 24px',color:'#aaa',fontSize:14}}>
            Connecting to your list…
          </div>
        )}
        {syncStatus !== 'connecting' && visibleItems.length === 0 && (
          <div style={{textAlign:'center',padding:'52px 24px',color:'#aaa',fontSize:15}}>
            {listView==='Done'
              ? 'Nothing checked off yet.\nDouble-tap any item to mark it done.'
              : 'No items here — tap + Add Item to start.'}
          </div>
        )}
        {sections.map(sec => {
          const its = visibleItems.filter(i => i.section === sec);
          if (!its.length) return null;
          return (
            <div key={sec}>
              <div style={{background:BLUE,color:'#fff',padding:'7px 16px',fontSize:13,fontWeight:600}}>{sec}</div>
              {its.map(item => {
                const eff = effectivePrice(item);
                const lineTotal = eff ? eff * item.qty : null;
                const isDrag = draggingId === item.id;
                const isOver = dragOverId === item.id && draggingId !== null;
                return (
                  <div
                    key={item.id}
                    onPointerDown={e => onPointerDown(e, item.id)}
                    onPointerUp={e => onPointerUp(e, item.id)}
                    onPointerMove={e => onPointerMove(e, item.id)}
                    onPointerLeave={onPointerLeave}
                    onClick={() => { if (!dragging.current) handleRowTap(item.id); }}
                    style={{
                      background: isDrag ? '#e3f2fd' : isOver ? '#f0f8ff' : '#fff',
                      borderBottom: isOver ? `2px solid ${BLUE}` : '0.5px solid #eee',
                      padding:'11px 16px',
                      display:'flex',alignItems:'center',gap:10,
                      opacity: isDrag ? 0.5 : 1,
                      touchAction:'none',
                      userSelect:'none',
                      cursor: dragging.current ? 'grabbing' : 'pointer',
                    }}
                  >
                    <span style={{color:'#ccc',fontSize:16,flexShrink:0}}>⠿</span>

                    <div style={{
                      width:24,height:24,borderRadius:'50%',flexShrink:0,
                      border:`1.5px solid ${item.bought?BLUE:'#ccc'}`,
                      background: item.bought ? BLUE : 'none',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      color:'#fff',fontSize:13,pointerEvents:'none'
                    }}>
                      {item.bought ? '✓' : ''}
                    </div>

                    <div style={{flex:1,minWidth:0}}>
                      <div style={{
                        fontSize:15,fontWeight:600,
                        display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',
                        textDecoration: item.bought ? 'line-through' : 'none',
                        color: item.bought ? '#aaa' : '#111',
                      }}>
                        {item.name}
                        {item.qty > 1 && <span style={{fontSize:12,color:'#999',fontWeight:400}}>({item.qty})</span>}
                      </div>
                      <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:2,alignItems:'center'}}>
                        {item.size && <span style={{fontSize:12,color:'#888'}}>{item.size}</span>}
                        <SaleTag item={item} />
                        {item.weekly && <Tag bg="#f3e5f5" color="#6a1b9a">weekly</Tag>}
                        {item.watch  && <Tag bg="#e3f2fd" color="#1565c0">watchlist</Tag>}
                      </div>
                    </div>

                    {item.price && (
                      <div style={{textAlign:'right',flexShrink:0,fontSize:14,fontWeight:600}}>
                        {item.discount > 0 && (
                          <div style={{fontSize:11,color:'#bbb',textDecoration:'line-through'}}>
                            ${(item.price*item.qty).toFixed(2)}
                          </div>
                        )}
                        <span style={{color:item.discount?'#2e7d32':(item.bought?'#aaa':'#111')}}>
                          ${lineTotal.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <button
                      onClick={e=>{e.stopPropagation();setEditingItem(item);setModal('edit');}}
                      style={{background:'none',border:'none',color:'#ccc',fontSize:16,
                        cursor:'pointer',flexShrink:0,padding:'4px',lineHeight:1}}>
                      ✏️
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Bottom nav */}
      <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',
        width:'100%',maxWidth:480,background:'#fff',borderTop:'0.5px solid #eee',
        display:'flex',padding:'8px 0 12px',zIndex:10}}>
        {[['☰','List',null],['📅','Trips','trips'],['⚙️','Sections','sections']].map(([icon,label,v])=>(
          <button key={label} onClick={()=>setModal(v)} style={{
            flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,
            background:'none',border:'none',cursor:'pointer',
            color: modal===v ? BLUE : '#999',fontSize:10
          }}>
            <span style={{fontSize:20}}>{icon}</span>{label}
          </button>
        ))}
      </div>

      {/* Share */}
      <Modal open={modal==='share'} onClose={()=>setModal(null)} title="Share List"
        rightAction={<button onClick={()=>setModal(null)} style={{background:'none',border:'none',fontSize:24,cursor:'pointer',color:'#999',lineHeight:1}}>×</button>}>
        <ShareModal onClose={()=>setModal(null)} />
      </Modal>

      {/* Add/Edit Item */}
      <Modal open={modal==='add'||modal==='edit'} onClose={()=>{setModal(null);setEditingItem(null);}}
        title={editingItem?'Edit Item':'Add Item'}
        rightAction={
          <button onClick={()=>{setModal(null);setEditingItem(null);}}
            style={{background:'none',border:'none',color:BLUE,fontSize:15,fontWeight:600,cursor:'pointer'}}>
            Done
          </button>
        }>
        <ItemForm
          key={editingItem?.id ?? 'new'}
          item={editingItem}
          sections={sections}
          memory={storeMemory}
          onSave={saveItem}
          onDelete={deleteItem}
        />
      </Modal>

      {/* Trips */}
      <Modal open={modal==='trips'} onClose={()=>{setModal(null);setEditingTrip(null);}} title="Shopping Trips"
        rightAction={<button onClick={()=>setModal(null)} style={{background:'none',border:'none',fontSize:24,cursor:'pointer',color:'#999',lineHeight:1}}>×</button>}>
        <div>
          {trips.map(t => (
            editingTrip?.id === t.id
              ? <TripEditRow key={t.id} trip={t} onSave={saveTrip} onDelete={deleteTrip} onCancel={()=>setEditingTrip(null)} />
              : (
                <div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                  padding:'12px 16px',borderBottom:'0.5px solid #eee'}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:600,color:'#111'}}>{t.label}</div>
                    <div style={{fontSize:12,color:'#888'}}>{t.date}</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{color:BLUE,fontSize:13}}>Est. ${estTotal.toFixed(2)}</span>
                    <button onClick={()=>setEditingTrip(t)}
                      style={{background:'none',border:'0.5px solid #ddd',borderRadius:6,
                        padding:'4px 10px',fontSize:12,cursor:'pointer',color:'#555'}}>
                      Edit
                    </button>
                  </div>
                </div>
              )
          ))}
          <button onClick={addTrip} style={{margin:12,background:'none',border:'0.5px dashed #ccc',
            borderRadius:10,padding:12,width:'calc(100% - 24px)',color:BLUE,fontSize:14,cursor:'pointer'}}>
            + Schedule New Trip
          </button>
        </div>
      </Modal>

      {/* Export */}
      <Modal open={modal==='export'} onClose={()=>setModal(null)} title="Export List"
        rightAction={<button onClick={()=>setModal(null)} style={{background:'none',border:'none',fontSize:24,cursor:'pointer',color:'#999',lineHeight:1}}>×</button>}>
        <ExportView items={items} sections={sections} />
      </Modal>

      {/* Sections */}
      <Modal open={modal==='sections'} onClose={()=>setModal(null)} title="Manage Sections"
        rightAction={<button onClick={()=>setModal(null)} style={{background:'none',border:'none',fontSize:24,cursor:'pointer',color:'#999',lineHeight:1}}>×</button>}>
        <div style={{padding:'0 16px'}}>
          {sections.map(sec => (
            <div key={sec} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
              padding:'10px 0',borderBottom:'0.5px solid #eee'}}>
              <span style={{fontSize:14,color:'#111'}}>{sec}</span>
              <button onClick={()=>removeSection(sec)}
                style={{background:'none',border:'none',color:'#c62828',fontSize:13,cursor:'pointer'}}>
                Remove
              </button>
            </div>
          ))}
          <div style={{marginTop:12}}>
            <div style={{fontSize:12,color:'#888',marginBottom:4}}>New Section Name</div>
            <input value={newSection} onChange={e=>setNewSection(e.target.value)}
              placeholder="e.g. Electronics"
              style={{width:'100%',border:'0.5px solid #ddd',borderRadius:8,padding:'9px 12px',
                fontSize:15,boxSizing:'border-box',marginBottom:8}} />
            <button onClick={addSectionFn} style={{width:'100%',background:BLUE,color:'#fff',border:'none',
              borderRadius:10,padding:12,fontSize:15,fontWeight:600,cursor:'pointer'}}>
              Add Section
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
