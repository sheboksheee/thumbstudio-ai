"use client";
import { useState } from "react";
import { Copy, Layers, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { Badge, Card, EmptyState } from "@/components/ui/misc";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { COLOR_MOODS, SUBJECT_POSITIONS, SUBJECT_SCALES, TEXT_MODES } from "@/lib/options";
import type { PresetDefaults } from "@/lib/presets";
import { TEMPLATE_TOKENS } from "@/lib/presets";
import type { PresetDTO } from "@/lib/types";
import { createPreset, deletePreset, updatePreset } from "@/lib/store";

type Draft = {
  id?: string;
  name: string;
  niche: string;
  creatorId: string;
  description: string;
  objective: string;
  composition: string;
  subjectRules: string;
  background: string;
  textRules: string;
  effects: string;
  template: string;
  defaults: PresetDefaults;
  builtIn?: boolean;
};

const blank = (creatorId = ""): Draft => ({
  name: "",
  niche: "",
  creatorId,
  description: "",
  objective: "",
  composition: "",
  subjectRules: "",
  background: "",
  textRules: "",
  effects: "",
  template: 'Thumbnail for "{{concept}}" featuring {{creator}}.',
  defaults: {},
});

function fromPreset(p: PresetDTO, copy = false): Draft {
  return {
    id: copy ? undefined : p.id,
    name: copy ? `${p.name} (copy)` : p.name,
    niche: p.niche,
    creatorId: copy ? "" : p.creatorId ?? "",
    description: p.description,
    objective: p.objective,
    composition: p.composition,
    subjectRules: p.subjectRules,
    background: p.background,
    textRules: p.textRules,
    effects: p.effects,
    template: p.template,
    defaults: { ...p.defaults },
    builtIn: copy ? false : p.builtIn,
  };
}

export function PresetList({ presets, creators, fixedCreatorId }: { presets: PresetDTO[]; creators: { id: string; name: string }[]; fixedCreatorId?: string }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const creatorName = (id: string | null) => creators.find((c) => c.id === id)?.name;

  async function del(p: PresetDTO) {
    if (!confirm(`Delete preset "${p.name}"?`)) return;
    try {
      await deletePreset(p.id);
      toast.success("Preset deleted");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Each preset defines a creative objective, composition rules and a prompt template.</p>
        <Button onClick={() => setDraft(blank(fixedCreatorId))}><Plus /> New preset</Button>
      </div>
      {presets.length === 0 ? (
        <EmptyState icon={<Layers />} title="No custom presets yet">Create presets for recurring video formats of this creator.</EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {presets.map((p) => (
            <Card key={p.id} className="flex flex-col p-4">
              <div className="mb-1 flex items-start justify-between gap-2">
                <div className="font-medium">{p.name}</div>
                <div className="flex shrink-0 gap-1">
                  {p.builtIn && <Badge tone="primary">Built-in</Badge>}
                  <Badge tone="outline">{p.niche}</Badge>
                </div>
              </div>
              {p.creatorId && <div className="mb-1 text-[11px] text-muted-foreground">For {creatorName(p.creatorId) ?? "creator"}</div>}
              <p className="line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">{p.description || p.objective}</p>
              <div className="mt-3 flex gap-1">
                <Button size="sm" variant="secondary" onClick={() => setDraft(fromPreset(p))}><Pencil /> Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => setDraft(fromPreset(p, true))}><Copy /> Duplicate</Button>
                {!p.builtIn && <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground hover:text-destructive" onClick={() => del(p)}><Trash2 /></Button>}
              </div>
            </Card>
          ))}
        </div>
      )}
      <PresetDialog draft={draft} onClose={() => setDraft(null)} creators={creators} fixedCreatorId={fixedCreatorId} />
    </div>
  );
}

export function PresetDialog({ draft, onClose, creators, fixedCreatorId, onSaved }: { draft: Draft | null; onClose: () => void; creators: { id: string; name: string }[]; fixedCreatorId?: string; onSaved?: (p: PresetDTO) => void }) {
  const [d, setD] = useState<Draft | null>(draft);
  const [saving, setSaving] = useState(false);
  const [lastDraft, setLastDraft] = useState(draft);
  if (draft !== lastDraft) {
    setLastDraft(draft);
    setD(draft);
  }
  if (!d) return <Dialog open={false} />;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD({ ...d, [k]: v });
  const setDef = (k: keyof PresetDefaults, v: string) => setD({ ...d, defaults: { ...d.defaults, [k]: v || undefined } });

  async function save() {
    if (!d) return;
    if (!d.name.trim()) return toast.error("Preset name is required");
    setSaving(true);
    try {
      const { id, builtIn: _b, ...rest } = d;
      void _b;
      const body = { ...rest, creatorId: d.creatorId || null };
      const p = id ? await updatePreset(id, body) : await createPreset(body);
      toast.success("Preset saved");
      onSaved?.(p);
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const area = (k: keyof Draft, label: string, ph: string, rows = 2) => (
    <div>
      <Label>{label}</Label>
      <Textarea rows={rows} value={d[k] as string} onChange={(e) => set(k, e.target.value as never)} placeholder={ph} />
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent wide>
        <DialogHeader title={d.id ? `Edit preset${d.builtIn ? " (built-in)" : ""}` : "New preset"} description={d.builtIn ? "Edits to built-in presets are kept. You can restore originals in Settings." : "Presets combine with the creator's Style DNA at compile time."} />
        <div className="grid gap-4 md:grid-cols-3">
          <div><Label>Name *</Label><Input value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Unboxing" /></div>
          <div><Label>Niche</Label><Input value={d.niche} onChange={(e) => set("niche", e.target.value)} placeholder="EA FC, Tech…" /></div>
          <div>
            <Label>Available for</Label>
            <NativeSelect value={d.creatorId} disabled={!!fixedCreatorId || d.builtIn} onChange={(e) => set("creatorId", e.target.value)}>
              <option value="">All creators</option>
              {creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </NativeSelect>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {area("description", "Short description", "Shown in the Studio preset picker")}
          {area("objective", "Creative objective", "What must the viewer feel / understand?")}
          {area("composition", "Composition rules", "Layout, focal points, placement")}
          {area("subjectRules", "Subject / expression", "Expression, pose, gesture")}
          {area("background", "Background", "Environment, complexity")}
          {area("effects", "Depth & effects", "Glow, particles, light")}
          {area("textRules", "Text rules", "Applied only when rendering a headline")}
          <div>
            <Label>Prompt template</Label>
            <Textarea rows={2} className="font-mono text-xs" value={d.template} onChange={(e) => set("template", e.target.value)} />
            <div className="mt-1 text-[11px] text-muted-foreground">Tokens: {TEMPLATE_TOKENS.map((t) => `{{${t}}}`).join(" ")}</div>
          </div>
        </div>
        <div className="mt-5">
          <div className="label-xs mb-2">Studio defaults when this preset is selected</div>
          <div className="grid gap-3 sm:grid-cols-4">
            <NativeSelect value={d.defaults.subjectPosition ?? ""} onChange={(e) => setDef("subjectPosition", e.target.value)}>
              <option value="">Position: keep</option>
              {SUBJECT_POSITIONS.map((o) => <option key={o.value} value={o.value}>Position: {o.label}</option>)}
            </NativeSelect>
            <NativeSelect value={d.defaults.subjectScale ?? ""} onChange={(e) => setDef("subjectScale", e.target.value)}>
              <option value="">Scale: keep</option>
              {SUBJECT_SCALES.map((o) => <option key={o.value} value={o.value}>Scale: {o.label}</option>)}
            </NativeSelect>
            <NativeSelect value={d.defaults.textMode ?? ""} onChange={(e) => setDef("textMode", e.target.value)}>
              <option value="">Text: keep</option>
              {TEXT_MODES.map((o) => <option key={o.value} value={o.value}>Text: {o.label}</option>)}
            </NativeSelect>
            <NativeSelect value={d.defaults.colorMood ?? ""} onChange={(e) => setDef("colorMood", e.target.value)}>
              <option value="">Mood: keep</option>
              {COLOR_MOODS.filter((m) => m.value !== "custom").map((o) => <option key={o.value} value={o.value}>Mood: {o.label}</option>)}
            </NativeSelect>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="animate-spin" />} Save preset</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
