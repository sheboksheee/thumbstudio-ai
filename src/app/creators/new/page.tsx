"use client";
import { PageHeader } from "@/components/sidebar";
import { CreatorEditor } from "@/components/creators/creator-editor";

export default function NewCreatorPage() {
  return (
    <div>
      <PageHeader title="كريتور جديد" subtitle="الاسم والألوان بس — وبعدها ترفع صورة الوش." />
      <div className="px-4 py-5 md:px-8 md:py-7">
        <CreatorEditor creator={null} assets={[]} presets={[]} />
      </div>
    </div>
  );
}
