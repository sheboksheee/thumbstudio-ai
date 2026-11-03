/**
 * ThumbStudio AI — deterministic prompt compiler.
 *
 * No AI is involved here: the compiler is a pure function that merges the
 * art director's manually-configured rules (creator profile, Style DNA,
 * preset, studio options, selected assets) into one structured prompt for
 * ChatGPT image generation. Identical input always produces identical output.
 *
 * Section order = priority order:
 *   1. Creator identity & face preservation
 *   2. Attached original assets
 *   3. Creator Style DNA
 *   4. Video-specific creative direction
 *   5. Composition & layout
 *   6. Quality & realism
 *   7. Negative constraints
 */
import { DNA_CATEGORIES, type StyleDna } from "../style-dna";
import { GENERIC_SCENE, detectEmotion, detectScenes, sceneById } from "./scenes";
import type {
  AssetKind,
  ColorMood,
  ReferencePriority,
  SubjectPosition,
  SubjectScale,
  TextMode,
  Variation,
} from "../options";

export interface CompilerCreator {
  name: string;
  channelName: string;
  niche?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  typography?: string;
  background?: string;
  retouching?: string;
  lighting?: string;
  compositionRules?: string;
  negative?: string;
  masterPrompt?: string;
  styleDna: StyleDna;
}

export interface CompilerPreset {
  name: string;
  /** Set for custom presets (owned by a creator). */
  creatorId?: string | null;
  niche?: string;
  objective?: string;
  composition?: string;
  subjectRules?: string;
  background?: string;
  textRules?: string;
  effects?: string;
  template?: string;
}

export interface CompilerAsset {
  id: string;
  kind: AssetKind | string;
  label?: string;
  purpose?: string;
  priority?: number;
  tags?: string;
}

export interface CompilerOptions {
  concept: string;
  textMode: TextMode;
  headline?: string;
  subjectPosition: SubjectPosition;
  subjectScale: SubjectScale;
  colorMood: ColorMood;
  colorMoodCustom?: string;
  backgroundDirection?: string;
  referencePriority: ReferencePriority;
  customInstructions?: string;
  variation: Variation;
  /** "concise" (default): short natural-language brief. "detailed": full structured spec. */
  promptStyle?: PromptStyle;
  /** Topic scene id from scenes.ts ("auto"/undefined = detect from concept). */
  sceneId?: string;
  /** Game name used in the prompt, e.g. "EA FC 27". */
  gameName?: string;
}

export type PromptStyle = "concise" | "detailed";

export interface CompileInput {
  creator: CompilerCreator;
  preset?: CompilerPreset | null;
  assets: CompilerAsset[];
  options: CompilerOptions;
}

export interface AttachmentItem {
  index: number;
  assetId: string;
  kind: string;
  label: string;
  role: string;
  purpose: string;
}

export interface CompileOutput {
  prompt: string;
  attachments: AttachmentItem[];
  manifest: string;
  warnings: string[];
  stats: { characters: number; words: number; sections: number };
}

// ---------------------------------------------------------------------------
// Helpers

const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const LATIN_RE = /[A-Za-z]/;

export function detectScript(text: string): "arabic" | "latin" | "mixed" | "none" {
  const a = ARABIC_RE.test(text);
  const l = LATIN_RE.test(text);
  if (a && l) return "mixed";
  if (a) return "arabic";
  if (l) return "latin";
  return "none";
}

/** Split free-form rule text into clean bullet items (lines, or "; " separated). */
export function toRules(text: string | undefined | null): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n|;\s+/)
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}

function bullets(items: string[], indent = ""): string {
  return items.map((i) => `${indent}- ${i}`).join("\n");
}

function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => vars[k] ?? "");
}

const KIND_ORDER: Record<string, number> = {
  face: 0,
  expression: 1,
  logo: 2,
  avatar: 3,
  asset: 4,
  reference: 5,
};

