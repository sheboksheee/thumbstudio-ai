/**
 * Topic-aware scene library for EA FC thumbnails.
 *
 * Deterministic keyword matching (Arabic + English) — no AI. Each topic gives
 * the image model a concrete, on-theme scene made of real Ultimate Team visual
 * language instead of random abstract effects.
 */

export interface Scene {
  id: string;
  /** Arabic label shown in the UI */
  label: string;
  /** Short Arabic hint shown under the label */
  hint: string;
  keywords: string[];
  /** What the main story element / hero object is */
  hero: string;
  /** Background and environment */
  background: string;
  /** Extra on-theme details */
  details: string;
  /** Default reaction for the creator */
  emotion: string;
}

export const SCENES: Scene[] = [
  {
    id: "card",
    label: "كرت / لاعب",
    hint: "تجربة أو مراجعة كرت",
    keywords: ["card", "player", "review", "كرت", "كارت", "بطاقة", "لاعب", "تجربة", "جربت", "مراجعة", "ريفيو", "تقييم"],
    hero: "the player card, large and slightly tilted toward the creator, razor-sharp, with a glow in the card's own colors",
    background: "a blurred EA FC stadium at night with floodlights, tinted with the card's colors",
    details: "light streaks and subtle sparks around the card, the card's rating clearly visible",
    emotion: "impressed, eyebrows raised",
  },
  {
    id: "pack",
    label: "تفتيح بكجات",
    hint: "بكجات، ووك أوت، سحبة قوية",
    keywords: ["pack", "packs", "pull", "walkout", "opening", "بكج", "بكجات", "باك", "باكو", "تفتيح", "فتحت", "سحبة", "سحبت", "ووك", "طلعلي", "طلعلى"],
    hero: "an EA FC pack-opening walkout moment — the card revealing in a burst of light",
    background: "the dark Ultimate Team pack-opening tunnel with intense walkout light beams and flares in the card's rarity color",
    details: "fireworks sparks, a strong glow from the pack, cinematic smoke",
    emotion: "shocked, mouth open, hands on head",
  },
  {
    id: "evolution",
    label: "تطوير / Evolution",
    hint: "قبل وبعد، تطوير كرت",
    keywords: ["evo", "evolution", "evolutions", "upgrade", "upgraded", "تطوير", "طورت", "ايفو", "إيفو", "ترقية", "ابجريد"],
    hero: "the same card shown before and after its upgrade, the upgraded version bigger and glowing",
    background: "a dark FUT-style background with an energy transformation effect between the two cards",
    details: "glowing upgrade arrows and rising stat numbers",
    emotion: "excited, pointing at the upgraded card",
  },
  {
    id: "champions",
    label: "FUT Champions",
    hint: "ويك إند، ترتيب، جوايز",
    keywords: ["champions", "champs", "fut champions", "weekend league", "wl", "rank", "rewards", "شامبيونز", "تشامبيونز", "ويك اند", "ويكند", "جوايز", "جوائز", "رانك", "تصنيف"],
    hero: "the FUT Champions trophy and a bold rank/record badge",
    background: "a dramatic esports arena with stadium floodlights and crowd bokeh",
    details: "motion streaks, competitive intensity, gold and blue accents",
    emotion: "intense and determined, or celebrating",
  },
  {
    id: "rivals",
    label: "Rivals / ديفيجن",
    hint: "مباريات، ديفيجن رايفلز",
    keywords: ["rivals", "division", "div", "رايفلز", "رايفالز", "ديفيجن", "ديفيزن", "دوري"],
    hero: "a division badge with the rank number",
    background: "an intense EA FC stadium at night, match atmosphere",
    details: "scoreboard-style glow, competitive energy",
    emotion: "focused, competitive",
  },
  {
    id: "squad",
    label: "تشكيلة",
    hint: "تشكيلة، ميزانية، فريق",
    keywords: ["squad", "team", "budget", "lineup", "تشكيلة", "تشكيله", "فريق", "سكواد", "ميزانية", "ميزانيه"],
    hero: "a neat arc of 3–5 FUT player cards forming the squad",
    background: "a clean pitch view with subtle formation lines",
    details: "consistent glow on all cards, a coin budget badge if relevant",
    emotion: "proud, presenting the squad",
  },
  {
    id: "sbc",
    label: "SBC / تحديات",
    hint: "تحدي تشكيلة، أوبجكتيف",
    keywords: ["sbc", "objective", "objectives", "تحدي", "تحديات", "اس بي سي", "أوبجكتيف", "اوبجكتيف", "مهام"],
    hero: "the SBC reward card with an upgrade pack beside it",
    background: "a FUT-style menu atmosphere, dark with neon accents",
    details: "checklist / completed-challenge glow",
    emotion: "satisfied, confident",
  },
  {
    id: "tactics",
    label: "خطط وتكتيك",
    hint: "خطة، تشكيل، تعليمات",
    keywords: ["tactic", "tactics", "formation", "custom tactics", "meta", "خطة", "خطه", "خطط", "تكتيك", "تكتيكات", "تعليمات", "طريقة لعب"],
    hero: "a glowing tactics board with a formation (dots and arrows)",
    background: "a dark pitch / chalkboard texture, minimal and readable",
    details: "glowing tactical lines that are simple enough to read at small size",
    emotion: "knowing, sharing a secret, pointing at the board",
  },
  {
    id: "icon",
    label: "أيقونة / هيرو",
    hint: "كروت أساطير",
    keywords: ["icon", "icons", "hero", "heroes", "legend", "legends", "أيقونة", "ايقونة", "ايكون", "أيكون", "هيرو", "اسطورة", "أسطورة", "اساطير"],
    hero: "a legendary Icon/Hero card with a premium golden sheen",
    background: "a golden, cinematic atmosphere with god rays and floating golden dust",
    details: "premium metallic reflections, epic scale",
    emotion: "awe, disbelief",
  },
  {
    id: "promo",
    label: "بروموشن (TOTY / TOTS)",
    hint: "فريق السنة، فريق الموسم",
    keywords: ["toty", "tots", "totw", "promo", "team of the year", "team of the season", "فريق السنة", "فريق الموسم", "توتي", "توتس", "بروموشن", "حدث"],
    hero: "the special promo card in its signature design",
    background: "the promo's signature colors (e.g. TOTY deep blue and gold, TOTS light blue) with themed light effects",
    details: "event-style glow and particles in the promo colors",
    emotion: "hyped, excited",
  },
  {
    id: "op",
    label: "كرت مكسور / ميتا",
    hint: "أوفر باور، بروكن",
    keywords: ["broken", "op", "overpowered", "insane", "cheat", "bug", "بروكن", "مكسور", "اوفر", "أوفر", "خرافي", "مرعب", "ميتا", "غش"],
    hero: "the card surrounded by a crackling electric energy aura, looking overpowered",
    background: "a dark stadium with lightning and energy effects",
    details: "electric arcs and shockwave, high energy",
    emotion: "disbelief, almost laughing",
  },
  {
    id: "coins",
    label: "كوينز وتريد",
    hint: "ربح كوينز، تريد",
    keywords: ["coins", "coin", "trading", "trade", "profit", "money", "كوينز", "كوين", "تريد", "تجارة", "ربح", "فلوس", "مليون"],
    hero: "stacks of golden FUT coins and a rising green profit graph",
    background: "a dark, rich background with golden light",
    details: "flying coins and sparkle",
    emotion: "excited, greedy grin",
  },
  {
    id: "gameplay",
    label: "جيم بلاي / مهارات",
    hint: "أهداف، مهارات، مباريات",
    keywords: ["goal", "goals", "skill", "skills", "gameplay", "match", "celebration", "هدف", "أهداف", "اهداف", "مهارة", "مهارات", "جيم بلاي", "ماتش", "مباراة"],
    hero: "a dynamic in-game action moment (shot, skill move or celebration) in EA FC broadcast style",
    background: "a packed stadium under floodlights with motion blur",
    details: "speed lines and ball trail",
    emotion: "hyped, celebrating",
  },
  {
    id: "comeback",
    label: "رجوع / من زمان",
    hint: "رجعت ألعب بيه بعد فترة",
    keywords: ["long time", "again", "return", "comeback", "back", "من زمان", "رجعت", "رجوع", "تاني", "ثاني", "بعد فترة", "زمان", "نسيت"],
    hero: "the card stepping out of the shadows into a bright spotlight, as if it has been forgotten and is now back",
    background: "a dark, dusty stadium where a single spotlight hits the card",
    details: "dust particles in the light beam, a nostalgic but epic feeling",
    emotion: "surprised, 'how did I forget this?'",
  },
];

