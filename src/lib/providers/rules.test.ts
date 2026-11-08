/**
 * Guards the hand-written exclusion rules. Twenty audits of regexes were
 * only ever checked by eye against whatever the database held that day;
 * these pin the two failure modes that cost the most: a rule that quietly
 * stops matching what it was written for (the accented "râpe"), and a rule
 * that starts hiding real accessories.
 *
 * "Real" titles below are copied from live results that were visible (kept)
 * when the rule was added. Add to both lists whenever an audit ships a rule.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KNOWN_COLLISION_EXCLUSIONS,
  WARGAMING_SCALE_PATTERN,
  DOLLHOUSE_MINIATURE_PATTERN,
  ETSY_SIGNAL_REQUIRED_GAMES,
  failsEtsyPrintSignal,
} from "./known-collisions";
import { NON_3D_PRINT_PATTERN } from "./non-3d-print-terms";
import { guessTypeFromTitle } from "./guess-type";
import { dropGuardVerdict } from "../drop-guard";
import { isGameSpecificMiscResult, MISC_SEARCH_TERMS } from "./misc-terms";
import { buildPrompt, judgeResults, parseVerdicts, shouldJudge } from "./llm-judge";

/** Every general rule a real result for `game` has to survive. */
function isExcluded(game: string, title: string, domain = "printables.com"): boolean {
  const collision = KNOWN_COLLISION_EXCLUSIONS[game];
  return (
    (collision?.test(title) ?? false) ||
    WARGAMING_SCALE_PATTERN.test(title) ||
    DOLLHOUSE_MINIATURE_PATTERN.test(title) ||
    (domain === "etsy.com" && NON_3D_PRINT_PATTERN.test(title)) ||
    failsEtsyPrintSignal(game, domain, title)
  );
}

const REAL: [game: string, title: string, domain?: string][] = [
  ["Earth", "Earth Boardgame Insert"],
  ["Speakeasy", "Speakeasy: Docks"],
  ["Speakeasy", "Speakeasy: Capo Prison"],
  ["Speakeasy", "SPEAKEASY 5 - POKER CHIPS - POKER CHIPS", "cults3d.com"],
  ["Iliad", "Reiner Knizia's Iliad Tile Protector"],
  ["Iliad", "Iliad Game Insert (Deluxe Edition)"],
  ["Iliad", "Iliad Box Insert"],
  ["The White Castle", "The White Castle Insert"],
  ["The White Castle", "The White Castle - dice bridge", "cults3d.com"],
  ["Recall", "Recall Boardgame Insert", "thingiverse.com"],
  ["Tend", "Tend Board Game Player Board & Insert System (IV Studios)"],
  ["On Mars", "On Mars (Lacerda) Insert / Organizer"],
  ["Yokohama", "Yokohama Deluxe Insert", "thingiverse.com"],
  ["The Gang", "The Gang Poker Chips"],
  ["The Gang", "The gang box insert"],
  ["Skyrise", "Skyrise board game insert for structures"],
  ["Luthier", "Luthier - Retail Box + Promos + Deluxe Addons Sleeved Insert"],
  ["Tea Garden", "Tea Garden Board Game Tea Set Insert"],
  ["Fromage", "Fromage Boardgame Insert (retail)"],
  ["Recall", "Recall Boardgame Inlay", "thingiverse.com"],
  ["Heat: Pedal to the Metal", "Heat Pedal to the Metal + Expansions Compatible Board Game Organizer ***DIGITAL FILES ONLY***", "etsy.com"],
  ["Lost Ruins of Arnak", "Lost Ruins of Arnak Upgrades", "etsy.com"],
];

const JUNK: [game: string, title: string, domain?: string][] = [
  ["Sanctuary", "Wayfarer Modular Arcane Sanctuary Terrain Tiles (18mm scale)", "cults3d.com"],
  ["The Gang", "Press Gang Stockade Terrain - The Eightpints The Docks", "thingiverse.com"],
  ["Ruins", "Modular Wargaming Ruins (magnetic)", "printables.com"],
  ["Earth", "3D printed Wound/Might/Will/Fate stat trackers compatible with the Middle-Earth Strategy Battle Game / MESBG PERSONAL use STL", "etsy.com"],
  ["Tag Team", "AWA Southern Tag Team Belts", "cults3d.com"],
  ["Fromage", "Râpe à fromage - Handle", "thingiverse.com"],
  ["Entropy", "The Lady of Entropy - Gods - PRESUPPORTED - Illustrated and Stats - 32mm scale", "cults3d.com"],
  ["Inferno", "Inferno Dragon Emerging Book Nook – Head & Tail Edition DIGITAL FILE- STL and .3mf", "etsy.com"],
  ["Recall", "Dental Patient Recall Tracker Excel, Reactivation Spreadsheet for Dental Office", "etsy.com"],
  ["Sanctuary", "Lemurian Forest Sanctuary | Deep Healing | Nature Goddess Phone", "etsy.com"],
  ["Falling", "Falling Leaves Handprint Art, Preschool Fall Activity, Printable Poem Craft", "etsy.com"],
  ["Iliad", "ZIMABLADE NAS - ILIAD BOX STYLE", "printables.com"],
  ["Iliad", "Cable cover box for Iliad Box", "thingiverse.com"],
  ["Iliad", "Iliad Box vertical stand", "printables.com"],
  ["Lisboa", "Lisboa Tram OcCre 1/24 spare parts", "thingiverse.com"],
  ["Lisboa", "Lisbon Tram - Electrico Lisboa - Carris", "thingiverse.com"],
  ["On Mars", "Olympus Mons on Mars", "thingiverse.com"],
];

