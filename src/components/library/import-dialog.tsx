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
    if (!creatorId) { toast.error("Choose a creator"); return; }
    setBusy(true);
    try {
      let last: ResultRecord | null = null;
      for (const f of files) {
        const p = projects.find((x) => x.id === projectId);
        last = await importResult({ file: f, creatorId, projectId: projectId || null, presetId: presetId || null, concept, prompt, variation: p?.variation ?? "" });
      }
      toast.success(`${files.length} thumbnail${files.length > 1 ? "s" : ""} imported`);
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
        <DialogHeader title="Import thumbnail" description="Add an image generated in ChatGPT. Link it to a project to keep its prompt and references." />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <Label>Creator</Label>
              <NativeSelect value={creatorId} onChange={(e) => { setCreatorId(e.target.value); setProjectId(""); }}>
                {creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </NativeSelect>
            </div>
            <div>
              <Label>Project (optional)</Label>
              <NativeSelect value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">— None —</option>
                {creatorProjects.map((p) => <option key={p.id} value={p.id}>{(p.title || "Untitled").slice(0, 60)}</option>)}
              </NativeSelect>
            </div>
            <div>
              <Label>Preset</Label>
              <NativeSelect value={presetId} onChange={(e) => setPresetId(e.target.value)}>
                <option value="">— None —</option>
                {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </NativeSelect>
            </div>
            <div><Label>Video concept</Label><Input value={concept} onChange={(e) => setConcept(e.target.value)} /></div>
            <div><Label>Prompt used</Label><Textarea rows={3} className="font-mono text-[11px]" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Optional — filled automatically from the project" /></div>
          </div>
          <Dropzone onFiles={upload} busy={busy} enablePaste={open} title="Drop generated thumbnail(s)" hint="Click, drag & drop, or paste (⌘V)" className="h-full min-h-[240px]" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
