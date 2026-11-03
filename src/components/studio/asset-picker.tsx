"use client";
import Link from "next/link";
import { Check, ImagePlus, Wand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ASSET_KINDS } from "@/lib/options";
import { orderAssets } from "@/lib/prompt/compiler";
import type { AssetDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Sensible default selection: best face, best expression, main logo, top 2 references. */
export function autoSelect(assets: AssetDTO[]): string[] {
  const by = (k: string) => assets.filter((a) => a.kind === k).sort((a, b) => a.priority - b.priority);
  return [
    ...by("face").slice(0, 2),
    ...by("expression").slice(0, 1),
    ...by("logo").filter((a) => a.priority <= 2).slice(0, 1),
    ...by("reference").slice(0, 2),
  ].map((a) => a.id);
}

export function AssetPicker({ assets, selected, onChange, creatorId }: { assets: AssetDTO[]; selected: string[]; onChange: (ids: string[]) => void; creatorId: string }) {
  const ordered = orderAssets(assets.filter((a) => selected.includes(a.id)));
  const orderIndex = new Map(ordered.map((a, i) => [a.id, i + 1]));

  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  if (!assets.length) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
        This creator has no photography or references yet.
        <Button asChild size="sm"><Link href={`/creators/edit?id=${creatorId}&tab=assets`}><ImagePlus /> Upload assets</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => onChange(autoSelect(assets))}><Wand /> Auto-select</Button>
        <Button size="sm" variant="ghost" onClick={() => onChange([])}>Clear</Button>
        <Button size="sm" variant="ghost" asChild className="ml-auto"><Link href={`/creators/edit?id=${creatorId}&tab=assets`}><ImagePlus /> Manage assets</Link></Button>
      </div>
      {ASSET_KINDS.map((k) => {
        const list = assets.filter((a) => a.kind === k.value);
        if (!list.length) return null;
        const wide = k.value === "reference";
        return (
          <div key={k.value}>
            <div className="label-xs mb-2">{k.label}</div>
            <div className={cn("grid gap-2", wide ? "grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" : "grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8")}>
              {list.map((a) => {
                const n = orderIndex.get(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => toggle(a.id)}
                    title={`${a.label}${a.purpose ? ` — ${a.purpose}` : ""}`}
                    className={cn(
                      "group relative overflow-hidden rounded-lg border transition",
                      wide ? "aspect-video" : "aspect-[4/5]",
                      n ? "border-primary glow-ring" : "border-transparent opacity-60 hover:opacity-100",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt={a.label} className="h-full w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1.5 pb-1 pt-4 text-left text-[10px] leading-tight text-white/90">
                      <div className="truncate" dir="auto">{a.label}</div>
                    </div>
                    {n ? (
                      <span className="absolute left-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-md bg-primary px-1 font-mono text-[10px] font-bold text-primary-foreground">{n}</span>
                    ) : (
                      <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-md border border-white/40 bg-black/40 opacity-0 transition group-hover:opacity-100"><Check className="h-3 w-3" /></span>
                    )}
                    {a.priority === 1 && <span className="absolute right-1.5 top-1.5 rounded bg-black/70 px-1 text-[9px] font-semibold text-primary">P1</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
