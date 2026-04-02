# CLAUDE.md — Grocery Shopping App Project Reference

This file documents the project setup, recurring problems, and hard-won lessons from building
this app. Read this before making changes. When in doubt, follow what's written here over
general best practices — these rules exist because something broke.

---

## Project Overview

A shared household grocery shopping app for two people (Gary + spouse). Inspired by AnyList
but focused on **price tracking** and **store-specific list organization** rather than meal
planning. Primary stores are Costco and SuperStore.

**Live URL:** https://newfnut-shopper.netlify.app  
**Netlify project name:** `melodious-lokum-c87edb`  
**Firebase project:** `hallarc`  
**Stack:** React + Vite, hosted on Netlify, Firebase backend  

---

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | React 18, Vite 5, JSX (single-file App.jsx) |
| Hosting | Netlify (browse-to-upload method) |
| Backend / sync | Firebase Firestore + Anonymous Auth |
| APIs | BarcodeDetector API, Open Food Facts |
| Package manager | npm |
| Version control | GitHub |

### Firebase Config (hallarc project)

```js
const firebaseConfig = {
  apiKey: "AIzaSyATdyW05921fNz_wyZ3zjYVF4o44mm_tyg",
  authDomain: "hallarc.firebaseapp.com",
  projectId: "hallarc",
  storageBucket: "hallarc.firebasestorage.app",
  messagingSenderId: "1057782930491",
  appId: "1:1057782930491:web:b54109ac07001be634501e",
  measurementId: "G-RDCJCLSQ5X"
};
```

Firebase is imported via CDN URL (not npm) directly in App.jsx:
```js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
```
Do NOT change these to npm imports — the project is set up for CDN Firebase and mixing the
two will break the build.

---

## Deployment — THE MOST IMPORTANT SECTION

### ✅ The Only Working Deploy Method: Browse-to-Upload

1. Run `npm run build` in the project root
2. Go to https://app.netlify.com → find project `melodious-lokum-c87edb` (newfnut-shopper)
3. Go to **Deploys** tab
4. Scroll to the bottom — find the **"browse to upload"** link/button
5. Select the entire `dist/` folder (not individual files — the whole folder)
6. Wait for deploy to complete

### ❌ Drag and Drop DOES NOT WORK

Drag-and-drop onto Netlify's deploy UI has failed repeatedly. It silently fails or produces
broken deploys. **Never use drag-and-drop.** Always use the browse-to-upload button.

### ❌ Build Before Code Is Ready = Broken Deploy

Early deploys failed because `npm run build` was run before the correct `App.jsx` was in
place. Vite built successfully but produced a near-empty `dist/` folder because the source
was wrong. The deploy looked like it worked but the live site was blank or broken.

**Rule: Always confirm the source file is correct and complete before running the build.**

### Build Command

```bash
npm run build
```

Output goes to `dist/`. Upload that entire `dist/` folder to Netlify.

---

## npm / Node Permissions Problems

### Symptom
npm commands fail with EACCES permission errors, usually when trying to install packages
globally or when the project folder has ownership issues.

### Fix
```bash
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /path/to/project
```

### Nuclear Option
If the project folder is corrupted or npm refuses to work no matter what:
```bash
rm -rf grocery-app/
# Then rebuild the project folder from scratch
mkdir grocery-app && cd grocery-app
npm create vite@latest . -- --template react
npm install
```
Then paste the correct source files back in before building.

---

## Firebase — Real-Time Sync

### Why Firebase Is Here
`localStorage` only works per-device. Two phones can't share a list without a backend.
Firebase Firestore was chosen because the project already had a `hallarc` Firebase project
and it supports real-time `onSnapshot` listeners.

### How Sync Works
- On app init: `signInAnonymously` → read `household/main` doc → if missing, seed with
  `INITIAL_STORES` → subscribe with `onSnapshot`
- On any state change: `setDoc(doc(db, 'household/main'), { stores })` writes the full
  state back
- Household sharing uses a URL parameter `?h=` to point multiple devices at the same doc

### First-Write Guard
There is a `isFirstWrite` ref that skips the first `useEffect` write after data loads from
Firebase. Without this, the app immediately overwrites Firestore with stale local state on
every page load. **Do not remove this guard.**

```js
const isFirstWrite = useRef(true);
useEffect(() => {
  if (!fbReady || stores === null) return;
  if (isFirstWrite.current) { isFirstWrite.current = false; return; }
  setDoc(doc(db, HH_DOC), { stores }).catch(...);
}, [stores, fbReady]);
```

### Stripping `trips` Field
When reading from Firestore, the app strips any `trips` field that may exist from old
data shapes: `(ds.data().stores || []).map(({ trips, ...rest }) => rest)`. This is a
legacy cleanup. Don't remove it or old documents will break the app.

