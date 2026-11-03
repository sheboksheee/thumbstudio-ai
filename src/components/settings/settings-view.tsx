"use client";
import { useEffect, useRef, useState } from "react";
import { Database, Download, HardDrive, Layers, Loader2, RotateCcw, Save, ShieldCheck, SlidersHorizontal, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect } from "@/components/ui/input";
import { Card } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PresetList } from "@/components/presets/preset-list";
import { DemoButton } from "@/components/demo-button";
import { PROMPT_STYLES, REFERENCE_PRIORITIES, VARIATIONS } from "@/lib/options";
import type { AppSettings, PresetDTO } from "@/lib/types";
import { ensureBuiltInPresets, exportBackup, importBackup, saveSettings } from "@/lib/store";
import { downloadBlob } from "@/lib/image-export";

export function SettingsView({ settings, presets, creators }: { settings: AppSettings; presets: PresetDTO[]; creators: { id: string; name: string }[] }) {
  const [s, setS] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<"backup" | "restore" | null>(null);
  const [usage, setUsage] = useState<{ used: number; quota: number; persisted: boolean } | null>(null);
  const restoreInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const est = await navigator.storage?.estimate?.();
      const persisted = (await navigator.storage?.persisted?.()) ?? false;
      if (est) setUsage({ used: est.usage ?? 0, quota: est.quota ?? 0, persisted });
    })().catch(() => undefined);
  }, [presets.length]);

  async function backup() {
    setBusy("backup");
    try {
      const blob = await exportBackup();
      downloadBlob(blob, `thumbstudio-backup-${new Date().toISOString().slice(0, 10)}.json`);
      toast.success(`Backup downloaded (${(blob.size / 1024 / 1024).toFixed(1)} MB)`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function restore(file: File) {
    if (!confirm("Restoring replaces ALL data in this browser with the backup. Continue?")) return;
    setBusy("restore");
    try {
      await importBackup(file);
      toast.success("Backup restored");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!/^https:\/\//.test(s.chatgptUrl)) return toast.error("ChatGPT URL must start with https://");
    setSaving(true);
    try {
      setS(await saveSettings(s));
      toast.success("Settings saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function restorePresets() {
    if (!confirm("Restore all six built-in EA FC presets to their original content? Your edits to them will be overwritten. Custom presets are not affected.")) return;
    try {
      await ensureBuiltInPresets(true);
      toast.success("Built-in presets restored");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="px-8 py-6">
      <Tabs defaultValue="presets">
        <TabsList>
          <TabsTrigger value="presets"><Layers /> Creative presets</TabsTrigger>
          <TabsTrigger value="workflow"><SlidersHorizontal /> Workflow</TabsTrigger>
          <TabsTrigger value="data"><Database /> Data</TabsTrigger>
        </TabsList>
        <TabsContent value="presets">
          <div className="mb-4 flex justify-end"><Button variant="ghost" size="sm" onClick={restorePresets}><RotateCcw /> Restore built-in presets</Button></div>
          <PresetList presets={presets} creators={creators} />
        </TabsContent>
        <TabsContent value="workflow">
          <Card className="max-w-2xl space-y-4 p-5">
            <div>
              <Label>ChatGPT URL</Label>
              <Input value={s.chatgptUrl} onChange={(e) => setS({ ...s, chatgptUrl: e.target.value })} />
              <p className="mt-1 text-[11px] text-muted-foreground">Opened in a new tab by “Copy Prompt &amp; Open ChatGPT”. You can point it at a specific project or custom GPT URL.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Default prompt length</Label>
                <NativeSelect value={s.promptStyle} onChange={(e) => setS({ ...s, promptStyle: e.target.value })}>
                  {PROMPT_STYLES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                </NativeSelect>
              </div>
              <div>
                <Label>Default variation</Label>
                <NativeSelect value={s.defaultVariation} onChange={(e) => setS({ ...s, defaultVariation: e.target.value })}>
                  {VARIATIONS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                </NativeSelect>
              </div>
              <div>
                <Label>Default reference priority</Label>
                <NativeSelect value={s.defaultReferencePriority} onChange={(e) => setS({ ...s, defaultReferencePriority: e.target.value })}>
                  {REFERENCE_PRIORITIES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                </NativeSelect>
              </div>
              <div>
                <Label>Default export format</Label>
                <NativeSelect value={s.exportFormat} onChange={(e) => setS({ ...s, exportFormat: e.target.value })}>
                  <option value="jpg">JPG</option>
                  <option value="png">PNG</option>
                </NativeSelect>
              </div>
              <div>
                <Label>Default export fit</Label>
                <NativeSelect value={s.exportFit} onChange={(e) => setS({ ...s, exportFit: e.target.value })}>
                  <option value="cover">Fill & crop to 16:9</option>
                  <option value="contain">Fit with letterbox</option>
                </NativeSelect>
              </div>
            </div>
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Save settings</Button>
          </Card>
        </TabsContent>
        <TabsContent value="data">
          <div className="grid max-w-4xl gap-4 md:grid-cols-2">
            <Card className="p-5">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><HardDrive className="h-4 w-4 text-primary" /> Stored in this browser</div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Creators, images, projects and thumbnails are saved in this browser&apos;s local database (IndexedDB) on this device. Nothing is uploaded anywhere. Another browser or computer starts empty — use a backup to move your library.
              </p>
              {usage && (
                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Used</span><span className="font-mono">{(usage.used / 1024 / 1024).toFixed(1)} MB</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Available</span><span className="font-mono">{(usage.quota / 1024 / 1024 / 1024).toFixed(1)} GB</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Protected from automatic cleanup</span><span className={usage.persisted ? "text-success" : "text-warning"}>{usage.persisted ? "Yes" : "Not granted"}</span></div>
                </div>
              )}
              <p className="mt-3 text-[11px] text-warning">Clearing your browser&apos;s site data deletes the library. Download a backup regularly.</p>
            </Card>
            <Card className="p-5">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Download className="h-4 w-4 text-primary" /> Backup & restore</div>
              <div className="flex flex-col gap-2">
                <Button variant="secondary" onClick={backup} disabled={!!busy}>{busy === "backup" ? <Loader2 className="animate-spin" /> : <Download />} Download full backup (with images)</Button>
                <Button variant="secondary" onClick={() => restoreInput.current?.click()} disabled={!!busy}>{busy === "restore" ? <Loader2 className="animate-spin" /> : <Upload />} Restore from backup…</Button>
                <input ref={restoreInput} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void restore(f); }} />
                <div className="my-1 h-px bg-border" />
                <DemoButton />
                <DemoButton reset />
              </div>
            </Card>
            <Card className="p-5 md:col-span-2">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> ChatGPT Manual Mode</div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                ThumbStudio AI does not use the OpenAI API, any API keys, browser automation or unofficial endpoints. Prompts are compiled deterministically from your own rules. You attach images in ChatGPT yourself and import the result back here. No image analysis is performed — every style rule is configured by you.
              </p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
