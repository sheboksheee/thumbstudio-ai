import { describe, expect, it } from "vitest";
import { compilePrompt, detectScript, orderAssets, toRules, type CompileInput } from "@/lib/prompt/compiler";
import { emptyDna, parseDna } from "@/lib/style-dna";
import { detectEmotion, detectScenes } from "@/lib/prompt/scenes";
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
      promptStyle: "detailed",
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

describe("concise brief (default)", () => {
  const concise = (over: Partial<CompileInput["options"]> = {}, assets?: CompileInput["assets"]) => {
    const input = base({ promptStyle: "concise", gameName: "EA FC 27", ...over });
    input.preset = null;
    if (assets) input.assets = assets;
    return compilePrompt(input);
  };

  it("is short, concept-first and deterministic", () => {
    const a = concise({ concept: "I opened 50 packs" });
    expect(a.prompt).toBe(concise({ concept: "I opened 50 packs" }).prompt);
    expect(a.stats.words).toBeLessThan(400);
    expect(a.prompt.indexOf("Video idea")).toBeLessThan(a.prompt.indexOf("Composition"));
    expect(a.prompt).toContain("an EA FC 27 video");
  });

  it("picks an on-topic EA FC scene from the concept (Arabic and English)", () => {
    expect(concise({ concept: "فتحت ٥٠ بكج أيقونة" }).prompt).toContain("pack-opening tunnel");
    expect(concise({ concept: "Best custom tactics for EA FC 27" }).prompt).toContain("tactics board");
    expect(concise({ concept: "طورت الكرت ده" }).prompt).toContain("before and after");
  });

  it("explicit video type wins over detection", () => {
    expect(concise({ concept: "فتحت بكجات", sceneId: "coins" }).prompt).toContain("FUT coins");
  });

  it("describes a card attached as 'Other asset' as the hero item, not as the face", () => {
    const out = concise({ concept: "How have I not played with this card?" }, [
      { id: "f", kind: "face", label: "me", priority: 1 },
      { id: "c", kind: "asset", label: "card", priority: 3 },
    ]);
    expect(out.prompt).toContain("1. photo of Test Creator");
    expect(out.prompt).toContain("2. the card / item for this video");
    expect(out.warnings.some((w) => w.includes("Face/Expression"))).toBe(false);
  });

  it("warns when several images are marked as the face", () => {
    const out = concise({}, [
      { id: "f", kind: "face", label: "me", priority: 1 },
      { id: "c", kind: "face", label: "card", priority: 2 },
    ]);
    expect(out.warnings.some((w) => w.includes("Face/Expression"))).toBe(true);
  });

  it("keeps identity and text rules", () => {
    const p = concise({ textMode: "render", headline: "أقوى بكج" }).prompt;
    expect(p).toContain("keep this exact face");
    expect(p).toContain("right-to-left");
    expect(concise({ textMode: "none" }).prompt).toContain("no additional text");
  });
});

describe("scene + emotion detection", () => {
  it("detects topics", () => {
    expect(detectScenes("FUT Champions rewards")[0].id).toBe("champions");
    expect(detectScenes("تشكيلة بميزانية ١٠٠ الف")[0].id).toBe("squad");
    expect(detectScenes("random words")).toHaveLength(0);
  });
  it("detects emotion", () => {
    expect(detectEmotion("مش مصدق اللي حصل")).toContain("shocked");
    expect(detectEmotion("خسرت كل الكوينز")).toContain("frustrated");
  });
});