---

## App Architecture

### Single File: App.jsx

The entire app lives in one `App.jsx` file. This was a deliberate choice for simplicity
during early development. A component refactor into multiple files has been discussed but
not yet done. When making changes, work within this single file unless explicitly asked to
split it out.

### Proposed Future Structure (not yet implemented)
```
src/
  components/
    ItemForm.jsx
    BarcodeScanner.jsx
    ExportView.jsx
    TripEditRow.jsx
    Modal.jsx
    Toggle.jsx
    Tag.jsx
  constants.js
  helpers.js
  App.jsx
```

### Screen Flow
```
App (root)
  └─ StoreListScreen       ← default, shows store tiles
       └─ StoreForm        ← inline, for add/edit store
  └─ ShoppingListScreen    ← when a store is selected
       ├─ QuickAdd         ← top bar input
       ├─ SwipeRow         ← each list item (swipe left=delete, right=check)
       ├─ Sheet (edit)     → ItemForm
       ├─ Sheet (sections) → SectionsManager
       └─ Sheet (export)   → ExportView
```

---

## Features Reference

### Stores
- Multiple stores, each with their own item list, sections, color, icon
- Drag-reorderable store tiles on the home screen
- Store data shape: `{ id, name, color, icon, sections[], items[], memory{} }`

### Items
- Item data shape: `{ id, name, qty, size, section, price, discount, saleEnd, weekly, watch, barcode, bought }`
- `price` is the regular price; `discount` is the amount off; `effectivePrice()` computes the sale price
- `saleEnd` is a date string (YYYY-MM-DD); expired sales are stripped on store load via `stripExpiredSales()`
- `bought` = checked off during a trip (not permanently deleted)
- `weekly` = regular recurring buy, shown in Weekly filter
- `watch` = on watchlist, typically in "Not Urgent" section

### Sections
- Ordered array of strings per store
- Default sections match a typical supermarket layout
- "Not Urgent" is the last section and used as the default for watchlist items
- Items can be drag-reordered within sections; dropped item inherits the section of the item it lands on

### Double-Tap to Check
Items are marked bought by double-tapping. A single tap opens edit (via the ✏️ button) or
is absorbed by the tap counter. The double-tap window is 380ms.

### Swipe Gestures
- Swipe **right** → toggle bought/unbought (green reveal)
- Swipe **left** → delete (red reveal, requires confirming by tapping the revealed button)
- Swipe threshold is 55px right, 55% of swipe zone width for left

### Item Memory (per store)
When an item is saved, its `name → { size, price, section, barcode }` is stored in
`store.memory`. QuickAdd uses this to autofill suggestions. Memory suggestions appear above
common items in the dropdown.

### Barcode Scanning
Uses `BarcodeDetector` API (Chrome/Android) with Open Food Facts as the data source.
Has a manual fallback input. Not all browsers support `BarcodeDetector` — it silently
falls back to manual entry.

### Price / Sale Logic
```js
function effectivePrice(item) {
  if (!item.price) return null;
  if (item.discount && item.saleEnd) {
    const today = new Date(); today.setHours(0,0,0,0);
    const end = new Date(item.saleEnd); end.setHours(0,0,0,0);
    if (end < today) return item.price;  // sale expired
  }
  return item.discount ? Math.max(0, item.price - item.discount) : item.price;
}
```
`totalCost()` sums only non-bought items not in "Not Urgent".

### Category Auto-Guess
`guessSection(name, sections)` matches the item name against keyword lists in
`CATEGORY_KEYWORDS` and returns the best matching section. Only fires on new items,
not edits.

---

## Styling Rules

- **No CSS files, no Tailwind** — all styles are inline `style={{}}` objects
- Global resets and animations are injected via `<style>{GLOBAL_CSS}</style>` inside each
  screen component
- iOS safe area insets are used throughout: `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`
- Color constants: `B = '#007AFF'` (iOS blue) is the primary accent
- Scrollable areas use className `ios-scroll` for `-webkit-overflow-scrolling: touch`
- Animations: `sheet` (slide up from bottom), `fade` (opacity fade in)
- `-webkit-tap-highlight-color: transparent` is set globally to suppress grey flash on tap

---

## Known Gotchas & Recurring Issues

### 1. Drag-and-Drop Deploy Silently Fails
Already covered above. Always use browse-to-upload. If the site looks wrong after deploy,
check that the `dist/` folder is non-empty and contains `index.html` before uploading.