/** Deterministic attachment order: identity first, then brand, assets, style references. */
export function orderAssets(assets: CompilerAsset[]): CompilerAsset[] {
  return assets
    .map((a, i) => ({ a, i }))
    .sort((x, y) => {
      const k = (KIND_ORDER[x.a.kind] ?? 9) - (KIND_ORDER[y.a.kind] ?? 9);
      if (k !== 0) return k;
      const p = (x.a.priority ?? 3) - (y.a.priority ?? 3);
      if (p !== 0) return p;
      return x.i - y.i;
    })
    .map((x) => x.a);
}

function roleFor(kind: string, priority: number | undefined, refPriority: ReferencePriority): string {
  const primary = (priority ?? 3) <= 1;
  switch (kind) {
    case "face":
      return primary ? "PRIMARY IDENTITY — exact face to reproduce" : "Identity support — additional angle of the same face";
    case "expression":
      return "Expression reference — copy the emotion, keep the identity from the face images";
    case "logo":
      return "Brand logo — reproduce faithfully if a logo is used";
    case "avatar":
      return "Channel avatar — brand/identity cue";
    case "asset":
      return "Original asset — include and keep recognisable";
    case "reference":
      if (refPriority === "style") return primary ? "Primary style reference — match closely" : "Style reference — match grading and layout";
      if (refPriority === "identity") return "Loose style inspiration only — do not copy content";
      return primary ? "Primary style reference" : "Supporting style reference";
    default:
      return "Supporting image";
  }
}

const POSITION_TEXT: Record<SubjectPosition, string> = {
  left: "on the LEFT third of the frame, body angled slightly toward the center",
  center: "in the CENTER of the frame, symmetrical and frontal",
  right: "on the RIGHT third of the frame, body angled slightly toward the center",
};

const OPPOSITE: Record<SubjectPosition, string> = {
  left: "right side",
  center: "upper or lower band around the subject",
  right: "left side",
};

const SCALE_TEXT: Record<SubjectScale, string> = {
  medium: "waist-up framing, subject about 45–55% of the frame height",
  large: "chest-up framing, subject about 65–75% of the frame height",
  xl: "head-and-shoulders framing, subject about 85–95% of the frame height",
  closeup: "tight close-up, face dominant and allowed to crop at the frame edge",
};

const MOOD_TEXT: Record<Exclude<ColorMood, "creator" | "custom">, string> = {
  warm: "warm, golden-hour grade with amber highlights and rich contrast",
  cold: "cold, icy grade with cyan/blue shadows and crisp highlights",
  neon: "electric neon grade with saturated accent glows on a dark base",
  dark: "dark, dramatic low-key grade with deep blacks and one strong accent color",
  highkey: "bright, clean high-key grade with soft shadows and vivid but controlled color",
};

const VARIATION_TEXT: Record<Variation, { label: string; direction: string[] }> = {
  safe: {
    label: "SAFE",
    direction: [
      "Follow the creator's proven layout and brand rules exactly; this is the on-brand production version.",
      "Favor clarity and instant readability over novelty.",
    ],
  },
  creative: {
    label: "CREATIVE",
    direction: [
      "Find a bolder visual metaphor for the concept while staying inside the brand system.",
      "You may push camera angle, scale contrast and lighting drama further than usual.",
      "Non-locked style rules are strong guidance, not strict law.",
    ],
  },
  experimental: {
    label: "EXPERIMENTAL",
    direction: [
      "Explore an unexpected, scroll-stopping concept: unusual perspective, surreal scale or a striking graphic idea.",
      "Only the identity rules and LOCKED Style DNA are mandatory; all other style rules are optional inspiration.",
      "Still a professional thumbnail: one clear focal point, readable at small size.",
    ],
  },
};

// ---------------------------------------------------------------------------
// Compiler

export function compilePrompt(input: CompileInput): CompileOutput {
  return input.options.promptStyle === "detailed" ? compileDetailed(input) : compileConcise(input);
}

// ---------------------------------------------------------------------------
// Concise brief (default)
//
// Image models respond best to a short, vivid, natural-language brief where the
// video idea comes first. Only rules the art director actually filled in are
// included — no generic boilerplate, no long negative lists.

