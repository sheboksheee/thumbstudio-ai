"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { getSettings, listAssets, listCreators, listPresets, listProjects, listResults } from "./store";

/** Live snapshot of the whole local library; re-renders on every change. */
export function useAppData() {
  return useLiveQuery(async () => {
    const [creators, presets, assets, projects, results, settings] = await Promise.all([
      listCreators(), listPresets(), listAssets(), listProjects(), listResults(), getSettings(),
    ]);
    return { creators, presets, assets, projects, results, settings };
  }, []);
}

export type AppData = NonNullable<ReturnType<typeof useAppData>>;

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
