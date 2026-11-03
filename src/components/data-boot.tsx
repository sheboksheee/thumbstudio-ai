"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { db, ensureBuiltInPresets } from "@/lib/store";
import { seedExampleData } from "@/lib/seed";

/**
 * Prepares the in-browser database: built-in presets, example creators on the
 * very first visit, and a request for persistent storage so the browser does
 * not evict the library.
 */
export function DataBoot({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await ensureBuiltInPresets();
        const seeded = await db.settings.get("seeded");
        if (!seeded) {
          if ((await db.creators.count()) === 0) await seedExampleData();
          await db.settings.put({ key: "seeded", value: new Date().toISOString() });
        }
        navigator.storage?.persist?.().catch(() => undefined);
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center">
        <div className="max-w-md">
          <div className="text-lg font-semibold">The local database could not be opened</div>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <p className="mt-2 text-sm text-muted-foreground">Private / incognito windows may block storage. Open ThumbStudio in a normal window.</p>
        </div>
      </div>
    );
  }
  if (!ready) return <Loading label="Preparing your studio…" />;
  return <>{children}</>;
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin text-primary" /> {label}
    </div>
  );
}