test("real accessories are never excluded for their own game", () => {
  for (const [game, title, domain] of REAL) {
    assert.equal(isExcluded(game, title, domain), false, `${game}: "${title}" should be kept`);
  }
});

test("known junk is excluded", () => {
  for (const [game, title, domain] of JUNK) {
    assert.equal(isExcluded(game, title, domain), true, `${game}: "${title}" should be excluded`);
  }
});

test("no per-game rule matches a plain accessory title for its own game", () => {
  // A stray "|" (empty alternative) or an over-broad term would hide every
  // real result for a game; probe each rule with the titles real ones use.
  const violations: string[] = [];
  for (const [game, re] of Object.entries(KNOWN_COLLISION_EXCLUSIONS)) {
    if (!re.flags.includes("i")) violations.push(`${game}: rule should be case-insensitive`);
    if (re.test("")) violations.push(`${game}: rule matches the empty string`);
    for (const probe of ["Insert / Organizer", "Board Game Insert", "Token Tray", "Player Board Overlay", "Dice Tower"]) {
      if (re.test(`${game} ${probe}`)) violations.push(`${game}: rule matches "${game} ${probe}"`);
    }
  }
  assert.deepEqual(violations, []);
});

test("the Etsy print-signal rule only touches Etsy results for listed games", () => {
  const nonPrint = "Dental Patient Recall Tracker Excel, Reactivation Spreadsheet";
  assert.equal(failsEtsyPrintSignal("Recall", "etsy.com", nonPrint), true);
  assert.equal(failsEtsyPrintSignal("Recall", "thingiverse.com", nonPrint), false);
  assert.equal(failsEtsyPrintSignal("Ticket to Ride", "etsy.com", nonPrint), false);
  assert.equal(ETSY_SIGNAL_REQUIRED_GAMES.has("Recall"), true);
});

test("accented and plural forms match what the rules were written for", () => {
  assert.equal(KNOWN_COLLISION_EXCLUSIONS.Fromage.test("Râpe à fromage"), true);
  assert.equal(KNOWN_COLLISION_EXCLUSIONS.Fromage.test("Grape jelly Fromage"), false);
  for (const t of ["Sand Dunes Terrain", "silicone sand molds", "Sand Scoops set", "Sand Tools", "Octopus sand tools"]) {
    assert.equal(KNOWN_COLLISION_EXCLUSIONS.Sand.test(t), true, t);
  }
  assert.equal(KNOWN_COLLISION_EXCLUSIONS.Sand.test("Sand Player Board Overlay"), false);
  assert.equal(WARGAMING_SCALE_PATTERN.test("Gothic Ruins 28mm scale"), true);
  assert.equal(WARGAMING_SCALE_PATTERN.test("Lost Ruins of Arnak Organizer"), false);
});

test("type guessing handles plurals without letting trackers steal inserts", () => {
  const cases: [string, string][] = [
    ["Tend standard (non-deluxe) inserts", "insert"],
    ["Sky Team Boardgame Inserts", "insert"],
    ["Dune Imperium Uprising (+Bloodlines) - Insert and Player Boards", "insert"],
    ["Splendor Duel Insert/Organizer and Score Trackers", "insert"],
    ["Terraforming Mars Ares Expedition Trackers", "tracker"],
    ["Azul Duel player board", "tracker"],
    ["Slay the Spire Encounter Trays", "tray"],
    ["Castles of Burgundy Tile Holder", "tray"],
    ["Cubitos Dice Tower", "dice-tower"],
    ["The Gang Poker Chips", "tokens"],
  ];
  for (const [title, expected] of cases) assert.equal(guessTypeFromTitle(title), expected, title);
});

test("collection sync never treats an empty or mostly-missing response as a mass removal", () => {
  const base = { existingCount: 144, unattended: true };
  assert.equal(dropGuardVerdict({ ...base, importedCount: 0, droppedCount: 144 }), "empty-response");
  assert.equal(dropGuardVerdict({ ...base, importedCount: 0, droppedCount: 144, unattended: false }), "empty-response");
  assert.equal(dropGuardVerdict({ ...base, importedCount: 90, droppedCount: 54 }), "large-drop");
  assert.equal(dropGuardVerdict({ ...base, importedCount: 90, droppedCount: 54, unattended: false }), "ok");
  assert.equal(dropGuardVerdict({ ...base, importedCount: 140, droppedCount: 4 }), "ok");
  assert.equal(dropGuardVerdict({ existingCount: 6, unattended: true, importedCount: 3, droppedCount: 3 }), "ok");
  assert.equal(dropGuardVerdict({ ...base, importedCount: 144, droppedCount: 0 }), "ok");
});

