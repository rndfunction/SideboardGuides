// Bootstrap the Vue app and wire store -> components.
// Vue is loaded as a global (window.Vue) via index.html because FORGE's preview
// VFS rewrites bare-URL ESM imports relative to the importing file (breaking them).
import DeckInput from "./components/DeckInput.js";
import TitleCard from "./components/TitleCard.js";
import SideboardGuide from "./components/SideboardGuide.js";
import GuideToolbar from "./components/GuideToolbar.js";
import {
  store,
  loadDecklist,
  addMatchup,
  removeMatchup,
  toggleCard
} from "./store.js";

const Vue = window.Vue;
if (!Vue || typeof Vue.createApp !== "function") {
  throw new Error("Vue global not found. Ensure /index.html loads vue.global.prod.js before /js/app.js.");
}

const app = Vue.createApp({
  data() {
    return { store };
  },
  computed: {
    parsed() { return store.parsed; },
    enriched() { return store.enriched; },
    loading() { return store.loading; },
    error() { return store.error; },
    matchups() { return store.matchups; },
    plan() { return store.plan; },
    deckName() { return store.deckName; }
  },
  methods: {
    onParse(text) {
      loadDecklist(text);
    },
    onReset() {
      store.parsed = null;
      store.enriched = null;
      store.error = null;
      store.status = "";
      store.rawText = "";
      store.matchups = [];
      store.plan = {};
      store.deckName = "";
    },
    addMatchup(name) { addMatchup(name); },
    addMatchups(names) { for (const n of names) addMatchup(n); },
    removeMatchup(name) { removeMatchup(name); },
    toggleCard(cardName, matchup) { toggleCard(cardName, matchup); },
    async onLoadState(saved) {
      if (saved.rawText) {
        await loadDecklist(saved.rawText);
      }
      if (Array.isArray(saved.matchups)) {
        store.matchups = saved.matchups.slice();
      }
      if (saved.plan && typeof saved.plan === "object") {
        store.plan = JSON.parse(JSON.stringify(saved.plan));
      }
      if (saved.deckName) {
        store.deckName = saved.deckName;
      }
    },
    onDeckNameChange(name) {
      store.deckName = name;
    }
  }
});

app.component("deck-input", DeckInput);
app.component("title-card", TitleCard);
app.component("sideboard-guide", SideboardGuide);
app.component("guide-toolbar", GuideToolbar);
app.mount("#app");