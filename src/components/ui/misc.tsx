"use client";
import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Badge({ className, tone = "default", ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "primary" | "success" | "warning" | "danger" | "outline" }) {
  const tones = {
    default: "bg-secondary text-secondary-foreground",
    primary: "bg-primary/15 text-primary ring-1 ring-inset ring-primary/30",
    success: "bg-success/15 text-success ring-1 ring-inset ring-success/30",
    warning: "bg-warning/15 text-warning ring-1 ring-inset ring-warning/30",
    danger: "bg-destructive/15 text-destructive ring-1 ring-inset ring-destructive/30",
    outline: "ring-1 ring-inset ring-border text-muted-foreground",
  } as const;
  return <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium", tones[tone], className)} {...props} />;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("panel", className)} {...props} />;
}

export function Switch({ checked, onChange, label, className }: { checked: boolean; onChange: (v: boolean) => void; label?: string; className?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors", checked ? "bg-primary" : "bg-muted", className)}
    >
      <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[18px] rtl:-translate-x-[18px]" : "translate-x-0.5 rtl:-translate-x-0.5")} />
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className, size = "default" }: { value: T; onChange: (v: T) => void; options: readonly { value: T; label: string; icon?: React.ReactNode }[]; className?: string; size?: "default" | "sm" }) {
  return (
    <div className={cn("inline-flex w-full rounded-lg border bg-background/60 p-0.5", className)} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-all [&_svg]:size-3.5",
            size === "sm" ? "h-7 px-2 text-[11px]" : "h-8 px-2.5 text-xs",
            value === o.value ? "bg-elevated text-foreground shadow-sm ring-1 ring-white/[0.06]" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stars({ value, onChange, size = 16 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  const [hover, setHover] = React.useState(0);
  return (
    <div className="inline-flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = (hover || value) >= n;
        return (
          <button
            key={n}
            type="button"
            disabled={!onChange}
            onMouseEnter={() => onChange && setHover(n)}
            onClick={() => onChange?.(value === n ? 0 : n)}
            className={cn("transition-transform", onChange && "hover:scale-110")}
            aria-label={`${n} نجوم`}
          >
            <Star style={{ width: size, height: size }} className={on ? "fill-warning text-warning" : "text-muted-foreground/40"} />
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: React.ReactNode; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:size-6">{icon}</div>
      <h3 className="text-base font-semibold">{title}</h3>
      {children && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionTitle({ children, hint, right }: { children: React.ReactNode; hint?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{children}</h2>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

export function ColorField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="flex h-9 items-center gap-2 rounded-lg border border-input bg-background/60 px-1.5">
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value)} className="h-6 w-8 cursor-pointer bg-transparent" aria-label={label} />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent font-mono text-xs uppercase outline-none" spellCheck={false} />
      </div>
    </div>
  );
}