const POSITION_SHORT: Record<SubjectPosition, string> = { left: "on the left side", center: "in the center", right: "on the right side" };
const SCALE_SHORT: Record<SubjectScale, string> = {
  medium: "waist-up",
  large: "large, chest-up",
  xl: "very large, head and shoulders",
  closeup: "close-up, face filling that side of the frame",
};
const MOOD_SHORT: Record<Exclude<ColorMood, "creator" | "custom">, string> = {
  warm: "warm golden tones",
  cold: "cold icy blue tones",
  neon: "electric neon accents on a dark base",
  dark: "dark, dramatic low-key lighting",
  highkey: "bright, clean high-key look",
};

function conciseRole(a: CompilerAsset, who: string, refPriority: ReferencePriority): string {
  const primary = (a.priority ?? 3) <= 1;
  switch (a.kind) {
    case "face":
      return primary
        ? `photo of ${who} (the creator) — keep this exact face: same features, skin tone, hair, beard, glasses and accessories`
        : `another photo of ${who} — same person, use it for likeness`;
    case "expression":
      return `${who}'s expression — use this emotion and pose, same face`;
    case "logo":
      return "the channel logo — reproduce it exactly if used";
    case "avatar":
      return "the channel avatar — brand cue";
    case "asset":
      return "the card / item for this video — include it exactly as it is (same design, rating and colors)";
    case "reference":
      if (refPriority === "style") return "style reference — closely match its grading, layout and polish (not its people or text)";
      if (refPriority === "identity") return "loose style inspiration only";
      return "style reference — match its look and polish, not its content";
    default:
      return "supporting image";
  }
}

const shortLine = (t: string | undefined) => toRules(t).join("; ");
const SIDE_OPPOSITE: Record<SubjectPosition, string> = { left: "right side", center: "sides", right: "left side" };

function isFootballNiche(...parts: (string | undefined)[]) {
  const t = parts.filter(Boolean).join(" ").toLowerCase();
  return /fc|fifa|فيفا|ultimate team|fut|كورة|كرة|football|soccer/.test(t);
}

