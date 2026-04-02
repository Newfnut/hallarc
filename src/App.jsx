import { useState, useRef, useEffect } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ─── Firebase ────────────────────────────────────────────────────────────────
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

// ─── Constants ───────────────────────────────────────────────────────────────
const B       = '#007AFF';
const HOLD_MS = 420;

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

const CATEGORY_KEYWORDS = {
  'Produce':              ['apple','banana','orange','strawberr','blueberr','grape','lemon','lime','avocado','tomato','spinach','arugula','kale','lettuce','broccoli','cauliflower','carrot','celery','cucumber','pepper','mushroom','onion','garlic','potato','sweet potato','corn','zucchini','asparagus','mango','pineapple','peach','plum','pear','berry','berries','ginger','beet','radish','leek','shallot','fennel','cabbage','brussels','artichoke','eggplant','squash','cantaloupe','watermelon','melon','cilantro','parsley','basil','mint','thyme','rosemary','dill','chive'],
  'Dairy':                ['milk','cheese','butter','cream','yogurt','egg','sour cream','cheddar','mozzarella','parmesan','brie','feta','gouda','ricotta','cottage','half and half','whipping'],
  'Meat':                 ['chicken','beef','turkey','pork','steak','bacon','sausage','ham','lamb','veal','bison','venison','ground','roast','rib','loin','filet','pepperoni','salami','prosciutto'],
  'Deli':                 ['deli','cold cut','hot dog','wiener','bologna','pastrami','corned beef','rotisserie','sliced'],
  'Bakery':               ['bread','sourdough','bagel','muffin','croissant','bun','roll','loaf','cake','pie','donut','cookie','pastry','pita','tortilla','naan','crumpet','baguette'],
  'Frozen Foods':         ['frozen','ice cream','popsicle','pizza','edamame'],
  'Beverages':            ['juice','water','coffee','tea','soda','pop','lemonade','kombucha','sparkling','energy drink','beer','wine','cider','oat milk','almond milk','soy milk'],
  'Grains, Pasta & Sides':['pasta','rice','quinoa','oatmeal','cereal','granola','bread crumb','noodle','couscous','barley','lentil','oat','flour','cornmeal','grits','polenta','cracker','pretzel','chip'],
  'Pantry':               ['oil','vinegar','sauce','ketchup','mustard','mayo','salsa','peanut butter','jam','honey','maple','syrup','spice','salt','pepper','sugar','baking','vanilla','yeast','cocoa','broth','stock','soup','can','canned','jar','condiment','dressing','seasoning','hot sauce','soy sauce','worcestershire','pickle','olive','relish','capers'],
  'Health & Beauty':      ['shampoo','conditioner','body wash','toothpaste','deodorant','soap','lotion','sunscreen','vitamin','supplement','medicine','advil','tylenol','razor','floss','mouthwash','toilet paper','paper towel','tissue','tampon','pad','bandage','laundry','dish soap','detergent','cleaner','spray','bleach','zip lock','bag','wrap','foil','saran'],
};

