"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAppData } from "@/lib/hooks";
import { Loading } from "@/components/data-boot";
import { Library } from "@/components/library/library";

function LibraryPage() {
  const sp = useSearchParams();
  const data = useAppData();
  if (!data) return <Loading />;
  return (
    <Library
      results={data.results}
      creators={data.creators.map((c) => ({ id: c.id, name: c.name, channelName: c.channelName, avatarUrl: c.avatarUrl, primaryColor: c.primaryColor }))}
      presets={data.presets.map((p) => ({ id: p.id, name: p.name }))}
      projects={data.projects.map((p) => ({ id: p.id, creatorId: p.creatorId, title: p.title || p.concept, concept: p.concept, presetId: p.presetId, compiledPrompt: p.compiledPrompt, variation: p.variation }))}
      settings={data.settings}
      initialOpen={sp.get("open") ?? undefined}
      initialStatus={sp.get("status") ?? undefined}
      initialCreator={sp.get("creator") ?? undefined}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <LibraryPage />
    </Suspense>
  );
}
