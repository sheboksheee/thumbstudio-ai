/**
 * ThumbStudio AI — local data store.
 *
 * Everything lives in this browser's IndexedDB (via Dexie): records and image
 * blobs. Nothing is sent to any server. Use Settings → Backup to move data
 * between browsers or machines.
 */
import Dexie, { type EntityTable } from "dexie";
import type {
  AppSettings, AssetDTO, AssetRecord, CreatorRecord, CreatorWithCounts, FileRecord, PresetRecord,
  ProjectRecord, ProjectWithCount, ReferenceSnapshot, ResultDTO, ResultRecord, SettingRecord,
} from "./types";
import { DEFAULT_SETTINGS } from "./types";
import { BUILT_IN_PRESETS, slugify } from "./presets";
import { emptyDna, parseDna, type StyleDna } from "./style-dna";
import { ASSET_KINDS, RESULT_STATUSES } from "./options";

class ThumbDB extends Dexie {
  creators!: EntityTable<CreatorRecord, "id">;
  assets!: EntityTable<AssetRecord, "id">;
  presets!: EntityTable<PresetRecord, "id">;
  projects!: EntityTable<ProjectRecord, "id">;
  results!: EntityTable<ResultRecord, "id">;
  files!: EntityTable<FileRecord, "id">;
  settings!: EntityTable<SettingRecord, "key">;

  constructor() {
    super("thumbstudio-ai");
    this.version(1).stores({
      creators: "id, updatedAt",
      assets: "id, creatorId, kind",
      presets: "id, &slug, creatorId",
      projects: "id, creatorId, updatedAt",
      results: "id, creatorId, projectId, parentId, createdAt",
      files: "id",
      settings: "key",
    });
  }
}

export const db = new ThumbDB();

export class StoreError extends Error {}

