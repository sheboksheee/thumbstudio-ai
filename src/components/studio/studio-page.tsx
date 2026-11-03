"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAppData } from "@/lib/hooks";
import { Loading } from "@/components/data-boot";
import { Studio } from "./studio";

function Inner() {
  const params = useSearchParams();
  const data = useAppData();
  if (!data) return <Loading />;
  return (
    <Studio
      creators={data.creators}
      presets={data.presets}
      assets={data.assets}
      projects={data.projects}
      settings={data.settings}
      projectParam={params.get("project") ?? undefined}
      creatorParam={params.get("creator") ?? undefined}
    />
  );
}

export function StudioPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Inner />
    </Suspense>
  );
}
