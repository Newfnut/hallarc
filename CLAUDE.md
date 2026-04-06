# Shopper — Project Documentation
*For Claude: read this file at the start of every session before making any changes.*

---

## Project overview

A shared household shopping list PWA built for Gary and his wife, primarily used on iPhone 14. Deployed to Netlify. Real-time sync via Firebase Firestore so both phones update live.

**Live URL:** https://hallarc.netlify.app  
**Repo/Deploy:** Netlify (drag-and-drop deployment)

---

## Firebase config

```js
const fbConfig = {
  apiKey: "AIzaSyATdyW05921fNz_wyZ3zjYVF4o44mm_tyg",
  authDomain: "hallarc.firebaseapp.com",
  projectId: "hallarc",
  storageBucket: "hallarc.firebasestorage.app",
  messagingSenderId: "1057782930491",
  appId: "1:1057782930491:web:b54109ac07001be634501e",
  measurementId: "G-RDCJCLSQ5X"
};
```

**Firebase SDK version:** 10.7.1 (imported via ESM from gstatic CDN)

---

## File structure

```
index.html      — entire app (HTML + CSS + JS, single file, ~1200 lines)
sw.js           — service worker for offline caching
manifest.json   — PWA manifest (name, icons, theme)
CLAUDE.md       — this file
```

All three files sit in the same flat directory. No build step, no bundler.

---

## Dev / testing

**Dev mode bypass** (skips Firebase auth, loads mock data):
```
open index.html?dev=1   — in any local server
```
Run a local server with: `npx serve .` or `python3 -m http.server 8080`

Dev mode lands directly on a Costco Langley trip with 6 sample items. All write operations (add, edit, delete, check) work against local `S.items` array — nothing touches Firestore.

**To remove dev mode before final deploy:** remove the `DEV` block and its `if(DEV)` guards in the write functions.

**iPhone testing:** Dev mode does NOT bypass login on iPhone because the `?dev=1` query param needs a real HTTP server — opening the file directly as `file://` won't work. Options:
- Use `npx serve .` on a Mac, then hit the local IP from iPhone on same WiFi (e.g. `http://192.168.x.x:3000?dev=1`)
- Or just deploy to Netlify and log in for real

---

## Architecture

### Single-page app pattern
- One `S` state object holds everything
- `render()` re-renders the full active screen based on `S.screen`
- Screens: `loading` → `auth` → `home` → `trip`
- `go(screen)` switches screens and calls `render()`
- `renderTripContent()` is a lighter re-render used for live item updates (avoids closing open sheets)

### Firestore data model

```
households/{householdId}/
  stores/{storeId}
    name, type, categories[], sortOrder, createdAt

  trips/{tripId}
    storeId, storeName, storeType, tripDate (YYYY-MM-DD), label,
    status ('active' | 'complete'), totalActive, totalChecked,
    itemCount, createdAt, completedAt

  trips/{tripId}/items/{itemId}
    name, category, qty, unit, priceType ('each'|'per_lb'|'per_kg'),
    price, saleDiscount, saleExpiry (YYYY-MM-DD | null), notes,
    isWatchlist (bool), checked (bool), sortOrder, createdAt

  itemCache/{itemId}
    name, normalizedName (lowercase), category, frequency,
    lastPrice, lastUsed

users/{uid}
  householdId, name, email, createdAt

households/{householdId}
  code (6-char uppercase), createdBy, createdAt
```

### Household sharing model
- First user creates account → new `households` doc created, code generated
- Second user (wife) signs up and enters the 6-char code → gets linked to same `householdId`
- All data lives under `households/{householdId}/` so both users see identical state

---

## Store templates

Three built-in types. When a store is created, it gets a copy of the category list from the matching template.

```
warehouse   → Costco-style categories (Produce, Dairy & Eggs, Meat, Frozen, etc.)
supermarket → SuperStore-style (aisle-numbered categories)
custom      → General + Watchlist only (user builds their own)
```

Default stores seeded on first household login: **Costco Langley** (warehouse) and **SuperStore Langley** (supermarket).

Users can add any number of additional stores via "Add store" on the home screen.

---

## Trip flow

1. Tap a store on Home → date picker sheet opens
2. Enter date + optional label → "Open List" creates a new `trip` doc in Firestore cloned with that store's category structure
3. Multiple trips can exist for the same store simultaneously (e.g. Costco Apr 15 + Costco Apr 22)
4. Tap "Complete ✓" → trip status set to `complete`, archived (hidden from active view)
5. History screen (Phase 3) will show completed trips

---

## Item interactions

| Gesture | Action |
|---|---|
| Double-tap | Toggle checked/unchecked |
| Single tap | Open item editor (after 320ms delay to distinguish from double-tap) |
| Swipe right | Check off item |
| Swipe left | Delete item |
| Long press (600ms) | Open "Move to category" context menu |

