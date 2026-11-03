# ThumbStudio AI

A web app for art-directing high-end YouTube thumbnails for multiple creators, built around **ChatGPT Manual Mode**.

> **بالعربي:** افتح لينك الموقع من أي متصفح وابدأ على طول. مفيش تسطيب، ومفيش API keys. كل بياناتك (الكريتورز والصور والثمبنيلات) بتتحفظ جوه المتصفح على جهازك بس. خد **Backup** من الإعدادات كل فترة، عشان لو مسحت بيانات المتصفح أو فتحت من جهاز تاني.

ThumbStudio does **not** call the OpenAI API, ask for API keys, automate a browser or use unofficial ChatGPT endpoints. It:

1. stores each creator's identity photography, reference thumbnails and creative rules (Style DNA),
2. compiles a structured, deterministic image prompt from those rules plus your video concept and preset,
3. copies the prompt, opens `chatgpt.com` in a new tab and shows a numbered checklist of the images **you** attach,
4. lets you import the generated thumbnail back into a Library for review, revisions, comparison and 1280×720 export.

No image analysis is faked. Every style rule is written by you, and the prompt compiler is a plain template engine (`src/lib/prompt/compiler.ts`).

## Opening the app

**Once deployed, just open the GitHub Pages link** (for example `https://<your-username>.github.io/thumbstudio-ai/`) in Chrome, Safari, Arc or Edge. No installation is needed.

On first visit the app loads three **fictional** example creators with clearly labelled placeholder images, the six built-in EA FC presets, one custom preset and one example project.

Tip: in Chrome or Edge, use **⋮ → Cast, save and share → Install page as app** to give it its own window and Dock icon.

## Where your data lives

Everything is stored **in your browser** (IndexedDB) on the device you're using. Nothing is uploaded anywhere: GitHub only hosts the app's code, never your images.

- A different browser or computer starts empty. To move your library, use **Settings → Data → Download full backup**, then **Restore from backup** on the other device.
- Clearing the browser's site data deletes the library, so download a backup regularly.
- Don't use private / incognito windows; they discard data when closed.

## Deploying to GitHub Pages

1. Push this folder to a GitHub repository (default branch `main`).
2. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes the site. The link appears in the **Actions** run and under **Settings → Pages**.

The workflow sets the correct base path automatically (`/<repo-name>`, or none for a `<username>.github.io` repository). GitHub Pages on a free account requires a **public** repository.

## The workflow

**Select creator → enter video concept → select preset → attach assets → generate prompt → open ChatGPT → import the result**

1. **Creators.** Create a profile with name, channel, palette, typography, background, retouching, lighting, composition rules, negative instructions and a master prompt. Upload face photos, expression photos, logos, avatars and past thumbnails by drag and drop. Give each image a label, tags, a **priority** (1 = primary to 5 = optional) and a **purpose**; the purpose is quoted in the prompt.
2. **Style DNA.** Fill in up to eleven categories: color grading, composition, subject placement, face treatment, visual hierarchy, lighting, background complexity, depth and effects, text treatment, game or niche assets, and creative constraints. Write one rule per line. **Lock** a category to make it core identity, which is then enforced in every variation.
3. **Studio.** Pick a creator, then write the concept in English or Arabic. Choose a preset, and set the text mode (none, exact headline, or leave space for text), subject position and scale, color mood, background, reference priority and custom notes. Then pick the assets. The compiled prompt updates live, and you can switch between **Safe**, **Creative** and **Experimental** variations or edit the prompt by hand.
4. **Copy Prompt & Open ChatGPT.** This button copies the full prompt, opens ChatGPT in a new tab and saves the project. It also opens a checklist of the images to attach, in numbered order. You can tick each image off, download them all as numbered files, or copy a short asset manifest. **Images are never uploaded automatically.**
5. **Import.** Download or copy the image from ChatGPT, then drop it into the checklist (or press ⌘V / Ctrl+V). It is stored together with its creator, concept, prompt, preset, variation and the snapshot of references used.
6. **Library.** Filter by creator, preset, status, rating or text. Set the approval status, give star ratings and write feedback. You can also:
   - import **revisions** (v2, v3, …),
   - **compare** two thumbnails side by side or with a slider,
   - preview the image with 16:9 safe areas and at real YouTube feed sizes,
   - **export** an exact **1280×720** JPG (kept under 2 MB) or PNG, by crop or letterbox with a chosen anchor.

### Prompt structure (priority order)

1. Creator identity and face preservation
2. Attached original assets (numbered to match the checklist)
3. Creator Style DNA (locked rules tagged as mandatory)
4. Video-specific creative direction
5. Composition and layout
6. Quality and realism (written to avoid a generic "AI look")
7. Negative constraints

Arabic concepts are detected and quoted as they are. Arabic headlines get extra rules for right-to-left text and connected letterforms.

### Built-in presets

Pack Opening · Player Review · Tactical Guide · FUT Champions · Squad Builder · Hero/Icon Reveal

You can edit built-in presets (and restore the originals in **Settings**) or create custom presets, available to all creators or to one only.

## Development

Requires Node.js 20 or 22.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Static export to `out/` |
| `npm run preview` | Serve `out/` locally |
| `npm test` | Prompt compiler and data store tests (Vitest) |
| `npm run typecheck` | TypeScript check |

## Tech stack

Next.js 15 (static export) · TypeScript · Tailwind CSS · shadcn/ui-style components on Radix primitives · Lucide icons · Dexie (IndexedDB) for local persistence · Canvas-based 1280×720 export · Vitest