const now = () => new Date().toISOString();
export const newId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`).replace(/-/g, "").slice(0, 24);

/* ------------------------------------------------------------------ files */

const urlCache = new Map<string, string>();

/** Object URL for a stored blob (cached for the session). */
async function fileUrl(fileId: string): Promise<string> {
  const hit = urlCache.get(fileId);
  if (hit) return hit;
  const rec = await db.files.get(fileId);
  if (!rec) return "";
  const url = typeof URL !== "undefined" && URL.createObjectURL ? URL.createObjectURL(rec.blob) : "";
  urlCache.set(fileId, url);
  return url;
}

async function deleteFile(fileId: string | null | undefined) {
  if (!fileId) return;
  await db.files.delete(fileId);
  const u = urlCache.get(fileId);
  if (u && typeof URL !== "undefined" && URL.revokeObjectURL) URL.revokeObjectURL(u);
  urlCache.delete(fileId);
}

export const ACCEPTED_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"];
export const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

export async function imageSize(blob: Blob): Promise<{ width: number; height: number }> {
  try {
    if (typeof createImageBitmap === "function") {
      const bmp = await createImageBitmap(blob);
      const out = { width: bmp.width, height: bmp.height };
      bmp.close?.();
      return out;
    }
  } catch {
    throw new StoreError("The file could not be read as an image.");
  }
  return { width: 0, height: 0 };
}

async function storeImage(file: Blob, name: string) {
  if (!ACCEPTED_MIME.includes(file.type)) throw new StoreError(`Unsupported file type "${file.type || "unknown"}". Use PNG, JPG, WEBP, GIF or AVIF.`);
  if (file.size > MAX_UPLOAD_BYTES) throw new StoreError("File is larger than 30 MB.");
  const { width, height } = await imageSize(file);
  const fileId = newId();
  await db.files.add({ id: fileId, blob: file });
  return { fileId, mime: file.type, width, height, sizeBytes: file.size, originalName: name };
}

/* ---------------------------------------------------------------- creators */

export type CreatorInput = Partial<Omit<CreatorRecord, "id" | "createdAt" | "updatedAt">>;

const CREATOR_DEFAULTS: Omit<CreatorRecord, "id" | "createdAt" | "updatedAt" | "styleDna"> = {
  name: "",
  channelName: "",
  niche: "",
  language: "en",
  avatarAssetId: null,
  logoAssetId: null,
  primaryColor: "#22d3ee",
  secondaryColor: "#0f172a",
  accentColor: "#f8fafc",
  typography: "",
  background: "",
  retouching: "",
  lighting: "",
  compositionRules: "",
  negative: "",
  masterPrompt: "",
  notes: "",
};

export async function listCreators(): Promise<CreatorWithCounts[]> {
  const [creators, assets] = await Promise.all([db.creators.orderBy("updatedAt").reverse().toArray(), db.assets.toArray()]);
  return Promise.all(
    creators.map(async (c) => {
      const mine = assets.filter((a) => a.creatorId === c.id);
      return {
        ...(await creatorDTO(c, mine)),
        counts: {
          face: mine.filter((a) => a.kind === "face" || a.kind === "expression").length,
          reference: mine.filter((a) => a.kind === "reference").length,
          total: mine.length,
        },
      };
    }),
  );
}

async function creatorDTO(c: CreatorRecord, assets: AssetRecord[]) {
  const avatar = assets.find((a) => a.id === c.avatarAssetId) ?? assets.find((a) => a.kind === "avatar");
  const logo = assets.find((a) => a.id === c.logoAssetId) ?? assets.find((a) => a.kind === "logo");
  return {
    ...c,
    styleDna: parseDna(JSON.stringify(c.styleDna ?? {})),
    avatarUrl: avatar ? await fileUrl(avatar.fileId) : null,
    logoUrl: logo ? await fileUrl(logo.fileId) : null,
  };
}

export async function getCreatorFull(id: string) {
  const c = await db.creators.get(id);
  if (!c) return null;
  const assets = (await db.assets.where("creatorId").equals(id).toArray()).sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt));
  return { creator: await creatorDTO(c, assets), assets: await assetDTOs(assets) };
}

export async function createCreator(input: CreatorInput & { styleDna?: StyleDna }) {
  const name = String(input.name ?? "").trim();
  if (!name) throw new StoreError("Creator name is required");
  const rec: CreatorRecord = {
    ...CREATOR_DEFAULTS,
    ...input,
    id: newId(),
    name,
    channelName: String(input.channelName || name).trim(),
    styleDna: input.styleDna ?? emptyDna(),
    createdAt: now(),
    updatedAt: now(),
  };
  await db.creators.add(rec);
  return rec;
}

export async function updateCreator(id: string, input: CreatorInput & { styleDna?: StyleDna }) {
  const data: Partial<CreatorRecord> = { ...input, updatedAt: now() };
  if (input.styleDna) data.styleDna = parseDna(JSON.stringify(input.styleDna));
  const n = await db.creators.update(id, data);
  if (!n && !(await db.creators.get(id))) throw new StoreError("Creator not found");
}

export async function deleteCreator(id: string) {
  await db.transaction("rw", [db.creators, db.assets, db.presets, db.projects, db.results, db.files], async () => {
    const assets = await db.assets.where("creatorId").equals(id).toArray();
    const results = await db.results.where("creatorId").equals(id).toArray();
    await Promise.all([...assets, ...results].map((x) => deleteFile(x.fileId)));
    await db.assets.where("creatorId").equals(id).delete();
    await db.results.where("creatorId").equals(id).delete();
    await db.projects.where("creatorId").equals(id).delete();
    await db.presets.where("creatorId").equals(id).delete();
    await db.creators.delete(id);
  });
}

/* ------------------------------------------------------------------ assets */

async function assetDTOs(list: AssetRecord[]): Promise<AssetDTO[]> {
  return Promise.all(list.map(async (a) => ({ ...a, url: await fileUrl(a.fileId) })));
}

export async function listAssets(): Promise<AssetDTO[]> {
  const list = (await db.assets.toArray()).sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt));
  return assetDTOs(list);
}

export async function uploadAssets(creatorId: string, kind: string, files: File[]) {
  if (!ASSET_KINDS.some((k) => k.value === kind)) throw new StoreError("Unknown asset kind");
  const creator = await db.creators.get(creatorId);
  if (!creator) throw new StoreError("Creator not found");
  const created: AssetRecord[] = [];
  for (const file of files) {
    const stored = await storeImage(file, file.name);
    const rec: AssetRecord = {
      id: newId(),
      creatorId,
      kind,
      label: file.name.replace(/\.[^.]+$/, "").slice(0, 80),
      tags: "",
      priority: 3,
      purpose: "",
      ...stored,
      createdAt: now(),
    };
    await db.assets.add(rec);
    created.push(rec);
  }
  const patch: Partial<CreatorRecord> = { updatedAt: now() };
  if (kind === "avatar" && !creator.avatarAssetId) patch.avatarAssetId = created[0].id;
  if (kind === "logo" && !creator.logoAssetId) patch.logoAssetId = created[0].id;
  await db.creators.update(creatorId, patch);
  return created;
}

export async function updateAsset(id: string, data: Partial<Pick<AssetRecord, "label" | "tags" | "priority" | "purpose" | "kind">>) {
  const patch = { ...data };
  if (patch.priority !== undefined) patch.priority = Math.min(5, Math.max(1, Number(patch.priority) || 3));
  await db.assets.update(id, patch);
}

export async function deleteAsset(id: string) {
  const a = await db.assets.get(id);
  if (!a) return;
  await db.assets.delete(id);
  await db.creators.where("id").equals(a.creatorId).modify((c) => {
    if (c.avatarAssetId === id) c.avatarAssetId = null;
    if (c.logoAssetId === id) c.logoAssetId = null;
  });
  await deleteFile(a.fileId);
}

/* ----------------------------------------------------------------- presets */

let presetsEnsured = false;

export async function ensureBuiltInPresets(force = false) {
  if (presetsEnsured && !force) return;
  for (const p of BUILT_IN_PRESETS) {
    const existing = await db.presets.where("slug").equals(p.slug).first();
    const data = { ...p, builtIn: true, creatorId: null };
    if (!existing) await db.presets.add({ ...data, id: newId(), createdAt: now(), updatedAt: now() });
    else if (force) await db.presets.update(existing.id, { ...data, updatedAt: now() });
  }
  presetsEnsured = true;
}

export async function listPresets(): Promise<PresetRecord[]> {
  const list = await db.presets.toArray();
  return list.sort((a, b) => Number(b.builtIn) - Number(a.builtIn) || a.name.localeCompare(b.name));
}

export type PresetInput = Partial<Omit<PresetRecord, "id" | "slug" | "builtIn" | "createdAt" | "updatedAt">>;

export async function createPreset(input: PresetInput) {
  const name = String(input.name ?? "").trim();
  if (!name) throw new StoreError("Preset name is required");
  let slug = slugify(name);
  if (await db.presets.where("slug").equals(slug).first()) slug = `${slug}-${Date.now().toString(36)}`;
  const rec: PresetRecord = {
    niche: "General",
    description: "",
    objective: "",
    composition: "",
    subjectRules: "",
    background: "",
    textRules: "",
    effects: "",
    template: "",
    defaults: {},
    ...input,
    creatorId: input.creatorId || null,
    name,
    slug,
    builtIn: false,
    id: newId(),
    createdAt: now(),
    updatedAt: now(),
  };
  await db.presets.add(rec);
  return rec;
}

export async function updatePreset(id: string, input: PresetInput) {
  const patch: Partial<PresetRecord> = { ...input, updatedAt: now() };
  if ("creatorId" in input) patch.creatorId = input.creatorId || null;
  await db.presets.update(id, patch);
  return (await db.presets.get(id))!;
}

export async function deletePreset(id: string) {
  const p = await db.presets.get(id);
  if (!p) return;
  if (p.builtIn) throw new StoreError("Built-in presets cannot be deleted (you can edit or restore them).");
  await db.presets.delete(id);
  await db.projects.toCollection().modify((pr) => {
    if (pr.presetId === id) pr.presetId = null;
  });
}

/* ---------------------------------------------------------------- projects */

export type ProjectInput = Partial<Omit<ProjectRecord, "id" | "createdAt" | "updatedAt">>;

export async function listProjects(): Promise<ProjectWithCount[]> {
  const [projects, results] = await Promise.all([db.projects.orderBy("updatedAt").reverse().toArray(), db.results.toArray()]);
  return projects.map((p) => ({ ...p, resultCount: results.filter((r) => r.projectId === p.id).length }));
}

export async function saveProject(id: string | null, input: ProjectInput): Promise<ProjectRecord> {
  if (!input.creatorId && !id) throw new StoreError("Select a creator first");
  const title = input.title || (input.concept ?? "").slice(0, 90);
  if (id && (await db.projects.get(id))) {
    await db.projects.update(id, { ...input, title, updatedAt: now() });
    return (await db.projects.get(id))!;
  }
  const rec: ProjectRecord = {
    creatorId: "",
    presetId: null,
    concept: "",
    textMode: "none",
    headline: "",
    subjectPosition: "right",
    subjectScale: "large",
    colorMood: "creator",
    colorMoodCustom: "",
    backgroundDirection: "",
    referencePriority: "balanced",
    customInstructions: "",
    variation: "safe",
    selectedAssetIds: [],
    compiledPrompt: "",
    ...input,
    title,
    id: newId(),
    createdAt: now(),
    updatedAt: now(),
  } as ProjectRecord;
  await db.projects.add(rec);
  return rec;
}

/* ----------------------------------------------------------------- results */

export async function listResults(): Promise<ResultDTO[]> {
  const list = await db.results.orderBy("createdAt").reverse().toArray();
  return Promise.all(list.map(async (r) => ({ ...r, url: await fileUrl(r.fileId) })));
}

export interface ImportInput {
  file: File;
  creatorId?: string;
  projectId?: string | null;
  parentId?: string | null;
  presetId?: string | null;
  concept?: string;
  prompt?: string;
  variation?: string;
  references?: ReferenceSnapshot[];
  feedback?: string;
}

/** Import a thumbnail generated in ChatGPT. Revisions inherit context and join the root's chain. */
export async function importResult(input: ImportInput): Promise<ResultRecord> {
  let { creatorId = "", presetId = null, concept = "", prompt = "", variation = "", references = [] } = input;
  let parentId: string | null = null;
  let version = 1;
  if (input.parentId) {
    const parent = await db.results.get(input.parentId);
    if (!parent) throw new StoreError("Parent result not found");
    creatorId ||= parent.creatorId;
    presetId ||= parent.presetId;
    concept ||= parent.concept;
    prompt ||= parent.prompt;
    variation ||= parent.variation;
    if (!references.length) references = parent.references;
    parentId = parent.parentId ?? parent.id;
    const chain = await db.results.filter((r) => r.id === parentId || r.parentId === parentId).toArray();
    version = Math.max(1, ...chain.map((r) => r.version)) + 1;
  }
  if (!creatorId) throw new StoreError("Choose a creator");
  const stored = await storeImage(input.file, input.file.name || "thumbnail");
  const rec: ResultRecord = {
    id: newId(),
    creatorId,
    projectId: input.projectId ?? null,
    presetId: presetId ?? null,
    parentId,
    version,
    concept,
    prompt,
    variation,
    references,
    ...stored,
    feedback: input.feedback ?? "",
    status: "pending",
    rating: 0,
    createdAt: now(),
    updatedAt: now(),
  };
  await db.results.add(rec);
  return rec;
}

export async function updateResult(id: string, data: Partial<Pick<ResultRecord, "feedback" | "status" | "rating" | "concept">>) {
  const patch = { ...data, updatedAt: now() };
  if (patch.status !== undefined && !RESULT_STATUSES.some((s) => s.value === patch.status)) throw new StoreError("Invalid status");
  if (patch.rating !== undefined) patch.rating = Math.min(5, Math.max(0, Math.round(Number(patch.rating) || 0)));
  await db.results.update(id, patch);
}

export async function deleteResult(id: string) {
  const r = await db.results.get(id);
  if (!r) return;
  // Promote the oldest revision to root so the chain survives.
  const children = (await db.results.where("parentId").equals(id).toArray()).sort((a, b) => a.version - b.version);
  if (children.length) {
    const [first, ...rest] = children;
    await db.results.update(first.id, { parentId: null });
    for (const c of rest) await db.results.update(c.id, { parentId: first.id });
  }
  await db.results.delete(id);
  await deleteFile(r.fileId);
}

export async function getFileBlob(fileId: string) {
  return (await db.files.get(fileId))?.blob ?? null;
}

/* ---------------------------------------------------------------- settings */

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.settings.toArray();
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in out) (out as unknown as Record<string, string>)[r.key] = r.value;
  if (!/^https:\/\//.test(out.chatgptUrl)) out.chatgptUrl = DEFAULT_SETTINGS.chatgptUrl;
  return out;
}

export async function saveSettings(s: Partial<AppSettings>) {
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]) {
    if (s[key] !== undefined) await db.settings.put({ key, value: String(s[key]) });
  }
  return getSettings();
}

/* ------------------------------------------------------------------ backup */

const BACKUP_VERSION = 1;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(url: string): Promise<Blob> {
  return (await fetch(url)).blob();
}

/** Full backup: all records plus every image (base64) in one JSON file. */
export async function exportBackup(): Promise<Blob> {
  const [creators, assets, presets, projects, results, settings, files] = await Promise.all([
    db.creators.toArray(), db.assets.toArray(), db.presets.toArray(), db.projects.toArray(), db.results.toArray(), db.settings.toArray(), db.files.toArray(),
  ]);
  const encoded = await Promise.all(files.map(async (f) => ({ id: f.id, data: await blobToDataUrl(f.blob) })));
  const body = JSON.stringify({ app: "ThumbStudio AI", version: BACKUP_VERSION, exportedAt: now(), creators, assets, presets, projects, results, settings, files: encoded });
  return new Blob([body], { type: "application/json" });
}

/** Replace all local data with a backup file. */
export async function importBackup(file: File) {
  let data: {
    app?: string; creators: CreatorRecord[]; assets: AssetRecord[]; presets: PresetRecord[]; projects: ProjectRecord[];
    results: ResultRecord[]; settings: SettingRecord[]; files: { id: string; data: string }[];
  };
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new StoreError("This is not a valid ThumbStudio backup file.");
  }
  if (data?.app !== "ThumbStudio AI" || !Array.isArray(data.creators)) throw new StoreError("This is not a ThumbStudio backup file.");
  const files = await Promise.all((data.files ?? []).map(async (f) => ({ id: f.id, blob: await dataUrlToBlob(f.data) })));
  await db.transaction("rw", [db.creators, db.assets, db.presets, db.projects, db.results, db.settings, db.files], async () => {
    await Promise.all([db.creators.clear(), db.assets.clear(), db.presets.clear(), db.projects.clear(), db.results.clear(), db.settings.clear(), db.files.clear()]);
    await db.files.bulkAdd(files);
    await db.creators.bulkAdd(data.creators);
    await db.assets.bulkAdd(data.assets ?? []);
    await db.presets.bulkAdd(data.presets ?? []);
    await db.projects.bulkAdd(data.projects ?? []);
    await db.results.bulkAdd(data.results ?? []);
    await db.settings.bulkAdd(data.settings ?? []);
  });
  urlCache.clear();
  presetsEnsured = false;
  await ensureBuiltInPresets();
}

export async function wipeAll() {
  await Promise.all([db.creators.clear(), db.assets.clear(), db.projects.clear(), db.results.clear(), db.files.clear()]);
  await db.presets.filter((p) => !p.builtIn).delete();
  urlCache.clear();
}
