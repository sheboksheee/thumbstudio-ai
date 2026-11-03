"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, ClipboardCopy, Download, ExternalLink, FileText, Info } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import type { AttachmentItem } from "@/lib/prompt/compiler";
import type { AssetDTO, ResultRecord } from "@/lib/types";
import { importResult } from "@/lib/store";
import { copyText } from "@/lib/clipboard";
import { safeName } from "@/lib/image-export";
import { cn } from "@/lib/utils";

export function ChatGPTDialog({
  open, onOpenChange, chatgptUrl, prompt, manifest, attachments, assets, ensureProject, importContext, onImported,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  chatgptUrl: string;
  prompt: string;
  manifest: string;
  attachments: AttachmentItem[];
  assets: AssetDTO[];
  ensureProject: () => Promise<string | null>;
  importContext: { creatorId: string; presetId: string | null; concept: string; variation: string };
  onImported?: () => void;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [imported, setImported] = useState<(ResultRecord & { url: string })[]>([]);
  const byId = new Map(assets.map((a) => [a.id, a]));

  useEffect(() => {
    if (open) {
      setChecked(new Set());
      setImported([]);
    }
  }, [open]);

  function downloadAll() {
    attachments.forEach((att, i) => {
      const a = byId.get(att.assetId);
      if (!a) return;
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = a.url;
        link.download = `${String(att.index).padStart(2, "0")}-${att.kind}-${safeName(att.label) || "image"}.${(a.mime.split("/")[1] || "png").replace("jpeg", "jpg")}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }, i * 250);
    });
  }

  async function importFiles(files: File[]) {
    setBusy(true);
    try {
      const projectId = await ensureProject();
      const refs = attachments.map((a) => ({ id: a.assetId, label: a.label, kind: a.kind, role: a.role, purpose: a.purpose }));
      const out: (ResultRecord & { url: string })[] = [];
      for (const f of files) {
        const r = await importResult({
          file: f, creatorId: importContext.creatorId, projectId, presetId: importContext.presetId,
          concept: importContext.concept, prompt, variation: importContext.variation, references: refs,
        });
        out.push({ ...r, url: URL.createObjectURL(f) });
      }
      setImported((x) => [...x, ...out]);
      toast.success(`${out.length} thumbnail${out.length > 1 ? "s" : ""} imported to the Library`);
      onImported?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const allChecked = attachments.length > 0 && attachments.every((a) => checked.has(a.assetId));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent wide className="max-w-5xl">
        <DialogHeader title="Finish in ChatGPT" description="ThumbStudio never uploads anything for you. Follow these steps in the ChatGPT tab." />
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4">
            <StepRow n={1} title="Prompt copied to clipboard">
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={async () => ((await copyText(prompt)) ? toast.success("Prompt copied") : toast.error("Clipboard blocked"))}><ClipboardCopy /> Copy prompt again</Button>
                <Button size="sm" variant="ghost" onClick={async () => ((await copyText(manifest)) ? toast.success("Manifest copied") : toast.error("Clipboard blocked"))}><FileText /> Copy manifest</Button>
              </div>
            </StepRow>
            <StepRow n={2} title="Open ChatGPT">
              <Button size="sm" variant="secondary" asChild>
                <a href={chatgptUrl} target="_blank" rel="noreferrer"><ExternalLink /> {chatgptUrl.replace(/^https:\/\//, "")}</a>
              </Button>
            </StepRow>
            <StepRow n={3} title={`Attach these ${attachments.length} image(s), in this order`} done={allChecked}>
              {attachments.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-warning"><Info className="h-3.5 w-3.5" /> No images selected — the prompt will rely on text only.</div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    {attachments.map((att) => {
                      const a = byId.get(att.assetId);
                      const on = checked.has(att.assetId);
                      return (
                        <label key={att.assetId} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border p-1.5 pr-3 transition", on ? "border-success/40 bg-success/[0.05]" : "hover:border-white/15")}>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={on}
                            onChange={() => setChecked((s) => { const n = new Set(s); if (n.has(att.assetId)) n.delete(att.assetId); else n.add(att.assetId); return n; })}
                          />
                          <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded border", on ? "border-success bg-success text-black" : "border-white/25")}>{on && <Check className="h-3.5 w-3.5" />}</span>
                          {a && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={a.url} alt="" className={cn("h-11 shrink-0 rounded object-cover", att.kind === "reference" ? "w-[78px]" : "w-9")} />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium"><span className="mr-1.5 font-mono text-primary">#{att.index}</span><bdi>{att.label}</bdi></div>
                            <div className="truncate text-[11px] text-muted-foreground">{att.role}</div>
                          </div>
                          {a && (
                            <a href={a.url} download={`${String(att.index).padStart(2, "0")}-${att.kind}.${(a.mime.split("/")[1] || "png").replace("jpeg", "jpg")}`} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground" onClick={(e) => e.stopPropagation()} title="Download this image"><Download className="h-3.5 w-3.5" /></a>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <Button size="sm" variant="ghost" onClick={downloadAll}><Download /> Download all (numbered)</Button>
                    <span className="text-[11px] text-muted-foreground">{checked.size}/{attachments.length} attached</span>
                  </div>
                </>
              )}
            </StepRow>
            <StepRow n={4} title="Paste the prompt (⌘V) and send">
              <p className="text-xs text-muted-foreground">Ask for a landscape image. If ChatGPT returns a square, reply “make it 16:9 landscape”.</p>
            </StepRow>
          </div>

          <div className="flex flex-col">
            <StepRow n={5} title="Import the result" done={imported.length > 0}>
              <p className="mb-3 text-xs text-muted-foreground">Download or copy the image from ChatGPT, then drop it here or press ⌘V. It is linked to this project, prompt and reference set.</p>
            </StepRow>
            <Dropzone onFiles={importFiles} busy={busy} enablePaste={open} title="Drop generated thumbnail" hint="Drag the file in, click to browse, or paste (⌘V)" className="mt-1 min-h-[180px] flex-1" />
            {imported.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="h-4 w-4" /> Imported {imported.length}</div>
                <div className="grid grid-cols-2 gap-2">
                  {imported.map((r) => (
                    <Link key={r.id} href={`/library?open=${r.id}`} className="overflow-hidden rounded-lg border hover:border-primary/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.url} alt="" className="aspect-video w-full object-cover" />
                    </Link>
                  ))}
                </div>
                <Button asChild size="sm" variant="secondary" className="w-full"><Link href="/library">Review in Library →</Link></Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepRow({ n, title, children, done }: { n: number; title: string; children?: React.ReactNode; done?: boolean }) {
  return (
    <div className="flex gap-3">
      <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold", done ? "bg-success text-black" : "bg-primary/15 text-primary")}>{done ? <Check className="h-3.5 w-3.5" /> : n}</span>
      <div className="min-w-0 flex-1">
        <div className="mb-2 text-sm font-medium">{title}</div>
        {children}
      </div>
    </div>
  );
}
