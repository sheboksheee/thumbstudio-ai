"use client";
import { useState } from "react";
import { Crown, Expand, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dropzone } from "@/components/ui/dropzone";
import { Input, NativeSelect } from "@/components/ui/input";
import { Badge, Card } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { ASSET_KINDS } from "@/lib/options";
import type { AssetDTO, CreatorDTO } from "@/lib/types";
import { deleteAsset, updateAsset, updateCreator, uploadAssets } from "@/lib/store";
import { cn } from "@/lib/utils";

export const PRIORITY_LABELS: Record<number, string> = { 1: "١ · الأساسية", 2: "٢ · مهمة", 3: "٣ · عادي", 4: "٤ · قليلة", 5: "٥ · اختياري" };

export function AssetManager({ creator, assets }: { creator: CreatorDTO; assets: AssetDTO[] }) {
  const [busyKind, setBusyKind] = useState<string | null>(null);
  const [preview, setPreview] = useState<AssetDTO | null>(null);
  const [tagFilter, setTagFilter] = useState("");

  async function upload(kind: string, files: File[]) {
    setBusyKind(kind);
    try {
      await uploadAssets(creator.id, kind, files);
      toast.success(files.length > 1 ? `اترفعت ${files.length} صور` : "الصورة اترفعت");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyKind(null);
    }
  }

  const allTags = Array.from(new Set(assets.flatMap((a) => a.tags.split(",").map((t) => t.trim()).filter(Boolean)))).sort();
  const visible = tagFilter ? assets.filter((a) => a.tags.split(",").map((t) => t.trim()).includes(tagFilter)) : assets;

  return (
    <div className="space-y-8">
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="label-xs me-1">فلتر بالتاج</span>
          <button onClick={() => setTagFilter("")} className={cn("rounded-md px-2 py-1 text-xs", !tagFilter ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>الكل</button>
          {allTags.map((t) => (
            <button key={t} onClick={() => setTagFilter(t === tagFilter ? "" : t)} className={cn("rounded-md px-2 py-1 text-xs", tagFilter === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>#{t}</button>
          ))}
        </div>
      )}
      {ASSET_KINDS.map((k) => {
        const list = visible.filter((a) => a.kind === k.value);
        return (
          <section key={k.value}>
            <div className="mb-3 flex items-baseline justify-between">
              <div>
                <h3 className="text-sm font-semibold">{k.label} <span className="ms-1 font-normal text-muted-foreground">{list.length}</span></h3>
                <p className="text-xs text-muted-foreground">{k.desc}</p>
              </div>
            </div>
            <div className={cn("grid gap-3", k.value === "reference" ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5")}>
              {list.map((a) => (
                <AssetCard key={a.id} asset={a} creator={creator} onPreview={() => setPreview(a)} wide={k.value === "reference"} />
              ))}
              <Dropzone
                compact={list.length > 0}
                busy={busyKind === k.value}
                title={list.length ? "ضيف صورة" : `حط صور ${k.label} هنا`}
                onFiles={(f) => upload(k.value, f)}
                className={cn(k.value === "reference" ? "aspect-video" : "aspect-[4/5]", list.length === 0 && "col-span-full aspect-auto")}
              />
            </div>
          </section>
        );
      })}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent wide="full">
          {preview && (
            <>
              <DialogHeader title={preview.label || preview.originalName} description={`${preview.width}×${preview.height}px · ${(preview.sizeBytes / 1024).toFixed(0)} KB · ${preview.kind}`} />
              <div className="checker flex max-h-[75vh] items-center justify-center overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview.url} alt="" className="max-h-[75vh] object-contain" />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssetCard({ asset, creator, onPreview, wide }: { asset: AssetDTO; creator: CreatorDTO; onPreview: () => void; wide?: boolean }) {
  const [a, setA] = useState(asset);

  async function patch(data: Partial<AssetDTO>) {
    setA((x) => ({ ...x, ...data }));
    try {
      await updateAsset(asset.id, data);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function del() {
    if (!confirm("تمسح الصورة دي؟")) return;
    try {
      await deleteAsset(asset.id);
      toast.success("الصورة اتمسحت");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function setAs(field: "avatarAssetId" | "logoAssetId") {
    try {
      await updateCreator(creator.id, { [field]: asset.id });
      toast.success(field === "avatarAssetId" ? "بقت صورة البروفايل" : "بقت اللوجو");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const isAvatar = creator.avatarAssetId === asset.id;
  const isLogo = creator.logoAssetId === asset.id;

  return (
    <Card className={cn("group overflow-hidden transition hover:border-white/15", a.priority === 1 && "border-primary/40")}>
      <div className={cn("checker relative overflow-hidden", wide ? "aspect-video" : "aspect-[4/5]")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset.url} alt={a.label} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        <div className="absolute bottom-2 start-2 flex gap-1">
          {a.priority === 1 && <Badge tone="primary" className="bg-black/70 backdrop-blur"><Star className="h-3 w-3 fill-current" /> الأساسية</Badge>}
          {isAvatar && <Badge className="bg-black/70 backdrop-blur">البروفايل</Badge>}
          {isLogo && <Badge className="bg-black/70 backdrop-blur">اللوجو</Badge>}
        </div>
        <div className="absolute end-2 top-2 flex gap-1 transition md:opacity-0 md:group-hover:opacity-100">
          <Button size="icon-sm" variant="secondary" onClick={onPreview} title="كبّر"><Expand /></Button>
          <Button size="icon-sm" variant="secondary" onClick={() => setAs("avatarAssetId")} title="خليها صورة البروفايل"><Crown /></Button>
          <Button size="icon-sm" variant="destructive" onClick={del} title="امسح"><Trash2 /></Button>
        </div>
      </div>
      <div className="space-y-1.5 p-2.5">
        <input className="w-full bg-transparent text-xs font-medium outline-none placeholder:text-muted-foreground" dir="auto" value={a.label} placeholder="اسم الصورة" onChange={(e) => setA({ ...a, label: e.target.value })} onBlur={(e) => e.target.value !== asset.label && patch({ label: e.target.value })} />
        <Input className="h-7 text-[11px]" placeholder="دي إيه؟ (اختياري — بتتكتب في البرومبت)" value={a.purpose} onChange={(e) => setA({ ...a, purpose: e.target.value })} onBlur={(e) => e.target.value !== asset.purpose && patch({ purpose: e.target.value })} />
        <div className="flex gap-1.5">
          <Input className="h-7 min-w-0 flex-1 text-[11px]" placeholder="تاجز، بفاصلة" value={a.tags} onChange={(e) => setA({ ...a, tags: e.target.value })} onBlur={(e) => e.target.value !== asset.tags && patch({ tags: e.target.value })} />
          <NativeSelect className="h-7 w-[92px] ps-2 pe-6 text-[11px]" value={a.priority} onChange={(e) => patch({ priority: Number(e.target.value) })} title="الأهمية">
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{PRIORITY_LABELS[n]}</option>)}
          </NativeSelect>
        </div>
        <NativeSelect className="h-7 ps-2 pe-6 text-[11px]" value={a.kind} onChange={(e) => patch({ kind: e.target.value })} title="نوع الصورة — بيعرّف ChatGPT الصورة دي إيه">
          {ASSET_KINDS.map((k) => <option key={k.value} value={k.value}>النوع: {k.label}</option>)}
        </NativeSelect>
        {a.kind === "logo" && !isLogo && (
          <button className="text-[11px] text-primary hover:underline" onClick={() => setAs("logoAssetId")}>خليه اللوجو الأساسي</button>
        )}
      </div>
    </Card>
  );
}
