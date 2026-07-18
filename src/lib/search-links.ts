/**
 * Thingiverse, Printables, Cults3D, and Etsy are covered by the "Search
 * all sites" button above these links, so they don't need a deep link
 * too. MakerWorld and MyMiniFactory have no working search API (see
 * UNSUPPORTED_SITES) and BGG's GeekList blocks API access entirely, so
 * those three stay as manual-browse deep links.
 */
export interface SearchTarget {
  key: string;
  label: string;
  url: string;
}

export function searchLinksForGame(gameName: string): SearchTarget[] {
  const q = encodeURIComponent(gameName);
  return [
    { key: "makerworld", label: "MakerWorld", url: `https://makerworld.com/en/search/models?keyword=${q}` },
    { key: "myminifactory", label: "MyMiniFactory", url: `https://www.myminifactory.com/search/?query=${q}` },
    { key: "bgg-geeklist", label: "BGG 3D Prints list", url: "https://boardgamegeek.com/geeklist/186909/3d-prints-for-board-games" },
  ];
}
