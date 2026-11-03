"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Dna, Images, Layers, Loader2, Lock, LockOpen, Save, Trash2, User, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { Badge, Card, ColorField, Switch } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreatorAvatar } from "@/components/creator-avatar";
import { AssetManager } from "./asset-manager";
import { PresetList } from "@/components/presets/preset-list";
import { DNA_CATEGORIES, dnaCompleteness, emptyDna, type StyleDna } from "@/lib/style-dna";
import type { AssetDTO, CreatorDTO, PresetDTO } from "@/lib/types";
import { createCreator, deleteCreator, updateCreator } from "@/lib/store";
import { cn } from "@/lib/utils";

type Profile = Pick<
  CreatorDTO,
  "name" | "channelName" | "niche" | "language" | "primaryColor" | "secondaryColor" | "accentColor" | "typography" | "background" | "retouching" | "lighting" | "compositionRules" | "negative" | "masterPrompt" | "notes"
>;

const EMPTY: Profile = {
  name: "",
  channelName: "",
  niche: "EA FC",
  language: "ar",
  primaryColor: "#22d3ee",
  secondaryColor: "#0b1120",
  accentColor: "#f8fafc",
  typography: "",
  background: "",
  retouching: "",
  lighting: "",
  compositionRules: "",
  negative: "",
  masterPrompt: "",
  notes: "",
};

function toProfile(c: CreatorDTO | null): Profile {
  if (!c) return EMPTY;
  const out = { ...EMPTY };
  for (const k of Object.keys(EMPTY) as (keyof Profile)[]) out[k] = (c[k] ?? "") as string;
  return out;
}

