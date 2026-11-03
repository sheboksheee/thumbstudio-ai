"use client";
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { seedExampleData } from "@/lib/seed";

export function DemoButton({ reset = false, label }: { reset?: boolean; label?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="secondary"
      disabled={busy}
      onClick={async () => {
        if (reset && !confirm("ده هيمسح كل الكريتورز والمشاريع والنتايج والصور اللي في المتصفح ده، ويرجّع الأمثلة. متأكد؟")) return;
        setBusy(true);
        try {
          await seedExampleData({ reset });
          toast.success(reset ? "رجعت للأمثلة" : "الأمثلة اتضافت");
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
      {label ?? (reset ? "امسح كل حاجة وارجع للأمثلة" : "ضيف كريتورز أمثلة")}
    </Button>
  );
}
