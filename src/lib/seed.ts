/**
 * Example data for ThumbStudio AI. All creators are fictional; all images are
 * generated placeholders (clearly labelled) so the workflow can be tried
 * immediately. Replace them with real photography for production use.
 * Runs in the browser and writes to IndexedDB.
 */
import { BUILT_IN_PRESETS } from "./presets";
import type { StyleDna } from "./style-dna";
import { db, ensureBuiltInPresets, newId, wipeAll } from "./store";

/** Render an SVG string to a PNG blob in the browser. */
async function svgToPng(svg: string): Promise<{ blob: Blob; width: number; height: number }> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("PNG encode failed"))), "image/png"));
    return { blob, width: canvas.width, height: canvas.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function faceSvg(c1: string, c2: string, label: string, mood: "neutral" | "shock" | "smile") {
  const mouth =
    mood === "shock"
      ? `<ellipse cx="400" cy="560" rx="38" ry="50" fill="#1a1a1a"/>`
      : mood === "smile"
        ? `<path d="M340 545 Q400 610 460 545" stroke="#1a1a1a" stroke-width="14" fill="none" stroke-linecap="round"/>`
        : `<path d="M350 560 L450 560" stroke="#1a1a1a" stroke-width="12" stroke-linecap="round"/>`;
  const brows = mood === "shock" ? 330 : 350;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000">
  <defs><radialGradient id="bg" cx="50%" cy="35%" r="80%"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient></defs>
  <rect width="800" height="1000" fill="url(#bg)"/>
  <ellipse cx="400" cy="1000" rx="330" ry="230" fill="#2a2f3a"/>
  <rect x="340" y="660" width="120" height="140" fill="#c99a7c"/>
  <ellipse cx="400" cy="450" rx="210" ry="260" fill="#d8a888"/>
  <path d="M190 400 Q200 170 400 160 Q600 170 610 400 Q560 260 400 250 Q240 260 190 400Z" fill="#2b1d16"/>
  <ellipse cx="320" cy="420" rx="26" ry="${mood === "shock" ? 30 : 20}" fill="#fff"/><circle cx="320" cy="420" r="13" fill="#3b2a20"/>
  <ellipse cx="480" cy="420" rx="26" ry="${mood === "shock" ? 30 : 20}" fill="#fff"/><circle cx="480" cy="420" r="13" fill="#3b2a20"/>
  <path d="M280 ${brows} L355 ${brows - 8}" stroke="#2b1d16" stroke-width="14" stroke-linecap="round"/>
  <path d="M445 ${brows - 8} L520 ${brows}" stroke="#2b1d16" stroke-width="14" stroke-linecap="round"/>
  <path d="M400 440 L385 500 L410 505" stroke="#b07f63" stroke-width="8" fill="none"/>
  ${mouth}
  <rect x="0" y="900" width="800" height="100" fill="#000" opacity="0.55"/>
  <text x="400" y="960" font-family="Helvetica, Arial, sans-serif" font-size="34" font-weight="700" fill="#fff" text-anchor="middle">${esc(label)}</text>
</svg>`;
}

function logoSvg(color: string, text: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
  <rect width="600" height="600" rx="140" fill="#0b0d10"/>
  <circle cx="300" cy="300" r="230" fill="none" stroke="${color}" stroke-width="28"/>
  <text x="300" y="350" font-family="Helvetica, Arial, sans-serif" font-size="150" font-weight="900" fill="${color}" text-anchor="middle">${esc(text)}</text>
</svg>`;
}

function thumbSvg(c1: string, c2: string, title: string, side: "left" | "right") {
  const fx = side === "right" ? 960 : 320;
  const tx = side === "right" ? 80 : 700;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c2}"/><stop offset="1" stop-color="#05070a"/></linearGradient>
    <radialGradient id="glow" cx="${fx / 12.8}%" cy="45%" r="45%"><stop offset="0" stop-color="${c1}" stop-opacity="0.7"/><stop offset="1" stop-color="${c1}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#g)"/>
  <rect width="1280" height="720" fill="url(#glow)"/>
  <ellipse cx="${fx}" cy="760" rx="260" ry="200" fill="#1c2129"/>
  <ellipse cx="${fx}" cy="360" rx="150" ry="185" fill="#d8a888" stroke="#fff" stroke-width="8"/>
  <rect x="${tx}" y="230" width="480" height="260" rx="18" fill="${c1}" opacity="0.92"/>
  <text x="${tx + 240}" y="385" font-family="Helvetica, Arial, sans-serif" font-size="78" font-weight="900" fill="#05070a" text-anchor="middle">${esc(title)}</text>
  <text x="640" y="700" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#ffffff" opacity="0.6" text-anchor="middle">SAMPLE STYLE REFERENCE — replace with a real past thumbnail</text>
</svg>`;
}

interface ExampleCreator {
  key: string;
  name: string;
  channelName: string;
  niche: string;
  language: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  typography: string;
  background: string;
  retouching: string;
  lighting: string;
  compositionRules: string;
  negative: string;
  masterPrompt: string;
  notes: string;
  styleDna: StyleDna;
  logoText: string;
  refs: string[];
}

const EXAMPLES: ExampleCreator[] = [
  {
    key: "mercer",
    name: "Kai Mercer",
    channelName: "MERCER FC",
    niche: "EA FC / Ultimate Team",
    language: "en",
    primaryColor: "#22d3ee",
    secondaryColor: "#0b1120",
    accentColor: "#facc15",
    typography: "Heavy condensed sans-serif (Bebas / Anton feel)\nWhite fill, 8px black stroke, slight drop shadow",
    background: "Dark stadium tunnel or pack-animation light; never daylight",
    retouching: "Natural skin texture, gentle clarity on eyes, no smoothing",
    lighting: "Key light camera-left, strong cyan rim light from behind-right",
    compositionRules: "Creator never smaller than 60% of frame height\nOne hero card maximum unless squad preset",
    negative: "No red arrows or red circles\nNo emoji",
    masterPrompt: "{{channel}} thumbnails feel like premium EA FC broadcast graphics: dark, cinematic, cyan-and-gold, with one massive reaction face.",
    notes: "Fictional example creator. Replace sample images with real photography.",
    logoText: "MFC",
    refs: ["99 PULL", "BROKEN?", "20-0"],
    styleDna: {
      colorGrading: { rules: "Cyan shadows, gold highlights\nSkin tones stay warm and natural", locked: true },
      composition: { rules: "Two-element layout: face + hero card\nDiagonal energy from face to card", locked: false },
      subjectPlacement: { rules: "Face on a third, cropped at frame edge", locked: false },
      faceTreatment: { rules: "Exaggerated but believable reactions\nWide eyes, eye contact with camera", locked: true },
      visualHierarchy: { rules: "Face → card → text", locked: false },
      lighting: { rules: "Cyan rim light always present", locked: true },
      backgroundComplexity: { rules: "Low: blurred stadium light, dark vignette", locked: false },
      depthEffects: { rules: "Thin white outer glow around subject\nVolumetric beams behind the card", locked: false },
      textTreatment: { rules: "Max 3 words, numbers preferred (ratings, records)", locked: false },
      nicheAssets: { rules: "EA FC style player cards (generic, no real licensed artwork)\nWalkout light effects", locked: false },
      constraints: { rules: "Never cover the face with text or cards", locked: true },
    },
  },
  {
    key: "noor",
    name: "Layla Noor",
    channelName: "نور جيمنج",
    niche: "EA FC Arabic community",
    language: "ar",
    primaryColor: "#a855f7",
    secondaryColor: "#0a0612",
    accentColor: "#22d3ee",
    typography: "Bold Arabic display type (Cairo / Tajawal feel), white with purple glow",
    background: "Purple-to-black gradients with soft neon haze",
    retouching: "Clean, bright skin, keep natural texture",
    lighting: "Soft frontal key with purple and cyan side lights",
    compositionRules: "Arabic text sits on the opposite side of the face\nLeave space top-left for the channel logo",
    negative: "No Latin text unless the headline requires it",
    masterPrompt: "Arabic-first gaming channel; thumbnails must feel energetic, modern and premium for an Arabic-speaking audience.",
    notes: "Fictional example creator demonstrating Arabic concepts and headlines.",
    logoText: "نور",
    refs: ["تفتيح بكجات", "تشكيلة", "أيقونة"],
    styleDna: {
      colorGrading: { rules: "Purple dominant, cyan accents\nDeep blacks", locked: true },
      composition: { rules: "Face one side, story object the other", locked: false },
      subjectPlacement: { rules: "Usually right side (Arabic reading order puts text right-to-left)", locked: false },
      faceTreatment: { rules: "Joyful or surprised expressions, bright eyes", locked: true },
      visualHierarchy: { rules: "Face → Arabic headline → object", locked: false },
      lighting: { rules: "Purple/cyan dual side lights", locked: false },
      backgroundComplexity: { rules: "Medium: neon haze and light streaks", locked: false },
      depthEffects: { rules: "Soft glow on edges, light particles", locked: false },
      textTreatment: { rules: "Arabic only, 1–3 words, correctly connected letters", locked: true },
      nicheAssets: { rules: "Generic football cards, packs, trophies", locked: false },
      constraints: { rules: "Never mirror or break Arabic glyphs", locked: true },
    },
  },
  {
    key: "lark",
    name: "Theo Lark",
    channelName: "Lark Tech",
    niche: "Consumer tech reviews",
    language: "en",
    primaryColor: "#f97316",
    secondaryColor: "#f8fafc",
    accentColor: "#0f172a",
    typography: "Clean geometric sans, black or white, no strokes",
    background: "Bright studio sweep or blurred desk setup",
    retouching: "Editorial, magazine-clean but realistic",
    lighting: "Large soft key from camera-right, clean highlights on products",
    compositionRules: "Product always in sharp focus and larger than life",
    negative: "No neon, no clutter, no fake screens",
    masterPrompt: "Minimal, Apple-keynote-clean thumbnails where the product is the hero and the face adds emotion.",
    notes: "Fictional non-gaming creator showing a custom preset.",
    logoText: "LT",
    refs: ["WORTH IT?", "1 YEAR LATER", "DON'T BUY"],
    styleDna: {
      colorGrading: { rules: "Bright, clean, high-key with orange accent", locked: true },
      composition: { rules: "Lots of negative space; product + face only", locked: true },
      subjectPlacement: { rules: "Face left, product right", locked: false },
      faceTreatment: { rules: "Subtle, curious expressions; not over the top", locked: false },
      visualHierarchy: { rules: "Product → face → text", locked: false },
      lighting: { rules: "Soft studio light, clean product reflections", locked: false },
      backgroundComplexity: { rules: "Minimal", locked: true },
      depthEffects: { rules: "Shallow depth of field on background only", locked: false },
      textTreatment: { rules: "2–3 words maximum", locked: false },
      nicheAssets: { rules: "Unbranded generic devices unless a product photo is attached", locked: false },
      constraints: { rules: "Never invent fake brand logos", locked: true },
    },
  },
];

const iso = () => new Date().toISOString();

/** Load the fictional example creators (idempotent). With reset, wipes all data first. */
export async function seedExampleData(opts: { reset?: boolean } = {}) {
  if (opts.reset) await wipeAll();
  await ensureBuiltInPresets(Boolean(opts.reset));
  void BUILT_IN_PRESETS;

  const created: Record<string, string> = {};
  for (const ex of EXAMPLES) {
    const existing = await db.creators.filter((c) => c.name === ex.name && c.channelName === ex.channelName).first();
    if (existing) {
      created[ex.key] = existing.id;
      continue;
    }
    const { key, logoText, refs, styleDna, ...fields } = ex;
    const id = newId();
    created[key] = id;
    await db.creators.add({ ...fields, id, styleDna, avatarAssetId: null, logoAssetId: null, createdAt: iso(), updatedAt: iso() });

    const mk = async (kind: string, name: string, svg: string, label: string, priority: number, purpose: string, tags: string) => {
      const png = await svgToPng(svg);
      const fileId = newId();
      await db.files.add({ id: fileId, blob: png.blob });
      const assetId = newId();
      await db.assets.add({ id: assetId, creatorId: id, kind, label, priority, purpose, tags, fileId, originalName: name, mime: "image/png", width: png.width, height: png.height, sizeBytes: png.blob.size, createdAt: iso() });
      return assetId;
    };

    const face = await mk("face", "face-front.png", faceSvg(ex.primaryColor, ex.secondaryColor, "SAMPLE FACE — replace", "neutral"), "Front face (sample)", 1, "Main identity photo, neutral, front-facing", "identity,front");
    await mk("face", "face-three-quarter.png", faceSvg(ex.accentColor, ex.secondaryColor, "SAMPLE 3/4 ANGLE — replace", "smile"), "3/4 angle (sample)", 2, "Secondary angle for likeness", "identity,angle");
    await mk("expression", "shock.png", faceSvg(ex.primaryColor, "#000000", "SAMPLE SHOCK — replace", "shock"), "Shocked reaction (sample)", 2, "Use for hype/reveal thumbnails", "shock,reaction");
    const logo = await mk("logo", "logo.png", logoSvg(ex.primaryColor, logoText), `${ex.channelName} logo (sample)`, 2, "Channel logo, top corner if used", "brand");
    for (let i = 0; i < refs.length; i++) {
      await mk("reference", `ref-${i + 1}.png`, thumbSvg(ex.primaryColor, ex.secondaryColor, refs[i], i % 2 ? "left" : "right"), `Past thumbnail: ${refs[i]} (sample)`, i === 0 ? 1 : 3, i === 0 ? "Best-performing layout" : "Grading reference", "style");
    }
    await db.creators.update(id, { avatarAssetId: face, logoAssetId: logo });
  }

  if (created.lark && !(await db.presets.where("slug").equals("tech-gadget-verdict").first())) {
    await db.presets.add({
      id: newId(),
      slug: "tech-gadget-verdict",
      name: "Gadget Verdict",
      niche: "Tech",
      builtIn: false,
      creatorId: created.lark,
      description: "Clean product verdict thumbnail.",
      objective: "Make the product irresistible and tease a clear verdict.",
      composition: "Oversized product on the right in perfect focus, creator on the left with a curious expression, generous negative space.",
      subjectRules: "Curious, skeptical or impressed; one eyebrow raised.",
      background: "Seamless bright studio sweep with a soft orange gradient.",
      textRules: "2–3 word verdict in clean black sans.",
      effects: "Realistic product reflections and soft contact shadow only.",
      template: 'Tech review thumbnail for "{{concept}}". {{creator}} next to a hero product shot that is larger than life.',
      defaults: { subjectPosition: "left", subjectScale: "large", textMode: "render", colorMood: "highkey" },
      createdAt: iso(),
      updatedAt: iso(),
    });
  }

  if (created.mercer && (await db.projects.count()) === 0) {
    const preset = await db.presets.where("slug").equals("eafc-pack-opening").first();
    const assets = (await db.assets.where("creatorId").equals(created.mercer).toArray()).sort((a, b) => a.priority - b.priority);
    await db.projects.add({
      id: newId(),
      creatorId: created.mercer,
      presetId: preset?.id ?? null,
      title: "I opened 50 Icon packs",
      concept: "I opened 50 Icon packs and got the rarest card in the game",
      textMode: "space",
      headline: "",
      subjectPosition: "left",
      subjectScale: "large",
      colorMood: "neon",
      colorMoodCustom: "",
      backgroundDirection: "",
      referencePriority: "balanced",
      customInstructions: "",
      variation: "safe",
      selectedAssetIds: assets.filter((a) => ["face", "expression", "reference"].includes(a.kind)).slice(0, 4).map((a) => a.id),
      compiledPrompt: "",
      createdAt: iso(),
      updatedAt: iso(),
    });
  }
  return created;
}
