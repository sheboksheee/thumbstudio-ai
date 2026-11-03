import { describe, expect, it } from "vitest";
import { compilePrompt, detectScript, orderAssets, toRules, type CompileInput } from "@/lib/prompt/compiler";
import { emptyDna, parseDna } from "@/lib/style-dna";
import { BUILT_IN_PRESETS } from "@/lib/presets";

function base(over: Partial<CompileInput["options"]> = {}): CompileInput {
  const dna = emptyDna();
  dna.colorGrading = { rules: "Teal shadows\nWarm skin", locked: true };
  dna.composition = { rules: "Two-element layout", locked: false };
  dna.constraints = { rules: "Never cover the face", locked: true };
  dna.faceTreatment = { rules: "Exaggerated reactions", locked: true };
  return {
    creator: {
      name: "Test Creator",
      channelName: "TEST FC",
      primaryColor: "#22d3ee",
      secondaryColor: "#000000",
      accentColor: "#ffffff",
      negative: "No emoji",
      masterPrompt: "{{channel}} premium look",
      styleDna: dna,
    },
    preset: BUILT_IN_PRESETS[0],
    assets: [
      { id: "r1", kind: "reference", label: "Ref", priority: 1 },
      { id: "f2", kind: "face", label: "Side", priority: 2 },
      { id: "f1", kind: "face", label: "Front", priority: 1 },
      { id: "l1", kind: "logo", label: "Logo", priority: 2 },
    ],
    options: {
      concept: "I opened 50 packs",
      textMode: "none",
      headline: "",
      subjectPosition: "left",
      subjectScale: "large",
      colorMood: "creator",
      referencePriority: "balanced",
      variation: "safe",
      ...over,
    },
  };
}

describe("prompt compiler", () => {
  it("is deterministic", () => {
    expect(compilePrompt(base()).prompt).toBe(compilePrompt(base()).prompt);
  });

  it("orders sections by priority", () => {
    const p = compilePrompt(base()).prompt;
    const order = ["IDENTITY", "ATTACHED ORIGINAL ASSETS", "STYLE DNA", "CREATIVE DIRECTION", "COMPOSITION", "QUALITY", "NEGATIVE"].map((s) => p.indexOf(s));
    expect(order.every((v) => v > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("orders attachments identity-first and numbers them", () => {
    const out = compilePrompt(base());
    expect(out.attachments.map((a) => a.assetId)).toEqual(["f1", "f2", "l1", "r1"]);
    expect(out.prompt).toContain("Image 1 (Front): PRIMARY IDENTITY");
    expect(out.manifest).toContain("1. Front [face]");
  });

  it("keeps identity and locked DNA across all variations", () => {
    for (const v of ["safe", "creative", "experimental"] as const) {
      const p = compilePrompt(base({ variation: v })).prompt;
      expect(p).toContain("exact likeness");
      expect(p).toContain("Teal shadows");
      expect(p).toContain("Hard rule: Never cover the face");
    }
    const exp = compilePrompt(base({ variation: "experimental" })).prompt;
    expect(exp).toContain("[LOCKED — mandatory in every variation]");
    expect(exp).toContain("[optional inspiration]");
  });

  it("variations produce different prompts", () => {
    const a = compilePrompt(base({ variation: "safe" })).prompt;
    const b = compilePrompt(base({ variation: "creative" })).prompt;
    const c = compilePrompt(base({ variation: "experimental" })).prompt;
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it("fills preset template tokens and master prompt", () => {
    const p = compilePrompt(base()).prompt;
    expect(p).toContain('Test Creator reacting to a legendary pack pull for the video: "I opened 50 packs"');
    expect(p).toContain("TEST FC premium look");
    expect(p).not.toMatch(/\{\{\w+\}\}/);
  });

  it("handles Arabic headlines with RTL rules", () => {
    const p = compilePrompt(base({ textMode: "render", headline: "أقوى بكج", concept: "فتحت ٥٠ بكج" })).prompt;
    expect(p).toContain('"أقوى بكج"');
    expect(p).toContain("right-to-left");
    expect(p).toContain("written in Arabic");
  });

  it("text modes", () => {
    expect(compilePrompt(base({ textMode: "none" })).prompt).toContain("NO text");
    expect(compilePrompt(base({ textMode: "space" })).prompt).toContain("Leave a clean, uncluttered area on the right side");
    const w = compilePrompt(base({ textMode: "render", headline: "" }));
    expect(w.warnings.some((x) => x.includes("headline is empty"))).toBe(true);
  });

  it("warns when no identity photo is attached", () => {
    const input = base();
    input.assets = input.assets.filter((a) => a.kind !== "face");
    const out = compilePrompt(input);
    expect(out.warnings.some((w) => w.includes("No face"))).toBe(true);
    expect(out.prompt).toContain("do not invent a specific real person");
  });

  it("always targets 16:9", () => {
    expect(compilePrompt(base()).prompt).toContain("16:9");
  });
});

describe("helpers", () => {
  it("detectScript", () => {
    expect(detectScript("hello")).toBe("latin");
    expect(detectScript("مرحبا")).toBe("arabic");
    expect(detectScript("FC مرحبا")).toBe("mixed");
    expect(detectScript("123")).toBe("none");
  });
  it("toRules splits lines and strips bullets", () => {
    expect(toRules("- one\n2. two\n\n• three; four")).toEqual(["one", "two", "three", "four"]);
  });
  it("orderAssets is stable", () => {
    const list = [{ id: "a", kind: "reference" }, { id: "b", kind: "reference" }];
    expect(orderAssets(list).map((x) => x.id)).toEqual(["a", "b"]);
  });
  it("parseDna tolerates garbage", () => {
    expect(parseDna("not json").colorGrading.rules).toBe("");
    expect(parseDna('{"lighting":{"rules":"x","locked":true}}').lighting).toEqual({ rules: "x", locked: true });
  });
});
