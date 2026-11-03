"use client";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Images, Sparkles, Users, Wand2 } from "lucide-react";
import { useAppData } from "@/lib/hooks";
import { Loading } from "@/components/data-boot";
import { PageHeader } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/misc";
import { DemoButton } from "@/components/demo-button";
import { CreatorAvatar } from "@/components/creator-avatar";
import { timeAgo } from "@/lib/utils";
import { labelOf, RESULT_STATUSES } from "@/lib/options";
import { dnaCompleteness } from "@/lib/style-dna";

export default function Dashboard() {
  const data = useAppData();
  if (!data) return <Loading />;
  const { creators, presets, results } = data;
  const projects = data.projects.slice(0, 8);
  const creatorById = new Map(creators.map((c) => [c.id, c]));
  const presetById = new Map(presets.map((p) => [p.id, p]));
  const approved = results.filter((r) => r.status === "approved").length;
  const pending = results.filter((r) => r.status === "pending" || r.status === "revision").length;

  const stats = [
    { label: "Creators", value: creators.length, icon: Users, href: "/creators" },
    { label: "Projects", value: data.projects.length, icon: Wand2, href: "/studio" },
    { label: "Thumbnails", value: results.length, icon: Images, href: "/library" },
    { label: "Approved", value: approved, icon: CheckCircle2, href: "/library?status=approved" },
    { label: "Awaiting review", value: pending, icon: Clock, href: "/library?status=pending" },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Your thumbnail production at a glance."
        actions={
          <Button asChild size="lg">
            <Link href="/studio"><Sparkles /> New thumbnail</Link>
          </Button>
        }
      />
      <div className="space-y-8 px-8 py-7">
        {/* Workflow strip */}
        <Card className="relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="label-xs mb-3">ChatGPT Manual Mode workflow</div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {["Select creator", "Enter concept", "Pick preset", "Attach assets", "Compile prompt", "Copy & open ChatGPT", "Import result"].map((s, i, arr) => (
              <span key={s} className="flex items-center gap-2">
                <span className="flex items-center gap-2 rounded-lg border bg-background/50 px-3 py-1.5">
                  <span className="font-mono text-[11px] text-primary">{String(i + 1).padStart(2, "0")}</span>
                  {s}
                </span>
                {i < arr.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
              </span>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {stats.map(({ label, value, icon: Icon, href }) => (
            <Link key={label} href={href} className="panel group p-4 transition hover:border-primary/40">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs">{label}</span>
                <Icon className="h-4 w-4 transition group-hover:text-primary" />
              </div>
              <div className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</div>
            </Link>
          ))}
        </div>

        {creators.length === 0 ? (
          <EmptyState icon={<Users />} title="No creators yet" action={<div className="flex gap-2"><Button asChild><Link href="/creators/new">Create a creator</Link></Button><DemoButton /></div>}>
            Create your first creator profile, or load the fictional example creators to explore the workflow.
          </EmptyState>
        ) : (
          <div className="grid gap-6 lg:grid-cols-5">
            <section className="lg:col-span-3">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Recent thumbnails</h2>
                <Link href="/library" className="text-xs text-muted-foreground hover:text-primary">View library →</Link>
              </div>
              {results.length === 0 ? (
                <EmptyState icon={<Images />} title="No thumbnails imported yet">
                  After generating in ChatGPT, import the image in the Studio or Library.
                </EmptyState>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {results.slice(0, 6).map((r) => (
                    <Link key={r.id} href={`/library?open=${r.id}`} className="group overflow-hidden rounded-xl border bg-panel transition hover:border-primary/40">
                      <div className="aspect-video overflow-hidden bg-black">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={r.url} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                      </div>
                      <div className="flex items-center justify-between gap-2 p-2.5">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-medium" dir="auto">{r.concept || "Untitled"}</div>
                          <div className="truncate text-[11px] text-muted-foreground">{creatorById.get(r.creatorId)?.name}</div>
                        </div>
                        <Badge tone={r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : r.status === "revision" ? "warning" : "outline"}>{labelOf(RESULT_STATUSES, r.status)}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
            <section className="space-y-6 lg:col-span-2">
              <div>
                <h2 className="mb-3 text-sm font-semibold">Project history</h2>
                <Card className="divide-y">
                  {projects.length === 0 && <div className="p-4 text-sm text-muted-foreground">No projects yet.</div>}
                  {projects.map((p) => {
                    const c = creatorById.get(p.creatorId);
                    return (
                      <Link key={p.id} href={`/studio?project=${p.id}`} className="flex items-center gap-3 p-3 transition hover:bg-white/[0.02]">
                        <CreatorAvatar name={c?.name ?? "?"} url={c?.avatarUrl} color={c?.primaryColor} size={32} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm" dir="auto">{p.title || p.concept || "Untitled project"}</div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {c?.name} · {p.presetId ? presetById.get(p.presetId)?.name : "No preset"} · {timeAgo(p.updatedAt)}
                          </div>
                        </div>
                        {p.resultCount > 0 && <Badge tone="primary">{p.resultCount}</Badge>}
                      </Link>
                    );
                  })}
                </Card>
              </div>
              <div>
                <h2 className="mb-3 text-sm font-semibold">Creators</h2>
                <div className="space-y-2">
                  {creators.slice(0, 5).map((c) => (
                    <Link key={c.id} href={`/creators/edit?id=${c.id}`} className="panel flex items-center gap-3 p-3 transition hover:border-primary/40">
                      <CreatorAvatar name={c.name} url={c.avatarUrl} color={c.primaryColor} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{c.name}</div>
                        <div className="truncate text-[11px] text-muted-foreground" dir="auto">{c.channelName}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-muted-foreground">Style DNA</div>
                        <div className="text-xs font-medium tabular-nums">{dnaCompleteness(c.styleDna)}%</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
