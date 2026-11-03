export type DnaCategoryKey =
  | "colorGrading"
  | "composition"
  | "subjectPlacement"
  | "faceTreatment"
  | "visualHierarchy"
  | "lighting"
  | "backgroundComplexity"
  | "depthEffects"
  | "textTreatment"
  | "nicheAssets"
  | "constraints";

export interface DnaEntry {
  /** Free-form rules written by the art director. One rule per line works best. */
  rules: string;
  /** Locked = core identity; enforced verbatim in every variation (even Experimental). */
  locked: boolean;
}

export type StyleDna = Record<DnaCategoryKey, DnaEntry>;

export const DNA_CATEGORIES: {
  key: DnaCategoryKey;
  label: string;
  hint: string;
  placeholder: string;
}[] = [
  { key: "colorGrading", label: "Color grading", hint: "Palette usage, contrast, saturation, skin-tone handling.", placeholder: "Teal shadows, warm skin highlights\nSaturation high but skin stays natural" },
  { key: "composition", label: "Composition", hint: "Framing, grid, balance, negative space.", placeholder: "Rule-of-thirds, one dominant focal point\nNever more than 3 visual elements" },
  { key: "subjectPlacement", label: "Subject placement", hint: "Where the creator usually sits in frame and how big.", placeholder: "Creator on the right third, chest-up, cropped at frame edge" },
  { key: "faceTreatment", label: "Face treatment", hint: "Expression intensity, retouching, eye contact.", placeholder: "Exaggerated but believable expression\nKeep real skin texture, no plastic smoothing" },
  { key: "visualHierarchy", label: "Visual hierarchy", hint: "Read order at small size.", placeholder: "1. Face  2. Hero object  3. Text" },
  { key: "lighting", label: "Lighting", hint: "Key/rim light direction, contrast, color of light.", placeholder: "Key light from camera-left, cyan rim light from behind-right" },
  { key: "backgroundComplexity", label: "Background complexity", hint: "How busy or minimal the background is allowed to be.", placeholder: "Low complexity, soft blurred environment, dark vignette" },
  { key: "depthEffects", label: "Depth & effects", hint: "Glow, particles, depth of field, outlines.", placeholder: "Subtle white outer stroke around subject\nLight particles only behind the subject" },
  { key: "textTreatment", label: "Text treatment", hint: "Font style, size, stroke, placement.", placeholder: "Max 3 words, heavy condensed sans, white with dark drop shadow" },
  { key: "nicheAssets", label: "Game / niche assets", hint: "Recurring props, UI, cards, logos specific to the niche.", placeholder: "EA FC player cards, pack walkout lights, rating badges" },
  { key: "constraints", label: "Creative constraints", hint: "Hard rules that must never be broken.", placeholder: "Never cover the face with text\nNo red arrows or circles" },
];

export function emptyDna(): StyleDna {
  return Object.fromEntries(
    DNA_CATEGORIES.map((c) => [c.key, { rules: "", locked: false }]),
  ) as StyleDna;
}

export function parseDna(raw: string | null | undefined): StyleDna {
  const base = emptyDna();
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<DnaCategoryKey, Partial<DnaEntry>>>;
    for (const c of DNA_CATEGORIES) {
      const v = parsed?.[c.key];
      if (v && typeof v === "object") {
        base[c.key] = { rules: String(v.rules ?? ""), locked: Boolean(v.locked) };
      }
    }
  } catch {
    /* ignore malformed JSON, return empty */
  }
  return base;
}

export function dnaCompleteness(dna: StyleDna): number {
  const filled = DNA_CATEGORIES.filter((c) => dna[c.key].rules.trim().length > 0).length;
  return Math.round((filled / DNA_CATEGORIES.length) * 100);
}