function guessSection(name, sections) {
  if (!name?.trim()) return '';
  const lower = name.toLowerCase();
  for (const [section, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (!sections.includes(section)) continue;
    if (keywords.some(kw => lower.includes(kw))) return section;
  }
  return '';
}

const INITIAL_STORES = [
  {
    id:'s1', name:'Costco Langley', color:'#007AFF', icon:'🛒',
    sections:[...DEFAULT_SECTIONS],
    items:[
      {id:1,name:'Bread',qty:1,size:'',section:'Bakery',price:null,discount:0,saleEnd:'',weekly:false,watch:false,barcode:'',bought:false},
      {id:2,name:'Bananas',qty:1,size:'',section:'Produce',price:1.99,discount:0,saleEnd:'',weekly:true,watch:false,barcode:'',bought:false},
      {id:3,name:'Frozen Pineapple',qty:1,size:'',section:'Frozen Foods',price:11.49,discount:0,saleEnd:'',weekly:false,watch:false,barcode:'',bought:false},
      {id:4,name:'Eggs Extra Large',qty:4,size:'',section:'Dairy',price:9.99,discount:0,saleEnd:'',weekly:true,watch:false,barcode:'',bought:false},
      {id:5,name:'Greek Yogurt',qty:2,size:'1.36kg',section:'Dairy',price:8.99,discount:0,saleEnd:'',weekly:false,watch:false,barcode:'',bought:false},
    ],
    memory:{}
  },
  {
    id:'s2', name:'Superstore', color:'#FF9500', icon:'🏪',
    sections:[...DEFAULT_SECTIONS],
    items:[
      {id:101,name:'Milk 3.25%',qty:2,size:'4L',section:'Dairy',price:6.99,discount:0,saleEnd:'',weekly:true,watch:false,barcode:'',bought:false},
      {id:102,name:'Sourdough',qty:1,size:'',section:'Bakery',price:4.49,discount:0,saleEnd:'',weekly:false,watch:false,barcode:'',bought:false},
    ],
    memory:{}
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function effectivePrice(item) {
  if (!item.price) return null;
  if (item.discount && item.saleEnd) {
    const today = new Date(); today.setHours(0,0,0,0);
    const end   = new Date(item.saleEnd); end.setHours(0,0,0,0);
    if (end < today) return item.price;
  }
  return item.discount ? Math.max(0, item.price - item.discount) : item.price;
}
function totalCost(items) {
  return items.filter(i=>i.price&&!i.bought&&i.section!=='Not Urgent').reduce((s,i)=>s+effectivePrice(i)*i.qty,0);
}
function uid() { return Math.random().toString(36).slice(2)+Date.now().toString(36); }
function stripExpiredSales(items) {
  const today=new Date(); today.setHours(0,0,0,0);
  return items.map(item=>{
    if(item.discount&&item.saleEnd){const end=new Date(item.saleEnd);end.setHours(0,0,0,0);if(end<today)return{...item,discount:0,saleEnd:''};}
    return item;
  });
}
function exportToCSV(items,sections,storeName) {
  const rows=[['Store','Section','Item','Qty','Size','Regular Price','Discount','Sale Price','Line Total','Weekly','On Sale','Watch','Barcode']];
  sections.forEach(sec=>items.filter(i=>!i.bought&&i.section===sec).forEach(item=>{
    const eff=effectivePrice(item);
    rows.push([storeName,sec,item.name,item.qty,item.size||'',item.price!=null?item.price.toFixed(2):'',item.discount?item.discount.toFixed(2):'',eff!=null?eff.toFixed(2):'',eff!=null?(eff*item.qty).toFixed(2):'',item.weekly?'Yes':'',item.discount>0?'Yes':'',item.watch?'Yes':'',item.barcode||'']);
  }));
  const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=`${storeName.replace(/\s+/g,'-')}-grocery-list.csv`;a.click();
  URL.revokeObjectURL(url);
}

// ─── Global CSS ───────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  *,*::before,*::after { -webkit-tap-highlight-color:transparent; box-sizing:border-box; }
  html {
    height:100%; margin:0; padding:0;
    overflow:hidden; overflow-x:hidden;
    max-width:100vw;
  }
  body {
    height:100%; margin:0; padding:0;
    overflow:hidden; overflow-x:hidden;
    max-width:100vw;
    background:#f2f2f7;
    font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif;
  }
  #root { height:100%; width:100vw; max-width:100vw; overflow:hidden; }
  input,select,button,textarea { font-family:inherit; }
  ::-webkit-scrollbar { display:none; }
  .ios-scroll { -webkit-overflow-scrolling:touch; overflow-y:auto; overscroll-behavior-y:contain; }
  @keyframes slideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
  .sheet { animation:slideUp 0.3s cubic-bezier(0.32,0.72,0,1); }
  .fade  { animation:fadeIn 0.18s ease; }
  .swipe-row     { position:relative; overflow:hidden; width:100%; contain:layout; }
  .swipe-content { will-change:transform; transition:none; width:100%; display:block; }
  .swipe-content.snapping { transition:transform 0.2s cubic-bezier(0.34,1,0.64,1); }
  .swipe-del {
    position:absolute; right:0; top:0; bottom:0;
    width:22vw; min-width:78px;
    background:#FF3B30;
    display:flex; align-items:center; justify-content:center;
    color:#fff; font-size:13px; font-weight:600;
    flex-direction:column; gap:2px; cursor:pointer;
  }
  .swipe-chk {
    position:absolute; left:0; top:0; bottom:0;
    width:22vw; min-width:78px;
    background:#34C759;
    display:flex; align-items:center; justify-content:center;
    color:#fff; font-size:13px; font-weight:600;
    flex-direction:column; gap:2px;
  }
  .drag-ghost {
    position:fixed; pointer-events:none; z-index:9999;
    opacity:0.9; border-radius:12px;
    box-shadow:0 10px 32px rgba(0,0,0,0.25);
    background:#fff; left:0; top:0;
    transform-origin:center center;
  }
  input:-webkit-autofill,input:-webkit-autofill:hover,input:-webkit-autofill:focus {
    -webkit-text-fill-color:#000 !important;
    -webkit-box-shadow:0 0 0 1000px #f2f2f7 inset !important;
    transition:background-color 5000s ease-in-out 0s;
  }
`;

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Tag({bg,color,children}){
  return <span style={{background:bg,color,borderRadius:4,padding:'1px 5px',fontSize:10,fontWeight:600,letterSpacing:0.2,whiteSpace:'nowrap'}}>{children}</span>;
}
function Toggle({on,onToggle}){
  return(
    <button onClick={onToggle} style={{width:46,height:28,borderRadius:14,border:'none',cursor:'pointer',flexShrink:0,background:on?'#34C759':'#e5e5ea',position:'relative',transition:'background 0.2s',padding:0}}>
      <span style={{position:'absolute',width:24,height:24,background:'#fff',borderRadius:'50%',top:2,left:on?20:2,transition:'left 0.2s cubic-bezier(0.34,1.56,0.64,1)',boxShadow:'0 2px 5px rgba(0,0,0,0.2)'}}/>
    </button>
  );
}
function Sheet({open,onClose,title,children,height='92vh'}){
  if(!open) return null;
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} className="fade"
      style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:300,display:'flex',alignItems:'flex-end'}}>
      <div className="sheet" style={{background:'#fff',borderRadius:'13px 13px 0 0',width:'100%',maxHeight:height,display:'flex',flexDirection:'column',paddingBottom:'env(safe-area-inset-bottom,16px)'}}>
        <div style={{display:'flex',justifyContent:'center',padding:'10px 0 0'}}>
          <div style={{width:36,height:5,borderRadius:3,background:'#d1d1d6'}}/>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 16px 10px',borderBottom:'0.5px solid #e5e5ea',flexShrink:0}}>
          <span style={{fontSize:17,fontWeight:600,color:'#000'}}>{title}</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:B,fontSize:17,cursor:'pointer',padding:'0 0 0 8px'}}>Done</button>
        </div>
        <div className="ios-scroll" style={{flex:1,minHeight:0,overflowY:'auto'}}>{children}</div>
      </div>
    </div>
  );
}
function SaleTag({item}){
  if(!item.discount) return null;
  const today=new Date(); today.setHours(0,0,0,0);
  const end=item.saleEnd?new Date(item.saleEnd):null;
  if(end) end.setHours(0,0,0,0);
  const expired=end&&end<today;
  const expiring=!expired&&end&&((end-today)/864e5<7);
  const endStr=item.saleEnd?' '+item.saleEnd.slice(5).replace('-','/'):'';
  if(expired) return <Tag bg="#f2f2f7" color="#aeaeb2">sale ended</Tag>;
  return <Tag bg={expiring?'#fff3e0':'#e8f5e9'} color={expiring?'#C1440E':'#1a7a3a'}>-${item.discount.toFixed(2)}{endStr}</Tag>;
}

// ─── SwipeRow ─────────────────────────────────────────────────────────────────
function SwipeRow({children,onDelete,onToggleBought,bought}){
  const rowRef=useRef(null);
  const startX=useRef(null);
  const curX=useRef(0);
  const [rev,setRev]=useState(null);
  const W=()=>Math.max(78,Math.round(window.innerWidth*0.22));
  function c(){return rowRef.current?.querySelector('.swipe-content');}
  function snapTo(px){const el=c();if(!el)return;el.classList.add('snapping');el.style.transform=px===0?'translateX(0)':`translateX(${px}px)`;}
  function snapBack(){snapTo(0);setRev(null);}
  function ts(e){startX.current=e.touches[0].clientX;curX.current=0;c()?.classList.remove('snapping');}
  function tm(e){
    if(startX.current===null)return;
    const dx=e.touches[0].clientX-startX.current;curX.current=dx;
    const el=c();if(!el)return;
    el.style.transform=`translateX(${Math.max(-W(),Math.min(W(),dx))}px)`;
    setRev(dx<-10?'delete':dx>10?'check':null);
  }
  function te(){
    const dx=curX.current,w=W();
    if(dx>55){snapTo(0);setRev(null);onToggleBought();}
    else if(dx<-(w*0.55)){snapTo(-w);setRev('delete');}
    else snapBack();
    startX.current=null;curX.current=0;
  }
  function del(e){e.stopPropagation();e.preventDefault();snapTo(-window.innerWidth);setTimeout(onDelete,180);}
  return(
    <div ref={rowRef} className="swipe-row" onTouchStart={ts} onTouchMove={tm} onTouchEnd={te} onTouchCancel={()=>{snapBack();startX.current=null;}}>
      <div className="swipe-chk" style={{opacity:rev==='check'?1:0,transition:'opacity 0.1s'}}>
        <span style={{fontSize:22}}>{bought?'↩':'✓'}</span><span>{bought?'Undo':'Done'}</span>
      </div>
      <div className="swipe-del"
        onTouchEnd={rev==='delete'?del:undefined} onClick={rev==='delete'?del:undefined}
        style={{opacity:rev==='delete'?1:0,transition:'opacity 0.1s',pointerEvents:rev==='delete'?'auto':'none'}}>
        <span style={{fontSize:24}}>🗑</span><span>Delete</span>
      </div>
      <div className="swipe-content" onClick={()=>rev==='delete'&&snapBack()}>{children}</div>
    </div>
  );
}

// ─── useTouchDrag ─────────────────────────────────────────────────────────────
// Long-press (~420ms) activates drag. Ghost follows finger. Drops on release.
// touch-action:none on each item prevents scroll conflict.
function useTouchDrag({onReorder}){
  const dragIdx   = useRef(null);
  const ghostEl   = useRef(null);
  const itemEls   = useRef({});   // key -> DOM el
  const holdTimer = useRef(null);
  const lastOver  = useRef(null);
  const [dragging,setDragging] = useState(null);
  const [overIdx, setOverIdx]  = useState(null);

  function reg(key,el){ itemEls.current[key]=el; }

  function mkGhost(srcEl){
    if(!srcEl) return;
    const r=srcEl.getBoundingClientRect();
    const g=document.createElement('div');
    g.className='drag-ghost';
    g.style.width=r.width+'px';
    g.style.height=r.height+'px';
    g.style.transform=`translate(${r.left}px,${r.top}px) scale(1.04)`;
    // Clone the visual content by copying HTML — keeps styling
    g.innerHTML=srcEl.innerHTML;
    document.body.appendChild(g);
    ghostEl.current=g;
  }
  function mvGhost(cx,cy){
    const g=ghostEl.current; if(!g) return;
    const w=parseFloat(g.style.width),h=parseFloat(g.style.height);
    g.style.transform=`translate(${cx-w/2}px,${cy-h/2}px) scale(1.04)`;
  }
  function rmGhost(){ghostEl.current?.remove();ghostEl.current=null;}

  function nearestKey(cy){
    let best=null,bd=Infinity;
    Object.entries(itemEls.current).forEach(([k,el])=>{
      if(!el) return;
      const r=el.getBoundingClientRect();
      const d=Math.abs(cy-(r.top+r.height/2));
      if(d<bd){bd=d;best=k;}
    });
    return best;
  }

  function handlers(key){
    return {
      elRef:(el)=>reg(key,el),
      onTouchStart(e){
        holdTimer.current=setTimeout(()=>{
          dragIdx.current=key;
          setDragging(key);
          mkGhost(itemEls.current[key]);
          if(navigator.vibrate) navigator.vibrate(40);
        },HOLD_MS);
      },
      onTouchMove(e){
        clearTimeout(holdTimer.current);
        if(dragIdx.current===null) return;
        e.preventDefault();
        const t=e.touches[0];
        mvGhost(t.clientX,t.clientY);
        const ov=nearestKey(t.clientY);
        if(ov!==lastOver.current){lastOver.current=ov;setOverIdx(ov);}
      },
      onTouchEnd(){
        clearTimeout(holdTimer.current);
        if(dragIdx.current===null) return;
        const from=dragIdx.current, to=lastOver.current;
        if(to!==null&&to!==from) onReorder(from,to);
        dragIdx.current=null;lastOver.current=null;
        rmGhost();setDragging(null);setOverIdx(null);
      },
      onTouchCancel(){
        clearTimeout(holdTimer.current);
        dragIdx.current=null;lastOver.current=null;
        rmGhost();setDragging(null);setOverIdx(null);
      },
    };
  }
  return {handlers,dragging,overIdx};
}

// ─── ItemForm ─────────────────────────────────────────────────────────────────
function ItemForm({item,sections,memory,onSave,onDelete,defaultFilter}){
  const notUrgent=sections.includes('Not Urgent')?'Not Urgent':sections[sections.length-1]||'';
  const blank={name:'',qty:1,size:'',section:defaultFilter==='watchlist'?notUrgent:'',price:'',discount:'',saleEnd:'',weekly:defaultFilter==='weekly',watch:defaultFilter==='watchlist',barcode:''};
  const init=item?{...item,price:item.price??'',discount:item.discount||'',saleEnd:item.saleEnd||''}:blank;
  const [f,setF]=useState(init);
  const [saleOn,setSaleOn]=useState(item?item.discount>0:defaultFilter==='sale');
  const [secOpen,setSecOpen]=useState(false);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));

  function handleNameChange(val){
    set('name',val);
    if(!item){const g=guessSection(val,sections);if(g)set('section',g);}
  }
  function handleSave(){
    if(!f.name.trim()) return;
    let disc=saleOn?(parseFloat(f.discount)||0):0,end=saleOn?f.saleEnd:'';
    if(disc&&end){const t=new Date();t.setHours(0,0,0,0);const e=new Date(end);e.setHours(0,0,0,0);if(e<t){disc=0;end='';}}
    onSave({...f,qty:parseInt(f.qty)||1,price:parseFloat(f.price)||null,discount:disc,saleEnd:end});
  }

  const row={display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderBottom:'0.5px solid #f0f0f5',background:'#fff'};
  const lbl={fontSize:14,color:'#000',display:'flex',alignItems:'center',gap:8};

  return(
    <div style={{paddingBottom:20}}>
      {/* Name hero */}
      <div style={{background:'#fff',borderRadius:12,margin:'10px 14px',padding:'12px',display:'flex',alignItems:'flex-start',gap:10,boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
        <div style={{flex:1,minWidth:0}}>
          <input value={f.name} onChange={e=>handleNameChange(e.target.value)}
            placeholder="Item name" autoFocus={!item}
            autoComplete="off" autoCorrect="off" autoCapitalize="words" spellCheck="false"
            style={{width:'100%',border:'none',outline:'none',fontSize:18,fontWeight:600,color:'#000',background:'transparent',padding:0,marginBottom:3}}/>
          <input value={f.size} onChange={e=>set('size',e.target.value)}
            placeholder="Size / note  (e.g. 1.36 kg)" autoComplete="off"
            style={{width:'100%',border:'none',outline:'none',fontSize:13,color:B,background:'transparent',padding:0}}/>
        </div>
        <button onClick={()=>set('watch',!f.watch)} style={{background:'none',border:'none',cursor:'pointer',padding:4,fontSize:20,opacity:f.watch?1:0.25,flexShrink:0}}>★</button>
      </div>

      <div style={{margin:'8px 14px 4px',fontSize:11,color:'#8e8e93',fontWeight:600,textTransform:'uppercase',letterSpacing:0.5}}>Info</div>
      <div style={{background:'#fff',borderRadius:12,margin:'0 14px',overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
        {/* Category */}
        <div style={row} onClick={()=>setSecOpen(o=>!o)}>
          <div style={lbl}><span style={{fontSize:18}}>🗂</span><span>Category</span></div>
          <div style={{fontSize:14,color:f.section?'#8e8e93':'#FF3B30',display:'flex',alignItems:'center',gap:4}}>
            <span>{f.section||'Pick one'}</span>
            <span style={{color:'#c7c7cc',fontSize:12}}>{secOpen?'▲':'▶'}</span>
          </div>
        </div>
        {secOpen&&(
          <div style={{background:'#f9f9f9',borderBottom:'0.5px solid #e5e5ea',maxHeight:185,overflowY:'auto'}}>
            {sections.map(s=>(
              <div key={s} onClick={()=>{set('section',s);setSecOpen(false);}}
                style={{padding:'9px 14px 9px 44px',fontSize:14,color:f.section===s?B:'#000',borderBottom:'0.5px solid #f2f2f7',fontWeight:f.section===s?600:400,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                {s}{f.section===s&&<span style={{color:B}}>✓</span>}
              </div>
            ))}
          </div>
        )}
        {/* Quantity */}
        <div style={row}>
          <div style={lbl}><span style={{fontSize:18}}>🔢</span><span>Quantity</span></div>
          <div style={{display:'flex',alignItems:'center'}}>
            <button onClick={()=>set('qty',Math.max(1,(parseInt(f.qty)||1)-1))} style={{width:30,height:30,borderRadius:'50%',background:'#e5e5ea',border:'none',cursor:'pointer',fontSize:17,display:'flex',alignItems:'center',justifyContent:'center',color:'#3c3c43'}}>−</button>
            <span style={{fontSize:16,fontWeight:600,color:'#000',minWidth:26,textAlign:'center'}}>{f.qty}</span>
            <button onClick={()=>set('qty',(parseInt(f.qty)||1)+1)} style={{width:30,height:30,borderRadius:'50%',background:B,border:'none',cursor:'pointer',fontSize:17,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff'}}>+</button>
          </div>
        </div>
        {/* Price — inline input */}
        <div style={row}>
          <div style={lbl}><span style={{fontSize:18}}>💰</span><span>Price</span></div>
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            <span style={{fontSize:14,color:'#8e8e93'}}>$</span>
            <input type="number" step="0.01" value={f.price} onChange={e=>set('price',e.target.value)}
              placeholder="0.00" inputMode="decimal"
              style={{width:72,border:'1px solid #e5e5ea',borderRadius:8,padding:'5px 8px',fontSize:14,background:'#f9f9f9',outline:'none',textAlign:'right'}}/>
          </div>
        </div>
        {/* Barcode — inline input, no camera */}
        <div style={{...row,borderBottom:'none'}}>
          <div style={lbl}><span style={{fontSize:18}}>▋▋</span><span>Barcode</span></div>
          <input value={f.barcode} onChange={e=>set('barcode',e.target.value)}
            placeholder="Enter number" inputMode="numeric" autoComplete="off"
            style={{width:140,border:'1px solid #e5e5ea',borderRadius:8,padding:'5px 8px',fontSize:13,background:'#f9f9f9',outline:'none',textAlign:'right'}}/>
        </div>
      </div>

      <div style={{margin:'10px 14px 4px',fontSize:11,color:'#8e8e93',fontWeight:600,textTransform:'uppercase',letterSpacing:0.5}}>Options</div>
      <div style={{background:'#fff',borderRadius:12,margin:'0 14px',overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
        {[['🏷','On Sale',saleOn,()=>setSaleOn(v=>!v)],['🔁','Weekly / Regular Buy',f.weekly,()=>set('weekly',!f.weekly)],['★','Watch List',f.watch,()=>set('watch',!f.watch)]].map(([icon,label,val,toggle],i,arr)=>(
          <div key={label} style={{...row,borderBottom:i<arr.length-1?'0.5px solid #f0f0f5':'none'}}>
            <div style={lbl}><span style={{fontSize:18}}>{icon}</span><span>{label}</span></div>
            <Toggle on={val} onToggle={toggle}/>
          </div>
        ))}
        {saleOn&&(
          <div style={{background:'#f9f9f9',padding:'8px 14px 10px',borderTop:'0.5px solid #e5e5ea'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div>
                <div style={{fontSize:10,color:'#8e8e93',fontWeight:600,textTransform:'uppercase',letterSpacing:0.4,marginBottom:3}}>Discount</div>
                <div style={{display:'flex',alignItems:'center',gap:3}}>
                  <span style={{color:'#8e8e93',fontSize:13}}>-$</span>
                  <input type="number" step="0.01" value={f.discount} onChange={e=>set('discount',e.target.value)} placeholder="0.00" inputMode="decimal"
                    style={{flex:1,border:'1px solid #e5e5ea',borderRadius:7,padding:'6px 7px',fontSize:13,background:'#fff',outline:'none'}}/>
                </div>
              </div>
              <div>
                <div style={{fontSize:10,color:'#8e8e93',fontWeight:600,textTransform:'uppercase',letterSpacing:0.4,marginBottom:3}}>Sale Ends</div>
                <input type="date" value={f.saleEnd} onChange={e=>set('saleEnd',e.target.value)}
                  style={{width:'100%',border:'1px solid #e5e5ea',borderRadius:7,padding:'6px 7px',fontSize:13,background:'#fff',outline:'none',boxSizing:'border-box'}}/>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{padding:'14px 14px 0'}}>
        <button onClick={handleSave} style={{width:'100%',background:B,color:'#fff',border:'none',borderRadius:12,padding:13,fontSize:16,fontWeight:600,cursor:'pointer',marginBottom:8,boxShadow:'0 2px 8px rgba(0,122,255,0.28)'}}>
          {item?'Save Changes':'Add Item'}
        </button>
        {item&&<button onClick={()=>onDelete(item.id)} style={{width:'100%',background:'none',color:'#FF3B30',border:'1px solid #FF3B30',borderRadius:12,padding:11,fontSize:14,cursor:'pointer'}}>Remove Item</button>}
      </div>
    </div>
  );
}

// ─── QuickAdd ─────────────────────────────────────────────────────────────────
function QuickAdd({sections,memory,onQuickAdd,onOpenEdit,activeFilter,estTotal,storeColor}){
  const [query,setQuery]=useState('');
  const [focused,setFocused]=useState(false);
  const inputRef=useRef(null);
  const notUrgent=sections.includes('Not Urgent')?'Not Urgent':sections[sections.length-1]||'';

  const suggestions=!query.trim()?[]:[...new Set([...Object.keys(memory||{}),...COMMON_ITEMS])].filter(n=>n.toLowerCase().includes(query.toLowerCase())&&n.toLowerCase()!==query.toLowerCase()).slice(0,8);

  function buildItem(name,mem){
    return{id:Date.now(),name,qty:1,size:mem?.size||'',section:activeFilter==='watchlist'?notUrgent:(mem?.section||guessSection(name,sections)||sections[0]||''),price:mem?.price||null,discount:0,saleEnd:'',weekly:activeFilter==='weekly',watch:activeFilter==='watchlist',barcode:mem?.barcode||'',bought:false};
  }
  function quickAdd(name){onQuickAdd(buildItem(name,(memory||{})[name]));setQuery('');setFocused(false);inputRef.current?.blur();}

  return(
    <div style={{position:'relative',zIndex:50}}>
      <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',background:'#fff',borderBottom:'0.5px solid #e5e5ea'}}>
        <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)}
          onFocus={()=>setFocused(true)} onBlur={()=>setTimeout(()=>setFocused(false),150)}
          onKeyDown={e=>{if(e.key==='Enter'&&query.trim())quickAdd(query.trim());if(e.key==='Escape'){setQuery('');inputRef.current?.blur();}}}
          placeholder="Add item…" autoComplete="off" autoCorrect="off" spellCheck="false"
          style={{flex:1,border:'none',outline:'none',fontSize:15,color:'#000',background:'transparent',padding:'4px 0',minWidth:0}}/>
        {query.trim()
          ?<button onClick={()=>{setQuery('');inputRef.current?.focus();}} style={{background:'none',border:'none',color:'#8e8e93',fontSize:18,cursor:'pointer',padding:'0 2px',flexShrink:0}}>✕</button>
          :<button onClick={()=>onOpenEdit({id:null,name:'',qty:1,size:'',section:'',price:'',discount:'',saleEnd:'',weekly:activeFilter==='weekly',watch:activeFilter==='watchlist',barcode:''})}
            style={{background:B,color:'#fff',border:'none',borderRadius:8,width:30,height:30,cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>+</button>}
        <span style={{color:'#e5e5ea',fontSize:15,flexShrink:0}}>|</span>
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',flexShrink:0}}>
          <span style={{fontSize:9,color:'#8e8e93',lineHeight:1}}>Est.</span>
          <span style={{fontSize:13,fontWeight:700,color:storeColor||B,lineHeight:1.2}}>${estTotal.toFixed(2)}</span>
        </div>
      </div>
      {focused&&query.trim().length>0&&(
        <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',borderBottom:'0.5px solid #e5e5ea',boxShadow:'0 4px 16px rgba(0,0,0,0.10)',zIndex:60,maxHeight:280,overflowY:'auto'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderBottom:'0.5px solid #f2f2f7',cursor:'pointer'}}
            onPointerDown={e=>{e.preventDefault();quickAdd(query.trim());}}>
            <span style={{fontSize:15,color:B,fontWeight:500}}>Add "{query.trim()}"</span>
            <button onPointerDown={e=>{e.stopPropagation();e.preventDefault();onOpenEdit({id:null,name:query.trim(),qty:1,size:'',section:guessSection(query.trim(),sections)||'',price:'',discount:'',saleEnd:'',weekly:activeFilter==='weekly',watch:activeFilter==='watchlist',barcode:''});setQuery('');setFocused(false);}} style={{background:'none',border:'none',cursor:'pointer',padding:'4px 6px',fontSize:15,color:'#c7c7cc'}}>✏️</button>
          </div>
          {suggestions.map(name=>{
            const mem=(memory||{})[name];
            return(
              <div key={name} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 14px',borderBottom:'0.5px solid #f2f2f7',cursor:'pointer'}}
                onPointerDown={e=>{e.preventDefault();quickAdd(name);}}>
                <div style={{display:'flex',alignItems:'center',gap:7,flex:1,minWidth:0}}>
                  <span style={{fontSize:13,color:mem?'#8e8e93':'#c7c7cc'}}>{mem?'🗂':'📋'}</span>
                  <span style={{fontSize:15,color:'#000'}}>{name}</span>
                  {mem?.price&&<span style={{fontSize:12,color:'#8e8e93'}}>${mem.price.toFixed(2)}</span>}
                  {mem?.size&&<span style={{fontSize:11,color:'#c7c7cc'}}>{mem.size}</span>}
                </div>
                <button onPointerDown={e=>{e.stopPropagation();e.preventDefault();onOpenEdit({id:null,name,qty:1,size:mem?.size||'',section:mem?.section||guessSection(name,sections)||'',price:mem?.price||'',discount:'',saleEnd:'',weekly:activeFilter==='weekly',watch:activeFilter==='watchlist',barcode:mem?.barcode||''});setQuery('');setFocused(false);}} style={{background:'none',border:'none',cursor:'pointer',padding:'4px 6px',fontSize:15,color:'#c7c7cc',flexShrink:0}}>✏️</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── SectionsManager ──────────────────────────────────────────────────────────
function SectionsManager({sections,onUpdate,onRemove,onAdd}){
  const [newSec,setNewSec]=useState('');
  const [editIdx,setEditIdx]=useState(null);
  const [editVal,setEditVal]=useState('');
  const {handlers,dragging,overIdx}=useTouchDrag({
    onReorder:(from,to)=>{
      const arr=[...sections];const[m]=arr.splice(from,1);arr.splice(to,0,m);onUpdate(arr);
    }
  });
  function saveRename(i){
    if(!editVal.trim()||editVal.trim()===sections[i]){setEditIdx(null);return;}
    const arr=[...sections];arr[i]=editVal.trim();onUpdate(arr);setEditIdx(null);
  }
  return(
    <div style={{padding:'0 14px 16px'}}>
      <p style={{fontSize:12,color:'#8e8e93',margin:'8px 0 12px'}}>Hold & drag to reorder · Tap name to rename</p>
      <div style={{background:'#fff',borderRadius:12,overflow:'hidden',marginBottom:12}}>
        {sections.map((sec,i)=>{
          const h=handlers(i);
          return(
            <div key={sec} ref={h.elRef}
              onTouchStart={h.onTouchStart} onTouchMove={h.onTouchMove} onTouchEnd={h.onTouchEnd} onTouchCancel={h.onTouchCancel}
              style={{display:'flex',alignItems:'center',gap:8,padding:'9px 12px',borderBottom:i<sections.length-1?'0.5px solid #e5e5ea':'none',borderTop:overIdx===i&&dragging!==null&&dragging!==i?`2px solid ${B}`:'2px solid transparent',background:dragging===i?'#f0f6ff':'#fff',opacity:dragging===i?0.45:1,touchAction:'none',userSelect:'none'}}>
              <span style={{color:'#c7c7cc',fontSize:17,flexShrink:0}}>≡</span>
              {editIdx===i
                ?<input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)} onBlur={()=>saveRename(i)} onKeyDown={e=>{if(e.key==='Enter')saveRename(i);if(e.key==='Escape')setEditIdx(null);}} style={{flex:1,border:'1px solid '+B,borderRadius:7,padding:'4px 8px',fontSize:14,outline:'none'}}/>
                :<span onClick={()=>{setEditIdx(i);setEditVal(sec);}} style={{flex:1,fontSize:14,color:'#000',cursor:'text'}}>{sec}</span>}
              <button onClick={()=>onRemove(sec)} style={{background:'none',border:'none',color:'#FF3B30',fontSize:12,cursor:'pointer',padding:'2px 4px',flexShrink:0}}>✕</button>
            </div>
          );
        })}
      </div>
      <div style={{fontSize:11,color:'#8e8e93',marginBottom:5,fontWeight:600,textTransform:'uppercase',letterSpacing:0.4}}>New Section</div>
      <div style={{display:'flex',gap:8}}>
        <input value={newSec} onChange={e=>setNewSec(e.target.value)} placeholder="e.g. Aisle 5 – Canned Goods" autoComplete="off"
          onKeyDown={e=>{if(e.key==='Enter'&&newSec.trim()){onAdd(newSec.trim());setNewSec('');}}}
          style={{flex:1,border:'1px solid #e5e5ea',borderRadius:10,padding:'8px 12px',fontSize:14,background:'#f2f2f7',outline:'none'}}/>
        <button onClick={()=>{if(newSec.trim()){onAdd(newSec.trim());setNewSec('');}}} style={{background:B,color:'#fff',border:'none',borderRadius:10,padding:'0 14px',cursor:'pointer',fontSize:14,fontWeight:600}}>Add</button>
      </div>
    </div>
  );
}

// ─── ExportView ───────────────────────────────────────────────────────────────
function ExportView({items,sections,storeName}){
  const ub=items.filter(i=>!i.bought);
  const grand=totalCost(ub.map(i=>({...i,bought:false})));
  function copyText(){
    let t=`Shopping List — ${storeName}\n\n`;
    sections.forEach(sec=>{const its=ub.filter(i=>i.section===sec);if(!its.length)return;t+=sec+'\n';its.forEach(i=>{const p=effectivePrice(i);t+=`  ${i.name}${i.qty>1?' x'+i.qty:''}${p?' $'+(p*i.qty).toFixed(2):''}\n`;});t+='\n';});
    t+='Total: $'+grand.toFixed(2);
    navigator.clipboard.writeText(t).then(()=>alert('Copied!')).catch(()=>alert('Copy failed'));
  }
  return(
    <div style={{padding:'8px 16px 16px'}}>
      {sections.map(sec=>{const its=ub.filter(i=>i.section===sec);if(!its.length)return null;return(
        <div key={sec}>
          <div style={{fontSize:11,color:'#8e8e93',padding:'8px 0 3px',fontWeight:600,textTransform:'uppercase',letterSpacing:0.4}}>{sec}</div>
          {its.map(i=>{const p=effectivePrice(i);return(
            <div key={i.id} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'0.5px solid #e5e5ea',fontSize:14}}>
              <span style={{color:'#000'}}>{i.name}{i.qty>1?` ×${i.qty}`:''}</span>
              <span style={{color:i.discount?'#1a7a3a':'#000'}}>{p?'$'+(p*i.qty).toFixed(2):'—'}</span>
            </div>
          );})}
        </div>
      );})}
      <div style={{display:'flex',justifyContent:'space-between',padding:'12px 0',fontSize:16,fontWeight:700,borderTop:'1px solid #000',marginTop:6}}>
        <span>Estimated Total</span><span>${grand.toFixed(2)}</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:4}}>
        <button onClick={copyText} style={{background:'#f2f2f7',color:'#000',border:'none',borderRadius:12,padding:13,fontSize:14,fontWeight:600,cursor:'pointer'}}>📋 Copy</button>
        <button onClick={()=>exportToCSV(ub,sections,storeName)} style={{background:B,color:'#fff',border:'none',borderRadius:12,padding:13,fontSize:14,fontWeight:600,cursor:'pointer'}}>📊 CSV</button>
      </div>
    </div>
  );
}

// ─── StoreListScreen ──────────────────────────────────────────────────────────
const STORE_COLORS=['#007AFF','#FF9500','#FF3B30','#34C759','#AF52DE','#FF2D55','#5AC8FA','#FF6B35'];
const STORE_ICONS=['🛒','🏪','🏬','🍎','🥩','🥖','🏠','🔧'];

function StoreListScreen({stores,onSelectStore,onAddStore,onEditStore}){
  const [editingStore,setEditingStore]=useState(null);
  const [storeOrder,setStoreOrder]=useState(()=>stores.map(s=>s.id));

  useEffect(()=>{
    setStoreOrder(prev=>{
      const ids=stores.map(s=>s.id);
      return[...prev.filter(id=>ids.includes(id)),...ids.filter(id=>!prev.includes(id))];
    });
  },[stores]);

  const ordered=storeOrder.map(id=>stores.find(s=>s.id===id)).filter(Boolean);

  const {handlers,dragging,overIdx}=useTouchDrag({
    onReorder:(from,to)=>{
      const arr=[...storeOrder];const[m]=arr.splice(from,1);arr.splice(to,0,m);setStoreOrder(arr);
    }
  });

  function StoreForm({store,onSave,onDelete}){
    const blank={id:uid(),name:'',color:STORE_COLORS[0],icon:'🛒',sections:[...DEFAULT_SECTIONS],items:[],memory:{}};
    const [f,setF]=useState(store?{...store}:blank);
    return(
      <div style={{padding:'8px 16px 24px'}}>
        <div style={{fontSize:11,color:'#8e8e93',marginBottom:4,fontWeight:600,textTransform:'uppercase',letterSpacing:0.4}}>Store Name</div>
        <input value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} placeholder="e.g. Costco Burnaby"
          autoComplete="off" autoCorrect="off" autoCapitalize="words" spellCheck="false" autoFocus
          style={{width:'100%',border:'1px solid #e5e5ea',borderRadius:10,padding:'9px 12px',fontSize:15,marginBottom:12,background:'#f2f2f7',outline:'none',boxSizing:'border-box',color:'#000'}}/>
        <div style={{fontSize:11,color:'#8e8e93',marginBottom:5,fontWeight:600,textTransform:'uppercase',letterSpacing:0.4}}>Color</div>
        <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
          {STORE_COLORS.map(c=><button key={c} onClick={()=>setF(p=>({...p,color:c}))} style={{width:32,height:32,borderRadius:'50%',background:c,border:`3px solid ${f.color===c?'#000':'transparent'}`,cursor:'pointer',padding:0}}/>)}
        </div>
        <div style={{fontSize:11,color:'#8e8e93',marginBottom:5,fontWeight:600,textTransform:'uppercase',letterSpacing:0.4}}>Icon</div>
        <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
          {STORE_ICONS.map(ic=><button key={ic} onClick={()=>setF(p=>({...p,icon:ic}))} style={{width:40,height:40,borderRadius:10,background:f.icon===ic?'#e5e5ea':'#f2f2f7',border:'none',cursor:'pointer',fontSize:20}}>{ic}</button>)}
        </div>
        <button onClick={()=>{if(!f.name.trim())return;onSave(f);}} style={{width:'100%',background:B,color:'#fff',border:'none',borderRadius:12,padding:13,fontSize:16,fontWeight:600,cursor:'pointer',marginBottom:10}}>{store?'Save Changes':'Add Store'}</button>
        {store&&<button onClick={()=>onDelete(store.id)} style={{width:'100%',background:'none',color:'#FF3B30',border:'1px solid #FF3B30',borderRadius:12,padding:11,fontSize:14,cursor:'pointer'}}>Delete Store</button>}
      </div>
    );
  }

  if(editingStore!==null){
    const existing=editingStore==='new'?null:stores.find(s=>s.id===editingStore);
    return(
      <div style={{background:'#f2f2f7',height:'100%',width:'100vw',display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <style>{GLOBAL_CSS}</style>
        <div style={{background:'#fff',padding:'0 16px 10px',borderBottom:'0.5px solid #e5e5ea',flexShrink:0,paddingTop:'calc(env(safe-area-inset-top,0px) + 10px)'}}>
          <div style={{display:'flex',alignItems:'center',paddingTop:6}}>
            <button onClick={()=>setEditingStore(null)} style={{background:'none',border:'none',color:B,fontSize:17,cursor:'pointer',padding:'4px 0'}}>‹ Back</button>
            <span style={{fontSize:17,fontWeight:600,flex:1,textAlign:'center'}}>{existing?'Edit Store':'New Store'}</span>
            <div style={{width:56}}/>
          </div>
        </div>
        <div className="ios-scroll" style={{flex:1,minHeight:0,overflowY:'auto',paddingBottom:80}}>
          <StoreForm store={existing} onSave={s=>{existing?onEditStore(s):onAddStore(s);setEditingStore(null);}} onDelete={()=>{onEditStore({...existing,_delete:true});setEditingStore(null);}}/>
        </div>
      </div>
    );
  }

  return(
    <div style={{background:'#f2f2f7',height:'100%',width:'100vw',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <style>{GLOBAL_CSS}</style>
      <div style={{background:'rgba(255,255,255,0.95)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderBottom:'0.5px solid rgba(60,60,67,0.18)',flexShrink:0,padding:'calc(env(safe-area-inset-top,0px) + 6px) 16px 10px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:2}}>
          <span style={{fontSize:26,fontWeight:700,color:'#000',letterSpacing:-0.5}}>My Lists</span>
          <button onClick={()=>setEditingStore('new')} style={{background:B,color:'#fff',border:'none',borderRadius:10,width:34,height:34,cursor:'pointer',fontSize:20,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
        </div>
        <p style={{fontSize:11,color:'#8e8e93',margin:'2px 0 0'}}>Tap to open · Hold to drag &amp; reorder</p>
      </div>
      <div className="ios-scroll" style={{flex:1,minHeight:0,overflowY:'auto',padding:'14px',paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 14px)'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {ordered.map((store,i)=>{
            const h=handlers(i);
            const remaining=store.items.filter(it=>!it.bought).length;
            const isDrag=dragging===i;
            const isOver=overIdx===i&&dragging!==null&&dragging!==i;
            return(
              <div key={store.id} ref={h.elRef}
                onTouchStart={h.onTouchStart} onTouchMove={h.onTouchMove} onTouchEnd={h.onTouchEnd} onTouchCancel={h.onTouchCancel}
                style={{background:'#fff',borderRadius:16,overflow:'hidden',boxShadow:isOver?`0 0 0 3px ${B},0 4px 16px rgba(0,0,0,0.12)`:'0 2px 8px rgba(0,0,0,0.08)',opacity:isDrag?0.4:1,transform:isDrag?'scale(0.95)':'scale(1)',transition:'transform 0.12s,opacity 0.12s,box-shadow 0.12s',userSelect:'none',touchAction:'none'}}>
                <div style={{height:56,background:store.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:30}}>{store.icon}</div>
                <div onClick={()=>onSelectStore(store.id)} style={{padding:'10px 12px 6px',cursor:'pointer'}}>
                  <div style={{fontSize:14,fontWeight:700,color:'#000',marginBottom:2,lineHeight:1.2}}>{store.name}</div>
                  <div style={{fontSize:12,color:'#8e8e93'}}>{remaining>0?`${remaining} item${remaining!==1?'s':''}`:'All done ✓'}</div>
                </div>
                <div style={{borderTop:'0.5px solid #f2f2f7',padding:'5px 12px',display:'flex',justifyContent:'flex-end'}}>
                  <button onClick={e=>{e.stopPropagation();setEditingStore(store.id);}} style={{background:'none',border:'none',color:'#8e8e93',fontSize:12,cursor:'pointer',padding:'2px 0',fontWeight:500}}>Edit ···</button>
                </div>
              </div>
            );
          })}
          <div onClick={()=>setEditingStore('new')} style={{background:'#fff',borderRadius:16,border:'2px dashed #c7c7cc',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:130,cursor:'pointer',gap:6,color:'#8e8e93'}}>
            <span style={{fontSize:30}}>+</span>
            <span style={{fontSize:13,fontWeight:500}}>Add Store</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ShoppingListScreen ───────────────────────────────────────────────────────
const CHIP_FILTERS=[{k:'all',l:'All'},{k:'weekly',l:'Weekly'},{k:'sale',l:'On Sale'},{k:'watchlist',l:'Watch List'}];

function ShoppingListScreen({store,onBack,onUpdateStore}){
  const [listView,setListView]=useState('Active');
  const [filter,setFilter]=useState('all');
  const [sheet,setSheet]=useState(null);
  const [editingItem,setEditingItem]=useState(null);
  const nextId=useRef(Date.now());
  const tapCounts=useRef({});
  const tapTimers=useRef({});

  useEffect(()=>{
    const cleaned=stripExpiredSales(store.items);
    const changed=cleaned.some((item,i)=>item.discount!==store.items[i].discount);
    if(changed) onUpdateStore({...store,items:cleaned});
  },[store.id]);

  const items=store.items,sections=store.sections;
  const notUrgent=sections.includes('Not Urgent')?'Not Urgent':sections[sections.length-1]||'';
  function updateStore(patch){onUpdateStore({...store,...patch});}

  function handleRowTap(id){
    const cur=(tapCounts.current[id]||0)+1;tapCounts.current[id]=cur;clearTimeout(tapTimers.current[id]);
    if(cur>=2){tapCounts.current[id]=0;updateStore({items:items.map(i=>i.id===id?{...i,bought:!i.bought}:i)});}
    else{tapTimers.current[id]=setTimeout(()=>{tapCounts.current[id]=0;},380);}
  }

  // Touch drag — keyed by item.id string for stability
  const {handlers,dragging:draggingKey,overIdx:overKey}=useTouchDrag({
    onReorder:(fromKey,toKey)=>{
      const arr=[...items];
      const fi=arr.findIndex(i=>String(i.id)===String(fromKey));
      const ti=arr.findIndex(i=>String(i.id)===String(toKey));
      if(fi<0||ti<0) return;
      const moved={...arr[fi],section:arr[ti].section};
      arr.splice(fi,1);arr.splice(ti,0,moved);
      updateStore({items:arr});
    }
  });

  const visibleItems=(()=>{
    let base=items;
    if(listView==='Active') base=base.filter(i=>!i.bought);
    if(listView==='Done')   base=base.filter(i=>i.bought);
    if(listView==='Done'){const seen=new Set();base=base.filter(i=>{if(seen.has(i.name))return false;seen.add(i.name);return true;});}
    if(filter==='weekly')    base=base.filter(i=>i.weekly);
    if(filter==='sale')      base=base.filter(i=>i.discount>0);
    if(filter==='watchlist') base=base.filter(i=>i.watch);
    return base;
  })();

  const remaining=items.filter(i=>!i.bought).length;
  const estTotal=totalCost(items);

  function saveItem(data){
    const isNew=!data.id||!items.find(i=>i.id===data.id);
    let fd={...data};
    if(filter==='weekly') fd.weekly=true;
    if(filter==='sale') fd.discount=fd.discount||0;
    if(filter==='watchlist'){fd.watch=true;fd.section=fd.section||notUrgent;}
    const saved=isNew?{...fd,id:nextId.current++,bought:false}:{...editingItem,...fd};
    const newItems=isNew?[...items,saved]:items.map(i=>i.id===saved.id?saved:i);
    const newMem=data.name.trim()?{...store.memory,[data.name.trim()]:{size:data.size||'',price:data.price||null,section:data.section,barcode:data.barcode||''}}:store.memory;
    updateStore({items:newItems,memory:newMem});
    setSheet(null);setEditingItem(null);
  }
  function deleteItem(id){updateStore({items:items.filter(i=>i.id!==id)});setSheet(null);setEditingItem(null);}
  function handleQuickAdd(newItem){
    let item={...newItem};
    if(filter==='weekly') item.weekly=true;
    if(filter==='watchlist'){item.watch=true;item.section=notUrgent;}
    const newMem=item.name.trim()?{...store.memory,[item.name.trim()]:{size:item.size||'',price:item.price||null,section:item.section,barcode:item.barcode||''}}:store.memory;
    updateStore({items:[...items,item],memory:newMem});
  }

  return(
    <div style={{background:'#f2f2f7',height:'100%',width:'100vw',display:'flex',flexDirection:'column',overflow:'hidden',position:'relative'}}>
      <style>{GLOBAL_CSS}</style>

      {/* Header */}
      <div style={{background:'rgba(255,255,255,0.97)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderBottom:'0.5px solid rgba(60,60,67,0.18)',flexShrink:0,paddingTop:'calc(env(safe-area-inset-top,0px) + 2px)'}}>
        {/* Title row */}
        <div style={{display:'flex',alignItems:'center',padding:'5px 12px 3px'}}>
          <button onClick={onBack} style={{background:'none',border:'none',color:B,fontSize:15,cursor:'pointer',padding:'4px 8px 4px 0',display:'flex',alignItems:'center',gap:1,flexShrink:0}}>
            <span style={{fontSize:18}}>‹</span> Lists
          </button>
          <div style={{flex:1,textAlign:'center',minWidth:0,overflow:'hidden'}}>
            <div style={{fontSize:15,fontWeight:600,color:'#000',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{store.icon} {store.name}</div>
            <div style={{fontSize:10,color:'#8e8e93'}}>{remaining} of {items.length} remaining</div>
          </div>
          <button onClick={()=>setSheet('sections')} style={{background:'none',border:'none',color:B,fontSize:14,fontWeight:500,cursor:'pointer',padding:'4px 0 4px 8px',flexShrink:0}}>Sections</button>
        </div>
        {/* Filter chips — centered */}
        <div style={{display:'flex',justifyContent:'center',padding:'2px 10px 5px',gap:5,overflowX:'auto'}}>
          {CHIP_FILTERS.map(cf=>(
            <button key={cf.k} onClick={()=>setFilter(cf.k)} style={{border:filter===cf.k?'none':'0.5px solid #c7c7cc',borderRadius:20,padding:'3px 11px',fontSize:12,fontWeight:500,background:filter===cf.k?B:'none',color:filter===cf.k?'#fff':'#3c3c43',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>{cf.l}</button>
          ))}
        </div>
        {/* Quick add */}
        <QuickAdd sections={sections} memory={store.memory} onQuickAdd={handleQuickAdd}
          onOpenEdit={pi=>{setEditingItem(pi);setSheet('edit');}}
          activeFilter={filter} estTotal={estTotal} storeColor={store.color}/>
      </div>

      {/* List */}
      <div className="ios-scroll" style={{flex:1,minHeight:0,overflowY:'auto',overflowX:'hidden',paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 72px)',width:'100%'}}>
        {visibleItems.length===0&&(
          <div style={{textAlign:'center',padding:'36px 24px',color:'#8e8e93',fontSize:14}}>
            {filter!=='all'?`No ${filter==='watchlist'?'watched':filter} items yet.`:listView==='Done'?'Nothing checked off yet.':'No items — type above to add one.'}
          </div>
        )}
        {sections.map(sec=>{
          const its=visibleItems.filter(i=>i.section===sec);
          if(!its.length) return null;
          return(
            <div key={sec} style={{width:'100%',overflow:'hidden'}}>
              <div style={{background:store.color,padding:'4px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{fontSize:11,fontWeight:700,color:'#fff',textTransform:'uppercase',letterSpacing:0.6}}>{sec}</span>
                <span style={{fontSize:10,color:'rgba(255,255,255,0.8)',fontWeight:500}}>{its.length}</span>
              </div>
              {its.map((item,idx)=>{
                const itemKey=String(item.id);
                const h=handlers(itemKey);
                const eff=effectivePrice(item);
                const lineT=eff?eff*item.qty:null;
                const isDrag=draggingKey===itemKey;
                const isOver=overKey===itemKey&&draggingKey!==null;
                return(
                  <SwipeRow key={item.id} bought={item.bought}
                    onDelete={()=>deleteItem(item.id)}
                    onToggleBought={()=>updateStore({items:items.map(i=>i.id===item.id?{...i,bought:!i.bought}:i)})}>
                    <div ref={h.elRef}
                      onTouchStart={h.onTouchStart} onTouchMove={h.onTouchMove} onTouchEnd={h.onTouchEnd} onTouchCancel={h.onTouchCancel}
                      onClick={()=>handleRowTap(item.id)}
                      style={{background:isDrag?'#e8f0ff':isOver?'#f0f8ff':'#fff',borderBottom:idx<its.length-1?'0.5px solid #f2f2f7':'none',borderTop:isOver?`2px solid ${B}`:'2px solid transparent',padding:'8px 10px 8px 14px',display:'flex',alignItems:'center',gap:8,opacity:isDrag?0.45:1,touchAction:'none',userSelect:'none',cursor:'pointer',width:'100%',boxSizing:'border-box',overflow:'hidden'}}>
                      <div style={{flex:1,minWidth:0,overflow:'hidden'}}>
                        <div style={{fontSize:15,fontWeight:item.bought?400:500,display:'flex',alignItems:'center',gap:5,flexWrap:'wrap',textDecoration:item.bought?'line-through':'none',color:item.bought?'#aeaeb2':'#000'}}>
                          {item.name}{item.qty>1&&<span style={{fontSize:12,color:'#8e8e93',fontWeight:400}}>×{item.qty}</span>}
                        </div>
                        {(item.size||item.discount||item.weekly||item.watch)&&(
                          <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:2,alignItems:'center'}}>
                            {item.size&&<span style={{fontSize:11,color:'#8e8e93'}}>{item.size}</span>}
                            <SaleTag item={item}/>
                            {item.weekly&&<Tag bg="#f3e5f5" color="#7b1fa2">weekly</Tag>}
                            {item.watch&&<Tag bg="#e3f2fd" color="#1565c0">watch</Tag>}
                          </div>
                        )}
                      </div>
                      {item.price!=null&&(
                        <div style={{textAlign:'right',flexShrink:0,fontSize:13,fontWeight:500}}>
                          {item.discount>0&&<div style={{fontSize:10,color:'#aeaeb2',textDecoration:'line-through'}}>${(item.price*item.qty).toFixed(2)}</div>}
                          <span style={{color:item.discount?'#1a7a3a':item.bought?'#aeaeb2':'#000'}}>${lineT.toFixed(2)}</span>
                        </div>
                      )}
                      <button onClick={e=>{e.stopPropagation();setEditingItem(item);setSheet('edit');}} style={{background:'none',border:'none',color:'#c7c7cc',fontSize:15,cursor:'pointer',flexShrink:0,padding:'4px 2px'}}>✏️</button>
                    </div>
                  </SwipeRow>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Bottom tabs */}
      <div style={{background:'rgba(255,255,255,0.95)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderTop:'0.5px solid rgba(60,60,67,0.18)',display:'flex',flexShrink:0,paddingBottom:'env(safe-area-inset-bottom,6px)',paddingTop:4,zIndex:10}}>
        {['Active','All','Done'].map(v=>(
          <button key={v} onClick={()=>setListView(v)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:1,background:'none',border:'none',cursor:'pointer',color:listView===v?B:'#8e8e93',fontSize:10,fontWeight:listView===v?700:400,padding:'4px 0',borderTop:listView===v?`2px solid ${B}`:'2px solid transparent'}}>
            <span style={{fontSize:17}}>{v==='Active'?'☐':v==='All'?'☰':'☑'}</span>{v}
          </button>
        ))}
        <div style={{width:'0.5px',background:'#e5e5ea',margin:'4px 0'}}/>
        <button onClick={()=>setSheet('export')} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:1,background:'none',border:'none',cursor:'pointer',color:sheet==='export'?B:'#8e8e93',fontSize:10,fontWeight:400,padding:'4px 0',borderTop:'2px solid transparent'}}>
          <span style={{fontSize:17}}>📤</span>Export
        </button>
      </div>

      <Sheet open={sheet==='edit'} onClose={()=>{setSheet(null);setEditingItem(null);}} title={editingItem?.id?'Edit Item':'Add Item'}>
        <ItemForm key={editingItem?.id??'new'} item={editingItem?.id?editingItem:null} sections={sections} memory={store.memory} onSave={saveItem} onDelete={deleteItem} defaultFilter={filter}/>
      </Sheet>
      <Sheet open={sheet==='sections'} onClose={()=>setSheet(null)} title="Sections / Aisles">
        <SectionsManager sections={sections}
          onUpdate={secs=>updateStore({sections:secs})}
          onRemove={sec=>{if(sections.length<=1)return;updateStore({sections:sections.filter(s=>s!==sec),items:items.map(i=>i.section===sec?{...i,section:sections[0]}:i)});}}
          onAdd={sec=>{if(!sec||sections.includes(sec))return;updateStore({sections:[...sections,sec]});}}/>
      </Sheet>
      <Sheet open={sheet==='export'} onClose={()=>setSheet(null)} title="Export List">
        <ExportView items={items} sections={sections} storeName={store.name}/>
      </Sheet>
    </div>
  );
}

// ─── Loading ──────────────────────────────────────────────────────────────────
function LoadingScreen(){
  return(
    <div style={{height:'100%',width:'100vw',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#f2f2f7',gap:14}}>
      <span style={{fontSize:48}}>🛒</span>
      <div style={{fontSize:17,fontWeight:600,color:'#000'}}>Grocery List</div>
      <div style={{fontSize:14,color:'#8e8e93'}}>Loading…</div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App(){
  const [stores,setStores]=useState(null);
  const [activeStoreId,setActiveStoreId]=useState(null);
  const [fbReady,setFbReady]=useState(false);
  const unsubRef=useRef(null);

  useEffect(()=>{
    async function init(){
      try{
        await signInAnonymously(auth);
        const ref=doc(db,HH_DOC);
        const snap=await getDoc(ref);
        if(!snap.exists()) await setDoc(ref,{stores:INITIAL_STORES});
        unsubRef.current=onSnapshot(ref,ds=>{
          if(ds.exists()) setStores((ds.data().stores||[]).map(({trips,...rest})=>rest));
        });
        setFbReady(true);
      }catch(err){
        console.error('Firebase init:',err);
        setStores(INITIAL_STORES);setFbReady(true);
      }
    }
    init();
    return()=>unsubRef.current?.();
  },[]);

  const isFirstWrite=useRef(true);
  useEffect(()=>{
    if(!fbReady||stores===null) return;
    if(isFirstWrite.current){isFirstWrite.current=false;return;}
    setDoc(doc(db,HH_DOC),{stores}).catch(err=>console.error('Firebase write:',err));
  },[stores,fbReady]);

  if(stores===null) return <><style>{GLOBAL_CSS}</style><LoadingScreen/></>;

  const activeStore=stores.find(s=>s.id===activeStoreId);

  function updateStore(updated){
    if(updated._delete){setStores(p=>p.filter(s=>s.id!==updated.id));setActiveStoreId(null);}
    else{setStores(p=>p.map(s=>s.id===updated.id?updated:s));}
  }

  if(activeStore) return <ShoppingListScreen store={activeStore} onBack={()=>setActiveStoreId(null)} onUpdateStore={updateStore}/>;
  return <StoreListScreen stores={stores} onSelectStore={id=>setActiveStoreId(id)} onAddStore={s=>setStores(p=>[...p,s])} onEditStore={updateStore}/>;
}