### 2. Firebase Write Overwrites on Load
The `isFirstWrite` guard exists to prevent this. If sync seems to reset data on page load,
this guard may have been accidentally removed or the `fbReady` flag isn't being set
correctly. Check the `useEffect` dependency array — both `fbReady` and `stores` must be in it.

### 3. npm Permissions on macOS
If you see `EACCES: permission denied` during npm install:
```bash
sudo chown -R $(whoami) ~/.npm
```
If that doesn't fix it, the project directory itself may need fixing:
```bash
sudo chown -R $(whoami) .
```

### 4. Build Produces Empty dist/
Cause: Building before the correct source is in place. Vite won't error — it just builds
whatever is there. If `dist/index.html` is tiny (< 1KB), something is wrong with the source.
Check `src/App.jsx` exists and is the full file before building.

### 5. Touch Events vs Click Events
This app is primarily touch-driven. Several places use `onPointerDown` instead of `onClick`
to avoid the 300ms delay on iOS. The `QuickAdd` suggestion list uses `onPointerDown` +
`e.preventDefault()` to prevent the input blur from firing before the tap registers.
If suggestion taps stop working, this is usually why.

### 6. Swipe + Drag Conflict
`SwipeRow` handles horizontal swipes. `useTouchDrag` handles vertical press-hold drags.
They conflict if not carefully separated. The swipe fires on `touchstart/move/end` on the
outer row div. The drag fires after a 420ms hold timer. The drag's `touchmove` calls
`e.preventDefault()` to stop scrolling — this is intentional. If scrolling breaks, check
that `touchAction: 'none'` is set on draggable item divs.

### 7. iOS Scroll Bounce / Fixed Layout
`index.html` sets `body { position: fixed; overflow: hidden }` to prevent iOS PWA bounce
scroll. This means **the only scrolling happens inside `.ios-scroll` divs**. If a new
screen is added without an `ios-scroll` container, it will not scroll on iOS.

### 8. Firestore Data Shape Changes
If the data shape of a store or item changes (new fields added), old documents in Firestore
will be missing those fields. Always use safe defaults when reading: `item.discount || 0`,
`item.watch || false`, etc. Never assume a field exists just because new code writes it.

### 9. Section Assignment on Drag-Reorder
When an item is drag-dropped onto another item, it inherits that item's `section`. This is
intentional — it lets you move items between sections by dragging. If section reassignment
is behaving unexpectedly, look at the `onReorder` callback in `ShoppingListScreen`:
```js
const moved = { ...arr[fi], section: arr[ti].section };
```

### 10. Anonymous Auth Required Before Firestore
Firestore rules require the user to be signed in (even anonymously). The app calls
`signInAnonymously(auth)` before any Firestore reads/writes. If this step fails, the app
falls back to `INITIAL_STORES` in local state only — data won't sync. Check the Firebase
Console → Authentication → Sign-in providers to confirm Anonymous is enabled.

---

## File Structure

```
project root/
  index.html          ← PWA meta tags, loads /src/main.jsx
  manifest.json       ← PWA manifest (name, icons, theme)
  vite.config.js      ← minimal Vite config, just the React plugin
  package.json        ← React 18, Vite 5, @vitejs/plugin-react
  netlify.toml        ← build command + SPA redirect rule
  src/
    main.jsx          ← ReactDOM.createRoot entry point
    App.jsx           ← ENTIRE APP (all components, styles, logic)
  dist/               ← built output, upload this to Netlify
```

---

## Update Workflow (Step by Step)

1. Edit `src/App.jsx` with the changes
2. Confirm the file looks correct (not empty, not partial)
3. Run: `npm run build`
4. Confirm `dist/index.html` exists and is > 1KB
5. Go to Netlify → `melodious-lokum-c87edb` → Deploys → browse to upload
6. Select the `dist/` folder
7. Wait for "Published" status
8. Open https://newfnut-shopper.netlify.app and hard-refresh (hold shift + reload)
9. Test on both devices to confirm real-time sync still works

---

## What NOT To Do

- **Don't use drag-and-drop on Netlify** — it fails silently
- **Don't build before App.jsx is ready** — empty dist
- **Don't switch Firebase imports from CDN to npm** — they're intentionally CDN
- **Don't remove the `isFirstWrite` guard** — data will be overwritten on load
- **Don't add CSS files or Tailwind** — everything is inline styles
- **Don't assume Firestore fields exist** — always use safe fallback values
- **Don't add `<form>` elements** — use button onClick handlers instead
- **Don't nest scrollable divs without `ios-scroll`** — iOS won't scroll them

---

## On The Horizon

- Refactor App.jsx into multiple component files (structure planned above)
- Trip history / date tracking
- Household sharing improvements (named households, invite links)
- More robust barcode scanning fallback