function compileConcise(input: CompileInput): CompileOutput {
  const { creator, preset, options } = input;
  const v = options.variation;
  const who = creator.name;
  const ordered = orderAssets(input.assets);
  const attachments: AttachmentItem[] = ordered.map((a, i) => ({
    index: i + 1,
    assetId: a.id,
    kind: a.kind,
    label: a.label?.trim() || `${a.kind} image`,
    role: a.purpose?.trim() || conciseRole(a, who, options.referencePriority),
    purpose: a.purpose?.trim() || "",
  }));
  const hasIdentity = attachments.some((a) => a.kind === "face" || a.kind === "expression");
  const hasItem = attachments.some((a) => a.kind === "asset");
  const warnings = baseWarnings(options, attachments, hasIdentity);
  const headline = (options.headline ?? "").trim();
  const concept = options.concept.trim();
  const vars: Record<string, string> = { concept, headline, creator: who, channel: creator.channelName, position: options.subjectPosition, scale: options.subjectScale };

  const football = isFootballNiche(creator.niche, preset?.niche, options.gameName) || !creator.niche?.trim();
  const game = options.gameName?.trim() || (football ? "EA FC" : "");
  // Scene: explicit choice > detected from concept > generic
  const detected = detectScenes(concept);
  const scene = football ? (sceneById(options.sceneId) ?? detected[0] ?? GENERIC_SCENE) : null;
  const secondary = football && !options.sceneId ? detected.find((sc) => sc.id !== scene?.id) : undefined;
  const emotion = detectEmotion(concept) ?? scene?.emotion ?? "a strong, believable reaction that fits the video";

  const out: string[] = [];
  out.push(
    `Create a high-end YouTube thumbnail (16:9 landscape) for ${game ? `${/^[aeiouAEIOU]/.test(game) ? "an" : "a"} ${game} ` : "a "}video by ${who}${creator.channelName && creator.channelName !== who ? ` (channel "${creator.channelName}")` : ""} — the kind top ${football ? "EA FC" : creator.niche?.trim() || "YouTube"} creators post: bold, clean, high-contrast, trendy and instantly readable on a phone. Advanced, professional design level.`,
  );

  if (concept) {
    const ar = detectScript(concept) === "arabic" || detectScript(concept) === "mixed";
    out.push(`Video idea: "${concept}"${ar ? " (Arabic — understand the meaning, don't write it on the image)" : ""}`);
  }

  if (attachments.length) out.push(["Attached images:", ...attachments.map((a) => `${a.index}. ${a.role}`)].join("\n"));

  // Composition
  const heroText = hasItem ? "the attached card/item" : scene ? scene.hero : "the main story element";
  const comp = [`${who} on the ${options.subjectPosition === "center" ? "center" : `${options.subjectPosition} side`}, ${SCALE_SHORT[options.subjectScale]}, ${emotion}.`];
  if (options.subjectPosition !== "center") comp.push(`${heroText[0].toUpperCase()}${heroText.slice(1)} on the ${SIDE_OPPOSITE[options.subjectPosition]} as the second focal point${hasItem && scene ? ` — ${scene.hero.replace(/^the player card, /, "")}` : ""}.`);
  else comp.push(`${heroText[0].toUpperCase()}${heroText.slice(1)} framing the creator without covering the face.`);
  comp.push("Only 2–3 elements, clear separation between them.");
  if (preset && !preset.creatorId && preset.composition?.trim() && v === "safe" && !scene) comp.push(preset.composition.trim());
  out.push(`Composition: ${comp.join(" ")}`);

  // Scene (topic-aware)
  if (scene) {
    const bg = options.backgroundDirection?.trim() || scene.background;
    const extra = secondary ? ` Also hint at: ${secondary.hero}.` : "";
    out.push(`Scene: ${bg}; ${scene.details}. Use real ${game} Ultimate Team visual language (FUT card design, stadium, pack lights) that matches the topic — no random abstract shapes or unrelated objects.${extra}`);
  } else {
    const bg = options.backgroundDirection?.trim() || shortLine(creator.background) || "a background that is clearly related to the video topic";
    out.push(`Scene: ${bg}. Everything in the background must relate to the video — no random abstract shapes.`);
  }
  if (preset?.objective?.trim() && preset.creatorId) out.push(preset.objective.trim());
  if (preset?.template?.trim() && preset.creatorId && !/\{\{\s*concept\s*\}\}/.test(preset.template)) out.push(fillTemplate(preset.template.trim(), vars));

  // Look
  const look: string[] = [`cinematic lighting with a strong rim light on ${who}`, "rich contrast", "subtle depth of field", "polished retouch with natural skin texture"];
  if (options.colorMood === "creator") look.push(`brand colors ${[creator.primaryColor, creator.accentColor].filter(Boolean).join(" and ")}`);
  else if (options.colorMood === "custom" && options.colorMoodCustom?.trim()) look.push(options.colorMoodCustom.trim());
  else if (options.colorMood !== "custom") look.push(MOOD_SHORT[options.colorMood]);
  for (const cat of DNA_CATEGORIES) {
    const e = creator.styleDna[cat.key];
    if (!e.rules.trim() || cat.key === "constraints") continue;
    if (v === "experimental" && !e.locked) continue;
    look.push(shortLine(e.rules));
  }
  for (const t of [creator.lighting, creator.retouching]) if (t?.trim()) look.push(shortLine(t));
  out.push(`Look: ${look.join(", ")}.`);
  if (v === "creative") out.push("Make it bolder and more original than a typical thumbnail, while keeping the creator's look.");
  if (v === "experimental") out.push("Try an unexpected, scroll-stopping idea — unusual angle or scale — with one clear focal point.");

  const master = creator.masterPrompt?.trim();
  if (master) out.push(fillTemplate(master, vars).replace(/\s*\n\s*/g, " "));

  // Text
  if (options.textMode === "render" && headline) {
    const ar = detectScript(headline) === "arabic" || detectScript(headline) === "mixed";
    out.push(`Text: only "${headline}", big and bold${ar ? ", written correctly in Arabic (right-to-left, connected letters)" : ""}${creator.typography?.trim() ? ` — ${shortLine(creator.typography)}` : ""}. Never over the face.`);
  } else if (options.textMode === "space") {
    out.push(`Text: none — leave clean space on the ${options.subjectPosition === "left" ? "right" : options.subjectPosition === "right" ? "left" : "top"} for a title added later.`);
  } else out.push("Text: no additional text.");

  const custom = toRules(options.customInstructions);
  if (custom.length) out.push(custom.join(". ") + ".");

  const avoid = ["changing the face", "extra people", "fake or garbled text and logos", "clutter", ...toRules(creator.styleDna.constraints.rules), ...toRules(creator.negative)];
  out.push(`Avoid: ${avoid.join(", ")}.`);

  const prompt = out.join("\n\n").trim() + "\n";
  return {
    prompt,
    attachments,
    manifest: buildManifest(creator, preset ?? null, options, attachments),
    warnings,
    stats: { characters: prompt.length, words: prompt.split(/\s+/).filter(Boolean).length, sections: out.length },
  };
}

