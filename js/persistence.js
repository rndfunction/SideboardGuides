// Save/load guide state to localStorage + text export.
// Saved shape: { version, savedAt, rawText, matchups, plan, deckName }

const SAVE_KEY = "mtg-deck-guide:saved";
const SAVE_LIST_KEY = "mtg-deck-guide:save-list";

export const PRESET_MATCHUPS = {
  Modern: ["Murktide", "Jund Saga", "Living End", "Tron", "Amulet Titan", "Burn", "Domain Zoo", "Yawgmoth", "Scam", "Rhinos"],
  Legacy: ["Delver", "Reanimator", "Doomsday", "Sneak and Show", "Lands", "Death and Taxes", "ANT", "Elves", "Painter", "8-Cast"],
  Pioneer: ["Rakdos Midrange", "Mono-Green Devotion", "Azorius Control", "Izzet Phoenix", "Amalia Combo", "Lotus Field", "Greasefang", "Mono-White Humans", "Enigmatic Fires"],
  Standard: ["Mono-Red", "Azorius Control", "Domain Ramp", "Golgari Midrange", "Boros Aggro", "Dimir Midrange", "Toxic", "Mono-Black"],
  Commander: ["Aggro", "Control", "Combo", "Midrange", "Stax", "Group Hug", "Voltron"]
};

export function saveGuide(state) {
  const payload = {
    version: 1,
    savedAt: Date.now(),
    rawText: state.rawText || "",
    matchups: Array.isArray(state.matchups) ? state.matchups : [],
    plan: state.plan || {},
    deckName: state.deckName || ""
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    return { ok: true, savedAt: payload.savedAt };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export function loadGuide() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

export function clearSaved() {
  try { localStorage.removeItem(SAVE_KEY); } catch (_) {}
}

/**
 * Export the current guide state as a human-readable text block.
 */
export function exportAsText(state) {
  const lines = [];
  const name = state.deckName || "Untitled Deck";
  lines.push("# " + name);
  lines.push("");

  if (state.matchups && state.matchups.length) {
    for (const matchup of state.matchups) {
      const ins = [];
      const outs = [];
      for (const [cardName, cardPlan] of Object.entries(state.plan || {})) {
        const s = cardPlan && cardPlan[matchup];
        if (s === "in") ins.push(cardName);
        else if (s === "out") outs.push(cardName);
      }
      lines.push("## vs " + matchup);
      lines.push("IN:");
      if (ins.length) for (const c of ins) lines.push("  + " + c);
      else lines.push("  (none)");
      lines.push("OUT:");
      if (outs.length) for (const c of outs) lines.push("  - " + c);
      else lines.push("  (none)");
      lines.push("");
    }
  } else {
    lines.push("(No matchups configured)");
  }

  return lines.join("\n");
}

export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  } catch (_) {
    return false;
  }
}