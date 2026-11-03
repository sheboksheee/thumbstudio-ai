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

## طريقة الاستخدام (The workflow)

١. **اختار الكريتور.** أول مرة: من «الكريتورز» اعمل كريتور جديد، وارفع صورة واضحة لوشه في «وش الكريتور».
٢. **اكتب فكرة الفيديو** بالعربي أو الإنجليزي. البرنامج بيتعرّف على نوع الفيديو لوحده (تفتيح بكجات، كرت، تطوير، شامبيونز، تشكيلة، خطط، أيقونات، كوينز…)، وتقدر تختار النوع بنفسك.
٣. **ضيف صورة الكرت أو العنصر** من «ضيف كرت أو عنصر».
٤. **دوس «انسخ وافتح ChatGPT»**: البرومبت بيتنسخ وChatGPT بيتفتح.
٥. **ارفع الصور في ChatGPT بنفس الترتيب** (زرار «احفظ الصور على الجهاز» بيحفظهم على الموبايل)، والصق البرومبت وابعت.
٦. **رجّع التصميم** في الخطوة ٣ (اسحب الصورة، أو اختارها، أو الصقها)، وهتلاقيه في «النتايج» للتقييم والمقارنة والتصدير بمقاس ١٢٨٠×٧٢٠.

The default **short prompt** is concept-first and topic-aware: it detects the video topic from the idea (Arabic + English keywords) and builds an on-theme EA FC scene: pack walkout tunnel, the card as the hero object, tactics board, Champions arena, and so on. It also picks a fitting reaction and describes each attached image by its role. The **detailed** mode (Advanced options) still produces the full structured spec.

### Detailed prompt structure (priority order)

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