export const GENERIC_SCENE: Scene = {
  id: "auto",
  label: "تلقائي",
  hint: "يختار حسب فكرة الفيديو",
  keywords: [],
  hero: "the main story element of the video",
  background: "an EA FC Ultimate Team stadium at night with dramatic floodlights",
  details: "subtle light streaks and depth",
  emotion: "a strong, believable reaction that fits the video",
};

const GENERIC_TOPICS = new Set(["card", "sbc", "gameplay", "comeback"]);

function norm(s: string) {
  return ` ${s.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/[^\p{L}\p{N}]+/gu, " ")} `;
}

/** Score every scene against the concept; best matches first. */
export function detectScenes(concept: string): Scene[] {
  const text = norm(concept);
  const scored = SCENES.map((sc) => {
    let score = 0;
    for (const nk of new Set(sc.keywords.map((k) => norm(k).trim()))) {
      if (!nk) continue;
      // Arabic words often carry prefixes (ال، ب، و) — allow substring for Arabic, word match for Latin.
      const isLatin = /^[a-z0-9 ]+$/.test(nk);
      const hit = isLatin ? text.includes(` ${nk} `) : text.includes(nk);
      if (hit) score += nk.length > 3 ? 2 : 1;
    }
    // Generic words ("card", "challenge", "again") count less than specific topics (hero, pack, TOTY…).
    return { sc, score: score * (GENERIC_TOPICS.has(sc.id) ? 0.75 : 1) };
  });
  return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).map((x) => x.sc);
}

