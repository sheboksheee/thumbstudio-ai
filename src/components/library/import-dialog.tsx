"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Dropzone } from "@/components/ui/dropzone";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import type { ResultRecord } from "@/lib/types";
import { importResult } from "@/lib/store";
import type { LibCreator, LibProject } from "./library";

export function ImportDialog({ open, onOpenChange, creators, projects, presets, onImported }: { open: boolean; onOpenChange: (o: boolean) => void; creators: LibCreator[]; projects: LibProject[]; presets: { id: string; name: string }[]; onImported: (id: string) => void }) {
  const [creatorId, setCreatorId] = useState(creators[0]?.id ?? "");
  const [projectId, setProjectId] = useState("");
  const [presetId, setPresetId] = useState("");
  const [concept, setConcept] = useState("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  const creatorProjects = projects.filter((p) => p.creatorId === creatorId);

  useEffect(() => {
    const p = projects.find((x) => x.id === projectId);
    if (p) {
      setConcept(p.concept);
      setPresetId(p.presetId ?? "");
      setPrompt(p.compiledPrompt);
    }
  }, [projectId, projects]);

  async function upload(files: File[]) {
    if (!creatorId) { toast.error("اختار الكريتور"); return; }
    setBusy(true);
    try {
      let last: ResultRecord | null = null;
      for (const f of files) {
        const p = projects.find((x) => x.id === projectId);
        last = await importResult({ file: f, creatorId, projectId: projectId || null, presetId: presetId || null, concept, prompt, variation: p?.variation ?? "" });
      }
      toast.success(files.length > 1 ? `اتضافت ${files.length} ثمبنيلات` : "الثمبنيل اتضاف");
      onOpenChange(false);
      if (last) onImported(last.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent wide>
        <DialogHeader title="ضيف ثمبنيل" description="ضيف صورة عملتها في ChatGPT. اربطها بمشروع عشان البرومبت يتحفظ معاها." />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <Label>الكريتور</Label>
              <NativeSelect value={creatorId} onChange={(e) => { setCreatorId(e.target.value); setProjectId(""); }}>
                {creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </NativeSelect>
            </div>
            <div>
              <Label>المشروع (اختياري)</Label>
              <NativeSelect value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">— من غير —</option>
                {creatorProjects.map((p) => <option key={p.id} value={p.id}>{(p.title || "بدون اسم").slice(0, 60)}</option>)}
              </NativeSelect>
            </div>
            <div>
              <Label>القالب</Label>
              <NativeSelect value={presetId} onChange={(e) => setPresetId(e.target.value)}>
                <option value="">— من غير —</option>
                {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </NativeSelect>
            </div>
            <div><Label>فكرة الفيديو</Label><Input value={concept} onChange={(e) => setConcept(e.target.value)} /></div>
            <div><Label>البرومبت</Label><Textarea rows={3} className="font-mono text-[11px]" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="اختياري — بيتملي لوحده من المشروع" /></div>
          </div>
          <Dropzone onFiles={upload} busy={busy} enablePaste={open} title="حط الصورة هنا" hint="دوس للاختيار، أو اسحبها، أو الصقها (⌘V)" className="h-full min-h-[240px]" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
