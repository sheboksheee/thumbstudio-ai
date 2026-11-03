"use client";
import { useRef, useState } from "react";
import { Columns2, SplitSquareHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Badge, Segmented, Stars } from "@/components/ui/misc";
import { RESULT_STATUSES, labelOf } from "@/lib/options";
import type { ResultDTO } from "@/lib/types";
import { statusTone, type LibCreator } from "./library";

export function CompareDialog({ open, onOpenChange, items, creatorById }: { open: boolean; onOpenChange: (o: boolean) => void; items: ResultDTO[]; creatorById: Map<string, LibCreator> }) {
  const [mode, setMode] = useState<"side" | "slider">("side");
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const [a, b] = items;

  const move = (clientX: number) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    setPos(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  };

  return (
    <Dialog open={open && items.length === 2} onOpenChange={onOpenChange}>
      <DialogContent wide="full">
        <DialogHeader title="قارن بين تصميمين" description="جنب بعض، أو اسحب الخط في النص." />
        <Segmented className="mb-4 w-auto" size="sm" value={mode} onChange={setMode} options={[{ value: "side", label: "جنب بعض", icon: <Columns2 /> }, { value: "slider", label: "سلايدر", icon: <SplitSquareHorizontal /> }]} />
        {a && b && (mode === "side" ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[a, b].map((r) => (
              <div key={r.id}>
                <div className="aspect-video overflow-hidden rounded-xl bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.url} alt="" className="h-full w-full object-contain" />
                </div>
                <Caption r={r} creator={creatorById.get(r.creatorId)} />
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div
              ref={box}
              dir="ltr"
              className="relative mx-auto aspect-video max-h-[70vh] cursor-ew-resize select-none overflow-hidden rounded-xl bg-black"
              onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); move(e.clientX); }}
              onPointerMove={(e) => e.buttons === 1 && move(e.clientX)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.url} alt="" className="absolute inset-0 h-full w-full object-contain" draggable={false} />
              <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt="" className="absolute inset-0 h-full w-full object-contain" draggable={false} />
              </div>
              <div className="absolute inset-y-0 w-0.5 bg-primary shadow-[0_0_12px_hsl(var(--primary))]" style={{ left: `${pos}%` }}>
                <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background/90" />
              </div>
              <span className="absolute left-3 top-3 rounded bg-black/75 px-2 py-0.5 text-xs">A · نسخة {a.version}</span>
              <span className="absolute right-3 top-3 rounded bg-black/75 px-2 py-0.5 text-xs">B · نسخة {b.version}</span>
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <Caption r={a} creator={creatorById.get(a.creatorId)} label="A" />
              <Caption r={b} creator={creatorById.get(b.creatorId)} label="B" />
            </div>
          </div>
        ))}
      </DialogContent>
    </Dialog>
  );
}

function Caption({ r, creator, label }: { r: ResultDTO; creator?: LibCreator; label?: string }) {
  return (
    <div className="mt-2 flex items-start justify-between gap-3 text-xs">
      <div className="min-w-0">
        <div className="truncate font-medium" dir="auto">{label && <span className="mr-1 text-primary">{label}</span>}{r.concept || "بدون اسم"} · نسخة {r.version}</div>
        <div className="text-muted-foreground">{creator?.name} · {r.variation || "—"} · {r.width}×{r.height}</div>
        {r.feedback && <div className="mt-1 line-clamp-2 text-muted-foreground" dir="auto">“{r.feedback}”</div>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge tone={statusTone(r.status)}>{labelOf(RESULT_STATUSES, r.status)}</Badge>
        <Stars value={r.rating} size={12} />
      </div>
    </div>
  );
}