export function sceneById(id: string | undefined | null): Scene | undefined {
  if (!id || id === "auto") return undefined;
  return SCENES.find((s) => s.id === id);
}

const EMOTION_WORDS: [string[], string][] = [
  [["صدمة", "صدمه", "مش مصدق", "مش مصدقه", "مستحيل", "shock", "shocked", "insane", "unbelievable", "wow", "omg", "يا نهار", "ياللهول"], "shocked, mouth open, hands on head"],
  [["زعلان", "خسرت", "خساره", "خسارة", "حزين", "ندمان", "lost", "sad", "regret", "worst", "اسوأ", "أسوأ"], "frustrated, disappointed, hand on forehead"],
  [["فزت", "فوز", "كسبت", "مبسوط", "won", "win", "happy", "best", "افضل", "أفضل"], "celebrating, big smile"],
  [["ازاي", "إزاي", "ليه", "كيف", "how", "why", "?", "؟"], "surprised and curious, eyebrows raised"],
];

export function detectEmotion(concept: string): string | undefined {
  const t = concept.toLowerCase();
  for (const [words, emotion] of EMOTION_WORDS) if (words.some((w) => t.includes(w))) return emotion;
  return undefined;
}

/** Short English hint per topic, used by the quick prompt ("Background related to the topic, e.g. …"). */
export const SCENE_SHORT: Record<string, string> = {
  card: "an EA FC stadium at night with floodlights",
  pack: "an EA FC pack-opening walkout scene",
  evolution: "a card evolution / upgrade effect",
  champions: "a FUT Champions arena with the trophy",
  rivals: "a Division Rivals match atmosphere",
  squad: "a pitch with a squad of FUT cards",
  sbc: "an SBC reward / upgrade pack moment",
  tactics: "a glowing tactics board on the pitch",
  icon: "a legendary Icon / Hero card reveal atmosphere",
  promo: "the current promo's signature colors and effects",
  op: "electric energy around an overpowered card",
  coins: "golden FUT coins and a profit vibe",
  gameplay: "an in-game action moment in a packed stadium",
  comeback: "a forgotten card stepping back into the spotlight",
};
