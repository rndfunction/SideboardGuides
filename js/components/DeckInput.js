// Deck input component: textarea + parse button + status.
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
      placeholder: [
        "Paste a decklist. Examples:",
        "4 Lightning Bolt",
        "4x Counterspell",
        "2 Snapcaster Mage (ISD) 78",
        "",
        "Sideboard",
        "3 Force of Will",
        "2 Surgical Extraction"
      ].join("\n")
    };
  },
  computed: {
    canParse() {
      return !this.loading && this.text.trim().length > 0;
    }
  },
  methods: {
    onParse() {
      if (!this.canParse) return;
      this.$emit("parse", this.text);
    },
    onReset() {
      this.text = "";
      this.$emit("reset");
    }
  },
  template: `
    <section class="deck-input">
      <label class="usa-label" for="decklist-input">Decklist</label>
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
        <span v-if="parsed" class="parse-status ok">
          Maindeck: {{ parsed.mainboard.length }} entries &middot;
          Sideboard: {{ parsed.sideboard.length }} entries
        </span>
      </div>

      <div v-if="error" class="parse-status error">{{ error }}</div>
    </section>
  `
};

export default DeckInput;