"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardCopy, Columns2, Download, Eye, Grid3x3, Loader2, RotateCcw, Trash2, Wand2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label, NativeSelect, Textarea } from "@/components/ui/input";
import { Badge, Segmented, Stars } from "@/components/ui/misc";
import { Dropzone } from "@/components/ui/dropzone";
import { RESULT_STATUSES, labelOf } from "@/lib/options";
import type { AppSettings, ResultDTO } from "@/lib/types";
import { deleteResult, getFileBlob, importResult, updateResult } from "@/lib/store";
import { downloadBlob, exportThumbnail, safeName, type ExportOptions } from "@/lib/image-export";
import { copyText } from "@/lib/clipboard";
import { cn, formatDate } from "@/lib/utils";
import { statusTone, type LibCreator } from "./library";

export function ResultDetail({
  result, group, creator, presetName, settings, onClose, onSelect, onCompare,
}: {
  result: ResultDTO;
  group: ResultDTO[];
  creator?: LibCreator;
  presetName?: string;
  settings: AppSettings;
  onClose: () => void;
  onSelect: (id: string) => void;
  onCompare: (ids: string[]) => void;
}) {
  const [r, setR] = useState(result);
  const [feedback, setFeedback] = useState(result.feedback);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"full" | "safe" | "small">("full");
  const [fmt, setFmt] = useState<"jpg" | "png">((settings.exportFormat as "jpg" | "png") || "jpg");
  const [fit, setFit] = useState<"cover" | "contain">((settings.exportFit as "cover" | "contain") || "cover");
  const [position, setPosition] = useState("centre");

  async function patch(data: Partial<Pick<ResultDTO, "status" | "rating" | "feedback">>) {
    setR((x) => ({ ...x, ...data }));
    try {
      await updateResult(r.id, data);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function uploadRevision(files: File[]) {
    setBusy(true);
    try {
      let last: { id: string } | null = null;
      for (const f of files) {
        last = await importResult({ file: f, parentId: r.id, projectId: r.projectId });
      }
      if (r.status === "pending") await patch({ status: "revision" });
      toast.success("Revision imported");
      if (last) onSelect(last.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!confirm("Delete this thumbnail permanently?")) return;
    try {
      onClose();
      await deleteResult(r.id);
      toast.success("Deleted");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const [exporting, setExporting] = useState(false);
  async function doExport() {
    setExporting(true);
    try {
      const blob = await getFileBlob(r.fileId);
      if (!blob) throw new Error("Image file is missing");
      const out = await exportThumbnail(blob, { format: fmt, fit, position: position as ExportOptions["position"] });
      const name = `${safeName(creator?.channelName || creator?.name || "") || "thumbnail"}_${safeName(r.concept) || r.id}_v${r.version}_1280x720.${fmt}`;
      downloadBlob(out, name);
      toast.success(`Exported 1280×720 ${fmt.toUpperCase()} · ${(out.size / 1024).toFixed(0)} KB`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  }
  const ratio = r.width && r.height ? r.width / r.height : 16 / 9;
  const isWide = Math.abs(ratio - 16 / 9) < 0.02;
  const prevVersion = group.filter((g) => g.version < r.version).pop();

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent wide="full" className="p-0">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_400px]">
          {/* Image */}
          <div className="border-b p-6 lg:border-b-0 lg:border-r">
            <DialogHeader title={<span dir="auto">{r.concept || "Untitled thumbnail"}</span>} description={`${creator?.name ?? "Unknown creator"} · ${presetName ?? "No preset"} · v${r.version} · ${formatDate(r.createdAt)}`} />
            <div className="mb-3 flex items-center gap-2">
              <Segmented
                className="w-auto"
                size="sm"
                value={view}
                onChange={setView}
                options={[{ value: "full", label: "Full", icon: <Eye /> }, { value: "safe", label: "Safe areas", icon: <Grid3x3 /> }, { value: "small", label: "YT sizes", icon: <Columns2 /> }]}
              />
              <span className="ml-auto text-[11px] text-muted-foreground">{r.width}×{r.height}px {isWide ? "· 16:9" : `· ${ratio.toFixed(2)}:1 (export will ${fit === "cover" ? "crop" : "letterbox"} to 16:9)`}</span>
            </div>
            {view === "full" && (
              <div className="checker flex items-center justify-center overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.url} alt="" className="max-h-[68vh] w-auto object-contain" />
              </div>
            )}
            {view === "safe" && (
              <div className="relative mx-auto aspect-video w-full overflow-hidden rounded-xl bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.url} alt="" className="h-full w-full" style={{ objectFit: fit, objectPosition: position === "centre" ? "center" : position }} />
                <div className="pointer-events-none absolute inset-[5%] rounded border border-dashed border-primary/70" />
                <div className="pointer-events-none absolute bottom-[4%] right-[2.5%] rounded bg-black/85 px-1.5 py-0.5 font-mono text-[11px] text-white">12:34</div>
                <div className="pointer-events-none absolute left-1/3 top-0 h-full w-px bg-white/15" />
                <div className="pointer-events-none absolute left-2/3 top-0 h-full w-px bg-white/15" />
                <div className="pointer-events-none absolute left-0 top-1/3 h-px w-full bg-white/15" />
                <div className="pointer-events-none absolute left-0 top-2/3 h-px w-full bg-white/15" />
              </div>
            )}
            {view === "small" && (
              <div className="flex flex-wrap items-end gap-8 rounded-xl bg-[#0f0f0f] p-8">
                {[{ w: 360, l: "Home feed" }, { w: 246, l: "Search" }, { w: 168, l: "Suggested sidebar" }].map((s) => (
                  <div key={s.w} style={{ width: s.w }}>
                    <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.url} alt="" className="h-full w-full object-cover" />
                      <span className="absolute bottom-1 right-1 rounded bg-black/85 px-1 font-mono text-[10px] text-white">12:34</span>
                    </div>
                    <div className="mt-2 h-2.5 w-4/5 rounded bg-white/15" />
                    <div className="mt-1.5 h-2 w-1/2 rounded bg-white/10" />
                    <div className="mt-2 text-[10px] text-white/40">{s.l} · {s.w}px</div>
                  </div>
                ))}
              </div>
            )}

            {/* Revisions */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="label-xs">Revisions ({group.length})</div>
                {prevVersion && <Button size="sm" variant="ghost" onClick={() => onCompare([prevVersion.id, r.id])}><Columns2 /> Compare with v{prevVersion.version}</Button>}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {group.map((g) => (
                  <button key={g.id} onClick={() => onSelect(g.id)} className={cn("relative w-36 shrink-0 overflow-hidden rounded-lg border transition", g.id === r.id ? "border-primary glow-ring" : "opacity-70 hover:opacity-100")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.url} alt="" className="aspect-video w-full object-cover" />
                    <span className="absolute left-1 top-1 rounded bg-black/75 px-1 font-mono text-[10px]">v{g.version}</span>
                    <span className={cn("absolute bottom-1 right-1 h-2 w-2 rounded-full", g.status === "approved" ? "bg-success" : g.status === "rejected" ? "bg-destructive" : g.status === "revision" ? "bg-warning" : "bg-white/40")} />
                  </button>
                ))}
                <Dropzone compact busy={busy} onFiles={uploadRevision} multiple={false} title="Import revision" className="w-36 shrink-0" />
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="space-y-5 p-6">
            <div>
              <Label>Approval status</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {RESULT_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => patch({ status: s.value })}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition",
                      r.status === s.value
                        ? s.value === "approved" ? "border-success/50 bg-success/10 text-success" : s.value === "rejected" ? "border-destructive/50 bg-destructive/10 text-destructive" : s.value === "revision" ? "border-warning/50 bg-warning/10 text-warning" : "border-white/20 bg-white/5"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {s.value === "approved" && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {s.value === "rejected" && <XCircle className="h-3.5 w-3.5" />}
                    {s.value === "revision" && <RotateCcw className="h-3.5 w-3.5" />}
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Rating</Label>
              <Stars value={r.rating} onChange={(v) => patch({ rating: v })} size={20} />
            </div>
            <div>
              <Label>Feedback</Label>
              <Textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} onBlur={() => feedback !== r.feedback && patch({ feedback })} placeholder="Notes for the next revision — face too smooth, text too small…" />
            </div>

            <div className="rounded-xl border bg-background/40 p-4">
              <div className="label-xs mb-3">Export · YouTube 1280×720</div>
              <div className="grid grid-cols-2 gap-2">
                <NativeSelect className="h-8 text-xs" value={fmt} onChange={(e) => setFmt(e.target.value as "jpg" | "png")}>
                  <option value="jpg">JPG (≤ 2 MB)</option>
                  <option value="png">PNG (lossless)</option>
                </NativeSelect>
                <NativeSelect className="h-8 text-xs" value={fit} onChange={(e) => setFit(e.target.value as "cover" | "contain")}>
                  <option value="cover">Fill & crop</option>
                  <option value="contain">Fit (letterbox)</option>
                </NativeSelect>
                {fit === "cover" && !isWide && (
                  <NativeSelect className="col-span-2 h-8 text-xs" value={position} onChange={(e) => setPosition(e.target.value)}>
                    <option value="centre">Crop anchor: center</option>
                    <option value="top">Crop anchor: top</option>
                    <option value="bottom">Crop anchor: bottom</option>
                    <option value="left">Crop anchor: left</option>
                    <option value="right">Crop anchor: right</option>
                  </NativeSelect>
                )}
              </div>
              <Button className="mt-3 w-full" onClick={doExport} disabled={exporting}>{exporting ? <Loader2 className="animate-spin" /> : <Download />} Export 1280×720 {fmt.toUpperCase()}</Button>
              <a href={r.url} download={r.originalName || `thumbnail-v${r.version}.${(r.mime.split("/")[1] || "png").replace("jpeg", "jpg")}`} className="mt-2 block text-center text-[11px] text-muted-foreground hover:text-primary">Download original ({r.width}×{r.height})</a>
            </div>

            <div className="space-y-1.5 text-xs">
              <Meta k="Creator" v={creator ? `${creator.name} · ${creator.channelName}` : "—"} />
              <Meta k="Preset" v={presetName ?? "—"} />
              <Meta k="Variation" v={r.variation || "—"} />
              <Meta k="Status" v={<Badge tone={statusTone(r.status)}>{labelOf(RESULT_STATUSES, r.status)}</Badge>} />
              <Meta k="Imported" v={new Date(r.createdAt).toLocaleString()} />
              <Meta k="File" v={r.originalName || "—"} />
            </div>

            {r.references.length > 0 && (
              <div>
                <div className="label-xs mb-2">References used ({r.references.length})</div>
                <ul className="space-y-1">
                  {r.references.map((ref, i) => (
                    <li key={ref.id + i} className="text-[11px] leading-snug text-muted-foreground"><span className="font-mono text-primary">#{i + 1}</span> <span className="text-foreground" dir="auto">{ref.label}</span> — {ref.role}</li>
                  ))}
                </ul>
              </div>
            )}

            {r.prompt && (
              <details className="group rounded-xl border bg-background/40">
                <summary className="flex cursor-pointer items-center justify-between p-3 text-xs font-medium">
                  Original prompt
                  <Button size="icon-sm" variant="ghost" onClick={async (e) => { e.preventDefault(); if (await copyText(r.prompt)) toast.success("Prompt copied"); }}><ClipboardCopy /></Button>
                </summary>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap border-t p-3 font-mono text-[11px] leading-relaxed text-muted-foreground" dir="auto">{r.prompt}</pre>
              </details>
            )}

            <div className="flex gap-2 border-t pt-4">
              {r.projectId && <Button asChild size="sm" variant="secondary"><Link href={`/studio?project=${r.projectId}`}><Wand2 /> Open project</Link></Button>}
              <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground hover:text-destructive" onClick={del}>{busy ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Meta({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="truncate text-right" dir="auto">{v}</span>
    </div>
  );
}
