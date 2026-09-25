/**
 * Games whose name is also a well-known other franchise/IP/brand --
 * relevance.ts's title-word-match has no way to know a genuinely
 * well-made 3D-print result is about that OTHER thing, not this board
 * game (a real Halo "Covenant" faction miniature, a real Counter-Strike
 * "Inferno" map model, a real Mozart "Lacrimosa" piano sheet). Unlike the
 * generic tabletop-signal check (misc-terms.ts's hasTabletopSignal,
 * rejected for regular games -- see etsy.ts's own comment on why), these
 * are negative exclusions on a specific, unambiguous marker, so they
 * can't accidentally cut a real result the way a positive requirement
 * would: a real "Covenant" board-game accessory would never legitimately
 * mention "Halo". Verified each pattern against every currently-visible
 * result for its game before adding (2026-07-30) -- the only two matches
 * found were themselves more of the same collision noise, not real hits.
 *
 * A second group below doesn't have a single other franchise/brand to key
 * off of, but does have its own consistent *domain vocabulary* -- checked
 * what a genuinely correct match looks like for each of these games first
 * (2026-07-30): it's almost always just "Insert"/"Organizer"/"Board Game
 * Insert", nothing else, while the noise clusters around real-world
 * industry/hobby/craft terms for that literal word (globes and topography
 * for "Earth", kinetic sand toys for "Sand", guitar-building tools for
 * "Luthier", historical-figure busts and astronomy instruments for
 * "Galileo Galilei", literal logging equipment for "Forestry", z-scale
 * model railway parts for "Funfair"). "Sand" specifically has zero
 * currently-correct results at all -- literally everything ever found for
 * it has been noise. Deliberately conservative about which words to
 * exclude on: skipped anything that could plausibly be real game theming
 * rather than pure collision, e.g. "cuckoo clock" for Black Forest (that
 * board game is actually about Black Forest cuckoo-clock making, so a
 * clock-themed piece could be a genuine accessory) and "guitar" for
 * Luthier (the board game is about being a luthier, so guitar-themed
 * pieces are plausibly real). Verified every pattern below against every
 * currently-visible result for its game -- zero risk in 6 of 7; the one
 * hit (a "Kermis Model Booster Ride" under Funfair) was itself more
 * z-scale model-railway noise, not a real result.
 */
