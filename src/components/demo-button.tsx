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
        if (reset && !confirm("This deletes ALL creators, projects, results and images in this browser, then reloads the example data. Continue?")) return;
        setBusy(true);
        try {
          await seedExampleData({ reset });
          toast.success(reset ? "Data reset to examples" : "Example creators loaded");
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
      {label ?? (reset ? "Reset to example data" : "Load example creators")}
    </Button>
  );
}
