"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Images, Settings, Users, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "الاستوديو", icon: Wand2, match: (p: string) => p === "/" || p.startsWith("/studio") },
  { href: "/library", label: "النتايج", icon: Images, match: (p: string) => p.startsWith("/library") },
  { href: "/creators", label: "الكريتورز", icon: Users, match: (p: string) => p.startsWith("/creators") },
  { href: "/settings", label: "الإعدادات", icon: Settings, match: (p: string) => p.startsWith("/settings") },
];

function Logo() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-cyan-600 shadow-[0_0_24px_-4px_hsl(var(--primary)/.7)]">
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-cyan-950" fill="currentColor"><rect x="3" y="5" width="18" height="12" rx="3" opacity=".35" /><path d="M10 8.5v6l5-3z" /></svg>
    </div>
  );
}

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sticky top-0 z-30 hidden h-screen w-[220px] shrink-0 flex-col border-e bg-panel/80 px-3 py-5 backdrop-blur md:flex">
      <Link href="/" className="mb-8 flex items-center gap-2.5 px-2">
        <Logo />
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-tight">ThumbStudio</div>
          <div className="text-[11px] font-medium text-primary">استوديو الثمبنيلات</div>
        </div>
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon, match }) => {
          const active = match(path);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "relative flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-all",
                active ? "bg-elevated text-foreground ring-1 ring-white/[0.06]" : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground",
              )}
            >
              {active && <span className="absolute -start-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-e bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />}
              <Icon className={cn("h-[18px] w-[18px]", href === "/" && "text-primary")} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="rounded-xl border bg-background/40 p-3 text-xs leading-relaxed text-muted-foreground">
        بيجهّزلك البرومبت والصور، وانت بترفعهم في ChatGPT بنفسك. من غير اشتراكات ولا API.
      </div>
    </aside>
  );
}

export function MobileNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-panel/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-4">
        {NAV.map(({ href, label, icon: Icon, match }) => {
          const active = match(path);
          return (
            <Link key={href} href={href} title={label} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition", active ? "text-primary" : "text-muted-foreground")}>
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b px-4 pb-4 pt-5 md:px-8 md:pb-5 md:pt-7">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
