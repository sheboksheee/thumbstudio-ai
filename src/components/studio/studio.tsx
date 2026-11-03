"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, AlignCenter, AlignLeft, AlignRight, Check, ClipboardCopy, ExternalLink, FileText, FilePlus2, History,
  Languages, Loader2, Pencil, RotateCcw, Save, Sparkles, Type, Users, Wand2, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { Badge, Card, EmptyState, Segmented } from "@/components/ui/misc";
import { CreatorAvatar } from "@/components/creator-avatar";
import { AssetPicker, autoSelect } from "./asset-picker";
import { ChatGPTDialog } from "./chatgpt-dialog";
import { compilePrompt, detectScript, type CompilerOptions } from "@/lib/prompt/compiler";
import { COLOR_MOODS, REFERENCE_PRIORITIES, SUBJECT_SCALES, VARIATIONS, type Variation } from "@/lib/options";
import type { AppSettings, AssetDTO, CreatorWithCounts, PresetDTO, ProjectWithCount } from "@/lib/types";
import { saveProject as storeSaveProject } from "@/lib/store";
import { BASE_PATH } from "@/lib/hooks";
import { copyText, copyTextSync } from "@/lib/clipboard";
import { cn, timeAgo } from "@/lib/utils";

type Project = ProjectWithCount;

interface FormState {
  projectId: string | null;
  creatorId: string | null;
  presetId: string | null;
  opts: CompilerOptions;
  selected: string[];
}

const DEFAULT_OPTIONS = (s: AppSettings): CompilerOptions => ({
  concept: "",
  textMode: "none",
  headline: "",
  subjectPosition: "right",
  subjectScale: "large",
  colorMood: "creator",
  colorMoodCustom: "",
  backgroundDirection: "",
  referencePriority: (s.defaultReferencePriority as CompilerOptions["referencePriority"]) || "balanced",
  customInstructions: "",
  variation: (s.defaultVariation as Variation) || "safe",
});

