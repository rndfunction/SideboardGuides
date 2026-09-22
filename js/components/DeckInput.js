// Deck input component: textarea + parse button + status.
// Collapses to a single-line summary after a successful parse, so the page
// stays compact. Expands on "Edit" click.
const DeckInput = {
  props: {
    parsed: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    error: { type: String, default: null }
  },
  emits: ["parse", "reset"],
  data() {
    return {
      text: "",
      expanded: true,
      placeholder: [
        "Paste a decklist. Examples:",
        "4 Lightning Bolt",
        "4x Counterspell",
        "2 Snapcaster Mage (ISD) 78",
        "",
        "Sideboard",
        "3 Force of Will",
        "2 Surgical Extraction",
        "",
        "Or use the MTGGoldfish style (blank line before sideboard):",
        "4 Elvish Mystic",
        "9 Forest",
        "",
        "3 Faerie Macabre",
        "3 Gnaw to the Bone"
      ].join("\n")
    };
  },
  computed: {
    canParse() {
      return !this.loading && this.text.trim().length > 0;
    },
    hasParsed() {
      return this.parsed && this.parsed.mainboard && this.parsed.mainboard.length > 0;
    },
    summary() {
      if (!this.hasParsed) return "";
      const mainCount = this.parsed.mainboard.reduce((a, e) => a + e.count, 0);
      const sideCount = (this.parsed.sideboard || []).reduce((a, e) => a + e.count, 0);
      return mainCount + " maindeck, " + sideCount + " sideboard";
    }
  },
  methods: {
    onParse() {
      if (!this.canParse) return;
      this.$emit("parse", this.text);
      // Auto-collapse happens via watcher when parsed updates.
    },
    onReset() {
      this.text = "";
      this.expanded = true;
      this.$emit("reset");
    },
    toggleExpanded() {
      this.expanded = !this.expanded;
    }
  },
  watch: {
    hasParsed(val) {
      if (val) this.expanded = false;
    }
  },
  template: `
    <section class="deck-input">
      <!-- Collapsed state: single-line summary with Edit button -->
      <div v-if="hasParsed && !expanded" class="deck-input-collapsed">
        <span class="deck-input-summary">
          <strong>Decklist:</strong> {{ summary }}
        </span>
        <button
          type="button"
          class="usa-button usa-button--outline usa-button--small"
          @click="toggleExpanded"
        >Edit decklist</button>
        <button
          type="button"
          class="usa-button usa-button--unstyled deck-input-reset-link"
          @click="onReset"
        >Clear</button>
      </div>

      <!-- Expanded state: full textarea -->
      <div v-else>
        <label class="usa-label" for="decklist-input">Decklist</label>
        <p class="usa-hint" style="margin-top:0;">
          Separate maindeck from sideboard with a blank line, or with a "Sideboard" header.
        </p>
        <textarea
          id="decklist-input"
          class="usa-textarea"
          :placeholder="placeholder"
          v-model="text"
          spellcheck="false"
        ></textarea>

        <div class="deck-input-actions">
          <button
            type="button"
            class="usa-button"
            :disabled="!canParse"
            @click="onParse"
          >
            {{ loading ? "Looking up..." : "Parse & Look Up" }}
          </button>
          <button
            type="button"
            class="usa-button usa-button--outline"
            @click="onReset"
          >Reset</button>
          <button
            v-if="hasParsed"
            type="button"
            class="usa-button usa-button--unstyled"
            @click="toggleExpanded"
          >Collapse</button>
          <span v-if="parsed" class="parse-status ok">
            Maindeck: {{ parsed.mainboard.length }} entries &middot;
            Sideboard: {{ parsed.sideboard.length }} entries
          </span>
        </div>
      </div>

      <div v-if="error" class="parse-status error">{{ error }}</div>
    </section>
  `
};

export default DeckInput;