export function CreatorEditor({ creator, assets, presets, initialTab }: { creator: CreatorDTO | null; assets: AssetDTO[]; presets: PresetDTO[]; initialTab?: string }) {
  const router = useRouter();
  const isNew = !creator;
  const [profile, setProfile] = useState<Profile>(() => toProfile(creator));
  const [dna, setDna] = useState<StyleDna>(() => creator?.styleDna ?? emptyDna());
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState(initialTab ?? (creator ? "assets" : "profile"));

  const initial = useMemo(() => JSON.stringify([toProfile(creator), creator?.styleDna ?? emptyDna()]), [creator]);
  const dirty = JSON.stringify([profile, dna]) !== initial;

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setProfile((p) => ({ ...p, [k]: v }));

  async function save(silent = false) {
    if (!profile.name.trim()) {
      if (!silent) {
        toast.error("اكتب اسم الكريتور");
        setTab("profile");
      }
      return;
    }
    if (!isNew && !dirty) {
      if (!silent) toast.success("كل التعديلات محفوظة");
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const c = await createCreator({ ...profile, styleDna: dna });
        toast.success("الكريتور اتعمل — ارفع صورة واضحة لوشه");
        router.push(`/creators/edit?id=${c.id}&tab=assets`);
      } else {
        await updateCreator(creator.id, { ...profile, styleDna: dna });
        if (!silent) toast.success("اتحفظ");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // Autosave: existing creators save themselves ~0.7s after the last change.
  const latest = useRef({ profile, dna, dirty });
  latest.current = { profile, dna, dirty };
  useEffect(() => {
    if (isNew || !dirty || !profile.name.trim()) return;
    const t = setTimeout(() => void save(true), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, dna, dirty, isNew]);

  // Flush pending edits when leaving the page; warn if the tab is closed mid-save.
  useEffect(() => {
    if (isNew || !creator) return;
    const id = creator.id;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (latest.current.dirty) {
        void updateCreator(id, { ...latest.current.profile, styleDna: latest.current.dna });
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      const l = latest.current;
      if (l.dirty && l.profile.name.trim()) void updateCreator(id, { ...l.profile, styleDna: l.dna });
    };
  }, [isNew, creator?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ⌘S / Ctrl+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function remove() {
    if (!creator) return;
    if (!confirm(`تمسح ${creator.name}؟ هيتمسح معاه كل صوره ومشاريعه وثمبنيلاته.`)) return;
    try {
      router.push("/creators");
      await deleteCreator(creator.id);
      toast.success("الكريتور اتمسح");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const completeness = dnaCompleteness(dna);

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      {!isNew && (
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <CreatorAvatar name={profile.name || "?"} url={creator.avatarUrl} color={profile.primaryColor} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{profile.name || "بدون اسم"}</h1>
              
            </div>
            <div className="text-sm text-muted-foreground" dir="auto">{profile.channelName}{profile.niche ? ` · ${profile.niche}` : ""}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={remove} className="text-muted-foreground hover:text-destructive"><Trash2 /> <span className="hidden sm:inline">امسح</span></Button>
            <Button variant="secondary" asChild><Link href={`/?creator=${creator.id}`}><Wand2 /> اعمل ثمبنيل</Link></Button>
            <Button onClick={() => save()} variant={dirty ? "default" : "secondary"} title="بيتحفظ تلقائي · ⌘S">
              {!profile.name.trim() ? <><Save /> اكتب الاسم</> : saving || dirty ? <><Loader2 className="animate-spin" /> بيحفظ…</> : <><Check className="text-success" /> اتحفظ</>}
            </Button>
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {!isNew && <TabsTrigger value="assets"><Images /> الصور <Badge tone="outline">{assets.length}</Badge></TabsTrigger>}
          <TabsTrigger value="profile"><User /> البيانات</TabsTrigger>
          {!isNew && <TabsTrigger value="dna"><Dna /> الستايل <Badge tone={completeness > 60 ? "primary" : "outline"}>{completeness}%</Badge></TabsTrigger>}
          {!isNew && <TabsTrigger value="presets"><Layers /> القوالب <Badge tone="outline">{presets.length}</Badge></TabsTrigger>}
        </TabsList>

        <TabsContent value="profile">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="space-y-4 p-5 lg:col-span-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>اسم الكريتور *</Label><Input value={profile.name} onChange={(e) => set("name", e.target.value)} placeholder="مثال: مصباح" /></div>
                <div><Label>اسم القناة</Label><Input value={profile.channelName} onChange={(e) => set("channelName", e.target.value)} placeholder="مثال: Mesbah FC" /></div>
                <div><Label>المجال</Label><Input value={profile.niche} onChange={(e) => set("niche", e.target.value)} placeholder="EA FC" /></div>
                <div>
                  <Label>لغة الجمهور</Label>
                  <NativeSelect value={profile.language} onChange={(e) => set("language", e.target.value)}>
                    <option value="ar">عربي</option>
                    <option value="en">إنجليزي</option>
                    <option value="mixed">عربي وإنجليزي</option>
                  </NativeSelect>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <ColorField label="اللون الأساسي" value={profile.primaryColor} onChange={(v) => set("primaryColor", v)} />
                <ColorField label="اللون التاني" value={profile.secondaryColor} onChange={(v) => set("secondaryColor", v)} />
                <ColorField label="لون مميز" value={profile.accentColor} onChange={(v) => set("accentColor", v)} />
              </div>
              {!isNew && (
                <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="ستايل الخط" value={profile.typography} onChange={(v) => set("typography", v)} placeholder="مثال: خط عريض أبيض بحدود سودة" />
                <Field label="الخلفية المفضلة" value={profile.background} onChange={(v) => set("background", v)} placeholder="مثال: استاد غامق بالليل" />
                <Field label="الريتاتش" value={profile.retouching} onChange={(v) => set("retouching", v)} placeholder="مثال: بشرة طبيعية من غير تنعيم" />
                <Field label="الإضاءة" value={profile.lighting} onChange={(v) => set("lighting", v)} placeholder="مثال: إضاءة سماوي من ورا" />
                <Field label="قواعد التكوين" value={profile.compositionRules} onChange={(v) => set("compositionRules", v)} placeholder="قاعدة في كل سطر" />
                <Field label="ممنوع" value={profile.negative} onChange={(v) => set("negative", v)} placeholder="مثال: من غير أسهم حمرا&#10;من غير إيموجي" />
              </div>
              <div>
                <Label>توجيه ثابت لكل الثمبنيلات</Label>
                <Textarea rows={4} value={profile.masterPrompt} onChange={(e) => set("masterPrompt", e.target.value)} placeholder="حاجة عايزها في كل ثمبنيل للكريتور ده. (اختياري)" />
              </div>
              <div><Label>ملاحظات</Label><Textarea rows={2} value={profile.notes} onChange={(e) => set("notes", e.target.value)} placeholder="ملاحظات ليك — مش بتدخل في البرومبت." /></div>
                </>
              )}
            </Card>
            <div className="space-y-4">
              <Card className="overflow-hidden">
                <div className="h-28" style={{ background: `linear-gradient(120deg, ${profile.primaryColor}, ${profile.secondaryColor})` }} />
                <div className="p-4">
                  <div className="label-xs mb-2">الألوان</div>
                  <div className="flex gap-2">
                    {[profile.primaryColor, profile.secondaryColor, profile.accentColor].map((c, i) => (
                      <div key={i} className="flex-1"><div className="h-10 rounded-lg ring-1 ring-white/10" style={{ background: c }} /><div className="mt-1 font-mono text-[10px] uppercase text-muted-foreground">{c}</div></div>
                    ))}
                  </div>
                </div>
              </Card>
              <Card className="p-4 text-xs leading-relaxed text-muted-foreground">
                كل الخانات اختيارية. اللي تكتبه بيدخل في البرومبت كقاعدة — سيب أي خانة فاضية لو مش محتاجها.
              </Card>
              {isNew && (
                <Button className="w-full" size="lg" onClick={() => save()} disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" /> : <Save />} اعمل الكريتور
                </Button>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="dna">
          <DnaEditor dna={dna} onChange={setDna} />
          
        </TabsContent>

        {!isNew && (
          <TabsContent value="assets">
            <AssetManager creator={creator} assets={assets} />
          </TabsContent>
        )}
        {!isNew && (
          <TabsContent value="presets">
            <PresetList presets={presets} creators={[{ id: creator.id, name: creator.name }]} fixedCreatorId={creator.id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function DnaEditor({ dna, onChange }: { dna: StyleDna; onChange: (d: StyleDna) => void }) {
  return (
    <div>
      <Card className="mb-5 flex flex-wrap items-center gap-4 p-4 text-sm">
        <Dna className="h-5 w-5 text-primary" />
        <div className="flex-1 text-muted-foreground">
          هنا ستايل القناة الثابت — اكتب قاعدة في كل سطر، وسيب الفاضي فاضي. القسم <span className="text-foreground">المقفول</span> بيتطبّق دايمًا حتى في الوضع التجريبي.
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {DNA_CATEGORIES.map((cat) => {
          const entry = dna[cat.key];
          return (
            <Card key={cat.key} className={cn("p-4 transition", entry.locked && "border-primary/35")}>
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {cat.labelAr}
                    {entry.rules.trim() && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{cat.hintAr}</div>
                </div>
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[11px] text-muted-foreground">
                  {entry.locked ? <Lock className="h-3.5 w-3.5 text-primary" /> : <LockOpen className="h-3.5 w-3.5" />}
                  ثابت
                  <Switch checked={entry.locked} onChange={(v) => onChange({ ...dna, [cat.key]: { ...entry, locked: v } })} label={`ثبّت ${cat.labelAr}`} />
                </label>
              </div>
              <Textarea rows={3} value={entry.rules} placeholder="قاعدة في كل سطر" onChange={(e) => onChange({ ...dna, [cat.key]: { ...entry, rules: e.target.value } })} />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
