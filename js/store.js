// Reactive store for the deck guide builder.
// Wires parser + Scryfall lookups into a shape the components consume.
//
// NOTE: FORGE's preview sandbox resolves bare-URL ESM imports relative to the
// importing file's directory (via its VFS), which breaks `import ... from "https://..."`.
// So we load Vue as a global via a <script> tag in index.html and pull `reactive`
// off `window.Vue` here. See /js/app.js for the matching pattern.

import { parseDecklist, sumCounts, uniqueNames } from "./parser.js";
import { lookupCards } from "./scryfall.js";

const Vue = window.Vue;
if (!Vue || typeof Vue.reactive !== "function") {
  throw new Error("Vue global not found. Ensure /index.html loads vue.global.prod.js before /js/app.js.");
}

export const store = Vue.reactive({
  rawText: "",
  parsed: null,       // { mainboard, sideboard, unparsed }
  enriched: null,     // { mainboard, sideboard, stats } with card metadata attached
  matchups: [],       // ["Jund", "Tron", ...]
  plan: {},           // plan[cardName][matchupName] = "in" | "out" | null
  deckName: "",       // user-editable title card name
  loading: false,
  error: null,
  status: "",         // user-facing progress text
  _lastMatchupId: 0
});

export async function loadDecklist(text) {
  store.error = null;
  store.status = "";
  store.rawText = text;
  store.parsed = parseDecklist(text);
  store.enriched = null;

  if (store.parsed.unparsed.length && !store.parsed.mainboard.length) {
    store.error = "Couldn't parse any cards. Try lines like: 4 Lightning Bolt";
    return;
  }

  const names = uniqueNames(store.parsed);
  if (!names.length) {
    store.error = "No cards found in decklist.";
    return;
  }

  store.loading = true;
  store.status = "Looking up " + names.length + " cards...";
  try {
    const map = await lookupCards(names, ({ phase, done, total }) => {
      if (phase === "cache") {
        store.status = "Checking cache... " + done + "/" + total;
      } else {
        store.status = "Fetching from Scryfall... " + done + "/" + total;
      }
    });
    store.enriched = enrich(store.parsed, map);
    const missing = store.enriched.stats.missing;
    if (missing.length) {
      store.status = "Loaded. " + missing.length + " card(s) not found on Scryfall.";
    } else {
      store.status = "Loaded " + names.length + " cards.";
    }
    // Ensure plan has entries for new cards.
    ensurePlanEntries(store.enriched);
    // Auto-derive a default deck name if none set yet.
    if (!store.deckName) {
      store.deckName = deriveDeckName(store.enriched);
    }
  } catch (err) {
    store.error = "Lookup failed: " + (err && err.message ? err.message : String(err));
  } finally {
    store.loading = false;
  }
}

function attachCard(entry, map) {
  const card = map.get(entry.name) || null;
  return { ...entry, card };
}

function enrich(parsed, map) {
  const mainboard = parsed.mainboard.map((e) => attachCard(e, map));
  const sideboard = parsed.sideboard.map((e) => attachCard(e, map));
  const missing = [];
  for (const e of [...mainboard, ...sideboard]) {
    if (!e.card) missing.push(e.name);
  }

  // Color identity across the deck (union of color_identity on main cards).
  const colorSet = new Set();
  for (const e of mainboard) {
    if (e.card && e.card.color_identity) {
      for (const c of e.card.color_identity) colorSet.add(c);
    }
  }

  // Mana curve: buckets 0..7+ by cmc, counting maindeck only, non-lands.
  const curve = [0, 0, 0, 0, 0, 0, 0, 0]; // index 0..6, 7 = 7+
  let nonlandCount = 0;
  let landCount = 0;
  for (const e of mainboard) {
    if (!e.card) continue;
    const isLand = /(^|\s)land(\s|$)/i.test(e.card.type_line);
    if (isLand) { landCount += e.count; continue; }
    nonlandCount += e.count;
    const cmc = Math.min(7, Math.max(0, Math.round(e.card.cmc || 0)));
    curve[cmc] += e.count;
  }

  const totalMain = sumCounts(mainboard);
  const totalSide = sumCounts(sideboard);

  return {
    mainboard,
    sideboard,
    stats: {
      totalMain,
      totalSide,
      colors: Array.from(colorSet).sort(),
      curve,
      nonlandCount,
      landCount,
      missing: Array.from(new Set(missing))
    }
  };
}

function ensurePlanEntries(enriched) {
  const allCards = [...enriched.mainboard, ...enriched.sideboard];
  for (const e of allCards) {
    if (!store.plan[e.name]) store.plan[e.name] = {};
  }
}

function deriveDeckName(enriched) {
  if (!enriched || !enriched.stats) return "Untitled Deck";
  const colors = enriched.stats.colors || [];
  const colorStr = colors.join("");
  // Archetype hint based on a rough creature count.
  let creatures = 0;
  for (const e of enriched.mainboard) {
    if (e.card && /creature/i.test(e.card.type_line || "")) creatures += e.count;
  }
  let archetype = "";
  if (creatures >= 18) archetype = "Aggro";
  else if (creatures <= 6) archetype = "Control";
  else archetype = "Midrange";
  return archetype + " " + (colorStr || "Colorless");
}

export function addMatchup(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return;
  if (store.matchups.includes(trimmed)) return;
  store.matchups.push(trimmed);
}

export function removeMatchup(name) {
  const i = store.matchups.indexOf(name);
  if (i >= 0) store.matchups.splice(i, 1);
  for (const card of Object.keys(store.plan)) {
    if (store.plan[card]) delete store.plan[card][name];
  }
}

/**
 * Cycle a cell: null -> "in" -> "out" -> null
 */
export function toggleCard(cardName, matchupName) {
  if (!store.plan[cardName]) store.plan[cardName] = {};
  const cur = store.plan[cardName][matchupName] || null;
  const next = cur === null ? "in" : cur === "in" ? "out" : null;
  if (next === null) delete store.plan[cardName][matchupName];
  else store.plan[cardName][matchupName] = next;
}