"use client";
import { useAppData } from "@/lib/hooks";
import { Loading } from "@/components/data-boot";
import { PageHeader } from "@/components/sidebar";
import { SettingsView } from "@/components/settings/settings-view";

export default function SettingsPage() {
  const data = useAppData();
  return (
    <div>
      <PageHeader title="Settings" subtitle="Presets, workflow defaults and your local data." />
      {!data ? <Loading /> : <SettingsView settings={data.settings} presets={data.presets} creators={data.creators.map((c) => ({ id: c.id, name: c.name }))} />}
    </div>
  );
}
