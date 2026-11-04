import type { StyleDna } from "./style-dna";
import type { PresetDefaults } from "./presets";

/* ---------- Stored records (IndexedDB) ---------- */

export interface CreatorRecord {
  id: string;
  name: string;
  channelName: string;
  niche: string;
  language: string;
  avatarAssetId: string | null;
  logoAssetId: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  typography: string;
  background: string;
  retouching: string;
  lighting: string;
  compositionRules: string;
  negative: string;
  masterPrompt: string;
  styleDna: StyleDna;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetRecord {
  id: string;
  creatorId: string;
  kind: string;
  label: string;
  tags: string;
  priority: number;
  purpose: string;
  fileId: string;
  originalName: string;
  mime: string;
  width: number;
  height: number;
  sizeBytes: number;
  createdAt: string;
}

export interface PresetRecord {
  id: string;
  slug: string;
  name: string;
  niche: string;
  builtIn: boolean;
  creatorId: string | null;
  description: string;
  objective: string;
  composition: string;
  subjectRules: string;
  background: string;
  textRules: string;
  effects: string;
  template: string;
  defaults: PresetDefaults;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRecord {
  id: string;
  creatorId: string;
  presetId: string | null;
  title: string;
  concept: string;
  textMode: string;
  headline: string;
  subjectPosition: string;
  subjectScale: string;
  colorMood: string;
  colorMoodCustom: string;
  backgroundDirection: string;
  referencePriority: string;
  customInstructions: string;
  variation: string;
  promptStyle?: string;
  sceneId?: string;
  cardMode?: string;
  selectedAssetIds: string[];
  compiledPrompt: string;
  createdAt: string;
  updatedAt: string;
}

export type ReferenceSnapshot = { id: string; label: string; kind: string; role: string; purpose?: string };

export interface ResultRecord {
  id: string;
  creatorId: string;
  projectId: string | null;
  presetId: string | null;
  parentId: string | null;
  version: number;
  concept: string;
  prompt: string;
  variation: string;
  references: ReferenceSnapshot[];
  fileId: string;
  originalName: string;
  mime: string;
  width: number;
  height: number;
  feedback: string;
  status: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface FileRecord {
  id: string;
  blob: Blob;
}

export interface SettingRecord {
  key: string;
  value: string;
}

/* ---------- View models used by the UI ---------- */

export type AssetDTO = AssetRecord & { url: string };
export type CreatorDTO = CreatorRecord & { avatarUrl: string | null; logoUrl: string | null };
export type CreatorWithCounts = CreatorDTO & { counts: { face: number; reference: number; total: number } };
export type PresetDTO = PresetRecord;
export type ProjectDTO = ProjectRecord;
export type ProjectWithCount = ProjectRecord & { resultCount: number };
export type ResultDTO = ResultRecord & { url: string };

export interface AppSettings {
  chatgptUrl: string;
  defaultVariation: string;
  defaultReferencePriority: string;
  exportFormat: string;
  exportFit: string;
  promptStyle: string;
  gameName: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  chatgptUrl: "https://chatgpt.com",
  defaultVariation: "safe",
  defaultReferencePriority: "balanced",
  exportFormat: "jpg",
  exportFit: "cover",
  promptStyle: "quick",
  gameName: "EA FC 27",
};
