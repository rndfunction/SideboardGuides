// Sideboard guide: matchup columns, card rows, cells cycle null -> in -> out -> null.
function manaSymbols(manaCost) {
  if (!manaCost) return [];
  const syms = [];
  const re = /\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(manaCost)) !== null) {
    syms.push(m[1]);
  }
  return syms;
}

const SideboardGuide = {
  props: {
    deck: { type: Object, required: true },
    matchups: { type: Array, default: () => [] },
    plan: { type: Object, default: () => ({}) }
  },
  emits: ["add-matchup", "remove-matchup", "toggle-card"],
  data() {
    return {
      newMatchup: ""
    };
  },
  computed: {
    mainRows() {
      return this.rowsFor(this.deck.mainboard || []);
    },
    sideRows() {
      return this.rowsFor(this.deck.sideboard || []);
    }
  },
  methods: {
    manaClass(sym) {
      // sym like "W", "U", "B", "R", "G", "C", "2", "X", "W/P", "2/W"
      if (!sym) return "ms-C";
      const up = String(sym).toUpperCase();
      if (up.includes("W")) return "ms-W";
      if (up.includes("U")) return "ms-U";
      if (up.includes("B")) return "ms-B";
      if (up.includes("R")) return "ms-R";
      if (up.includes("G")) return "ms-G";
      return "ms-C";
    },
    symbolText(sym) {
      if (!sym) return "";
      const s = String(sym);
      // Single letter or single digit -> show as-is.
      if (s.length === 1) return s;
      // Hybrid/phyrexian/2-color: show first letter or the number.
      const num = s.match(/^\d+/);
      if (num) return num[0];
      const letter = s.match(/[WUBRGC]/i);
      return letter ? letter[0].toUpperCase() : s[0];
    }
  },
  methods: {
    manaSymbols,
    rowsFor(list) {
      // Aggregate duplicates by name (decklists usually already aggregate,
      // but be safe).
      const byName = new Map();
      for (const e of list) {
        const key = e.name;
        if (!byName.has(key)) {
          byName.set(key, { name: e.name, count: 0, card: e.card });
        }
        byName.get(key).count += e.count;
      }
      // Sort lands to bottom within a section? Keep original order for now.
      return Array.from(byName.values());
    },
    cellState(cardName, matchup) {
      const cardPlan = this.plan[cardName];
      if (!cardPlan) return null;
      return cardPlan[matchup] || null;
    },
    cellLabel(cardName, matchup) {
      const s = this.cellState(cardName, matchup);
      if (s === "in") return "IN";
      if (s === "out") return "OUT";
      return "";
    },
    cellClass(cardName, matchup) {
      const s = this.cellState(cardName, matchup);
      return {
        "state-in": s === "in",
        "state-out": s === "out"
      };
    },
    onToggle(cardName, matchup) {
      this.$emit("toggle-card", cardName, matchup);
    },
    onAddMatchup() {
      const name = this.newMatchup.trim();
      if (!name) return;
      this.$emit("add-matchup", name);
      this.newMatchup = "";
    },
    onRemoveMatchup(name) {
      this.$emit("remove-matchup", name);
    },
    sectionSummary(section, matchup) {
      // For a section ("main" or "side"), show net in/out counts for the matchup.
      const rows = section === "main" ? this.mainRows : this.sideRows;
      let inCount = 0, outCount = 0;
      for (const r of rows) {
        const s = this.cellState(r.name, matchup);
        if (s === "in") inCount += r.count;
        else if (s === "out") outCount += r.count;
      }
      if (!inCount && !outCount) return "";
      const parts = [];
      if (inCount) parts.push("+" + inCount);
      if (outCount) parts.push("-" + outCount);
      return parts.join(" / ");
    }
  },
  template: `
    <section class="sideboard-guide">
      <h3>Sideboard Guide</h3>
      <p style="color:#555;font-size:0.9rem;">
        Add matchups as columns. Click any cell to cycle: blank &rarr; IN &rarr; OUT &rarr; blank.
      </p>

      <div class="matchup-header">
        <div class="matchup-input">
          <label class="usa-sr-only" for="matchup-new">Add matchup</label>
          <input
            id="matchup-new"
            type="text"
            v-model="newMatchup"
            placeholder="e.g. Jund, Tron, Murktide"
            @keydown.enter.prevent="onAddMatchup"
          />
          <button type="button" class="usa-button usa-button--outline" @click="onAddMatchup">Add matchup</button>
        </div>
      </div>

      <div v-if="!matchups.length" class="empty-state">
        No matchups yet. Add one above to start building the guide.
      </div>

      <div v-else class="guide-table-wrap">
        <table class="guide-table">
          <thead>
            <tr>
              <th class="card-col">Card</th>
              <th v-for="m in matchups" :key="m" style="min-width:90px;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;">
                  <span>{{ m }}</span>
                  <button
                    type="button"
                    class="matchup-remove"
                    :title="'Remove ' + m"
                    @click="onRemoveMatchup(m)"
                  >&times;</button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr class="section-row">
              <td :colspan="matchups.length + 1">Maindeck</td>
            </tr>
            <tr v-for="row in mainRows" :key="'m-' + row.name">
              <th class="card-col">
                <span class="card-count-badge">{{ row.count }}</span>{{ row.name }}
                <span class="mana-cost" v-if="row.card && row.card.mana_cost">
                  <span
                    v-for="(sym, i) in manaSymbols(row.card.mana_cost)"
                    :key="i"
                    class="mana-symbol"
                    :class="manaClass(sym)"
                  >{{ symbolText(sym) }}</span>
                </span>
              </th>
              <td
                v-for="m in matchups"
                :key="'m-' + row.name + '-' + m"
                class="toggle-cell"
                :class="cellClass(row.name, m)"
                @click="onToggle(row.name, m)"
              >{{ cellLabel(row.name, m) }}</td>
            </tr>

            <tr class="section-row">
              <td :colspan="matchups.length + 1">Sideboard</td>
            </tr>
            <tr v-for="row in sideRows" :key="'s-' + row.name">
              <th class="card-col">
                <span class="card-count-badge">{{ row.count }}</span>{{ row.name }}
                <span class="mana-cost" v-if="row.card && row.card.mana_cost">
                  <span
                    v-for="(sym, i) in manaSymbols(row.card.mana_cost)"
                    :key="i"
                    class="mana-symbol"
                    :class="manaClass(sym)"
                  >{{ symbolText(sym) }}</span>
                </span>
              </th>
              <td
                v-for="m in matchups"
                :key="'s-' + row.name + '-' + m"
                class="toggle-cell"
                :class="cellClass(row.name, m)"
                @click="onToggle(row.name, m)"
              >{{ cellLabel(row.name, m) }}</td>
            </tr>

            <tr class="section-row">
              <td :colspan="matchups.length + 1">Net totals</td>
            </tr>
            <tr>
              <th class="card-col">Main &plusmn;</th>
              <td v-for="m in matchups" :key="'nm-' + m" style="text-align:center;">
                {{ sectionSummary('main', m) }}
              </td>
            </tr>
            <tr>
              <th class="card-col">Side &plusmn;</th>
              <td v-for="m in matchups" :key="'ns-' + m" style="text-align:center;">
                {{ sectionSummary('side', m) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `
};

export default SideboardGuide;