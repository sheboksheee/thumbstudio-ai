"use client";
import { useEffect, useMemo, useState } from "react";
import { Columns2, Images, Search, Upload, X } from "lucide-react";
import { PageHeader } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Badge, EmptyState, Stars } from "@/components/ui/misc";
import { ResultDetail } from "./result-detail";
import { CompareDialog } from "./compare-dialog";
import { ImportDialog } from "./import-dialog";
import { RESULT_STATUSES, labelOf } from "@/lib/options";
import type { AppSettings, ResultDTO } from "@/lib/types";
import { BASE_PATH } from "@/lib/hooks";
import { cn, formatDate } from "@/lib/utils";

export type LibCreator = { id: string; name: string; channelName: string; avatarUrl: string | null; primaryColor: string };
export type LibProject = { id: string; creatorId: string; title: string; concept: string; presetId: string | null; compiledPrompt: string; variation: string };

export const statusTone = (s: string) => (s === "approved" ? "success" : s === "rejected" ? "danger" : s === "revision" ? "warning" : "outline") as "success" | "danger" | "warning" | "outline";

export function Library({
  results, creators, presets, projects, settings, initialOpen, initialStatus, initialCreator,
}: {
  results: ResultDTO[];
  creators: LibCreator[];
  presets: { id: string; name: string }[];
  projects: LibProject[];
  settings: AppSettings;
  initialOpen?: string;
  initialStatus?: string;
  initialCreator?: string;
}) {
  const [creator, setCreator] = useState(initialCreator ?? "");
  const [preset, setPreset] = useState("");
  const [status, setStatus] = useState(initialStatus ?? "");
  const [minRating, setMinRating] = useState(0);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"new" | "old" | "rating">("new");
  const [latestOnly, setLatestOnly] = useState(false);
  const [openId, setOpenId] = useState<string | null>(initialOpen ?? null);
  const [compare, setCompare] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const creatorById = useMemo(() => new Map(creators.map((c) => [c.id, c])), [creators]);
  const presetById = useMemo(() => new Map(presets.map((p) => [p.id, p])), [presets]);

  // Revision groups: root id -> versions
  const groups = useMemo(() => {
    const m = new Map<string, ResultDTO[]>();
    for (const r of results) {
      const root = r.parentId ?? r.id;
      m.set(root, [...(m.get(root) ?? []), r]);
    }
    for (const list of m.values()) list.sort((a, b) => a.version - b.version);
    return m;
  }, [results]);

  const filtered = useMemo(() => {
    let list = results.filter((r) => {
      if (creator && r.creatorId !== creator) return false;
      if (preset && r.presetId !== preset) return false;
      if (status && (status === "pending" ? !(r.status === "pending" || r.status === "revision") : r.status !== status)) return false;
      if (minRating && r.rating < minRating) return false;
      if (q && !`${r.concept} ${r.feedback} ${r.prompt}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    if (latestOnly) {
      list = list.filter((r) => {
        const g = groups.get(r.parentId ?? r.id) ?? [r];
        return g[g.length - 1].id === r.id;
      });
    }
    return [...list].sort((a, b) => (sort === "rating" ? b.rating - a.rating || b.createdAt.localeCompare(a.createdAt) : sort === "old" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)));
  }, [results, creator, preset, status, minRating, q, sort, latestOnly, groups]);

  useEffect(() => {
    if (openId && !results.some((r) => r.id === openId)) setOpenId(null);
  }, [results, openId]);

  const open = results.find((r) => r.id === openId) ?? null;
  const toggleCompare = (id: string) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 2 ? [c[1], id] : [...c, id]));
  const anyFilter = creator || preset || status || minRating || q;

  return (
    <div>
      <PageHeader
        title="Library"
        subtitle={`${results.length} imported thumbnail${results.length === 1 ? "" : "s"} · review, rate, revise, compare and export at 1280×720.`}
        actions={
          <>
            {compare.length > 0 && (
              <Button variant="secondary" onClick={() => setCompareOpen(true)} disabled={compare.length < 2}>
                <Columns2 /> Compare ({compare.length}/2)
              </Button>
            )}
            <Button onClick={() => setImportOpen(true)} disabled={!creators.length}><Upload /> Import thumbnail</Button>
          </>
        }
      />
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b bg-background/85 px-8 py-3 backdrop-blur">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-8 pl-8 text-xs" placeholder="Search concept, feedback, prompt…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <NativeSelect className="h-8 w-44 text-xs" value={creator} onChange={(e) => setCreator(e.target.value)}>
          <option value="">All creators</option>
          {creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </NativeSelect>
        <NativeSelect className="h-8 w-44 text-xs" value={preset} onChange={(e) => setPreset(e.target.value)}>
          <option value="">All presets</option>
          {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </NativeSelect>
        <NativeSelect className="h-8 w-40 text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any status</option>
          {RESULT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </NativeSelect>
        <NativeSelect className="h-8 w-32 text-xs" value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
          <option value={0}>Any rating</option>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{"★".repeat(n)}+</option>)}
        </NativeSelect>
        <NativeSelect className="h-8 w-32 text-xs" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="new">Newest</option>
          <option value="old">Oldest</option>
          <option value="rating">Top rated</option>
        </NativeSelect>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={latestOnly} onChange={(e) => setLatestOnly(e.target.checked)} className="accent-[hsl(var(--primary))]" /> Latest revision only
        </label>
        {anyFilter && <Button size="sm" variant="ghost" onClick={() => { setCreator(""); setPreset(""); setStatus(""); setMinRating(0); setQ(""); }}><X /> Clear</Button>}
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} shown</span>
      </div>

      <div className="px-8 py-6">
        {results.length === 0 ? (
          <EmptyState icon={<Images />} title="No thumbnails yet" action={<Button onClick={() => setImportOpen(true)} disabled={!creators.length}><Upload /> Import a thumbnail</Button>}>
            Generate in ChatGPT using a Studio prompt, then import the image here or directly from the Studio checklist.
          </EmptyState>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No thumbnails match these filters.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((r, i) => {
              const c = creatorById.get(r.creatorId);
              const group = groups.get(r.parentId ?? r.id) ?? [];
              const inCompare = compare.includes(r.id);
              return (
                <div key={r.id} className={cn("panel group animate-fade-up overflow-hidden transition hover:border-white/15", inCompare && "glow-ring border-primary/60")} style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
                  <button className="relative block aspect-video w-full overflow-hidden bg-black" onClick={() => setOpenId(r.id)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.url} alt={r.concept} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" />
                    <div className="absolute left-2 top-2 flex gap-1">
                      <Badge tone={statusTone(r.status)} className="bg-black/70 backdrop-blur">{labelOf(RESULT_STATUSES, r.status)}</Badge>
                      {group.length > 1 && <Badge className="bg-black/70 backdrop-blur">v{r.version} of {group.length}</Badge>}
                    </div>
                  </button>
                  <div className="space-y-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium" dir="auto">{r.concept || "Untitled"}</div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {c?.name ?? "Unknown"} · {r.presetId ? presetById.get(r.presetId)?.name ?? "Preset" : "No preset"}{r.variation ? ` · ${r.variation}` : ""}
                        </div>
                      </div>
                      <label className="flex shrink-0 cursor-pointer items-center gap-1 text-[11px] text-muted-foreground" title="Select for comparison">
                        <input type="checkbox" checked={inCompare} onChange={() => toggleCompare(r.id)} className="accent-[hsl(var(--primary))]" /> Compare
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <Stars value={r.rating} size={13} />
                      <span className="text-[11px] text-muted-foreground">{formatDate(r.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {open && (
        <ResultDetail
          key={open.id}
          result={open}
          group={groups.get(open.parentId ?? open.id) ?? [open]}
          creator={creatorById.get(open.creatorId)}
          presetName={open.presetId ? presetById.get(open.presetId)?.name : undefined}
          settings={settings}
          onClose={() => { setOpenId(null); window.history.replaceState(null, "", `${BASE_PATH}/library/`); }}
          onSelect={setOpenId}
          onCompare={(ids) => { setCompare(ids); setCompareOpen(true); }}
        />
      )}
      <CompareDialog open={compareOpen} onOpenChange={setCompareOpen} items={compare.map((id) => results.find((r) => r.id === id)).filter((r): r is ResultDTO => !!r)} creatorById={creatorById} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} creators={creators} projects={projects} presets={presets} onImported={(id) => setOpenId(id)} />
    </div>
  );
}
