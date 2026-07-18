/**
 * None of these sites offer a public search API without an approved app
 * (Thingiverse, Etsy) or have terms that discourage scraping (MakerWorld,
 * Printables). Deep-linking straight to each site's own search results is
 * the reliable way to help someone browse. They paste back whatever link
 * they find via the "Add a print" form, which unfurls it automatically.
 */
export interface SearchTarget {
  key: string;
  label: string;
  url: string;
}

export function searchLinksForGame(gameName: string): SearchTarget[] {
  const q = encodeURIComponent(gameName);
  return [
    { key: "thingiverse", label: "Thingiverse", url: `https://www.thingiverse.com/search?q=${q}&type=things` },
    { key: "printables", label: "Printables", url: `https://www.printables.com/search/models?q=${q}` },
    { key: "makerworld", label: "MakerWorld", url: `https://makerworld.com/en/search/models?keyword=${q}` },
    { key: "cults3d", label: "Cults3D", url: `https://cults3d.com/en/search?q=${q}` },
    { key: "myminifactory", label: "MyMiniFactory", url: `https://www.myminifactory.com/search/?query=${q}` },
    { key: "etsy", label: "Etsy", url: `https://www.etsy.com/search?q=${encodeURIComponent(gameName + " insert")}` },
    { key: "bgg-geeklist", label: "BGG 3D Prints list", url: "https://boardgamegeek.com/geeklist/186909/3d-prints-for-board-games" },
  ];
}
