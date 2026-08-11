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
  Covenant: /halo|vhorlath|darkmoon|xenomorph|prometheus|\balien\b|ark of the covenant|indiana jones|\bneca\b|\blds\b|relief society|baptismal|general conference/i,
  // "kyosho"/"vfc"/"aeg"/"hpa"/"wolverine inferno" added in the fifth audit
  // -- Kyosho is an RC-car brand with an "Inferno" model line, and
  // VFC/AEG/HPA/Wolverine are airsoft-gun brands/terminology that all
  // happen to use "Inferno" as a product name.
  // "tcg binder"/"tcg display" added in the seventh audit -- a Magic: The
  // Gathering card named "Inferno" showing up in trading-card-storage
  // listings, flat card-binder products rather than 3D-print files.
  Inferno: /cs:?go|\bcs2\b|\bdante\b|botticelli|fortnite|arcadia quest|ghost rider|\bkyosho\b|\bvfc\b|\baeg\b|\bhpa\b|wolverine inferno|tcg binder|tcg display/i,
  // "dog recall/training"/"active recall" added in the fifth audit -- dog
  // obedience-training content ("recall" is the actual training term for
  // a dog returning when called) and "active recall" (a real study
  // technique, ironic collision with the study-guide content this game
  // already attracts).
  Recall: /\bhonda\b|\bacura\b|total recall|schwarzenegger|johnny cab|\bquaid\b|heroquest|ultima online|\bnerf\b|for seniors|reminiscing|memory care|dog (recall|training)|active recall/i,
  Lacrimosa: /neverness to everness|\bnte\b|ys viii|\bmozart\b|\brequiem\b|piano (sheet music|lesson)/i,
  "Tag Team": /pokemon go|heroquest|\bwwf\b|funko pop/i,
  "The Anarchy": /sons of anarchy|marvel|spiderpunk/i,
  // "chainsaw man" added in the fifth audit -- an anime franchise.
  // "falling entropy" added in the sixth audit -- a maker/designer's actual
  // username on these sites, which naturally collides with both "Falling"
  // and "Entropy" since it contains both words.
  Falling: /under falling skies|chainsaw man|falling entropy/i,
  Speakeasy: /murder mystery|speakeasy arms/i,
  // "charred earth"/"earth day"/"happiest place on earth" added in the
  // fifth audit -- a wargaming terrain term, the environmental holiday,
  // and the Disney tagline, respectively. Broadened to bare "disney(land)"
  // in the eighth audit after a second, differently-worded Disney tagline
  // ("Most Magical Place on Earth") showed up -- chasing each individual
  // tagline wasn't going to keep up with Disney's own marketing copy.
  Earth: /\bpuzzle\b|topograph|\bcoaster\b|\bglobe\b|\batlas\b|\belemental\b|\bepcot\b|spaceship earth|charred earth|earth day|happiest place on earth|disney(land)?/i,
  Sand: /sand dune|sand castle|\bsandbox\b|kinetic sand|sand mold|sand play|sand scoop|sand dollar|sand ladder|sand jacuzzi|sand filter|sand clock/i,
  // "blueprints? for luthier"/"mayones" added in the fourth audit, "luthier
  // plans" added in the seventh (same recurring Etsy series, just phrased
  // "Luthier Plans...Blueprint" instead of "Blueprints for luthier") -- a
  // recurring series of paper guitar-building plans/blueprints (2D PDF
  // plans, not 3D-print files), distinct from the "guitar" theming
  // deliberately left unexcluded above since the board game itself is
  // about being a luthier.
  Luthier: /radius block|\bclamps?\b|\bcello\b|headstock|\bc3po\b|nut files?|string spacer|blueprints? for luthier|luthier plans|\bmayones\b/i,
  "Galileo Galilei": /\bstatue\b|\bbust\b|portachiavi|\bkeychain\b|eppur si muove|\bstencil\b|pendulum clock|\bquadrants?\b|planetario|planetarium/i,
  Forestry: /relascope|angle gauge|densiometer|\bforwarder\b|\btyres?\b|\bdozer\b|\bgrapple\b|half-track|logging (equipment|truck)/i,
  "Black Forest": /schwarzwald|bollenhut|\bmug\b|\bbookmark\b|watermelon|battbox|vapor.*box/i,
  Funfair: /z-scale|\bnerf\b|teacup ride|\bcarousel\b|\bkermis\b|tornado carnival|toilet container|beer tent|ride seat/i,
  // "nerf"/"airsoft"/"league of legends"/"leona"/"kamen rider"/"mu online"/
  // "voron"/"nike undercover" added in the fifth audit -- Daybreak collides
  // with an unusually wide spread of unrelated brands/franchises, each
  // using "Daybreak" as a product/character/model name.
  Daybreak: /\bnerf\b|airsoft|league of legends|\bleona\b|kamen rider|mu online|\bvoron\b|nike undercover/i,
  // "a-team"/"scooby"/"doctor who"/"paternoster"/"little rascals"/
  // "freshies"/"villain gang" added in the fifth audit.
  "The Gang": /\ba-team\b|\bscooby\b|doctor who|paternoster|little rascals|\bfreshies\b|villain gang/i,
  // "tyres?/tires?" added in the fifth audit -- Yokohama is a real tire
  // brand, which turned out to be the dominant collision (Porsche racing
  // wheels, tire logos), plus travel-guide content for the actual city.
  Yokohama: /\btyres?\b|\btires?\b|reiseführer|field guide/i,
  // Fromage collides with its own literal meaning -- French for "cheese" --
  // so almost everything found for it is real cheese-making equipment/
  // recipes rather than board-game accessories. Can't exclude on "fromage"
  // itself (that's the search term), so this keys on the specific
  // cheese-tool/recipe vocabulary instead.
  Fromage: /tupperware|\bmoulin\b|\brape\b|\bpresse\b|gâteau|glaçage|\bchevre\b/i,
  // "cthulhu"/"sisters of battle"/"sky children of (the) light"/
  // "rocamadour" added in the fifth audit -- Sanctuary's noise is mostly
  // generic fantasy/sci-fi terrain with no single unifying vocabulary
  // (unlike Earth/Sand/etc above), so only the identifiable franchise
  // names could safely be excluded; the rest stays in the unfixable
  // bucket.
  Sanctuary: /cthulhu|sisters of battle|sky children of (the )?light|rocamadour/i,
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
  // respectively) -- the rest is generic fantasy/wargaming terrain with no
  // single unifying vocabulary to key off of, same as Sanctuary's
  // unfixable remainder.
  Ruins: /\bulvheim\b|\bcitadel\b/i,
};
