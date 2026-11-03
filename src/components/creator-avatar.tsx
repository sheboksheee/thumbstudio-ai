import { cn } from "@/lib/utils";

export function CreatorAvatar({ name, url, color, size = 40, className }: { name: string; url?: string | null; color?: string; size?: number; className?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-panel", className)}
      style={{ width: size, height: size, ["--tw-ring-color" as string]: (color ?? "#22d3ee") + "88" }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-semibold" style={{ background: color ?? "#22d3ee", color: "#05070a", fontSize: size * 0.36 }}>
          {initials}
        </div>
      )}
    </div>
  );
}
