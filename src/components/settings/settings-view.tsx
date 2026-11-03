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
      toast.success(`النسخة الاحتياطية اتنزلت (${(blob.size / 1024 / 1024).toFixed(1)} ميجا)`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function restore(file: File) {
    if (!confirm("الاسترجاع هيمسح كل البيانات اللي هنا ويحط مكانها النسخة الاحتياطية. متأكد؟")) return;
    setBusy("restore");
    try {
      await importBackup(file);
      toast.success("النسخة الاحتياطية رجعت");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!/^https:\/\//.test(s.chatgptUrl)) return toast.error("لينك ChatGPT لازم يبدأ بـ https://");
    setSaving(true);
    try {
      setS(await saveSettings(s));
      toast.success("الإعدادات اتحفظت");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function restorePresets() {
    if (!confirm("ترجّع القوالب الجاهزة لأصلها؟ تعديلاتك عليهم هتتمسح، والقوالب المخصصة مش هتتأثر.")) return;
    try {
      await ensureBuiltInPresets(true);
      toast.success("القوالب الجاهزة رجعت لأصلها");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="px-4 py-5 md:px-8 md:py-6">
      <Tabs defaultValue="workflow">
        <TabsList>
          <TabsTrigger value="workflow"><SlidersHorizontal /> عام</TabsTrigger>
          <TabsTrigger value="data"><Database /> النسخ الاحتياطي</TabsTrigger>
          <TabsTrigger value="presets"><Layers /> القوالب</TabsTrigger>
        </TabsList>
        <TabsContent value="presets">
          <div className="mb-4 flex justify-end"><Button variant="ghost" size="sm" onClick={restorePresets}><RotateCcw /> رجّع القوالب الجاهزة لأصلها</Button></div>
          <PresetList presets={presets} creators={creators} />
        </TabsContent>
        <TabsContent value="workflow">
          <Card className="max-w-2xl space-y-4 p-5">
            <div>
              <Label>اسم اللعبة</Label>
              <Input value={s.gameName} onChange={(e) => setS({ ...s, gameName: e.target.value })} placeholder="EA FC 27" dir="ltr" />
              <p className="mt-1 text-[11px] text-muted-foreground">بيتكتب في البرومبت — غيّره لما تنزل نسخة جديدة من اللعبة.</p>
            </div>
            <div>
              <Label>لينك ChatGPT</Label>
              <Input value={s.chatgptUrl} onChange={(e) => setS({ ...s, chatgptUrl: e.target.value })} />
              <p className="mt-1 text-[11px] text-muted-foreground">بيتفتح لما تدوس «انسخ وافتح ChatGPT». ممكن تحط لينك مشروع أو GPT معيّن.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>طول البرومبت</Label>
                <NativeSelect value={s.promptStyle} onChange={(e) => setS({ ...s, promptStyle: e.target.value })}>
                  {PROMPT_STYLES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                </NativeSelect>
              </div>
              <div>
                <Label>مستوى الجرأة الافتراضي</Label>
                <NativeSelect value={s.defaultVariation} onChange={(e) => setS({ ...s, defaultVariation: e.target.value })}>
                  {VARIATIONS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                </NativeSelect>
              </div>
              <div>
                <Label>الثمبنيلات المرجعية</Label>
                <NativeSelect value={s.defaultReferencePriority} onChange={(e) => setS({ ...s, defaultReferencePriority: e.target.value })}>
                  {REFERENCE_PRIORITIES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                </NativeSelect>
              </div>
              <div>
                <Label>صيغة التصدير</Label>
                <NativeSelect value={s.exportFormat} onChange={(e) => setS({ ...s, exportFormat: e.target.value })}>
                  <option value="jpg">JPG</option>
                  <option value="png">PNG</option>
                </NativeSelect>
              </div>
              <div>
                <Label>طريقة التصدير</Label>
                <NativeSelect value={s.exportFit} onChange={(e) => setS({ ...s, exportFit: e.target.value })}>
                  <option value="cover">املا وقص لـ 16:9</option>
                  <option value="contain">كاملة بحواف</option>
                </NativeSelect>
              </div>
            </div>
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Save settings</Button>
          </Card>
        </TabsContent>
        <TabsContent value="data">
          <div className="grid max-w-4xl gap-4 md:grid-cols-2">
            <Card className="p-5">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><HardDrive className="h-4 w-4 text-primary" /> بياناتك متحفظة في المتصفح ده</div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                الكريتورز والصور والمشاريع والثمبنيلات متحفظين على جهازك في المتصفح ده بس، ومفيش حاجة بتترفع على أي سيرفر. لو فتحت من متصفح أو جهاز تاني هتلاقيه فاضي — استخدم النسخة الاحتياطية عشان تنقل بياناتك.
              </p>
              {usage && (
                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">المستخدم</span><span className="font-mono">{(usage.used / 1024 / 1024).toFixed(1)} MB</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">المتاح</span><span className="font-mono">{(usage.quota / 1024 / 1024 / 1024).toFixed(1)} GB</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">محمي من المسح التلقائي</span><span className={usage.persisted ? "text-success" : "text-warning"}>{usage.persisted ? "أيوه" : "لأ"}</span></div>
                </div>
              )}
              <p className="mt-3 text-[11px] text-warning">لو مسحت بيانات المتصفح، المكتبة هتتمسح. خد نسخة احتياطية كل فترة.</p>
            </Card>
            <Card className="p-5">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Download className="h-4 w-4 text-primary" /> نسخة احتياطية</div>
              <div className="flex flex-col gap-2">
                <Button variant="secondary" onClick={backup} disabled={!!busy}>{busy === "backup" ? <Loader2 className="animate-spin" /> : <Download />} نزّل نسخة احتياطية كاملة (بالصور)</Button>
                <Button variant="secondary" onClick={() => restoreInput.current?.click()} disabled={!!busy}>{busy === "restore" ? <Loader2 className="animate-spin" /> : <Upload />} استرجع من نسخة احتياطية…</Button>
                <input ref={restoreInput} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void restore(f); }} />
                <div className="my-1 h-px bg-border" />
                <DemoButton />
                <DemoButton reset />
              </div>
            </Card>
            <Card className="p-5 md:col-span-2">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> بيشتغل إزاي؟</div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                ThumbStudio مش بيستخدم OpenAI API ولا أي مفاتيح أو اشتراكات. البرنامج بيكتب البرومبت من فكرة الفيديو وستايل الكريتور، وانت بترفع الصور في ChatGPT بنفسك وترجّع النتيجة هنا. البرنامج مش بيحلل الصور — هو بيرتّب كل حاجة عشان ChatGPT يطلّع أحسن نتيجة.
              </p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