test("Miscellaneous rejects inserts made for one specific game but keeps generic accessories", () => {
  const specific = [
    "Snow Colony – Board Game Organizer / Insert (3D Printable STL)",
    "Isle of Trains: All Aboard – Board Game Organizer / Insert (3D Printable STL)",
    "Zombicide 2nd Edition Board Game Organizer | Insert | Premium Storage Solution",
    "Barrage ALL IN Board Game Insert / Organizer",
    "Catan Board Game with 5-6 Player Extension Box Insert Organizer",
    "Token & Dice Tray box insert for Horizon Zero Dawn the board game",
    "ICE Board Game 2nd Edition Token Tray",
    "Board Game Insert Organizer Heroes of Land, Air & Sea and 10 expansions",
    "Stardew Valley Board Game Meeple",
    "ISS Vanguard (Awaken Realms) Boardgame - Token/Dice Tray & Event Cards Holder",
    "TOWER OF GODS: Olympus – An adventure game featuring dice and the Olympian gods (Print & Play)",
  ];
  const generic = [
    "Dice Tower",
    "Board Game Token Tray and Card Holder",
    "Board Game Token Tray",
    "Token tray, tabletop, board game tray",
    "Board Game Insert Organizer for any game",
    "Wooden Board Game Meeple Pieces",
    "Universal Board Game Organizer",
    "Gridfinity Board Game Insert",
    "Wyrmwood Table Accessory - Hex tile cup holder.stl",
    "Dungeon Master Screen Clip - Straight",
    "Stegosaurus Meeple",
    "Battle Meeple",
  ];
  for (const t of specific) assert.equal(isGameSpecificMiscResult(t), true, t);
  for (const t of generic) assert.equal(isGameSpecificMiscResult(t), false, t);
  // ...and the scan-time filters for every Miscellaneous term apply it.
  for (const q of MISC_SEARCH_TERMS) assert.equal(q.extraFilter?.(specific[0]), false, q.term);
});

test("the AI screen: scope, prompt, and parsing all lean toward keeping", async () => {
  assert.equal(shouldJudge("Miscellaneous", undefined), true);
  assert.equal(shouldJudge("Recall", undefined), true);
  assert.equal(shouldJudge("Ticket to Ride", undefined), false);
  assert.equal(shouldJudge("Ticket to Ride", "all"), true);
  assert.equal(shouldJudge("Recall", "off"), false);

  const { system, user } = buildPrompt("Recall", [{ url: "u1", title: "Dental Recall &amp; Tracker", domain: "etsy.com" }]);
  assert.match(system, /owns the board game "Recall"/);
  assert.match(system, /When in doubt, answer keep/);
  assert.match(user, /1\. \[etsy\.com\] Dental Recall & Tracker/);
  assert.match(buildPrompt("Miscellaneous", []).system, /Miscellaneous/);

  assert.deepEqual(parseVerdicts('Sure: [{"i":1,"v":"off-topic"},{"i":3,"v":"different-game"},{"i":9,"v":"off-topic"}]', 3), [
    "off-topic", "keep", "different-game",
  ]);
  assert.deepEqual(parseVerdicts("not json at all", 2), ["keep", "keep"]);
  assert.deepEqual(parseVerdicts('[{"i":1,"v":"nuke it"}]', 1), ["keep"]);

  const candidates = [
    { url: "a", title: "Recall Insert", domain: "etsy.com" },
    { url: "b", title: "Dental Recall Tracker", domain: "etsy.com" },
  ];
  const ok = async () => new Response(JSON.stringify({ content: [{ type: "text", text: '[{"i":1,"v":"keep"},{"i":2,"v":"off-topic"}]' }] }));
  assert.deepEqual([...(await judgeResults("Recall", candidates, { apiKey: "k", fetchImpl: ok as typeof fetch }))], [["b", "off-topic"]]);
  // fail open: no key, API error, network failure -> nothing rejected
  assert.equal((await judgeResults("Recall", candidates, { apiKey: "", fetchImpl: ok as typeof fetch })).size, 0);
  const bad = async () => new Response("nope", { status: 500 });
  assert.equal((await judgeResults("Recall", candidates, { apiKey: "k", fetchImpl: bad as typeof fetch })).size, 0);
  const boom = async () => { throw new Error("network"); };
  assert.equal((await judgeResults("Recall", candidates, { apiKey: "k", fetchImpl: boom as typeof fetch })).size, 0);
});
