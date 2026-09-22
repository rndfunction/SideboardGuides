// Toolbar above the sideboard guide: save/load/export + preset matchups.
import {
  saveGuide,
  loadGuide,
  clearSaved,
  exportAsText,
  copyToClipboard,
  PRESET_MATCHUPS
} from "../persistence.js";

const GuideToolbar = {
  props: {
    deckName: { type: String, default: "" },
    rawText: { type: String, default: "" },
    matchups: { type: Array, default: () => [] },
    plan: { type: Object, default: () => ({}) }
  },
  emits: ["load-state", "add-matchups"],
  data() {
    return {
      lastMessage: "",
      lastMessageClass: "ok",
      presetFormat: "Modern"
    };
  },
  computed: {
    presetFormats() {
      return Object.keys(PRESET_MATCHUPS);
    },
    presetList() {
      return PRESET_MATCHUPS[this.presetFormat] || [];
    },
    newPresets() {
      // Only show presets that aren't already added.
      return this.presetList.filter((m) => !this.matchups.includes(m));
    }
  },
  methods: {
    flash(msg, cls) {
      this.lastMessage = msg;
      this.lastMessageClass = cls || "ok";
      setTimeout(() => { this.lastMessage = ""; }, 2500);
    },
    onSave() {
      const r = saveGuide({
        rawText: this.rawText,
        matchups: this.matchups,
        plan: this.plan,
        deckName: this.deckName
      });
      if (r.ok) this.flash("Saved locally.", "ok");
      else this.flash("Save failed: " + (r.error || "unknown"), "error");
    },
    onLoad() {
      const saved = loadGuide();
      if (!saved) { this.flash("No saved guide found.", "error"); return; }
      this.$emit("load-state", saved);
      this.flash("Loaded saved guide.", "ok");
    },
    onClear() {
      clearSaved();
      this.flash("Saved guide cleared.", "ok");
    },
    async onCopy() {
      const text = exportAsText({
        deckName: this.deckName,
        matchups: this.matchups,
        plan: this.plan
      });
      const ok = await copyToClipboard(text);
      if (ok) this.flash("Guide copied to clipboard.", "ok");
      else this.flash("Copy failed.", "error");
    },
    onDownload() {
      const text = exportAsText({
        deckName: this.deckName,
        matchups: this.matchups,
        plan: this.plan
      });
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safe = (this.deckName || "deck").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      a.download = safe + "-sideboard-guide.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.flash("Downloaded.", "ok");
    },
    onAddPreset(matchup) {
      this.$emit("add-matchups", [matchup]);
    },
    onAddAllPresets() {
      if (!this.newPresets.length) return;
      this.$emit("add-matchups", this.newPresets.slice());
    }
  },
  template: `
    <div class="guide-toolbar">
      <div class="toolbar-row">
        <button type="button" class="usa-button usa-button--outline" @click="onSave">Save</button>
        <button type="button" class="usa-button usa-button--outline" @click="onLoad">Load</button>
        <button type="button" class="usa-button usa-button--outline" @click="onClear">Clear saved</button>
        <button type="button" class="usa-button usa-button--outline" @click="onCopy">Copy as text</button>
        <button type="button" class="usa-button usa-button--outline" @click="onDownload">Download .txt</button>
        <span v-if="lastMessage" class="toolbar-msg" :class="lastMessageClass">{{ lastMessage }}</span>
      </div>

      <div class="toolbar-row">
        <label class="usa-sr-only" for="preset-format">Format</label>
        <select id="preset-format" class="usa-select" v-model="presetFormat" style="max-width:12rem;">
          <option v-for="f in presetFormats" :key="f" :value="f">{{ f }}</option>
        </select>
        <span class="preset-label">Quick-add:</span>
        <button
          v-for="m in newPresets.slice(0, 10)"
          :key="m"
          type="button"
          class="usa-button usa-button--unstyled preset-chip"
          @click="onAddPreset(m)"
        >+ {{ m }}</button>
        <button
          v-if="newPresets.length > 1"
          type="button"
          class="usa-button usa-button--outline preset-chip"
          @click="onAddAllPresets"
        >Add all</button>
      </div>
    </div>
  `
};

export default GuideToolbar;