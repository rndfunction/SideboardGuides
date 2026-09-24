SideboardGuides
Community-contributed sideboard guides for Sideboard Guide Builder.

Each guide is a self-contained JSON file that captures a decklist, its matchups, and the full sideboarding plan for each matchup. The app loads them directly — no build step, no server.

For users
The app fetches manifest.json from this repo and lists every guide in the Browse community guides panel. Click a guide to load it, and you can immediately print the cards, tweak the plan, or export it back out as your own.

There's no setup required on your end. If you're just here to look around, the guides live in guides/.

For contributors
Submitting a guide is a small, git-only workflow. You don't need to clone the repo or write any code.

1. Build your guide in the app
Go to sideboardguide.io and:

Paste or upload your decklist.

Add matchups as folder tabs at the top of the grid.

Set the IN / OUT plan for each card in each matchup. Remember that every matchup's IN total must equal its OUT total — that's the rule the app enforces with the "Balance" indicator.

Optionally customize the title card's color, font, symbol, and texture.

Click Export to download a .json file. This file is your guide.

2. Add the file to this repo
Click Add file → Upload files at the top of this repository.

Drop your exported .json into the guides/ folder.

Name it descriptively, using lowercase and hyphens — e.g. mono-red-burn-modern.json, mono-green-elves-pauper.json, izzet-phoenix-pioneer.json.

Commit directly to a new branch.

3. Update manifest.json
Every guide must have an entry in manifest.json so the app can list it. Open the manifest, add your guide to the guides array, and include:

Field	Description
file	The exact filename you uploaded, including .json
deckName	The name as you want it to appear in the browser
format	Pauper, Modern, Legacy, Pioneer, Standard, or Commander
archetype	A short archetype label, e.g. Mono-Red Burn, Mono-Green Elves
author	Your GitHub handle
createdAt	Today's date, YYYY-MM-DD
Example entry:

{
"file": "mono-red-burn-modern.json",
"deckName": "Mono-Red Burn",
"format": "Modern",
"archetype": "Mono-Red Burn",
"author": "rndfunction",
"createdAt": "2026-09-24"
}

Also bump lastUpdated at the top of the manifest to today's date.

4. Open a pull request
Describe the deck and any matchups the guide is tuned against. If the JSON is valid and the manifest entry is correct, it'll be merged quickly.

Format reference
The manifest.json shape:

{
"version": 1,
"lastUpdated": "YYYY-MM-DD",
"guides": [ { ...entry... }, { ...entry... } ]
}

Each file in guides/ is a share format JSON produced by the app. The shape:

{
"format": "mtg-sideboard-guide",
"version": 1,
"generator": "Sideboard Guide Builder",
"createdAt": "ISO timestamp",
"deck": {
"name": "Mono-Red Burn",
"format": "Modern",
"archetype": "Mono-Red Burn",
"rawText": "4 Monastery Swiftspear\n4 Soul-Scar Mage\n..."
},
"matchups": ["Murktide", "Amulet Titan", "Rhinos"],
"plan": {
"Searing Blaze": {
"Murktide": { "dir": "out", "count": 3 }
},
"Roiling Vortex": {
"Murktide": { "dir": "in", "count": 3 }
}
},
"titleCard": {
"color": "#8a2a1a",
"fontKey": "cinzel",
"symbol": "auto",
"texture": "none",
"intensity": "medium"
}
}

Field notes
format is a fixed tag — always "mtg-sideboard-guide". It's how the app recognizes a valid guide file.

version tracks the schema. Currently 1. If future versions change the shape, this lets the app accept both old and new files gracefully.

deck.rawText is the canonical decklist as text. The app re-parses it on load and re-derives mainboard, sideboard, colors, and mana curve. You don't need to store any of that explicitly.

matchups is the ordered list of matchups, matching the tab order in the app.

plan is keyed by card name, then by matchup. Each entry is { "dir": "in"|"out", "count": N }. Only cards with a plan appear here; blank cells are omitted.

titleCard is optional and only controls presentation. If you don't customize anything, the app derives sensible defaults from the deck's colors.

What not to do
Don't hand-edit the JSON unless you're comfortable with it. The app's Export button produces a valid file every time; use it.

Don't rename files after the manifest has been updated. The file field in the manifest must match the filename in guides/ exactly, character for character, and case matters.

Don't include card images. The app looks them up on Scryfall when the guide loads. Storing them here would bloat the repo.

Don't submit a guide you wouldn't want others to use. Everything here is public.

License
By submitting a guide you agree to make it freely available for anyone to use, copy, and modify. See LICENSE if one is present.

Credits
The guide format and the app itself are built on Scryfall card data. Decklists shown in guides are the property of their authors; this repository simply hosts them.
