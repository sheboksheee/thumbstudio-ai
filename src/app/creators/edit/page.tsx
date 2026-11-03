"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppData } from "@/lib/hooks";
import { Loading } from "@/components/data-boot";
import { CreatorEditor } from "@/components/creators/creator-editor";
import { EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

function EditCreator() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const tab = params.get("tab") ?? undefined;
  const data = useAppData();
  if (!data) return <Loading />;
  const creator = data.creators.find((c) => c.id === id);
  if (!creator) {
    return (
      <div className="p-8">
        <EmptyState icon={<Users />} title="الكريتور مش موجود" action={<Button asChild variant="secondary"><Link href="/creators">ارجع للكريتورز</Link></Button>}>
          ممكن يكون اتمسح، أو متسجل في متصفح تاني.
        </EmptyState>
      </div>
    );
  }
  const assets = data.assets.filter((a) => a.creatorId === id);
  return (
    <div className="px-4 py-5 md:px-8 md:py-7">
      <CreatorEditor key={id} creator={creator} assets={assets} presets={data.presets.filter((p) => p.creatorId === id)} initialTab={tab} />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <EditCreator />
    </Suspense>
  );
}
