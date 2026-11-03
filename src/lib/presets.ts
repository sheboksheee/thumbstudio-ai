import type { ColorMood, SubjectPosition, SubjectScale, TextMode } from "./options";

export interface PresetDefaults {
  subjectPosition?: SubjectPosition;
  subjectScale?: SubjectScale;
  textMode?: TextMode;
  colorMood?: ColorMood;
}

export interface PresetData {
  slug: string;
  name: string;
  niche: string;
  description: string;
  objective: string;
  composition: string;
  subjectRules: string;
  background: string;
  textRules: string;
  effects: string;
  /** Supports {{concept}}, {{headline}}, {{creator}}, {{channel}}, {{position}}, {{scale}} */
  template: string;
  defaults: PresetDefaults;
}

export const TEMPLATE_TOKENS = ["concept", "headline", "creator", "channel", "position", "scale"] as const;

export const BUILT_IN_PRESETS: PresetData[] = [
  {
    slug: "eafc-pack-opening",
    name: "Pack Opening",
    niche: "EA FC",
    description: "High-hype pack reveal with walkout energy and a mystery card.",
    objective: "Sell the anticipation and payoff of a pack opening: the viewer must feel a huge pull is about to happen.",
    composition: "Creator on one side reacting; a glowing pack or walkout card on the opposite side as the second focal point. Strong diagonal energy between face and card.",
    subjectRules: "Shocked or ecstatic reaction, mouth open, eyes wide and directed at the card or the camera. Hands may frame the face.",
    background: "Dark stadium-tunnel or pack-animation backdrop with volumetric light beams and flares in the card's rarity color.",
    textRules: "Optional 1–3 word hype text (e.g. a rating or a short exclamation). Never cover the face or the card.",
    effects: "Light rays emanating from the card, subtle particles, gentle lens bloom. Keep it clean, not cluttered.",
    template: "{{creator}} reacting to a legendary pack pull for the video: \"{{concept}}\". The card/pack is the hero object opposite the creator, glowing with rarity-colored walkout light.",
    defaults: { subjectPosition: "left", subjectScale: "large", textMode: "space", colorMood: "neon" },
  },
  {
    slug: "eafc-player-review",
    name: "Player Review",
    niche: "EA FC",
    description: "Authority-driven review of a single player card.",
    objective: "Position the creator as the expert verdict on one player. The viewer should instantly know which player is reviewed and that there is a strong opinion.",
    composition: "Player card or player render large and centered-opposite the creator; creator smaller-to-equal size with an evaluative expression. Clear two-element layout.",
    subjectRules: "Confident, skeptical or impressed expression; slight head tilt; eye contact with camera.",
    background: "Clean gradient or blurred stadium matching the card's color family. Low complexity.",
    textRules: "Optional verdict word (e.g. 'BROKEN?', 'MUST BUY') or the card rating. High contrast, maximum 2 words.",
    effects: "Soft rim light separating subject from background; card has a subtle glow and reflection.",
    template: "Player review thumbnail for \"{{concept}}\". {{creator}} gives an expert verdict next to a large, legible player card.",
    defaults: { subjectPosition: "right", subjectScale: "large", textMode: "render", colorMood: "creator" },
  },
  {
    slug: "eafc-tactical-guide",
    name: "Tactical Guide",
    niche: "EA FC",
    description: "Educational tactics / formation thumbnail with a clear 'secret' promise.",
    objective: "Communicate a smart, actionable tactic or formation. It should feel like insider knowledge that leads to wins.",
    composition: "Simplified tactics board or pitch graphic (top-down formation, arrows) occupying the non-subject side. Creator pointing or explaining.",
    subjectRules: "Focused, knowing or 'secret-sharing' expression; one hand pointing toward the tactics graphic.",
    background: "Dark pitch texture or chalkboard-style surface; minimal and readable.",
    textRules: "Formation number (e.g. 4-2-3-1) or 1–2 word promise. Bold, simple.",
    effects: "Glowing tactical lines and player dots; keep diagrams simple enough to read at small size.",
    template: "Tactical guide thumbnail for \"{{concept}}\". {{creator}} reveals a winning formation/tactic shown on a clean, glowing tactics board.",
    defaults: { subjectPosition: "left", subjectScale: "large", textMode: "render", colorMood: "cold" },
  },
  {
    slug: "eafc-fut-champions",
    name: "FUT Champions",
    niche: "EA FC",
    description: "Competitive weekend-league stakes: wins, rewards, rank.",
    objective: "Convey high-stakes competition: a record, a rank, rewards or an intense match moment.",
    composition: "Creator in intense competitive pose with a big result element (win record, rank badge or trophy) as the second focal point.",
    subjectRules: "Intense, determined or celebrating expression; controller in hand is welcome.",
    background: "Dramatic arena with crowd bokeh and stadium floodlights, tinted with the creator's colors.",
    textRules: "Win record or rank (e.g. '20-0', 'ELITE') as the only text. Very large, thick stroke.",
    effects: "Strong backlight, light haze, motion streaks behind the subject. Competitive energy.",
    template: "FUT Champions thumbnail for \"{{concept}}\". {{creator}} under stadium lights with a large competitive result element.",
    defaults: { subjectPosition: "right", subjectScale: "xl", textMode: "render", colorMood: "dark" },
  },
  {
    slug: "eafc-squad-builder",
    name: "Squad Builder",
    niche: "EA FC",
    description: "Showcase a team / squad with a clear budget or theme hook.",
    objective: "Show an impressive squad at a glance and make the budget/theme the hook.",
    composition: "3–5 player cards arranged in a tidy arc or row on the non-subject side; creator presenting them. Cards must not overlap the face.",
    subjectRules: "Proud or surprised expression; presenting gesture toward the squad.",
    background: "Clean gradient with subtle pitch lines; low complexity so cards read clearly.",
    textRules: "Budget or theme in 1–3 words (e.g. '100K', 'META'). Placed in clear space.",
    effects: "Cards have consistent lighting, soft shadows and a shared glow color.",
    template: "Squad builder thumbnail for \"{{concept}}\". {{creator}} presents a neat arc of player cards that communicates the squad's theme.",
    defaults: { subjectPosition: "left", subjectScale: "medium", textMode: "render", colorMood: "creator" },
  },
  {
    slug: "eafc-hero-icon-reveal",
    name: "Hero/Icon Reveal",
    niche: "EA FC",
    description: "Epic reveal of a Hero or Icon card with legendary atmosphere.",
    objective: "Deliver an epic, cinematic reveal that feels premium and legendary.",
    composition: "Hero/Icon card large and dominant with dramatic light; creator reacting with awe on the opposite side. Symmetry or strong diagonal.",
    subjectRules: "Awe, disbelief or celebration; eyes locked on the card or camera.",
    background: "Golden or rarity-colored atmosphere with volumetric god rays, smoke and depth.",
    textRules: "Optional single word ('ICON', 'HERO') or rating. Premium, never cheap-looking.",
    effects: "Cinematic god rays, embers or golden dust, premium metallic sheen on the card.",
    template: "Icon/Hero reveal thumbnail for \"{{concept}}\". {{creator}} reacts in awe to a legendary card bathed in cinematic light.",
    defaults: { subjectPosition: "right", subjectScale: "large", textMode: "space", colorMood: "warm" },
  },
];

export function parseDefaults(raw: string | null | undefined): PresetDefaults {
  try {
    const v = JSON.parse(raw || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9؀-ۿ]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "preset"
  );
}