export const KNOWN_COLLISION_EXCLUSIONS: Record<string, RegExp> = {
  // "lds"/"relief society"/"baptismal"/"general conference" added in the
  // fifth audit -- LDS/Mormon religious-education content ("covenant" is a
  // significant term in LDS theology), same collision shape as the
  // religious "Ark of the Covenant" content already excluded here.
  // "non-compete" added in the sixteenth audit -- "covenant" is real legal
  // terminology for a binding contract clause, so Etsy surfaces non-compete
  // agreement templates on name alone; two separate listings hit this.
  Covenant: /halo|vhorlath|darkmoon|xenomorph|prometheus|\balien\b|ark of the covenant|indiana jones|\bneca\b|\blds\b|relief society|baptismal|general conference|non-?compete/i,
  // "kyosho"/"vfc"/"aeg"/"hpa"/"wolverine inferno" added in the fifth audit
  // -- Kyosho is an RC-car brand with an "Inferno" model line, and
  // VFC/AEG/HPA/Wolverine are airsoft-gun brands/terminology that all
  // happen to use "Inferno" as a product name.
  // "tcg binder"/"tcg display" added in the seventh audit -- a Magic: The
  // Gathering card named "Inferno" showing up in trading-card-storage
  // listings, flat card-binder products rather than 3D-print files.
  // "warhound"/"conversion bits?"/"beast wars"/pokemon added in the
  // nineteenth audit -- Warhammer 40k's Warhound Titan, wargaming
  // hobby-conversion bits, Transformers Beast Wars, and Pokemon TCG
  // content all separately use "Inferno" as a unit/card/character name.
  // Verified against Inferno's own 2 currently-correct results and the
  // full visible corpus -- zero false positives.
  Inferno: /cs:?go|\bcs2\b|\bdante\b|botticelli|fortnite|arcadia quest|ghost rider|\bkyosho\b|\bvfc\b|\baeg\b|\bhpa\b|wolverine inferno|tcg binder|tcg display|\bwarhound\b|conversion bits?|beast wars|pok[ée]mon/i,
  // "dog recall/training"/"active recall" added in the fifth audit -- dog
  // obedience-training content ("recall" is the actual training term for
  // a dog returning when called) and "active recall" (a real study
  // technique, ironic collision with the study-guide content this game
  // already attracts).
  // "wand of recall"/"mopar"/"kelsey hayes" added in the nineteenth audit --
  // a D&D spell item and a classic Mopar-car wheel-recall listing, same
  // scattered-real-world-"recall" shape as the rest of this entry.
  Recall: /\bhonda\b|\bacura\b|total recall|schwarzenegger|johnny cab|\bquaid\b|heroquest|ultima online|\bnerf\b|for seniors|reminiscing|memory care|dog (recall|training)|active recall|wand of recall|\bmopar\b|kelsey hayes/i,
  Lacrimosa: /neverness to everness|\bnte\b|ys viii|\bmozart\b|\brequiem\b|piano (sheet music|lesson)/i,
  // "wwe"/"wrestl"/"usos"/"wrestlemania"/"tag team title" added in the
  // seventeenth audit -- "wwf" already covered the old name, but real WWE
  // tag-team wrestling content (belts, wrestler figures) uses the current
  // brand name and generic wrestling vocabulary instead.
  // "tag team belts?" added in the eighteenth audit -- an AWA (a real
  // wrestling promotion) title belt listing that the seventeenth audit's
  // "tag team title" phrase didn't catch, since sellers also say "belts."
  // Verified against Tag Team's own 2 currently-correct results and the
  // full visible corpus -- zero false positives.
  "Tag Team": /pokemon go|heroquest|\bwwf\b|funko pop|\bwwe\b|wrestl|\busos\b|wrestlemania|tag team title|tag team belts?/i,
  // "grinder"/"knucks"/"fgc9"/"anarchy symbol"/"cyber twins"/"no masters no
  // slaves" added in the seventeenth audit -- anarchism as a real
  // political/punk concept and symbol surfaces an unusually wide spread of
  // unrelated things: airsoft/firearm lower receivers (FGC9), herb
  // grinders, brass knuckles, the anarchy symbol itself. Checked against
  // all 7 currently-visible results first -- all plain Insert/Organizer/
  // Tray listings, none use this vocabulary.
  "The Anarchy": /sons of anarchy|marvel|spiderpunk|\bgrinder\b|\bknucks\b|fgc9|anarchy symbol|cyber twins|no masters no slaves/i,
  // "chainsaw man" added in the fifth audit -- an anime franchise.
  // "falling entropy" added in the sixth audit -- a maker/designer's actual
  // username on these sites, which naturally collides with both "Falling"
  // and "Entropy" since it contains both words.
  Falling: /under falling skies|chainsaw man|falling entropy/i,
  // "prohibition"/"roaring 20s"/"art deco"/"gatsby" added in the fourteenth
  // audit -- the same 1920s-speakeasy party/decor genre as "murder
  // mystery" above, just a different corner of it (calendars, party decor,
  // rather than mystery-party kits).
  // "peephole grille"/"call of duty"/"clan tinleg" added in the nineteenth
  // audit -- a real speakeasy-door hardware part, a Call of Duty weapon-
  // skin prop, and an unrelated fantasy dwarf model, all naming
  // "speakeasy" without being this game.
  Speakeasy: /murder mystery|speakeasy arms|prohibition|roaring 20s|art deco|gatsby|peephole grille|call of duty|clan tinleg/i,
  // "charred earth"/"earth day"/"happiest place on earth" added in the
  // fifth audit -- a wargaming terrain term, the environmental holiday,
  // and the Disney tagline, respectively. Broadened to bare "disney(land)"
  // in the eighth audit after a second, differently-worded Disney tagline
  // ("Most Magical Place on Earth") showed up -- chasing each individual
  // tagline wasn't going to keep up with Disney's own marketing copy.
  Earth: /\bpuzzle\b|topograph|\bcoaster\b|\bglobe\b|\batlas\b|\belemental\b|\bepcot\b|spaceship earth|charred earth|earth day|happiest place on earth|disney(land)?/i,
  // "spirograph"/"sand tools?"/"pattern rollers?" added in the eighteenth
  // audit -- more of the same craft-supply/beach-toy genre as the rest of
  // this list (Sand has zero real results ever). Verified against the full
  // visible corpus -- zero false positives.
  // "kief" added in the nineteenth audit -- a weed-storage container shaped
  // like a sandbox. This game has zero currently-correct results ever.
  Sand: /sand dune|sand castle|\bsandbox\b|kinetic sand|sand mold|sand play|sand scoop|sand dollar|sand ladder|sand jacuzzi|sand filter|sand clock|spirograph|sand tools?|pattern rollers?|\bkief\b/i,
  // "blueprints? for luthier"/"mayones" added in the fourth audit, "luthier
  // plans" added in the seventh (same recurring Etsy series, just phrased
  // "Luthier Plans...Blueprint" instead of "Blueprints for luthier") -- a
  // recurring series of paper guitar-building plans/blueprints (2D PDF
  // plans, not 3D-print files), distinct from the "guitar" theming
  // deliberately left unexcluded above since the board game itself is
  // about being a luthier.
  // "tool holders?"/"files? holders?"/"neck rest"/"setup tools?"/
  // "potenciometros?" added in the nineteenth audit -- real guitar-repair
  // tool-storage listings for actual luthiers, a genuine craft-tool genre
  // distinct from the game's own "being a luthier" theming this entry
  // otherwise deliberately leaves alone.
  Luthier: /radius block|\bclamps?\b|\bcello\b|headstock|\bc3po\b|nut files?|string spacer|blueprints? for luthier|luthier plans|\bmayones\b|tool holders?|files? holders?|neck rest|setup tools?|potenciometros?/i,
  // "tiny legends"/"chibi"/"conversation companion" added in the nineteenth
  // audit -- a chibi-figurine product line and an unrelated ed-tech app
  // both use the real historical figure's name. Verified against this
  // game's own 9 currently-correct results and the full visible corpus.
  "Galileo Galilei": /\bstatue\b|\bbust\b|portachiavi|\bkeychain\b|eppur si muove|\bstencil\b|pendulum clock|\bquadrants?\b|planetario|planetarium|tiny legends|\bchibi\b|conversation companion/i,
  Forestry: /relascope|angle gauge|densiometer|\bforwarder\b|\btyres?\b|\bdozer\b|\bgrapple\b|half-track|logging (equipment|truck)/i,
  "Black Forest": /schwarzwald|bollenhut|\bmug\b|\bbookmark\b|watermelon|battbox|vapor.*box/i,
  // "funfair ride"/"fairground ride"/"chariot seat" added in the nineteenth
  // audit -- more carnival-ride 3D-print models, same genre as the teacup-
  // ride/carousel terms already here. Verified against Funfair's own 2
  // currently-correct results and the full visible corpus.
  Funfair: /z-scale|\bnerf\b|teacup ride|\bcarousel\b|\bkermis\b|tornado carnival|toilet container|beer tent|ride seat|funfair ride|fairground ride|chariot seat/i,
  // "nerf"/"airsoft"/"league of legends"/"leona"/"kamen rider"/"mu online"/
  // "voron"/"nike undercover" added in the fifth audit -- Daybreak collides
  // with an unusually wide spread of unrelated brands/franchises, each
  // using "Daybreak" as a product/character/model name.
  Daybreak: /\bnerf\b|airsoft|league of legends|\bleona\b|kamen rider|mu online|\bvoron\b|nike undercover/i,
  // "a-team"/"scooby"/"doctor who"/"paternoster"/"little rascals"/
  // "freshies"/"villain gang" added in the fifth audit. "girl gang"/
  // "raccoon gang"/"dachshund gang" added in the fourteenth -- "gang" is
  // a common cutesy suffix for people/pet-group merchandise, same shape
  // as "villain gang" above.
  // Bare "terrain" added in the nineteenth audit -- a wargaming-terrain
  // listing ("Press Gang Stockade Terrain"), same generic-hobby shape as
  // the terrain terms elsewhere in this file. Verified against this
  // game's own 10 currently-correct results first -- none use this word.
  "The Gang": /\ba-team\b|\bscooby\b|doctor who|paternoster|little rascals|\bfreshies\b|villain gang|girl gang|raccoon gang|dachshund gang|\bterrain\b/i,
  // "tyres?/tires?" added in the fifth audit -- Yokohama is a real tire
  // brand, which turned out to be the dominant collision (Porsche racing
  // wheels, tire logos), plus travel-guide content for the actual city.
  // "hueforge" added in the sixteenth audit -- Yokohama is also a real
  // Japanese city, and makers create HueForge (multi-color layered
  // lithophane) art of its actual landmarks (Marine Tower, the Red Brick
  // Warehouse) -- three separate listings hit this exact term.
  // "slot car"/"carrera"/"manhole" added in the nineteenth audit -- a
  // Carrera slot-car advertising sign and a manhole-cover coaster, both
  // real-world Yokohama-the-city collisions rather than this game.
  Yokohama: /\btyres?\b|\btires?\b|reiseführer|field guide|hueforge|slot car|\bcarrera\b|\bmanhole\b/i,
  // Fromage collides with its own literal meaning -- French for "cheese" --
  // so almost everything found for it is real cheese-making equipment/
  // recipes rather than board-game accessories. Can't exclude on "fromage"
  // itself (that's the search term), so this keys on the specific
  // cheese-tool/recipe vocabulary instead.
  // "rape" broadened to "r[aâ]pe" in the nineteenth audit -- a French
  // cheese-grater listing spelled it with the accented "râpe", which the
  // plain-"a" version silently never matched.
  Fromage: /tupperware|\bmoulin\b|\br[aâ]pe\b|\bpresse\b|gâteau|glaçage|\bchevre\b/i,
  // "cthulhu"/"sisters of battle"/"sky children of (the) light"/
  // "rocamadour" added in the fifth audit -- Sanctuary's noise is mostly
  // generic fantasy/sci-fi terrain with no single unifying vocabulary
  // (unlike Earth/Sand/etc above), so only the identifiable franchise
  // names could safely be excluded; the rest stays in the unfixable
  // bucket. "wargaming terrain"/"tabletop terrain"/"dnd"/"rpg scenery"/
  // "scatter terrain" added in the fourteenth audit -- these ARE real 3D-
  // print STL files (unlike the rest of this file's non-3d-print
  // exclusions), just for generic D&D/wargaming terrain rather than this
  // specific game. Checked against Sanctuary's own 5 currently-correct
  // results first -- none use this vocabulary, they're all plain
  // Insert/Organizer/Dice Tray listings. Broadened to bare "terrain" in the
  // eighteenth audit -- the compound phrases above missed plain "Terrain
  // Tiles" listings; a real Sanctuary insert/organizer never uses this
  // word. Re-verified against the same 5 correct results and the full
  // visible corpus -- bare "terrain" only otherwise matches a different
  // game's own real listing, unaffected since this exclusion is scoped to
  // Sanctuary only. (The "<N>mm scale" half of that same collision was
  // promoted to the general WARGAMING_SCALE_PATTERN below instead, since
  // it isn't specific to Sanctuary.) Bare "ruins?" added in the nineteenth
  // audit -- another generic-wargaming-terrain word Sanctuary's noise
  // shares, same shape as "terrain" above. NOTE: this word alone has 23
  // real matches DB-wide, all for the unrelated game "Lost Ruins of
  // Arnak" -- harmless here since this exclusion only ever runs against
  // Sanctuary's own search results, never Arnak's.
  Sanctuary: /cthulhu|sisters of battle|sky children of (the )?light|rocamadour|\bterrain\b|\bruins?\b|\bdnd\b|d&d|rpg scenery/i,
  // Entropy has zero currently-correct results ever, same as "Sand" --
  // it's a real thermodynamics term, so the noise splits between literal
  // physics/chemistry content ("T-s diagram", "enthalpy") and several
  // unrelated hobby-brand product lines that all happen to be named
  // "Entropy" (a CNC calibration test block, an RC-crawler part, a razor
  // brand, a fantasy miniature series called "Vessel of Entropy", and
  // "Entropy: Zero", a Half-Life fan mod).
  Entropy: /milled in aluminum|step files|t-s diagram|enthalpy|vessel of entropy|entropy zero|arnoz brain board|entropy cannon|entropy razors|falling entropy/i,
  // Added in the eighth audit -- a psychology/psychoanalysis game name
  // collision, structurally identical to Galileo Galilei/Recall/etc:
  // "Unconscious Mind" is a real psychology concept, so Etsy surfaces
  // genuine Freud/Jung study content on name alone. The board game's own
  // real results are consistently Insert/Organizer/Tray-worded, checked
  // against all 20 currently-visible rows before adding.
  "Unconscious Mind": /\bfreud\b|\bjung\b|psychoanalysis|psychodynamic/i,
  // Added in the eighth audit -- "Toy Battle" is generic enough that Etsy/
  // Thingiverse return literal toy-weapon replicas and unrelated character
  // props on name alone (a Marvel "Thor" prop, a "Toy car"). Narrower than
  // most entries here since only 4 rows exist total for this game so far.
  "Toy Battle": /\bthor\b|toy cars?/i,
  // Added in the eighth audit -- "Ruins" collides with the entire
  // wargaming-terrain genre (a real, extremely common terrain category
  // name), so this game has zero currently-correct results, same as Sand/
  // Falling/Entropy. "Ulvheim" and "Citadel" are the only two
  // identifiable, safely-excludable brand names in the noise (a specific
  // terrain product line and Games Workshop's own miniatures brand,
  // respectively). Revisited in the fourteenth audit: a fresh batch of
  // "wrong game" tags turned out to share real vocabulary after all --
  // "wargaming terrain"/"tabletop terrain"/"DnD"/"RPG scenery"/"scatter
  // terrain" -- so the "no unifying vocabulary" call above no longer
  // fully holds. Safe to add since this game still has zero currently-
  // correct results to protect.
  // "diorama"/"miniature terrain" added in the sixteenth audit -- more
  // generic-terrain STL listings that don't happen to say "DnD"/
  // "wargaming" but are the same real-3D-print-wrong-hobby shape.
  // "aquarium"/"terrarium"/"reptile" added in the seventeenth audit -- a
  // real 3D-print hobby genre (tank decor) that also uses "ruins" as
  // literal decoration description. Broadened to bare "terrain"/
  // "wargam(e|ing)"/"mordheim" (a specific Games Workshop wargame) and to
  // "planter"/"bookmark" (real craft items, a different genre) in the
  // eighteenth audit -- same "real 3D-print, generic wargaming/craft
  // subject, zero board-game relevance" shape as everything else here.
  // This game still has zero currently-correct results ever (60 rows
  // found, 0 visible), so every one of these is maximally safe.
  Ruins: /\bulvheim\b|\bcitadel\b|\bterrain\b|\bdnd\b|d&d|rpg scenery|\bdiorama\b|aquarium|terrarium|reptile|wargam(e|ing)|\bmordheim\b|\bplanters?\b|\bbookmarks?\b/i,
  // Added in the ninth audit -- "Ants" has zero currently-correct results
  // ever, same shape as Sand/Entropy/Ruins: it's a real insect, so Etsy/
  // Printables/Thingiverse/Cults3D surface actual ant-keeping/pest-control
  // hobbyist prints (ant farms, feeder tubes, anti-ant cat-food bowls) on
  // name alone. Deliberately skipped a few generic titles ("Giant Ants",
  // "Terminal Ants", "Ants Mini") that could plausibly be real game
  // miniatures rather than noise, same caution as the rest of this group.
  Ants: /ant farm|ants? nest|anti-?ants|ameisenbuffet|ants?[- ]?keeper|bait holder|worker ants|ants?[- ]buffet|ants logo|rick and morty|\btrough\b/i,
  // Eleventh audit (2026-08-15) -- six more games added after a large manual
  // hide pass surfaced clear, repeating collision clusters rather than
  // scattered noise. Each verified against every currently-visible row for
  // its game before adding.
  //
  // Hibachi collides with the hibachi-grill birthday-party planning genre
  // (chopstick sleeves, place cards, banners, grilling-table blueprints) --
  // real party content, not 3D prints, all sharing this specific vocabulary.
  Hibachi: /chopstick|place card|party decor|birthday|banner|grilling table|teppanyaki|left right game|water bottle label|hibachi night|blackstone/i,
  // "Tea Garden" collides with the ladies'/bridal tea-party planning genre
  // -- every real hit for this game says "Insert"/"Organizer"/"Puerh", never
  // "tea party".
  // "tea lights?"/"lego"/"zen garden" added in the nineteenth audit -- a
  // candle listing, a LEGO set replacement part, and an unrelated zen-
  // garden kit, all sharing "tea"/"garden" separately rather than being
  // this game.
  "Tea Garden": /tea party|tea lights?|\blego\b|zen garden/i,
  // Iliad collides with Greek-mythology classroom/gift content (Homer's
  // actual subject matter, so relevance.ts can't tell them apart on name
  // alone) -- Achilles/Agamemnon namecards, escape-room activities, word-
  // cloud prints. A second collision (a French ISP's "Freebox"/"Iliad Box"
  // router hardware) exists too but is too ambiguous to safely exclude --
  // a currently-correct result ("Cable cover box for Iliad Box") uses the
  // same "Iliad Box" phrase, so only the unambiguous router-only terms
  // would be safe, and none of those appeared often enough here to bother.
  // "freebox"/"nas"/"wifi 6"/"zimablade" added in the nineteenth audit --
  // "Iliad" (Free/Iliad) is also a real French ISP whose router hardware
  // ("Freebox"/"Iliadbox") and NAS-enclosure mod projects collide here.
  // Deliberately left bare "iliad box" alone: a currently-visible real
  // result ("Cable cover box for Iliad Box") uses that exact phrase too,
  // so it can't be safely distinguished from the router by title alone.
  Iliad: /greek mythology|escape room|word clouds?|digital stamps?|trojan war|\bagamemnon\b|\bachilles\b|freebox|\bnas\b|wifi\s*6|zimablade/i,
  // "Flip 7" collides with THREE unrelated real products that all happen to
  // share the name: the Samsung Galaxy Z Flip 7 (foldable phone cases/
  // skins/stands), the JBL Flip 7 (bluetooth speaker holders), and GoPro's
  // flip-door housings. None of this app's real Flip 7 results ever
  // mention a phone, speaker, or camera brand.
  "Flip 7": /z flip 7|samsung.*flip|galaxy.*flip|jbl flip|gopro/i,
  // Parks collides with two unrelated things: Disney theme-park content
  // (its own tagline/vacation-planning vocabulary), and romance novelist
  // Eliza Parks (her full name, not a real risk of matching a genuine
  // insert title).
  Parks: /eliza parks|disney|rosa parks/i,
  // Lisboa (the board game, named for the city) collides with the city's
  // two football clubs, Benfica and Sporting CP -- team logos, stadium
  // models, signed photos.
  Lisboa: /benfica|sporting (clube|de lisboa)|soccer team|futebol/i,
  // Twelfth audit (2026-08-22-ish, a week's worth of manual hides reviewed
  // at once). "Tea Witches" collides with Halloween witch-themed tea party
  // content (tea light candle holders, witch tea party games, tea bag
  // favors) -- this game has almost no real results (2 visible) buried
  // under it.
  "Tea Witches": /tea light|witches? tea|tea bag envelope|apothecary label/i,
  // "Distilled" collides with literal distilled water (Instapot capture,
  // water bottle handles, skincare toner) -- real results for this game
  // say "Insert"/"Organizer", never "distilled water".
  Distilled: /distilled water/i,
  // "The White Castle" collides with Disney-princess/fairytale imagery
  // (Snow White, unicorns, Evil Queen) that share "white" and "castle"
  // separately. Narrower than a bare "castle" exclusion would need to be --
  // the game itself is about Himeji Castle (nicknamed "White Heron
  // Castle"), so a currently-correct result legitimately uses that
  // vocabulary; this only targets the unambiguous Disney/fairytale terms.
  // "cinderella castle" added in the fourteenth audit -- Disney's actual
  // Magic Kingdom castle name, same shape as the other Disney terms here
  // but doesn't contain the literal word "disney".
  // "3d model of the japanese castle" added in the eighteenth audit -- a
  // generic tourist/decorative Himeji Castle model, hidden by the user
  // despite the game's own real Himeji-Castle connection this exclusion
  // list otherwise deliberately avoids touching. Checked all 14 currently-
  // visible results first: none use "Himeji"/"White Heron" at all -- every
  // real listing just says "The White Castle" directly (Insert/Organizer/
  // Bridge/Token) -- so this narrow decorative-model phrase is safe and
  // doesn't touch the bare Himeji/White Heron vocabulary itself.
  "The White Castle": /disney|unicorn|evil queen|coquette|cinderella castle|3d model of the japanese castle/i,
  // Added in the fourteenth audit -- "Res Arcana" collides with tarot's own
  // "Major Arcana" terminology, so Etsy surfaces genuine tarot decks on
  // name alone.
  "Res Arcana": /tarot|major arcana/i,
  // Added in the nineteenth audit -- literal Mars-planet astronomy/sci-fi
  // terrain models (crater/canyon/city names) that collide with the game's
  // own name. Verified against this game's own 10 currently-correct
  // results first -- none use these specific named features.
  "On Mars": /gusev crater|olympus mons|gossamer canyon|sulfur city/i,
  // Added in the nineteenth audit -- "SecSavr Skyrise" is a real resin 3D
  // printer model, and "Christophsis" is a Star Wars planet name; neither
  // is this game. Verified against this game's own 4 currently-correct
  // results first.
  Skyrise: /secsavr|christophsis/i,
  // Added in the nineteenth audit -- "corral"/"commissary" are real
  // ranch/livestock-supply terms that a separate "Tend" product line uses,
  // distinct from this game's own accessories. Verified against this
  // game's own 2 currently-correct results first.
  Tend: /\bcorral\b|commissary/i,
};

