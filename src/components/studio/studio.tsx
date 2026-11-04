"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlignCenter, AlignLeft, AlignRight, Check, ChevronDown, ClipboardCopy, Download, ExternalLink, FilePlus2,
  Images, Pencil, Plus, RotateCcw, Sparkles, Upload, Users, Wand2, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { Card, EmptyState, Segmented } from "@/components/ui/misc";
import { Dropzone } from "@/components/ui/dropzone";
import { CreatorAvatar } from "@/components/creator-avatar";
import { AssetPicker, autoSelect } from "./asset-picker";
import { compilePrompt, type CompilerOptions, type PromptStyle } from "@/lib/prompt/compiler";
import { GENERIC_SCENE, SCENES, detectScenes } from "@/lib/prompt/scenes";
import { CARD_MODES, COLOR_MOODS, PROMPT_STYLES, type CardMode, REFERENCE_PRIORITIES, SUBJECT_SCALES, VARIATIONS, presetLabel, type Variation } from "@/lib/options";
import type { AppSettings, AssetDTO, CreatorWithCounts, PresetDTO, ProjectWithCount } from "@/lib/types";
import { importResult, saveProject as storeSaveProject, uploadAssets } from "@/lib/store";
import { BASE_PATH } from "@/lib/hooks";
import { copyText, copyTextSync } from "@/lib/clipboard";
import { safeName } from "@/lib/image-export";
import { cn, timeAgo } from "@/lib/utils";

interface FormState {
  projectId: string | null;
  creatorId: string | null;
  presetId: string | null;
  opts: CompilerOptions;
  selected: string[];
}

const defaults = (s: AppSettings): CompilerOptions => ({
  concept: "",
  textMode: "space",
  headline: "",
  subjectPosition: "right",
  subjectScale: "large",
  colorMood: "card",
  colorMoodCustom: "",
  backgroundDirection: "",
  referencePriority: (s.defaultReferencePriority as CompilerOptions["referencePriority"]) || "balanced",
  customInstructions: "",
  variation: (s.defaultVariation as Variation) || "safe",
  promptStyle: (s.promptStyle as PromptStyle) || "quick",
  sceneId: "auto",
  cardMode: "auto",
  gameName: s.gameName || "EA FC 27",
});

const KIND_SHORT: Record<string, string> = { face: "الوش", expression: "تعبير", asset: "كرت / عنصر", reference: "مرجع", logo: "لوجو", avatar: "أفاتار" };