export function Studio({
  creators, presets, assets, projects, settings, projectParam, creatorParam,
}: {
  creators: CreatorWithCounts[];
  presets: PresetDTO[];
  assets: AssetDTO[];
  projects: Project[];
  settings: AppSettings;
  projectParam?: string;
  creatorParam?: string;
}) {
  const router = useRouter();

  const stateFor = useCallback(
    (projId?: string | null, creatorHint?: string | null): FormState => {
      const p = projId ? projects.find((x) => x.id === projId) : undefined;
      if (p) {
        return {
          projectId: p.id,
          creatorId: p.creatorId,
          presetId: p.presetId,
          selected: p.selectedAssetIds,
          opts: {
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
          },
        };
      }
      const cid = (creatorHint && creators.some((c) => c.id === creatorHint) ? creatorHint : null) ?? (creators.length === 1 ? creators[0].id : null);
      return { projectId: null, creatorId: cid, presetId: null, selected: cid ? autoSelect(assets.filter((a) => a.creatorId === cid)) : [], opts: DEFAULT_OPTIONS(settings) };
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
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState<"prompt" | "manifest" | null>(null);

  const creator = creators.find((c) => c.id === creatorId) ?? null;
  const creatorAssets = useMemo(() => assets.filter((a) => a.creatorId === creatorId), [assets, creatorId]);
  const availablePresets = presets.filter((p) => !p.creatorId || p.creatorId === creatorId);
  const preset = availablePresets.find((p) => p.id === presetId) ?? null;
  const selectedAssets = useMemo(() => selected.map((id) => creatorAssets.find((a) => a.id === id)).filter((a): a is AssetDTO => !!a), [selected, creatorAssets]);

  const set = <K extends keyof CompilerOptions>(k: K, v: CompilerOptions[K]) => setOpts((o) => ({ ...o, [k]: v }));

  const compiled = useMemo(() => {
    if (!creator) return null;
    return compilePrompt({ creator, preset, assets: selectedAssets, options: opts });
  }, [creator, preset, selectedAssets, opts]);

  const finalPrompt = manualPrompt ?? compiled?.prompt ?? "";

  // Any input change discards manual prompt edits only if the user confirms via "Recompile";
  // we keep edits but flag them as stale.
  const compiledKey = compiled?.prompt ?? "";
  const [editBase, setEditBase] = useState<string>("");
  const stale = manualPrompt !== null && editBase !== compiledKey;

  const snapshot = JSON.stringify({ creatorId, presetId, opts, selected, manualPrompt });
  const snapshotOf = (st: FormState) => JSON.stringify({ creatorId: st.creatorId, presetId: st.presetId, opts: st.opts, selected: st.selected, manualPrompt: null });
  const [savedSnapshot, setSavedSnapshot] = useState<string>(() => (initial.projectId ? snapshotOf(initial) : ""));
  const dirty = snapshot !== savedSnapshot;

  const apply = useCallback((st: FormState) => {
    setProjectId(st.projectId);
    setCreatorId(st.creatorId);
    setPresetId(st.presetId);
    setOpts(st.opts);
    setSelected(st.selected);
    setManualPrompt(null);
    setEditing(false);
    setDialogOpen(false);
    setSavedSnapshot(st.projectId ? JSON.stringify({ creatorId: st.creatorId, presetId: st.presetId, opts: st.opts, selected: st.selected, manualPrompt: null }) : "");
  }, []);

  // Navigating to another project (recent list, dashboard, library) loads it in place.
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

  function pickPreset(p: PresetDTO | null) {
    setPresetId(p?.id ?? null);
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

  const saveProject = useCallback(async (silent = false): Promise<string | null> => {
    if (!creatorId) {
      toast.error("Select a creator first");
      return null;
    }
    setSaving(true);
    try {
      const p = await storeSaveProject(projectId, {
        creatorId, presetId, ...opts, headline: opts.headline ?? "", colorMoodCustom: opts.colorMoodCustom ?? "",
        backgroundDirection: opts.backgroundDirection ?? "", customInstructions: opts.customInstructions ?? "",
        selectedAssetIds: selected, compiledPrompt: finalPrompt, title: opts.concept.slice(0, 90),
      });
      setProjectId(p.id);
      setSavedSnapshot(snapshot);
      if (projectParam !== p.id) window.history.replaceState(null, "", `${BASE_PATH}/studio/?project=${p.id}`);
      if (!silent) toast.success("Project saved");
      return p.id;
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    } finally {
      setSaving(false);
    }
  }, [creatorId, presetId, opts, selected, finalPrompt, projectId, snapshot, projectParam]);

  /** The core Manual Mode action: copy → open ChatGPT → show checklist. */
  function copyAndOpen() {
    if (!compiled || !finalPrompt) return;
    // Copy synchronously so we stay inside the click gesture, then open the tab.
    let ok = copyTextSync(finalPrompt);
    const win = window.open(settings.chatgptUrl || "https://chatgpt.com", "_blank");
    if (win) win.opener = null;
    if (!ok) {
      copyText(finalPrompt).then((r) => {
        ok = r;
        if (!r) toast.error("Clipboard blocked — use the Copy button in the checklist.");
      });
    }
    if (ok) toast.success("Prompt copied to clipboard");
    if (!win) toast.message("Popup blocked — use the “Open ChatGPT” link in the checklist.");
    setDialogOpen(true);
    void saveProject(true);
  }

  async function copy(kind: "prompt" | "manifest") {
    const text = kind === "prompt" ? finalPrompt : compiled?.manifest ?? "";
    if (await copyText(text)) {
      setCopied(kind);
      toast.success(kind === "prompt" ? "Prompt copied" : "Asset manifest copied");
      setTimeout(() => setCopied(null), 1600);
    } else toast.error("Could not access the clipboard");
  }

  function newProject() {
    if (dirty && !confirm("Start a new project? Unsaved changes in this one will be lost.")) return;
    apply(stateFor(null, creatorId));
    router.push(creatorId ? `/studio?creator=${creatorId}` : "/studio");
  }

  if (creators.length === 0) {
    return (
      <div className="p-8">
        <EmptyState icon={<Users />} title="Create a creator first" action={<Button asChild><Link href="/creators/new">New creator</Link></Button>}>
          The Studio compiles prompts from a creator&apos;s profile, Style DNA and photography.
        </EmptyState>
      </div>
    );
  }

  const conceptScript = detectScript(opts.concept);
  const headlineScript = detectScript(opts.headline ?? "");
  const creatorProjects = projects.filter((p) => !creatorId || p.creatorId === creatorId).slice(0, 12);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/85 px-6 py-3 backdrop-blur">
        <Wand2 className="h-5 w-5 text-primary" />
        <div className="text-sm font-semibold">Studio</div>
        <div className="mx-2 h-4 w-px bg-border" />
        <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground" dir="auto">
          {projectId ? <>Project · <span className="text-foreground">{opts.concept.slice(0, 60) || "Untitled"}</span></> : "New project"}
          {dirty && projectId && <Badge tone="warning" className="ml-2">Unsaved</Badge>}
        </div>
        <NativeSelect
          className="h-8 w-56 text-xs"
          value=""
          onChange={(e) => e.target.value && router.push(`/studio?project=${e.target.value}`)}
          aria-label="Open recent project"
        >
          <option value="">Recent projects…</option>
          {creatorProjects.map((p) => (
            <option key={p.id} value={p.id}>{(p.title || p.concept || "Untitled").slice(0, 40)} · {timeAgo(p.updatedAt)}</option>
          ))}
        </NativeSelect>
        <Button size="sm" variant="ghost" onClick={newProject}><FilePlus2 /> New</Button>
        <Button size="sm" variant="secondary" onClick={() => saveProject()} disabled={saving || !creatorId}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Save</Button>
      </div>

      <div className="grid flex-1 gap-0 xl:grid-cols-[minmax(0,1fr)_500px] 2xl:grid-cols-[minmax(0,1fr)_580px]">
        {/* Builder */}
        <div className="space-y-5 px-6 py-6">
          {/* 1. Creator */}
          <Step n={1} title="Creator" done={!!creator}>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {creators.map((c) => (
                <button
                  key={c.id}
                  onClick={() => pickCreator(c.id)}
                  className={cn(
                    "flex min-w-[180px] items-center gap-3 rounded-xl border p-2.5 pr-4 text-left transition",
                    c.id === creatorId ? "border-primary/60 bg-primary/[0.06] glow-ring" : "bg-background/40 hover:border-white/15",
                  )}
                >
                  <CreatorAvatar name={c.name} url={c.avatarUrl} color={c.primaryColor} size={36} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{c.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground" dir="auto">{c.channelName}</div>
                  </div>
                </button>
              ))}
            </div>
          </Step>

          {creator && (
            <>
              {/* 2. Concept */}
              <Step n={2} title="Video concept" done={!!opts.concept.trim()} right={conceptScript !== "none" && <Badge tone="outline"><Languages className="h-3 w-3" /> {conceptScript === "arabic" ? "Arabic" : conceptScript === "mixed" ? "Arabic + English" : "English"}</Badge>}>
                <Textarea
                  rows={2}
                  className="text-base"
                  value={opts.concept}
                  onChange={(e) => set("concept", e.target.value)}
                  placeholder="What is the video about? English or Arabic — e.g. “I opened 50 Icon packs” / “فتحت ٥٠ بكج أيقونة”"
                />
              </Step>

              {/* 3. Preset */}
              <Step n={3} title="Preset" done={!!preset}>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 2xl:grid-cols-4">
                  <PresetChip active={!presetId} onClick={() => pickPreset(null)} name="No preset" desc="Creator DNA + concept only" />
                  {availablePresets.map((p) => (
                    <PresetChip key={p.id} active={p.id === presetId} onClick={() => pickPreset(p)} name={p.name} desc={p.description} tag={p.creatorId ? "Custom" : p.niche} />
                  ))}
                </div>
              </Step>

              {/* 4. Direction */}
              <Step n={4} title="Creative direction">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Text</Label>
                    <Segmented
                      value={opts.textMode}
                      onChange={(v) => set("textMode", v)}
                      options={[{ value: "none", label: "No text" }, { value: "render", label: "Headline", icon: <Type /> }, { value: "space", label: "Leave space" }]}
                    />
                    {opts.textMode === "render" && (
                      <div className="mt-2">
                        <Input value={opts.headline} onChange={(e) => set("headline", e.target.value)} placeholder="Exact headline — e.g. 99 PULL / أقوى بكج" className={cn(headlineScript === "arabic" && "text-right text-base")} />
                        {(headlineScript === "arabic" || headlineScript === "mixed") && <div className="mt-1 text-[11px] text-primary">Arabic headline detected — RTL rendering rules will be added.</div>}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Subject position</Label>
                    <Segmented
                      value={opts.subjectPosition}
                      onChange={(v) => set("subjectPosition", v)}
                      options={[{ value: "left", label: "Left", icon: <AlignLeft /> }, { value: "center", label: "Center", icon: <AlignCenter /> }, { value: "right", label: "Right", icon: <AlignRight /> }]}
                    />
                  </div>
                  <div>
                    <Label>Subject scale</Label>
                    <Segmented value={opts.subjectScale} onChange={(v) => set("subjectScale", v)} options={SUBJECT_SCALES.map((s) => ({ value: s.value, label: s.label }))} size="sm" />
                  </div>
                  <div>
                    <Label>Reference priority</Label>
                    <Segmented value={opts.referencePriority} onChange={(v) => set("referencePriority", v)} options={REFERENCE_PRIORITIES.map((s) => ({ value: s.value, label: s.label }))} size="sm" />
                  </div>
                  <div>
                    <Label>Color mood</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {COLOR_MOODS.map((m) => (
                        <button key={m.value} onClick={() => set("colorMood", m.value)} className={cn("rounded-lg border px-2.5 py-1.5 text-xs transition", opts.colorMood === m.value ? "border-primary/60 bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
                          {m.value === "creator" && <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: creator.primaryColor }} />}
                          {m.label}
                        </button>
                      ))}
                    </div>
                    {opts.colorMood === "custom" && <Input className="mt-2" value={opts.colorMoodCustom} onChange={(e) => set("colorMoodCustom", e.target.value)} placeholder="e.g. emerald and black with gold rim light" />}
                  </div>
                  <div>
                    <Label>Background direction</Label>
                    <Input value={opts.backgroundDirection} onChange={(e) => set("backgroundDirection", e.target.value)} placeholder={preset?.background ? "Optional — preset background applies" : creator.background || "e.g. blurred stadium at night"} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Custom instructions</Label>
                    <Textarea rows={2} value={opts.customInstructions} onChange={(e) => set("customInstructions", e.target.value)} placeholder="One per line — e.g. hold the trophy in the right hand" />
                  </div>
                </div>
              </Step>

              {/* 5. Assets */}
              <Step n={5} title="Attach assets" done={selectedAssets.length > 0} right={<span className="text-xs text-muted-foreground">{selectedAssets.length} selected · attach order is automatic</span>}>
                <AssetPicker assets={creatorAssets} selected={selected} onChange={setSelected} creatorId={creator.id} />
              </Step>
            </>
          )}
        </div>

        {/* Output */}
        <aside className="border-l bg-panel/40 xl:sticky xl:top-[57px] xl:h-[calc(100vh-57px)]">
          <div className="flex h-full flex-col p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4 text-primary" /> Compiled prompt</div>
              {compiled && <span className="font-mono text-[11px] text-muted-foreground">{finalPrompt.split(/\s+/).filter(Boolean).length} words · {finalPrompt.length} chars</span>}
            </div>
            <Segmented
              value={opts.variation}
              onChange={(v) => set("variation", v)}
              options={VARIATIONS.map((v) => ({ value: v.value, label: v.label, icon: v.value === "safe" ? <Check /> : v.value === "creative" ? <Sparkles /> : <Zap /> }))}
            />
            <div className="mt-1.5 text-[11px] text-muted-foreground">{VARIATIONS.find((v) => v.value === opts.variation)?.desc} Identity &amp; locked DNA are preserved in all variations.</div>

            {compiled && compiled.warnings.length > 0 && (
              <div className="mt-3 space-y-1 rounded-lg border border-warning/30 bg-warning/[0.06] p-2.5">
                {compiled.warnings.map((w) => (
                  <div key={w} className="flex gap-2 text-[11px] text-warning"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{w}</div>
                ))}
              </div>
            )}

            <div className="relative mt-3 min-h-[240px] flex-1 overflow-hidden rounded-xl border bg-background/70">
              {!compiled ? (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">Select a creator to start compiling.</div>
              ) : editing ? (
                <textarea
                  className="h-full w-full resize-none bg-transparent p-4 font-mono text-[12px] leading-relaxed outline-none"
                  dir="auto"
                  value={finalPrompt}
                  onChange={(e) => {
                    if (manualPrompt === null) setEditBase(compiledKey);
                    setManualPrompt(e.target.value);
                  }}
                  autoFocus
                />
              ) : (
                <pre className="h-full overflow-auto whitespace-pre-wrap p-4 font-mono text-[12px] leading-relaxed text-foreground/90" dir="auto">{finalPrompt}</pre>
              )}
              {compiled && (
                <div className="absolute right-2 top-2 flex gap-1">
                  <Button size="icon-sm" variant="secondary" title={editing ? "Done editing" : "Edit prompt manually"} onClick={() => setEditing(!editing)}>{editing ? <Check /> : <Pencil />}</Button>
                  {manualPrompt !== null && (
                    <Button size="icon-sm" variant="secondary" title="Discard manual edits and recompile" onClick={() => { setManualPrompt(null); setEditing(false); }}><RotateCcw /></Button>
                  )}
                </div>
              )}
            </div>
            {manualPrompt !== null && (
              <div className={cn("mt-2 text-[11px]", stale ? "text-warning" : "text-muted-foreground")}>
                {stale ? "Manual edits active — inputs changed since. Click ↺ to recompile." : "Manual edits active."}
              </div>
            )}

            <div className="mt-4 space-y-2">
              <Button size="xl" className="w-full text-[15px]" disabled={!compiled} onClick={copyAndOpen}>
                <ExternalLink className="!size-5" /> Copy Prompt &amp; Open ChatGPT
              </Button>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="secondary" size="sm" disabled={!compiled} onClick={() => copy("prompt")}>{copied === "prompt" ? <Check /> : <ClipboardCopy />} Prompt</Button>
                <Button variant="secondary" size="sm" disabled={!compiled} onClick={() => copy("manifest")}>{copied === "manifest" ? <Check /> : <FileText />} Manifest</Button>
                <Button variant="secondary" size="sm" disabled={!compiled} onClick={() => setDialogOpen(true)}><History /> Checklist</Button>
              </div>
              <p className="pt-1 text-center text-[11px] leading-relaxed text-muted-foreground">
                Manual Mode: images are <span className="text-foreground">not</span> uploaded automatically. Attach the {compiled?.attachments.length ?? 0} listed image(s) in ChatGPT yourself.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {compiled && creator && (
        <ChatGPTDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          chatgptUrl={settings.chatgptUrl}
          prompt={finalPrompt}
          manifest={compiled.manifest}
          attachments={compiled.attachments}
          assets={creatorAssets}
          ensureProject={() => (projectId && !dirty ? Promise.resolve(projectId) : saveProject(true))}
          importContext={{ creatorId: creator.id, presetId, concept: opts.concept, variation: opts.variation }}
        />
      )}
    </div>
  );
}

function Step({ n, title, children, done, right }: { n: number; title: string; children: React.ReactNode; done?: boolean; right?: React.ReactNode }) {
  return (
    <Card className="animate-fade-up p-5">
      <div className="mb-3.5 flex items-center gap-3">
        <span className={cn("flex h-6 w-6 items-center justify-center rounded-full font-mono text-[11px] font-semibold transition", done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
          {done ? <Check className="h-3.5 w-3.5" /> : n}
        </span>
        <h2 className="flex-1 text-sm font-semibold tracking-tight">{title}</h2>
        {right}
      </div>
      {children}
    </Card>
  );
}

function PresetChip({ active, onClick, name, desc, tag }: { active: boolean; onClick: () => void; name: string; desc?: string; tag?: string }) {
  return (
    <button onClick={onClick} className={cn("rounded-xl border p-3 text-left transition", active ? "border-primary/60 bg-primary/[0.06] glow-ring" : "bg-background/40 hover:border-white/15")}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{name}</span>
        {tag && <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">{tag}</span>}
      </div>
      {desc && <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{desc}</div>}
    </button>
  );
}
