"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Wand2, Images, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/creators", label: "Creators", icon: Users },
  { href: "/studio", label: "Studio", icon: Wand2, primary: true },
  { href: "/library", label: "Library", icon: Images },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sticky top-0 z-30 flex h-screen w-[76px] shrink-0 flex-col items-center border-r bg-panel/80 py-4 backdrop-blur xl:w-[208px] xl:items-stretch xl:px-3">
      <Link href="/" className="mb-7 flex items-center gap-2.5 xl:px-2">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-cyan-600 shadow-[0_0_24px_-4px_hsl(var(--primary)/.7)]">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-cyan-950" fill="currentColor"><rect x="3" y="5" width="18" height="12" rx="3" opacity=".35" /><path d="M10 8.5v6l5-3z" /></svg>
        </div>
        <div className="hidden leading-tight xl:block">
          <div className="text-sm font-semibold tracking-tight">ThumbStudio</div>
          <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-primary">AI · Manual</div>
        </div>
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon, primary }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "group relative flex h-11 w-11 items-center justify-center gap-3 rounded-xl text-sm font-medium transition-all xl:w-auto xl:justify-start xl:px-3",
                active ? "bg-elevated text-foreground ring-1 ring-white/[0.06]" : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground",
              )}
            >
              {active && <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-primary shadow-[0_0_12px_hsl(var(--primary))] xl:-left-3" />}
              <Icon className={cn("h-[18px] w-[18px] transition", primary && "text-primary", active && "scale-105")} />
              <span className="hidden xl:inline">{label}</span>
              {primary && <span className="ml-auto hidden rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary xl:inline">Main</span>}
            </Link>
          );
        })}
      </nav>
      <div className="hidden rounded-xl border bg-background/40 p-3 text-[11px] leading-relaxed text-muted-foreground xl:block">
        <span className="font-medium text-foreground">Manual Mode.</span> No API keys. Prompts are compiled locally — you attach images in ChatGPT yourself.
      </div>
    </aside>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b px-8 pb-5 pt-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
