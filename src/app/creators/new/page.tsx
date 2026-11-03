"use client";
import { PageHeader } from "@/components/sidebar";
import { CreatorEditor } from "@/components/creators/creator-editor";

export default function NewCreatorPage() {
  return (
    <div>
      <PageHeader title="New creator" subtitle="Start with the basics — you can add photography, references and Style DNA next." />
      <div className="px-8 py-7">
        <CreatorEditor creator={null} assets={[]} presets={[]} />
      </div>
    </div>
  );
}
