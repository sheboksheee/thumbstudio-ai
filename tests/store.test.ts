import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createCreator, db, deleteAsset, deleteCreator, deletePreset, deleteResult, ensureBuiltInPresets, getCreatorFull,
  importResult, listCreators, listPresets, listResults, saveProject, updateCreator, updateResult, uploadAssets,
} from "@/lib/store";

const png = (name = "a.png") => new File([new Uint8Array([137, 80, 78, 71])], name, { type: "image/png" });

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe("store", () => {
  it("creates and updates creators", async () => {
    const c = await createCreator({ name: "  Alex  " });
    expect(c.name).toBe("Alex");
    expect(c.channelName).toBe("Alex");
    await updateCreator(c.id, { niche: "EA FC" });
    expect((await listCreators())[0].niche).toBe("EA FC");
    await expect(createCreator({ name: " " })).rejects.toThrow(/required/);
  });

  it("uploads assets, sets first logo as default, rejects non-images", async () => {
    const c = await createCreator({ name: "A" });
    await uploadAssets(c.id, "logo", [png("logo.png")]);
    const full = await getCreatorFull(c.id);
    expect(full!.assets).toHaveLength(1);
    expect(full!.creator.logoAssetId).toBe(full!.assets[0].id);
    await expect(uploadAssets(c.id, "face", [new File(["x"], "a.txt", { type: "text/plain" })])).rejects.toThrow(/Unsupported/);
    await deleteAsset(full!.assets[0].id);
    expect((await db.creators.get(c.id))!.logoAssetId).toBeNull();
    expect(await db.files.count()).toBe(0);
  });

  it("keeps revision chains flat and versioned", async () => {
    const c = await createCreator({ name: "A" });
    const v1 = await importResult({ file: png(), creatorId: c.id, concept: "Pack", prompt: "P" });
    const v2 = await importResult({ file: png(), parentId: v1.id });
    const v3 = await importResult({ file: png(), parentId: v2.id });
    expect([v2.version, v3.version]).toEqual([2, 3]);
    expect(v2.parentId).toBe(v1.id);
    expect(v3.parentId).toBe(v1.id);
    expect(v3.concept).toBe("Pack");
    await deleteResult(v1.id);
    const rest = await db.results.toArray();
    const root = rest.find((r) => r.id === v2.id)!;
    expect(root.parentId).toBeNull();
    expect(rest.find((r) => r.id === v3.id)!.parentId).toBe(v2.id);
  });

  it("validates result updates", async () => {
    const c = await createCreator({ name: "A" });
    const r = await importResult({ file: png(), creatorId: c.id });
    await updateResult(r.id, { status: "approved", rating: 9 });
    const [after] = await listResults();
    expect(after.status).toBe("approved");
    expect(after.rating).toBe(5);
    await expect(updateResult(r.id, { status: "nope" })).rejects.toThrow(/Invalid/);
  });

  it("cascades creator deletion", async () => {
    const c = await createCreator({ name: "A" });
    await uploadAssets(c.id, "face", [png()]);
    await saveProject(null, { creatorId: c.id, concept: "x" });
    await importResult({ file: png(), creatorId: c.id });
    await deleteCreator(c.id);
    expect(await db.assets.count()).toBe(0);
    expect(await db.projects.count()).toBe(0);
    expect(await db.results.count()).toBe(0);
    expect(await db.files.count()).toBe(0);
  });

  it("seeds built-in presets once and protects them", async () => {
    await ensureBuiltInPresets(true);
    await ensureBuiltInPresets(true);
    const presets = await listPresets();
    expect(presets.filter((p) => p.builtIn)).toHaveLength(6);
    await expect(deletePreset(presets[0].id)).rejects.toThrow(/Built-in/);
  });

  it("saves and updates projects", async () => {
    const c = await createCreator({ name: "A" });
    const p = await saveProject(null, { creatorId: c.id, concept: "My concept", selectedAssetIds: ["a"] });
    expect(p.title).toBe("My concept");
    const p2 = await saveProject(p.id, { concept: "Changed", variation: "creative" });
    expect(p2.id).toBe(p.id);
    expect(p2.variation).toBe("creative");
    expect(await db.projects.count()).toBe(1);
  });
});
