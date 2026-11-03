export const SUBJECT_POSITIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
] as const;

export const SUBJECT_SCALES = [
  { value: "medium", label: "Medium", desc: "waist-up, ~45% of frame height" },
  { value: "large", label: "Large", desc: "chest-up, ~70% of frame height" },
  { value: "xl", label: "Extra large", desc: "head-and-shoulders, ~90% of frame height" },
  { value: "closeup", label: "Close-up", desc: "face fills the frame side, cropped at the edge" },
] as const;

export const TEXT_MODES = [
  { value: "none", label: "No text" },
  { value: "render", label: "Render headline" },
  { value: "space", label: "Leave text space" },
] as const;

export const COLOR_MOODS = [
  { value: "creator", label: "Creator palette" },
  { value: "warm", label: "Warm / golden" },
  { value: "cold", label: "Cold / icy" },
  { value: "neon", label: "Neon / electric" },
  { value: "dark", label: "Dark dramatic" },
  { value: "highkey", label: "Bright high-key" },
  { value: "custom", label: "Custom" },
] as const;

export const REFERENCE_PRIORITIES = [
  { value: "identity", label: "Identity first", desc: "Faces and logos are sacred; style refs are loose inspiration." },
  { value: "balanced", label: "Balanced", desc: "Exact identity, close adherence to style references." },
  { value: "style", label: "Match references", desc: "Replicate the reference thumbnails' layout and grading closely." },
] as const;

export const VARIATIONS = [
  { value: "safe", label: "Safe", desc: "On-brand, proven layout, minimal risk." },
  { value: "creative", label: "Creative", desc: "Bolder concept within the brand system." },
  { value: "experimental", label: "Experimental", desc: "Push the visual idea; only locked DNA is fixed." },
] as const;

export const ASSET_KINDS = [
  { value: "face", label: "Face", desc: "Identity photos of the creator" },
  { value: "expression", label: "Expression", desc: "Emotion / expression photography" },
  { value: "reference", label: "Thumbnail ref", desc: "Past thumbnails that define the style" },
  { value: "logo", label: "Logo", desc: "Channel or brand logo" },
  { value: "avatar", label: "Avatar", desc: "Channel avatar" },
  { value: "asset", label: "Other asset", desc: "Props, game assets, cut-outs" },
] as const;

export type SubjectPosition = (typeof SUBJECT_POSITIONS)[number]["value"];
export type SubjectScale = (typeof SUBJECT_SCALES)[number]["value"];
export type TextMode = (typeof TEXT_MODES)[number]["value"];
export type ColorMood = (typeof COLOR_MOODS)[number]["value"];
export type ReferencePriority = (typeof REFERENCE_PRIORITIES)[number]["value"];
export type Variation = (typeof VARIATIONS)[number]["value"];
export type AssetKind = (typeof ASSET_KINDS)[number]["value"];

export const RESULT_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "revision", label: "Needs revision" },
  { value: "rejected", label: "Rejected" },
] as const;

export function labelOf<T extends { value: string; label: string }>(list: readonly T[], v: string) {
  return list.find((x) => x.value === v)?.label ?? v;
}