/**
 * Unlike everything above, this one isn't keyed to any single game's own
 * vocabulary -- a "<N>mm scale" marker (28mm, 32mm, 18mm, ...) is generic
 * tabletop-wargaming-miniature notation that has nothing to do with which
 * game happens to share a search term with it. Promoted out of Sanctuary's
 * own entry in the eighteenth audit after the same marker turned up as an
 * unexplained hidden collision on a completely different game (Entropy --
 * "The Lady of Entropy ... 32mm scale"), confirming it's a cross-game
 * signal rather than a Sanctuary quirk. These ARE real 3D-print STL files,
 * same as the terrain terms above -- just for generic wargaming miniatures
 * rather than any specific board game. A real board-game insert/organizer
 * listing has no reason to ever cite a miniature scale this way -- verified
 * zero matches across all 1417 currently-visible results, every game.
 * Applied in scan.ts to every game's default query, alongside (not instead
 * of) any per-game KNOWN_COLLISION_EXCLUSIONS entry above.
 */
export const WARGAMING_SCALE_PATTERN = /\d+\s*mm\s*scale/i;

/**
 * Same shape as WARGAMING_SCALE_PATTERN above -- these ARE real 3D-print
 * STL files, just for a different physical-scale hobby than tabletop board
 * games: 1:12-ish dollhouse miniatures and "book nook" diorama inserts
 * (a bookshelf-insert scene, a distinct and prolific STL genre of its own).
 * Added in the nineteenth audit after a sweep of ~600 previously-unlabeled
 * hidden rows found this recurring across a dozen unrelated games
 * (Sanctuary, Inferno, ...) with no connection to any one game's own
 * vocabulary. Verified zero matches across all 1423 currently-visible
 * results, every game, every domain.
 */
export const DOLLHOUSE_MINIATURE_PATTERN = /book nooks?|dollhouse/i;
