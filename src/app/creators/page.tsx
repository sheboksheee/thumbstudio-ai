"use client";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { useAppData } from "@/lib/hooks";
import { Loading } from "@/components/data-boot";
import { PageHeader } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { DemoButton } from "@/components/demo-button";
import { CreatorAvatar } from "@/components/creator-avatar";
import { dnaCompleteness } from "@/lib/style-dna";

export default function CreatorsPage() {
  const data = useAppData();
  if (!data) return <Loading />;
  const { creators } = data;
  return (
    <div>
      <PageHeader
        title="Creators"
        subtitle="Creator profiles, identity photography, reference galleries and Style DNA."
        actions={<Button asChild><Link href="/creators/new"><Plus /> New creator</Link></Button>}
      />
      <div className="px-8 py-7">
        {creators.length === 0 ? (
          <EmptyState icon={<Users />} title="Your creator library is empty" action={<div className="flex gap-2"><Button asChild><Link href="/creators/new">Create creator</Link></Button><DemoButton /></div>}>
            Each creator stores their face photography, references, colors and creative rules.
          </EmptyState>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {creators.map((c, i) => {
              const dna = dnaCompleteness(c.styleDna);
              return (
                <Link key={c.id} href={`/creators/edit?id=${c.id}`} className="panel group animate-fade-up overflow-hidden transition hover:-translate-y-0.5 hover:border-primary/40" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="relative h-24" style={{ background: `linear-gradient(120deg, ${c.primaryColor}, ${c.secondaryColor})` }}>
                    {c.logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.logoUrl} alt="" className="absolute right-3 top-3 h-10 w-10 rounded-lg object-cover opacity-90 ring-1 ring-black/30" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-panel via-panel/20 to-transparent" />
                  </div>
                  <div className="-mt-9 px-4 pb-4">
                    <CreatorAvatar name={c.name} url={c.avatarUrl} color={c.primaryColor} size={56} />
                    <div className="mt-3 font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground" dir="auto">{c.channelName}{c.niche ? ` · ${c.niche}` : ""}</div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px]">
                      <div className="rounded-lg bg-background/60 py-2"><div className="text-sm font-semibold tabular-nums">{c.counts.face}</div><div className="text-muted-foreground">Faces</div></div>
                      <div className="rounded-lg bg-background/60 py-2"><div className="text-sm font-semibold tabular-nums">{c.counts.reference}</div><div className="text-muted-foreground">Refs</div></div>
                      <div className="rounded-lg bg-background/60 py-2"><div className="text-sm font-semibold tabular-nums">{dna}%</div><div className="text-muted-foreground">DNA</div></div>
                    </div>
                    <div className="mt-3 flex gap-1.5">
                      {[c.primaryColor, c.secondaryColor, c.accentColor].map((col) => (
                        <span key={col} className="h-1.5 flex-1 rounded-full" style={{ background: col }} />
                      ))}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