export function Studio({
  creators, presets, assets, projects, settings, projectParam, creatorParam,
}: {
  creators: CreatorWithCounts[];
  presets: PresetDTO[];
  assets: AssetDTO[];
  projects: ProjectWithCount[];
  settings: AppSettings;
  projectParam?: string;
  creatorParam?: string;
}) {
  const router = useRouter();

  const stateFor = useCallback(
    (projId?: string | null, creatorHint?: string | null): FormState => {
      const p = projId ? projects.find((x) => x.id === projId) : undefined;
      const base = defaults(settings);
      if (p) {
        return {
          projectId: p.id,
          creatorId: p.creatorId,
          presetId: p.presetId,
          selected: p.selectedAssetIds,
          opts: {
            ...base,
            concept: p.concept,
            textMode: p.textMode as CompilerOptions["textMode"],
            headline: p.headline,
            subjectPosition: p.subjectPosition as CompilerOptions["subjectPosition"],
            subjectScale: p.subjectScale as CompilerOptions["subjectScale"],
            colorMood: p.colorMood as CompilerOptions["colorMood"],
            colorMoodCustom: p.colorMoodCustom,
            backgroundDirection: p.backgroundDirection,
            referencePriority: p.referencePriority as CompilerOptions["referencePriority"],
            customInstructions: p.customInstructions,
            variation: p.variation as Variation,
            promptStyle: (p.promptStyle as PromptStyle) || base.promptStyle,
            sceneId: p.sceneId || "auto",
            cardMode: (p.cardMode as CardMode) || "auto",
          },
        };
      }
      const valid = creatorHint && creators.some((c) => c.id === creatorHint) ? creatorHint : null;
      const cid = valid ?? creators[0]?.id ?? null;
      return { projectId: null, creatorId: cid, presetId: null, selected: cid ? autoSelect(assets.filter((a) => a.creatorId === cid)) : [], opts: base };
    },
    [projects, creators, assets, settings],
  );

  const [initial] = useState(() => stateFor(projectParam, creatorParam));
  const [projectId, setProjectId] = useState<string | null>(initial.projectId);
  const [creatorId, setCreatorId] = useState<string | null>(initial.creatorId);
  const [presetId, setPresetId] = useState<string | null>(initial.presetId);
  const [opts, setOpts] = useState<CompilerOptions>(initial.opts);
  const [selected, setSelected] = useState<string[]>(initial.selected);
  const [manualPrompt, setManualPrompt] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [sent, setSent] = useState(false);
  const [imported, setImported] = useState<{ id: string; url: string }[]>([]);

  const creator = creators.find((c) => c.id === creatorId) ?? null;
  const creatorAssets = useMemo(() => assets.filter((a) => a.creatorId === creatorId), [assets, creatorId]);
  const availablePresets = presets.filter((p) => !p.creatorId || p.creatorId === creatorId);
  const preset = availablePresets.find((p) => p.id === presetId) ?? null;
  const selectedAssets = useMemo(() => selected.map((id) => creatorAssets.find((a) => a.id === id)).filter((a): a is AssetDTO => !!a), [selected, creatorAssets]);
  const set = <K extends keyof CompilerOptions>(k: K, v: CompilerOptions[K]) => setOpts((o) => ({ ...o, [k]: v }));

  const compiled = useMemo(() => (creator ? compilePrompt({ creator, preset, assets: selectedAssets, options: opts }) : null), [creator, preset, selectedAssets, opts]);
  const finalPrompt = manualPrompt ?? compiled?.prompt ?? "";
  const detected = useMemo(() => detectScenes(opts.concept), [opts.concept]);
  const activeScene = opts.sceneId && opts.sceneId !== "auto" ? SCENES.find((s) => s.id === opts.sceneId) : detected[0] ?? GENERIC_SCENE;
  const byId = useMemo(() => new Map(creatorAssets.map((a) => [a.id, a])), [creatorAssets]);

  useEffect(() => setSent(false), [finalPrompt]);

  const apply = useCallback((st: FormState) => {
    setProjectId(st.projectId);
    setCreatorId(st.creatorId);
    setPresetId(st.presetId);
    setOpts(st.opts);
    setSelected(st.selected);
    setManualPrompt(null);
    setEditing(false);
    setSent(false);
    setImported([]);
  }, []);

  useEffect(() => {
    if (projectParam && projectParam !== projectId && projects.some((p) => p.id === projectParam)) apply(stateFor(projectParam));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectParam]);

  function pickCreator(id: string) {
    if (id === creatorId) return;
    setCreatorId(id);
    setSelected(autoSelect(assets.filter((a) => a.creatorId === id)));
    if (preset?.creatorId && preset.creatorId !== id) setPresetId(null);
    setManualPrompt(null);
  }

  function pickPreset(id: string | null) {
    setPresetId(id);
    const p = presets.find((x) => x.id === id);
    if (p) {
      setOpts((o) => ({
        ...o,
        subjectPosition: p.defaults.subjectPosition ?? o.subjectPosition,
        subjectScale: p.defaults.subjectScale ?? o.subjectScale,
        textMode: p.defaults.textMode ?? o.textMode,
        colorMood: p.defaults.colorMood ?? o.colorMood,
      }));
    }
  }

  const saveProject = useCallback(async (): Promise<string | null> => {
    if (!creatorId) return null;
    try {
      const p = await storeSaveProject(projectId, {
        creatorId, presetId, ...opts,
        headline: opts.headline ?? "", colorMoodCustom: opts.colorMoodCustom ?? "", backgroundDirection: opts.backgroundDirection ?? "",
        customInstructions: opts.customInstructions ?? "", promptStyle: opts.promptStyle ?? "quick", sceneId: opts.sceneId ?? "auto", cardMode: opts.cardMode ?? "auto",
        selectedAssetIds: selected, compiledPrompt: finalPrompt, title: opts.concept.slice(0, 90),
      });
      setProjectId(p.id);
      if (projectParam !== p.id) window.history.replaceState(null, "", `${BASE_PATH}/?project=${p.id}`);
      return p.id;
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    }
  }, [creatorId, presetId, opts, selected, finalPrompt, projectId, projectParam]);

  /** Copy synchronously (inside the tap), then open ChatGPT. */
  function copyAndOpen() {
    if (!compiled || !finalPrompt) return;
    if (!opts.concept.trim()) {
      toast.error("اكتب فكرة الفيديو الأول");
      return;
    }
    let ok = copyTextSync(finalPrompt);
    const win = window.open(settings.chatgptUrl || "https://chatgpt.com", "_blank");
    if (win) win.opener = null;
    if (!ok) copyText(finalPrompt).then((r) => { ok = r; if (!r) toast.error("المتصفح منع النسخ — استخدم «انسخ البرومبت بس»"); });
    if (ok) toast.success("البرومبت اتنسخ — الصقه في ChatGPT مع الصور");
    if (!win) toast.message("المتصفح منع فتح ChatGPT — دوس على لينك chatgpt.com تحت الزرار");
    setSent(true);
    void saveProject();
  }

  async function copyPrompt() {
    if (await copyText(finalPrompt)) toast.success("البرومبت اتنسخ");
    else toast.error("مقدرتش أنسخ — جرب تاني");
  }

  async function addItem(files: File[]) {
    if (!creator) return;
    setUploading(true);
    try {
      const created = await uploadAssets(creator.id, "asset", files);
      setSelected((s) => [...s, ...created.map((a) => a.id)]);
      toast.success(files.length > 1 ? `اتضافت ${files.length} صور` : "الصورة اتضافت");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  /** Phone: share sheet → "Save images". Desktop: numbered downloads. */
  async function saveImages() {
    const items = compiled?.attachments ?? [];
    const files: File[] = [];
    for (const att of items) {
      const a = byId.get(att.assetId);
      if (!a) continue;
      const blob = await (await fetch(a.url)).blob();
      const ext = (a.mime.split("/")[1] || "png").replace("jpeg", "jpg");
      files.push(new File([blob], `${String(att.index).padStart(2, "0")}-${att.kind}-${safeName(att.label) || "image"}.${ext}`, { type: a.mime }));
    }
    if (!files.length) return;
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.canShare?.({ files }) && /Mobi|iPhone|iPad|Android/i.test(navigator.userAgent)) {
      try {
        await navigator.share({ files, title: "صور الثمبنيل" });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    files.forEach((f, i) =>
      setTimeout(() => {
        const url = URL.createObjectURL(f);
        const link = document.createElement("a");
        link.href = url;
        link.download = f.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }, i * 300),
    );
  }

  async function importFiles(files: File[]) {
    if (!creator) return;
    setImporting(true);
    try {
      const pid = await saveProject();
      const refs = (compiled?.attachments ?? []).map((a) => ({ id: a.assetId, label: a.label, kind: a.kind, role: a.role, purpose: a.purpose }));
      const out: { id: string; url: string }[] = [];
      for (const f of files) {
        const r = await importResult({ file: f, creatorId: creator.id, projectId: pid, presetId, concept: opts.concept, prompt: finalPrompt, variation: opts.variation, references: refs });
        out.push({ id: r.id, url: URL.createObjectURL(f) });
      }
      setImported((x) => [...x, ...out]);
      toast.success("التصميم اتحفظ في النتايج");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  function newProject() {
    apply(stateFor(null, creatorId));
    router.push(creatorId ? `/?creator=${creatorId}` : "/");
  }

  if (creators.length === 0) {
    return (
      <div className="p-4 md:p-8">
        <EmptyState icon={<Users />} title="ضيف كريتور الأول" action={<Button asChild size="lg"><Link href="/creators/new"><Plus /> كريتور جديد</Link></Button>}>
          اعمل بروفايل للكريتور وارفع صورة واضحة لوشه، وبعدها تقدر تعمل ثمبنيلات في ثواني.
        </EmptyState>
      </div>
    );
  }

  const faceCount = creatorAssets.filter((a) => a.kind === "face" || a.kind === "expression").length;
  const recent = projects.filter((p) => p.creatorId === creatorId).slice(0, 15);
  const faceWarning = compiled?.warnings.some((w) => w.includes("Face/Expression"));
  const hasCard = selectedAssets.some((a) => a.kind === "asset");

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background/85 px-4 py-2.5 backdrop-blur md:px-6">
        <Wand2 className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1 truncate text-sm font-semibold">{projectId ? opts.concept.slice(0, 50) || "مشروع" : "ثمبنيل جديد"}</div>
        {recent.length > 0 && (
          <NativeSelect className="h-8 w-36 text-xs md:w-52" value="" onChange={(e) => e.target.value && router.push(`/?project=${e.target.value}`)} aria-label="آخر المشاريع">
            <option value="">آخر المشاريع…</option>
            {recent.map((p) => <option key={p.id} value={p.id}>{(p.title || p.concept || "بدون اسم").slice(0, 40)} · {timeAgo(p.updatedAt)}</option>)}
          </NativeSelect>
        )}
        <Button size="sm" variant="ghost" onClick={newProject}><FilePlus2 /> <span className="hidden sm:inline">جديد</span></Button>
      </div>

      <div className="grid flex-1 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_480px]">
        {/* ------------------------------------------------------------- Brief */}
        <div className="min-w-0 space-y-4 px-4 py-4 md:px-6 md:py-6">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {creators.map((c) => (
              <button
                key={c.id}
                onClick={() => pickCreator(c.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-2xl border p-2 pe-4 transition",
                  c.id === creatorId ? "border-primary/60 bg-primary/[0.07] glow-ring" : "bg-panel hover:border-white/15",
                )}
              >
                <CreatorAvatar name={c.name} url={c.avatarUrl} color={c.primaryColor} size={34} />
                <span className="text-sm font-semibold">{c.name}</span>
              </button>
            ))}
            <Link href="/creators/new" className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-dashed px-4 text-sm text-muted-foreground transition hover:border-primary/50 hover:text-foreground">
              <Plus className="h-4 w-4" /> كريتور
            </Link>
          </div>

          {creator && (
            <>
              <Card className="p-4 md:p-5">
                <label htmlFor="concept" className="mb-2 block text-base font-bold">الفيديو عن إيه؟</label>
                <Textarea
                  id="concept"
                  rows={3}
                  className="resize-none border-white/10 bg-background/40 text-base leading-relaxed md:text-lg"
                  value={opts.concept}
                  onChange={(e) => set("concept", e.target.value)}
                  placeholder="مثال: إزاي مالعبتش بالكرت ده من زمان؟ / فتحت ٥٠ بكج أيقونة"
                />
                <div className="mt-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>نوع الفيديو</span>
                    {opts.sceneId === "auto" && opts.concept.trim() && <span className="text-primary">اتعرّف تلقائي: {activeScene?.label}</span>}
                  </div>
                  <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 md:flex-wrap">
                    <SceneChip active={opts.sceneId === "auto"} onClick={() => set("sceneId", "auto")} label="تلقائي" icon />
                    {SCENES.map((s) => (
                      <SceneChip key={s.id} active={opts.sceneId === s.id} onClick={() => set("sceneId", s.id)} label={s.label} hint={opts.sceneId === "auto" && detected[0]?.id === s.id} />
                    ))}
                  </div>
                </div>
              </Card>

              <Card className="p-4 md:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-base font-bold">الصور</div>
                  <button onClick={() => setShowPicker((v) => !v)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <Images className="h-3.5 w-3.5" /> {showPicker ? "اقفل" : "اختار من صور الكريتور"}
                  </button>
                </div>
                {faceCount === 0 && (
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/30 bg-warning/[0.06] p-3 text-sm text-warning">
                    مفيش صورة لوش {creator.name} — ارفع صورة واضحة عشان ChatGPT يحافظ على الشكل.
                    <Button asChild size="sm" variant="secondary"><Link href={`/creators/edit?id=${creator.id}&tab=assets`}>ارفع صورة الوش</Link></Button>
                  </div>
                )}
                <div className="flex gap-2.5 overflow-x-auto pb-1">
                  {(compiled?.attachments ?? []).map((att) => {
                    const a = byId.get(att.assetId);
                    if (!a) return null;
                    return (
                      <div key={att.assetId} className="relative w-24 shrink-0">
                        <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-white/10 bg-black">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={a.url} alt={a.label} className="h-full w-full object-cover" />
                          <span className="absolute start-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-md bg-primary px-1 font-mono text-[11px] font-bold text-primary-foreground">{att.index}</span>
                          <button onClick={() => setSelected((s) => s.filter((x) => x !== att.assetId))} className="absolute end-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-md bg-black/70 text-white opacity-80 hover:opacity-100" aria-label="شيل الصورة"><X className="h-3 w-3" /></button>
                        </div>
                        <div className="mt-1 truncate text-center text-[11px] text-muted-foreground">{KIND_SHORT[att.kind] ?? att.kind}</div>
                      </div>
                    );
                  })}
                  <Dropzone compact busy={uploading} onFiles={addItem} title="ضيف كرت أو عنصر" className="aspect-[4/5] w-24 shrink-0 p-2" />
                </div>
                <div className="mt-4">
                  <div className="mb-2 text-xs text-muted-foreground">الكرت</div>
                  <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                    {CARD_MODES.map((m) => (
                      <SceneChip key={m.value} active={(opts.cardMode ?? "auto") === m.value} onClick={() => set("cardMode", m.value)} label={m.value === "auto" ? `تلقائي${hasCard ? " (الكرت اللي رفعته)" : ""}` : m.label} />
                    ))}
                  </div>
                  {opts.cardMode === "attached" && !hasCard && <div className="mt-2 text-xs text-warning">ارفع صورة الكرت من «ضيف كرت أو عنصر».</div>}
                </div>
                {faceWarning && (
                  <div className="mt-3 rounded-xl border border-warning/30 bg-warning/[0.06] p-3 text-xs leading-relaxed text-warning">
                    فيه أكتر من صورة متسجلة إنها «وش الكريتور». لو واحدة منهم كرت أو عنصر، غيّر نوعها لـ «كروت وعناصر» من صفحة الكريتور ← الصور، عشان ChatGPT ميفتكرهاش وشك.
                  </div>
                )}
                {showPicker && (
                  <div className="mt-4 border-t pt-4">
                    <AssetPicker assets={creatorAssets} selected={selected} onChange={setSelected} creatorId={creator.id} />
                  </div>
                )}
              </Card>

              <Card className="grid gap-4 p-4 sm:grid-cols-2 md:p-5">
                <div>
                  <Label>مكان {creator.name} في الصورة</Label>
                  <Segmented
                    value={opts.subjectPosition}
                    onChange={(v) => set("subjectPosition", v)}
                    options={[{ value: "right", label: "يمين", icon: <AlignRight /> }, { value: "center", label: "النص", icon: <AlignCenter /> }, { value: "left", label: "شمال", icon: <AlignLeft /> }]}
                  />
                </div>
                <div>
                  <Label>الكتابة على الصورة</Label>
                  <Segmented value={opts.textMode} onChange={(v) => set("textMode", v)} options={[{ value: "space", label: "سيب مكان للعنوان" }, { value: "none", label: "من غير" }, { value: "render", label: "ChatGPT يكتب" }]} />
                  {opts.textMode === "render" && (
                    <Input className="mt-2 text-base" value={opts.headline} onChange={(e) => set("headline", e.target.value)} placeholder="العنوان بالظبط — مثال: أقوى بكج" />
                  )}
                  {opts.textMode === "space" && <div className="mt-1.5 text-[11px] text-muted-foreground">ChatGPT مش هيكتب حاجة، وهيسيب مكان تحت في النص للعنوان بتاعك.</div>}
                </div>
              </Card>

              <details className="group rounded-xl border bg-panel">
                <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-semibold md:px-5">
                  خيارات متقدمة
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
                </summary>
                <div className="grid gap-4 border-t p-4 sm:grid-cols-2 md:p-5">
                  <div>
                    <Label>مستوى الجرأة</Label>
                    <Segmented value={opts.variation} onChange={(v) => set("variation", v)} options={VARIATIONS.map((v) => ({ value: v.value, label: v.label }))} />
                    <div className="mt-1 text-[11px] text-muted-foreground">{VARIATIONS.find((v) => v.value === opts.variation)?.desc}</div>
                  </div>
                  <div>
                    <Label>حجم {creator.name}</Label>
                    <Segmented size="sm" value={opts.subjectScale} onChange={(v) => set("subjectScale", v)} options={SUBJECT_SCALES.map((s) => ({ value: s.value, label: s.label }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>الألوان</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {COLOR_MOODS.map((m) => (
                        <button key={m.value} onClick={() => set("colorMood", m.value)} className={cn("rounded-lg border px-2.5 py-1.5 text-xs transition", opts.colorMood === m.value ? "border-primary/60 bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
                          {m.value === "creator" && <span className="me-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: creator.primaryColor }} />}
                          {m.label}
                        </button>
                      ))}
                    </div>
                    {opts.colorMood === "custom" && <Input className="mt-2" value={opts.colorMoodCustom} onChange={(e) => set("colorMoodCustom", e.target.value)} placeholder="مثال: أخضر زمردي مع إضاءة دهبي" />}
                  </div>
                  <div>
                    <Label>الخلفية (اختياري)</Label>
                    <Input value={opts.backgroundDirection} onChange={(e) => set("backgroundDirection", e.target.value)} placeholder="سيبها فاضية والبرنامج يختار حسب الموضوع" />
                  </div>
                  <div>
                    <Label>قالب</Label>
                    <NativeSelect value={presetId ?? ""} onChange={(e) => pickPreset(e.target.value || null)}>
                      <option value="">من غير قالب</option>
                      {availablePresets.map((p) => <option key={p.id} value={p.id}>{presetLabel(p)}{p.creatorId ? " (مخصص)" : ""}</option>)}
                    </NativeSelect>
                  </div>
                  <div>
                    <Label>طول البرومبت</Label>
                    <Segmented value={(opts.promptStyle ?? "concise") as PromptStyle} onChange={(v) => { set("promptStyle", v); setManualPrompt(null); }} options={PROMPT_STYLES.map((p) => ({ value: p.value, label: p.label }))} />
                  </div>
                  <div>
                    <Label>الثمبنيلات المرجعية</Label>
                    <Segmented size="sm" value={opts.referencePriority} onChange={(v) => set("referencePriority", v)} options={REFERENCE_PRIORITIES.map((s) => ({ value: s.value, label: s.label }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>تعليمات إضافية</Label>
                    <Textarea rows={2} value={opts.customInstructions} onChange={(e) => set("customInstructions", e.target.value)} placeholder="سطر لكل تعليمة — مثال: ماسك الكرت بإيده اليمين" />
                  </div>
                </div>
              </details>
            </>
          )}
        </div>

        {/* ------------------------------------------------------------ Output */}
        {creator && compiled && (
          <aside className="border-t bg-panel/40 lg:sticky lg:top-[53px] lg:h-[calc(100vh-53px)] lg:overflow-y-auto lg:border-s lg:border-t-0">
            <div className="space-y-6 p-4 md:p-6">
              <Step n={1} title="انسخ البرومبت وافتح ChatGPT" done={sent}>
                <Button size="xl" className="h-14 w-full text-base font-bold" onClick={copyAndOpen}>
                  <Sparkles className="!size-5" /> انسخ وافتح ChatGPT
                </Button>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <button onClick={copyPrompt} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ClipboardCopy className="h-3.5 w-3.5" /> انسخ البرومبت بس</button>
                  <button onClick={() => setShowPrompt((v) => !v)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    {showPrompt ? "اخفي البرومبت" : "شوف البرومبت"} <ChevronDown className={cn("h-3.5 w-3.5 transition", showPrompt && "rotate-180")} />
                  </button>
                </div>
                {showPrompt && (
                  <div className="relative mt-3 overflow-hidden rounded-xl border bg-background/70" dir="ltr">
                    {editing ? (
                      <textarea className="h-72 w-full resize-none bg-transparent p-3 font-mono text-[12px] leading-relaxed outline-none" value={finalPrompt} onChange={(e) => setManualPrompt(e.target.value)} autoFocus />
                    ) : (
                      <pre className="max-h-72 overflow-auto whitespace-pre-wrap p-3 font-mono text-[12px] leading-relaxed text-foreground/90">{finalPrompt}</pre>
                    )}
                    <div className="absolute right-2 top-2 flex gap-1">
                      <Button size="icon-sm" variant="secondary" title={editing ? "خلاص" : "عدّل بإيدك"} onClick={() => setEditing(!editing)}>{editing ? <Check /> : <Pencil />}</Button>
                      {manualPrompt !== null && <Button size="icon-sm" variant="secondary" title="ارجع للبرومبت الأصلي" onClick={() => { setManualPrompt(null); setEditing(false); }}><RotateCcw /></Button>}
                    </div>
                  </div>
                )}
                <a href={settings.chatgptUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"><ExternalLink className="h-3 w-3" /> chatgpt.com</a>
              </Step>

              <Step n={2} title={compiled.attachments.length === 1 ? "ارفع الصورة دي في ChatGPT" : compiled.attachments.length ? `ارفع الـ ${compiled.attachments.length} صور دول في ChatGPT بنفس الترتيب` : "مفيش صور مختارة"}>
                {compiled.attachments.length > 0 ? (
                  <>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {compiled.attachments.map((att) => {
                        const a = byId.get(att.assetId);
                        return a ? (
                          <div key={att.assetId} className="relative w-16 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={a.url} alt="" className="aspect-[4/5] w-full rounded-lg object-cover" />
                            <span className="absolute start-1 top-1 rounded bg-primary px-1 font-mono text-[10px] font-bold text-primary-foreground">{att.index}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                    <Button variant="secondary" className="mt-3 w-full" onClick={saveImages}><Download /> احفظ الصور على الجهاز</Button>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">البرنامج مش بيرفع الصور لوحده — في ChatGPT دوس <b>+</b> واختار الصور دي، والصق البرومبت وابعت.</p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">ضيف صورة وش الكريتور على الأقل عشان النتيجة تبقى شبهه.</p>
                )}
              </Step>

              <Step n={3} title="رجّع التصميم هنا" done={imported.length > 0}>
                <Dropzone onFiles={importFiles} busy={importing} enablePaste title="حط الصورة اللي طلعت من ChatGPT" hint="اسحبها هنا، أو دوس واختارها، أو الصقها (⌘V)" className="py-7" />
                {imported.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {imported.map((r) => (
                        <Link key={r.id} href={`/library?open=${r.id}`} className="overflow-hidden rounded-lg border hover:border-primary/50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.url} alt="" className="aspect-video w-full object-cover" />
                        </Link>
                      ))}
                    </div>
                    <Button asChild variant="secondary" size="sm" className="w-full"><Link href="/library"><Upload /> افتح النتايج — قيّم وصدّر ١٢٨٠×٧٢٠</Link></Button>
                  </div>
                )}
              </Step>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function Step({ n, title, children, done }: { n: number; title: string; children: React.ReactNode; done?: boolean }) {
  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold", done ? "bg-success text-black" : "bg-primary/15 text-primary")}>{done ? <Check className="h-3.5 w-3.5" /> : n}</span>
        <h2 className="text-sm font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SceneChip({ active, onClick, label, icon, hint }: { active: boolean; onClick: () => void; label: string; icon?: boolean; hint?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active ? "border-primary/60 bg-primary/15 text-primary" : hint ? "border-primary/30 text-foreground" : "text-muted-foreground hover:border-white/20 hover:text-foreground",
      )}
    >
      {icon && <Sparkles className="h-3 w-3" />}
      {label}
    </button>
  );
}
