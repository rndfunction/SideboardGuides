// Scryfall API client with batching + localStorage caching.
// Docs: https://scryfall.com/docs/api
// We use POST /cards/collection (max 75 identifiers per call).
// Cache entries stored under "mtg-deck-guide:cards:<lowercased name>".

const API_BASE = "https://api.scryfall.com";
const CACHE_PREFIX = "mtg-deck-guide:card:";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const BATCH_SIZE = 75;
const THROTTLE_MS = 100; // politeness delay between batch requests

function cacheKey(name) {
  return CACHE_PREFIX + name.trim().toLowerCase();
}

function readCache(name) {
  try {
    const raw = localStorage.getItem(cacheKey(name));
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || !entry.t || Date.now() - entry.t > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey(name));
      return null;
    }
    return entry.card || null;
  } catch (_) {
    return null;
  }
}

function writeCache(name, card) {
  try {
    localStorage.setItem(cacheKey(name), JSON.stringify({ t: Date.now(), card }));
  } catch (_) {
    // Storage full or disabled; ignore.
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Normalize a Scryfall card object into just what the UI needs.
 */
function normalizeCard(card) {
  if (!card) return null;
  return {
    id: card.id,
    name: card.name,
    mana_cost: card.mana_cost || "",
    cmc: typeof card.cmc === "number" ? card.cmc : 0,
    type_line: card.type_line || "",
    oracle_text: card.oracle_text || "",
    colors: card.colors || [],
    color_identity: card.color_identity || [],
    rarity: card.rarity || "",
    set: card.set || "",
    set_name: card.set_name || "",
    image_normal: (card.image_uris && card.image_uris.normal) || "",
    image_small: (card.image_uris && card.image_uris.small) || "",
    scryfall_uri: card.scryfall_uri || "",
    layout: card.layout || "normal"
  };
}

/**
 * Fetch a single batch from Scryfall's collection endpoint.
 * Returns { data: [card], not_found: [identifier] }
 */
async function fetchBatch(names) {
  const body = { identifiers: names.map((n) => ({ name: n })) };
  const res = await fetch(API_BASE + "/cards/collection", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error("Scryfall returned " + res.status + " " + res.statusText);
  }
  return res.json();
}

/**
 * Look up many card names. Returns a Map<name, normalizedCard|null>.
 * Uses cache first, batches the misses, throttles between batches.
 * onProgress({ phase, done, total, cached }) is optional.
 */
export async function lookupCards(names, onProgress) {
  const result = new Map();
  const misses = [];
  let cachedCount = 0;

  for (const name of names) {
    const hit = readCache(name);
    if (hit) {
      result.set(name, hit);
      cachedCount++;
    } else {
      misses.push(name);
    }
  }

  const total = names.length;
  let done = cachedCount;
  if (onProgress) onProgress({ phase: "cache", done, total });

  // Chunk the misses.
  const batches = [];
  for (let i = 0; i < misses.length; i += BATCH_SIZE) {
    batches.push(misses.slice(i, i + BATCH_SIZE));
  }

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi];
    if (bi > 0) await sleep(THROTTLE_MS);

    let payload;
    try {
      payload = await fetchBatch(batch);
    } catch (err) {
      // Mark the whole batch as failed (null), keep going.
      for (const name of batch) result.set(name, null);
      done += batch.length;
      if (onProgress) onProgress({ phase: "fetch", done, total, error: String(err) });
      continue;
    }

    const foundByName = new Map();
    for (const raw of payload.data || []) {
      const card = normalizeCard(raw);
      if (card) foundByName.set(card.name.toLowerCase(), card);
      // Also cache under the requested name if Scryfall returned a canonical name.
    }

    for (const name of batch) {
      const card = foundByName.get(name.trim().toLowerCase()) || null;
      result.set(name, card);
      if (card) writeCache(name, card);
    }

    done += batch.length;
    if (onProgress) onProgress({ phase: "fetch", done, total, batch: bi + 1, batches: batches.length });
  }

  return result;
}

export function clearCache() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(CACHE_PREFIX)) keys.push(k);
  }
  for (const k of keys) localStorage.removeItem(k);
}