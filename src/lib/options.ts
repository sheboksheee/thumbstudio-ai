export const SUBJECT_POSITIONS = [
  { value: "right", label: "يمين" },
  { value: "center", label: "النص" },
  { value: "left", label: "شمال" },
] as const;

export const SUBJECT_SCALES = [
  { value: "medium", label: "متوسط", desc: "من الوسط لفوق" },
  { value: "large", label: "كبير", desc: "من الصدر لفوق" },
  { value: "xl", label: "كبير جداً", desc: "الراس والكتاف" },
  { value: "closeup", label: "كلوز", desc: "الوش مالي الجنب" },
] as const;

export const TEXT_MODES = [
  { value: "none", label: "من غير كتابة" },
  { value: "render", label: "اكتب عنوان" },
  { value: "space", label: "سيب مكان للعنوان" },
] as const;

export const COLOR_MOODS = [
  { value: "card", label: "ألوان الكرت" },
  { value: "creator", label: "ألوان القناة" },
  { value: "warm", label: "دافي / دهبي" },
  { value: "cold", label: "بارد / تلجي" },
  { value: "neon", label: "نيون" },
  { value: "dark", label: "غامق ودرامي" },
  { value: "highkey", label: "فاتح ونضيف" },
  { value: "custom", label: "مخصص" },
] as const;

export const REFERENCE_PRIORITIES = [
  { value: "identity", label: "الوش أهم", desc: "المراجع إلهام بس" },
  { value: "balanced", label: "متوازن", desc: "" },
  { value: "style", label: "قلّد المراجع", desc: "نفس ستايل الثمبنيلات القديمة" },
] as const;

export const VARIATIONS = [
  { value: "safe", label: "آمن", desc: "ستايل القناة المعتاد." },
  { value: "creative", label: "إبداعي", desc: "فكرة أجرأ بنفس الهوية." },
  { value: "experimental", label: "تجريبي", desc: "حاجة غير متوقعة تمامًا." },
] as const;

export const PROMPT_STYLES = [
  { value: "quick", label: "سريع", desc: "قصير زي البرومبت اللي بتكتبه بإيدك — ChatGPT بيكمّل الباقي." },
  { value: "concise", label: "متوسط", desc: "بيوصف مشهد من اللعبة حسب موضوع الفيديو." },
  { value: "detailed", label: "مفصّل", desc: "كل القواعد مكتوبة بالتفصيل." },
] as const;

export const CARD_MODES = [
  { value: "auto", label: "تلقائي", desc: "لو رفعت كرت هيتحط زي ما هو" },
  { value: "attached", label: "الكرت اللي رفعته", desc: "الكرت بالظبط زي الصورة" },
  { value: "mystery", label: "كرت فاضي", desc: "تصميم الكرت من غير لاعب" },
  { value: "multiple", label: "كذا كرت", desc: "صف كروت" },
  { value: "none", label: "من غير كرت", desc: "" },
] as const;
export type CardMode = (typeof CARD_MODES)[number]["value"];

export const ASSET_KINDS = [
  { value: "face", label: "وش الكريتور", desc: "صور واضحة لوش الكريتور" },
  { value: "expression", label: "تعبيرات", desc: "صور بتعبيرات مختلفة (صدمة، فرحة…)" },
  { value: "asset", label: "كروت وعناصر", desc: "كروت لاعيبة، بكجات، أي عنصر يظهر في التصميم" },
  { value: "reference", label: "ثمبنيلات مرجعية", desc: "ثمبنيلات قديمة بتعبّر عن ستايل القناة" },
  { value: "logo", label: "لوجو", desc: "لوجو القناة" },
  { value: "avatar", label: "صورة القناة", desc: "الأفاتار" },
] as const;

export type SubjectPosition = (typeof SUBJECT_POSITIONS)[number]["value"];
export type SubjectScale = (typeof SUBJECT_SCALES)[number]["value"];
export type TextMode = (typeof TEXT_MODES)[number]["value"];
export type ColorMood = (typeof COLOR_MOODS)[number]["value"];
export type ReferencePriority = (typeof REFERENCE_PRIORITIES)[number]["value"];
export type Variation = (typeof VARIATIONS)[number]["value"];
export type AssetKind = (typeof ASSET_KINDS)[number]["value"];

export const RESULT_STATUSES = [
  { value: "pending", label: "لسه" },
  { value: "approved", label: "معتمد" },
  { value: "revision", label: "محتاج تعديل" },
  { value: "rejected", label: "مرفوض" },
] as const;

/** Arabic display names for the built-in presets (stored names stay English for the prompt). */
export const PRESET_LABELS_AR: Record<string, string> = {
  "eafc-pack-opening": "تفتيح بكجات",
  "eafc-player-review": "مراجعة لاعب",
  "eafc-tactical-guide": "شرح خطة",
  "eafc-fut-champions": "FUT Champions",
  "eafc-squad-builder": "بناء تشكيلة",
  "eafc-hero-icon-reveal": "كشف أيقونة / هيرو",
};

export function presetLabel(p: { slug: string; name: string }) {
  return PRESET_LABELS_AR[p.slug] ?? p.name;
}

export function labelOf<T extends { value: string; label: string }>(list: readonly T[], v: string) {
  return list.find((x) => x.value === v)?.label ?? v;
}
