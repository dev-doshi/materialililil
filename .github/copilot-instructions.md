# materialililil – AI Coding Agent Instructions

## Architecture Overview

**Hybrid Electron + Next.js Desktop App**
- Next.js 16 (App Router) with `output: "export"` → static site served by Electron
- Electron main process: `electron/main.js` (BrowserWindow, auto-updater, IPC)
- Preload bridge: `electron/preload.js` (context isolation, sandboxed API)
- Dev mode: `pnpm dev:electron` runs Next.js dev server + Electron concurrently
- Production: Next.js builds to `out/`, electron-serve loads it, electron-builder packages for all platforms

**State Management: Zustand with Undo/Redo**
- Single store: `src/store/appStore.ts` (666 lines) — centralized state for images, maps, UI, history
- History system: `MAX_HISTORY = 30`, saves snapshots on param changes, supports undo/redo
- Toast notifications: `toasts` array with `id`, `message`, `type`, `timestamp`
- Use selectors for performance: `const x = useAppStore(s => s.x)` (not `useAppStore()`)

**Map Generation Engine**
- 13 PBR map types (`src/types/maps.ts`): Height, Normal, Diffuse, AO, Roughness, Metallic, etc.
- Dependency graph (`MAP_DEPENDENCIES`): Height → Normal → related maps cascade auto-regenerate
- Generator functions: `src/engine/mapGenerators.ts` — each map type has a dedicated algorithm
- Image processing primitives: `src/engine/algorithms.ts` (Sobel, Gaussian blur, Canny edge, etc.)
- Post-processing pipeline: `applyCommonParams()` applies intensity, levels, brightness, contrast, blur, sharpen, invert to every map

**3D Rendering**
- React Three Fiber + Drei: `src/components/Viewport3D.tsx`
- Dynamic import (SSR disabled): `dynamic(() => import('@/components/Viewport3D'), { ssr: false })`
- PBR material preview on sphere/cube/plane with real-time map updates

## Development Workflows

**Essential Commands**
```bash
pnpm dev             # Next.js dev server (web-only)
pnpm dev:electron    # Next.js + Electron (hot reload both)
pnpm build           # Next.js static export to ./out
pnpm build:electron  # Full Electron build → ./dist (macOS/Windows/Linux)
pnpm lint            # ESLint check
```

**Build Requirements**
- Node.js 20+, pnpm 9+, no pnpm-workspace.yaml (single package, not monorepo)
- Electron requires `postinstall` hook: `electron-builder install-app-deps`

**Release Process**
1. Update version in `package.json`, `CHANGELOG.md`, `TERMS_OF_SERVICE.md`, `PRIVACY_POLICY.md`
2. Update `TOS_VERSION` / `PRIVACY_VERSION` constants in `src/components/LegalNotice.tsx`
3. Commit changes, tag with `git tag -a vX.Y.Z -m "vX.Y.Z"`, push tag
4. GitHub Actions (`.github/workflows/release.yml`) auto-builds all platforms, publishes to GitHub Releases
5. Creates stable-named artifacts (e.g., `materialililil-universal.dmg`) for auto-updating README links

## Code Conventions

**Brand Identity**
- Primary accent: `--accent: #f59e0b` (amber-500), hover: `#fbbf24` (amber-400)
- Dark theme: `--background: #0a0a0c`, `--foreground: #e8e8ec`
- Fonts: Space Grotesk (UI), JetBrains Mono (code/monospace) — loaded via `next/font/google`

**Component Patterns**
- All pages/components use `'use client'` (Next.js App Router client components)
- Map selection: `selectedMap` state, keyboard shortcuts `1-9` select by index
- Panel toggles: `leftPanelOpen`, `rightPanelOpen` with `⌘[` / `⌘]` shortcuts
- Dynamic imports for heavy components (3D viewer, chart libraries)

**Storage & Persistence**
- LocalStorage keys prefix: `materialililil-` (e.g., `materialililil-project`, `materialililil-legal-accepted`)
- Project save/load: JSON serialization of `sourceImage` (dataURL) + all map params
- Legal acceptance tracking: stores ToS/Privacy version + timestamp

**File Structure**
```
src/
  app/              # Next.js App Router (page.tsx, layout.tsx, globals.css)
  components/       # 27 React components (TopBar, MapList, Viewport2D/3D, etc.)
  engine/           # Core algorithms (algorithms.ts, mapGenerators.ts, professionalTools.ts)
  store/            # Zustand state (appStore.ts)
  types/            # TypeScript types (maps.ts — MapType, MapParams, dependencies)
  lib/              # Utilities (utils.ts — cn() for class merging)
electron/           # Main/preload processes
```

## Critical Implementation Details

**Map Generation Flow**
1. User uploads image → `setSourceImage()` → stores `sourceImageData` (ImageData)
2. User clicks "Generate" → `generateSingleMap(type)` or `generateAllMaps()`
3. Lookup generator in `MAP_GENERATORS` object, run with params → returns ImageData
4. Convert to dataURL, store in `maps[type]`, trigger dependent map regeneration if enabled
5. Cascade: Height changes → auto-regenerate Normal → auto-regenerate dependent maps

**Auto-Update System**
- `electron-updater` checks GitHub Releases every 30 min (dev mode skipped)
- IPC events: `updater:status` with `{ status, version, percent, message }`
- User sees dialog on download complete, clicks "Restart Now" → `autoUpdater.quitAndInstall()`

**Legal/ToS Mechanism**
- `src/components/LegalNotice.tsx`: Modal shown on first launch or version change
- Tracks `TOS_VERSION` and `PRIVACY_VERSION` constants, compares to localStorage
- Blocks app usage until user accepts ("I Agree" button)

**Performance Optimizations**
- Map generation runs synchronously on main thread (no Web Workers yet)
- Large images (>2048px) show performance warning
- History saved only on manual param changes (not live updates)
- 3D viewer dynamically imported to reduce initial bundle size

## Common Mistakes to Avoid

- **Do NOT** add `pnpm-workspace.yaml` — causes build errors (not a monorepo)
- **Do NOT** use `next/image` with remote URLs — `images: { unoptimized: true }` for Electron
- **Do NOT** access Electron APIs directly in renderer — use `window.electronAPI` from preload
- **Do NOT** mutate Zustand state directly — use `set()` function in actions
- **Do NOT** forget to update ToS/Privacy versions when those docs change

## Testing & Debugging

- Check Electron logs: main process crashes show in terminal, renderer in DevTools
- Map generation errors: caught in try/catch, show toast notification
- Build artifacts: `dist/` for Electron builds, `out/` for Next.js static export
- GitHub Actions logs: workflow builds for 3 platforms in parallel (10-15 min)

## External Dependencies

- Three.js 0.182 + @react-three/fiber 9 + @react-three/drei 10 (3D rendering)
- fflate (ZIP compression), file-saver (download trigger)
- Recharts 3 (histogram charts), react-dropzone 15 (drag-drop upload)
- electron-updater 6 (GitHub Releases auto-update)
- All licenses documented in `THIRD_PARTY_LICENSES.md` (MIT-compatible)
