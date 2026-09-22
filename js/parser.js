// MTG decklist parser.
// Handles common formats:
//   4 Lightning Bolt
//   4x Lightning Bolt
//   4 Lightning Bolt (2X2)
//   Sideboard
//   3x Force of Will
//   // comments and blank lines ignored
// Returns { mainboard: [{count, name, set?}], sideboard: [...], unparsed: [...] }

const COUNT_NAME = /^(\d+)\s*[xX]?\s+(.+?)\s*$/;
const SIDEBOARD_HEADERS = /^(sideboard|sb|side board)\s*:?\s*$/i;
const SECTION_HEADERS = /^(maindeck|main deck|main|deck)\s*:?\s*$/i;
const COMMENT_LINE = /^\s*(\/\/|#|$)/;

/**
 * Parse a decklist string into mainboard/sideboard arrays.
 */
export function parseDecklist(text) {
  const mainboard = [];
  const sideboard = [];
  const unparsed = [];
  let inSideboard = false;
  const lines = (text || "").split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (COMMENT_LINE.test(line)) continue;

    if (SIDEBOARD_HEADERS.test(line)) { inSideboard = true; continue; }
    if (SECTION_HEADERS.test(line)) { inSideboard = false; continue; }

    const match = line.match(COUNT_NAME);
    if (!match) { unparsed.push(line); continue; }

    const count = parseInt(match[1], 10);
    let rest = match[2];

    // Strip trailing set/collector info: "Lightning Bolt (2X2) 117"
    // and foil marker "*F*" / "FOIL"
    let set = null;
    const setMatch = rest.match(/^(.+?)\s+\(([A-Z0-9]{2,6})\)(?:\s+\S+)?\s*$/);
    if (setMatch) {
      rest = setMatch[1];
      set = setMatch[2];
    }
    rest = rest.replace(/\s*\*F\*|\s*\bFOIL\b/gi, "").trim();

    if (!rest) { unparsed.push(line); continue; }

    const entry = { count, name: rest, set };
    if (inSideboard) sideboard.push(entry);
    else mainboard.push(entry);
  }

  return { mainboard, sideboard, unparsed };
}

/**
 * Sum counts of a list.
 */
export function sumCounts(entries) {
  return entries.reduce((acc, e) => acc + e.count, 0);
}

/**
 * Unique card names across main+side.
 */
export function uniqueNames(parsed) {
  const names = new Set();
  for (const e of parsed.mainboard) names.add(e.name);
  for (const e of parsed.sideboard) names.add(e.name);
  return Array.from(names);
}