---

## Category logic

**Auto-categorize on add:**
1. Check `itemCache` — if name was entered before, reuse stored category
2. If not cached, run `guessCategory()` — keyword match against `CAT_KEYS` map
3. If no confident match → item lands in `Uncategorized` section (highlighted amber at top of list)

**Manual re-categorize:**
- Long press → pick a category from the context menu
- The new category is saved to Firestore AND written back to `itemCache` so future entries remember it

**Watchlist:**
- Special category that appears at bottom of list
- Items in Watchlist are excluded from the running total
- Flag via editor toggle OR by moving to "Watchlist" category via long press

---

## Pricing

- `priceType`: `each` (default), `per_lb`, `per_kg`
- `price`: the base retail price
- `saleDiscount`: dollar amount off (e.g. 2.00)
- `saleExpiry`: YYYY-MM-DD — when this date passes, `effPrice()` returns retail price automatically
- Effective price: `effPrice(item)` = `price - saleDiscount` if sale is active, else `price`
- Running total uses `effPrice(item) × qty` for all non-watchlist unchecked items

---

## Totals bar (trip screen)

Two figures always visible at the bottom:
- **Active** — sum of all unchecked, non-watchlist items at effective price
- **Checked** — sum of all crossed-off items

Crossed-off section is collapsible, shows its own subtotal.

---

## Theme

Light/dark toggle button in every screen header. Preference saved to `localStorage`. Full CSS variable system — adding `data-theme="dark"` to `<html>` switches everything. No hardcoded colors in JS.

---

## Build phases

### ✅ Phase 1 — Complete (current state)
- Firebase Auth (email/password)
- Household creation + code-based joining
- Store templates (warehouse, supermarket, custom)
- Default stores seeded (Costco Langley, SuperStore Langley)
- Create dated trips (multiple per store)
- Add items (quick-add bar + full editor)
- Real-time Firestore sync
- Check off items (double-tap, swipe)
- Delete items (swipe left)
- Category grouping with collapse/expand
- Running total + checked total
- Sale price with auto-expiry
- Watchlist (excluded from total)
- Auto-categorize (cache + keyword guess)
- Long-press category mover
- Light/dark mode
- Service worker + offline cache (IndexedDB persistence)
- Dev mode bypass (`?dev=1`)

### 🔲 Phase 2 — Next
- Autocomplete from `itemCache` (the Firestore query is wired, needs UI polish)
- Open Food Facts API fallback for unknown items
- Per-lb/kg display in both units (e.g. "0.69/lb = $1.52/kg")
- Sale flag + expiry date in row display (already started, needs refinement)
- Regular-buy quick-add (flag items as regulars, one-tap populate for next trip)
- Drag-to-reorder items within and across categories

### 🔲 Phase 3 — Later
- Item photos (Firebase Storage, custom "make sure you buy this one" image)
- Barcode scanner (ZXing browser library)
- History / archive view (completed trips)
- Template editor UI (add/remove/rename categories per store)
- iOS PWA safe-area polish + haptic feel

---

## Known issues / notes

- **iPhone login:** The `?dev=1` flag requires an HTTP server. On iPhone, must either use local WiFi IP or deploy to Netlify.
- **Service worker:** Does not register on `file://` URLs — this is normal browser behaviour. Works once deployed to HTTPS.
- **Drag-to-reorder:** Not yet implemented. Plan: use HTML5 drag API on desktop, touch-based long-press-drag on mobile. Save `sortOrder` field to Firestore on drop so order persists.
- **Firestore indexes:** If Firestore complains about missing composite indexes, create them in the Firebase console for: `(households/{id}/itemCache) normalizedName ASC` and `(households/{id}/trips) status ASC + createdAt DESC`.
- **`renderTripContent()` guard:** When the item editor sheet is open, live Firestore updates set `S.tripNeedsUpdate = true` instead of re-rendering, to avoid closing the open sheet. The re-render fires after the sheet closes.

---

## Style / conventions

- **No framework.** Vanilla JS ES modules only.
- **Single file.** All CSS and JS stay in `index.html` unless file size demands splitting.
- **CSS variables for everything.** Never hardcode a color in JS or HTML.
- **iOS-native feel.** Font stack: `-apple-system, BlinkMacSystemFont, 'SF Pro Display'`. Border radius, shadow, and spacing follow iOS conventions.
- **Render pattern:** `renderX()` returns HTML string → assigned to `innerHTML` → `bindX()` attaches listeners. Never manipulate individual DOM nodes directly.
- **When returning code changes:** return only the changed function(s) or block(s), not the entire file. Reference the function name clearly.