function baseWarnings(options: CompilerOptions, attachments: AttachmentItem[], hasIdentity: boolean) {
  const w: string[] = [];
  if (!options.concept.trim()) w.push("No video concept entered.");
  if (!hasIdentity) w.push("No face or expression photo selected — ChatGPT cannot preserve the creator's identity without one.");
  const faces = attachments.filter((a) => a.kind === "face" || a.kind === "expression");
  if (faces.length >= 2) w.push(`${faces.length} images are marked as Face/Expression — make sure every one of them is a photo of the creator (cards and props belong in "Other asset").`);
  if (attachments.length > 10) w.push("More than 10 images selected; ChatGPT may ignore some attachments. Consider trimming.");
  if (options.textMode === "render" && !options.headline?.trim()) w.push("Text mode is 'Render headline' but the headline is empty.");
  return w;
}

// ---------------------------------------------------------------------------
// Detailed structured spec

function compileDetailed(input: CompileInput): CompileOutput {
  const { creator, preset, options } = input;
  const warnings: string[] = [];
  const v = options.variation;
  const ordered = orderAssets(input.assets);

  const attachments: AttachmentItem[] = ordered.map((a, i) => ({
    index: i + 1,
    assetId: a.id,
    kind: a.kind,
    label: a.label?.trim() || `${a.kind} image`,
    role: roleFor(a.kind, a.priority, options.referencePriority),
    purpose: a.purpose?.trim() || "",
  }));

  const faces = attachments.filter((a) => a.kind === "face");
  const expressions = attachments.filter((a) => a.kind === "expression");
  const hasIdentity = faces.length + expressions.length > 0;
  const logos = attachments.filter((a) => a.kind === "logo" || a.kind === "avatar");
  const refs = attachments.filter((a) => a.kind === "reference");

  if (!options.concept.trim()) warnings.push("No video concept entered.");
  if (!hasIdentity) warnings.push("No face or expression photo selected — ChatGPT cannot preserve the creator's identity without one.");
  if (attachments.length > 10) warnings.push("More than 10 images selected; ChatGPT may ignore some attachments. Consider trimming.");
  if (options.textMode === "render" && !options.headline?.trim()) warnings.push("Text mode is 'Render headline' but the headline is empty.");

  const conceptScript = detectScript(options.concept);
  const headline = (options.headline ?? "").trim();
  const headlineScript = detectScript(headline);
  const pos = options.subjectPosition;
  const vars: Record<string, string> = {
    concept: options.concept.trim(),
    headline,
    creator: creator.name,
    channel: creator.channelName,
    position: pos,
    scale: options.subjectScale,
  };

  const sections: string[] = [];
  const idx = (n: number, title: string) => `## ${n}. ${title}`;

  // Header -----------------------------------------------------------------
  sections.push(
    [
      `# YOUTUBE THUMBNAIL — ${creator.channelName || creator.name}${preset ? ` · ${preset.name}` : ""} · ${VARIATION_TEXT[v].label} VARIATION`,
      "",
      "Create ONE finished, professional YouTube thumbnail image.",
      "Format: 16:9 landscape (YouTube 1280×720). Generate in the widest landscape size available and keep all critical elements (face, hero object, text) inside the central safe area so nothing is lost when cropped to exactly 16:9.",
      "The sections below are in strict priority order — when two instructions conflict, the earlier section wins.",
    ].join("\n"),
  );

  // 1. Identity --------------------------------------------------------------
  const identity: string[] = [];
  if (hasIdentity) {
    const faceRefs = [...faces, ...expressions].map((a) => `Image ${a.index}`).join(", ");
    identity.push(
      `The person in this thumbnail is ${creator.name}${creator.channelName ? ` (YouTube channel "${creator.channelName}")` : ""}. Their real likeness is provided in ${faceRefs}.`,
      "Reproduce their face with exact likeness: same facial structure, eye shape and color, nose, lips, jawline, skin tone, facial hair, hairline and hairstyle, and any distinctive features (moles, scars, glasses, piercings).",
      "Do NOT beautify, de-age, slim, change ethnicity, or swap the face with a generic model. The creator must be instantly recognisable to their own audience.",
    );
    if (expressions.length) {
      identity.push("Use the expression image(s) only for emotion and pose; identity always comes from the face image(s).");
    }
  } else {
    identity.push(
      `The thumbnail features ${creator.name}${creator.channelName ? ` (channel "${creator.channelName}")` : ""}. No face photo is attached in this request — do not invent a specific real person; keep the subject consistent with the description below.`,
    );
  }
  const retouch = toRules(creator.retouching);
  if (retouch.length) identity.push("Retouching style:\n" + bullets(retouch, "  "));
  const faceDna = creator.styleDna.faceTreatment;
  if (faceDna.rules.trim()) identity.push("Face treatment:\n" + bullets(toRules(faceDna.rules), "  "));
  sections.push(`${idx(1, "CREATOR IDENTITY & FACE PRESERVATION (highest priority)")}\n${bullets(identity)}`);

  // 2. Attached assets ------------------------------------------------------
  if (attachments.length) {
    const lines = attachments.map((a) => {
      const purpose = a.purpose ? ` — ${a.purpose}` : "";
      return `- Image ${a.index} (${a.label}): ${a.role}${purpose}`;
    });
    const rules: string[] = [
      `${attachments.length} image(s) are attached in this exact order. Refer to them by number.`,
    ];
    if (logos.length) rules.push("Logos must keep their exact shape, colors and proportions — never redraw, misspell or stylise them.");
    if (refs.length) {
      if (options.referencePriority === "style") rules.push("Match the style references closely: grading, layout logic, outline/glow treatment and text style. Do not copy their people or their text.");
      else if (options.referencePriority === "identity") rules.push("Style references are loose inspiration only; prioritise the creator's identity and this brief over matching them.");
      else rules.push("Follow the style references for grading, polish and layout language, but build a NEW composition for this concept. Do not copy their people or their text.");
    }
    sections.push(`${idx(2, "ATTACHED ORIGINAL ASSETS")}\n${lines.join("\n")}\n${bullets(rules)}`);
  } else {
    sections.push(`${idx(2, "ATTACHED ORIGINAL ASSETS")}\n- No images are attached. Work from the written direction only.`);
  }

  // 3. Style DNA ------------------------------------------------------------
  const dnaLines: string[] = [];
  const palette = [creator.primaryColor, creator.secondaryColor, creator.accentColor].filter(Boolean);
  if (palette.length) {
    dnaLines.push(`Brand palette: primary ${creator.primaryColor}${creator.secondaryColor ? `, secondary ${creator.secondaryColor}` : ""}${creator.accentColor ? `, accent ${creator.accentColor}` : ""}.`);
  }
  if (creator.niche?.trim()) dnaLines.push(`Niche: ${creator.niche.trim()}.`);
  const lockedNames: string[] = [];
  for (const cat of DNA_CATEGORIES) {
    if (cat.key === "faceTreatment") continue; // already in section 1
    const entry = creator.styleDna[cat.key];
    const rules = toRules(entry.rules);
    if (!rules.length) continue;
    if (entry.locked) lockedNames.push(cat.label);
    const tag = entry.locked ? " [LOCKED — mandatory in every variation]" : v === "experimental" ? " [optional inspiration]" : v === "creative" ? " [strong guidance]" : "";
    dnaLines.push(`${cat.label}${tag}:\n${bullets(rules, "  ")}`);
  }
  const extra: [string, string | undefined][] = [
    ["Lighting direction", creator.lighting],
    ["Typography preferences", creator.typography],
    ["Background preferences", creator.background],
  ];
  for (const [label, text] of extra) {
    const r = toRules(text);
    if (r.length) dnaLines.push(`${label}:\n${bullets(r, "  ")}`);
  }
  const master = creator.masterPrompt?.trim();
  if (master) dnaLines.push(`Creator master direction:\n  ${fillTemplate(master, vars).replace(/\n+/g, "\n  ")}`);
  if (lockedNames.length && v !== "safe") dnaLines.push(`Locked categories (${lockedNames.join(", ")}) define the creator's core identity and must survive this ${VARIATION_TEXT[v].label.toLowerCase()} variation unchanged.`);
  sections.push(`${idx(3, "CREATOR STYLE DNA")}\n${dnaLines.length ? bullets(dnaLines) : "- No Style DNA configured; use a clean, modern, high-contrast YouTube style."}`);

  // 4. Creative direction ---------------------------------------------------
  const dir: string[] = [];
  if (options.concept.trim()) {
    const lang = conceptScript === "arabic" ? " (written in Arabic — interpret its meaning; do not render it as text unless asked below)" : conceptScript === "mixed" ? " (mixed Arabic/English — interpret its meaning)" : "";
    dir.push(`Video concept${lang}: "${options.concept.trim()}"`);
  }
  if (preset) {
    if (preset.template?.trim()) dir.push(fillTemplate(preset.template.trim(), vars));
    if (preset.objective?.trim()) dir.push(`Creative objective: ${preset.objective.trim()}`);
    if (preset.subjectRules?.trim()) dir.push(`Subject performance: ${preset.subjectRules.trim()}`);
  }
  dir.push(...VARIATION_TEXT[v].direction);
  // Color mood
  if (options.colorMood === "creator") dir.push("Color mood: use the creator's brand palette as the dominant grade.");
  else if (options.colorMood === "custom" && options.colorMoodCustom?.trim()) dir.push(`Color mood: ${options.colorMoodCustom.trim()} (keep brand palette accents).`);
  else if (options.colorMood !== "custom") dir.push(`Color mood: ${MOOD_TEXT[options.colorMood]}, harmonised with the brand palette.`);
  // Background
  const bgParts = [options.backgroundDirection?.trim(), preset?.background?.trim()].filter(Boolean) as string[];
  if (bgParts.length) dir.push(`Background: ${bgParts.join(" — ")}`);
  const bgDna = creator.styleDna.backgroundComplexity.rules.trim();
  if (bgDna && !bgParts.length) dir.push("Background: follow the creator's background-complexity rules above.");
  if (preset?.effects?.trim()) dir.push(`Effects: ${preset.effects.trim()}`);
  // Text
  if (options.textMode === "none") {
    dir.push("Text: NO text, letters, numbers or watermarks anywhere in the image.");
  } else if (options.textMode === "space") {
    dir.push(`Text: do NOT render any text. Leave a clean, uncluttered area on the ${OPPOSITE[pos]} where a headline will be added later in post-production.`);
  } else if (headline) {
    const t: string[] = [`Text: render exactly this headline and nothing else: "${headline}"`];
    if (headlineScript === "arabic" || headlineScript === "mixed") {
      t.push("The headline is Arabic: write it right-to-left with correctly connected Arabic letterforms, correct letter order, no mirrored or broken glyphs, no Latin transliteration, no added diacritics.");
    }
    t.push("Spell it character-for-character. Large, bold, high-contrast and readable at mobile size. Never place it over the face.");
    if (preset?.textRules?.trim()) t.push(preset.textRules.trim());
    dir.push(t.join(" "));
  } else {
    dir.push("Text: no headline provided — do not render any text.");
  }
  const custom = toRules(options.customInstructions);
  if (custom.length) dir.push("Art director notes for this video:\n" + bullets(custom, "  "));
  sections.push(`${idx(4, "VIDEO-SPECIFIC CREATIVE DIRECTION")}\n${bullets(dir)}`);

  // 5. Composition ------------------------------------------------------------
  const comp: string[] = [
    `Subject placement: ${creator.name} ${POSITION_TEXT[pos]}; ${SCALE_TEXT[options.subjectScale]}.`,
    pos === "center"
      ? "Secondary elements frame the subject symmetrically without touching the face."
      : `Use the ${OPPOSITE[pos]} for the hero object / story element${options.textMode !== "none" ? " and text area" : ""}.`,
  ];
  if (preset?.composition?.trim()) comp.push(`Preset layout: ${preset.composition.trim()}`);
  comp.push(...toRules(creator.compositionRules).map((r) => `Creator rule: ${r}`));
  comp.push(
    "Maximum three focal elements. Clear read order: face → hero object → text.",
    "Strong subject/background separation (rim light, contrast or subtle outline) so the thumbnail reads at 160×90 px.",
    "Keep the bottom-right corner free of important detail (YouTube places the video duration there).",
  );
  sections.push(`${idx(5, "COMPOSITION & LAYOUT")}\n${bullets(comp)}`);

  // 6. Quality ---------------------------------------------------------------
  const quality = [
    "Premium, art-directed result that looks like the work of a top YouTube thumbnail designer — not a generic AI image.",
    "Photographic realism for people: natural skin texture and pores, real hair strands, correct anatomy, natural hands with five fingers.",
    "Coherent lighting: every element shares the same light direction and color temperature; believable contact shadows.",
    "Crisp focus on the face and hero object; controlled depth of field in the background.",
    "Bold but controlled contrast and saturation; clean edges; no muddy midtones.",
  ];
  sections.push(`${idx(6, "QUALITY & REALISM")}\n${bullets(quality)}`);

  // 7. Negatives ---------------------------------------------------------------
  const neg: string[] = [
    "No altered or generic face, no face swap, no plastic/waxy skin, no over-smoothing, no uncanny eyes.",
    "No generic AI aesthetics: no random glowing orbs, no excessive bokeh, no oversaturated HDR halo, no fantasy clutter unrelated to the concept.",
    "No distorted logos, no fake UI gibberish, no misspelled text, no watermarks, no borders or frames.",
    "No extra people unless requested; no duplicated limbs or fingers.",
  ];
  if (options.textMode !== "render") neg.push("No text of any kind.");
  for (const r of toRules(creator.negative)) neg.push(r);
  // Creative constraints already appear in section 3; repeat them here as hard rules for emphasis.
  for (const r of toRules(creator.styleDna.constraints.rules)) neg.push(`Hard rule: ${r}`);
  sections.push(`${idx(7, "NEGATIVE CONSTRAINTS")}\n${bullets(dedupe(neg))}`);

  // Output -------------------------------------------------------------------
  sections.push(
    [
      "## OUTPUT",
      "- Deliver one 16:9 landscape thumbnail image. Do not ask follow-up questions; make confident creative decisions within these rules.",
      hasIdentity ? "- Before finalising, verify the face matches the attached identity image(s)." : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  const prompt = sections.join("\n\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  return {
    prompt,
    attachments,
    manifest: buildManifest(creator, preset ?? null, options, attachments),
    warnings,
    stats: {
      characters: prompt.length,
      words: prompt.split(/\s+/).filter(Boolean).length,
      sections: sections.length,
    },
  };
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    const k = i.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function buildManifest(
  creator: Pick<CompilerCreator, "name" | "channelName">,
  preset: Pick<CompilerPreset, "name"> | null,
  options: Pick<CompilerOptions, "concept" | "variation">,
  attachments: AttachmentItem[],
): string {
  const head = [
    `ThumbStudio asset manifest`,
    `Creator: ${creator.name}${creator.channelName ? ` / ${creator.channelName}` : ""}`,
    `Preset: ${preset?.name ?? "None"} · Variation: ${options.variation}`,
    `Concept: ${options.concept.trim() || "—"}`,
    "",
    `Attach in this order (${attachments.length}):`,
  ];
  const lines = attachments.map(
    (a) => `${a.index}. ${a.label} [${a.kind}] — ${a.role}${a.purpose ? ` (${a.purpose})` : ""}`,
  );
  return [...head, ...(lines.length ? lines : ["(no images selected)"])].join("\n");
}
