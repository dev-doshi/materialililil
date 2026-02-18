# Changelog

All notable changes to materialililil will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — 2026-02-18

### Added
- **Project file format (.matlil):** ZIP-based project files containing source image, all generated maps, and full parameter state
- **Native file dialogs:** Save, Save As, Open, and Export all use native OS file pickers in Electron
- **Folder export mode:** Export all maps directly to a folder (Electron only) alongside existing ZIP export
- **Dirty state tracking:** Unsaved changes indicator (amber dot) in title bar and toolbar
- **Window title updates:** Shows current project filename and modification status
- **⌘E keyboard shortcut:** Opens Export modal from anywhere
- **⌘⇧S keyboard shortcut:** Save Project As
- **Reveal in Finder/Explorer:** After exporting, quickly open the output location
- **Export modal accessible from anywhere:** MapList batch actions, QuickGenerate, and keyboard shortcuts can all open the export modal
- **Browser fallback:** All save/export features work in browser mode with standard download dialogs

### Changed
- **"Download" → "Export" terminology:** All UI labels now consistently use "Export" for map output
- **Export modal uses store state:** Any component can trigger the export modal via the centralized store
- **Single map export uses native dialog:** Export individual maps with a file picker instead of auto-downloading
- **Batch actions menu:** "Download All" replaced with "Export All" which opens the full export modal

### Removed
- **file-saver dependency:** Replaced with native Electron IPC file writing and browser Blob URL downloads
- **localStorage-only project save:** Replaced with proper file-based save/load (localStorage used only as crash recovery autosave)
- **Sequential multi-download:** No longer fires 13 individual file downloads — use the export modal instead

## [0.1.4] — 2026-02-17

### Fixed
- **Critical:** Replaced custom `app://` protocol with `loadFile()` for production
  - Fixes `SecurityError: Failed to read 'localStorage'` on app launch
  - Uses native `file://` protocol which has full web storage access
  - Simplest and most reliable approach for serving static files in Electron

## [0.1.3] — 2026-02-17

### Fixed
- **Critical:** Removed Content Security Policy (CSP) that blocked all resources
  - CSP `default-src 'self'` doesn't work with custom `app://` protocol
  - All resources are local/trusted so no CSP is needed

## [0.1.2] — 2026-02-17

### Fixed
- **Critical:** Replaced `electron-serve` with built-in Electron protocol APIs
  - Eliminates runtime dependency packaging issues entirely
  - Uses `protocol.handle()` to serve static files from `out/` directory

### Removed
- `electron-serve` dependency (replaced with built-in Electron APIs)

## [0.1.1] — 2026-02-17

### Fixed
- **Critical:** Moved `electron-serve` to dependencies (was in devDependencies)
  - Fixes "Cannot find module 'electron-serve'" crash on app launch
  - The packaged app now includes all required runtime dependencies

## [0.1.0] — 2026-02-17

### Added
- Initial release as Electron desktop application
- 13 PBR texture map types: Height, Normal, Diffuse, AO, Roughness, Metallic,
  Displacement, Edge, Specular, Emissive, Opacity, Curvature, Smoothness
- Real-time 3D material preview with Three.js
- 2D viewport with pixel inspector
- Grid comparison view for all maps
- 12 built-in material presets (Brick, Wood, Metal, etc.)
- Custom preset save/load
- Per-map parameter controls with 50+ adjustable parameters
- 4-tab interface: Adjust / Generate / Effects / Inspect
- Export to ZIP with presets for Blender, Unity, Unreal Engine, Godot,
  Source Engine, Custom
- ORM channel packing (AO + Roughness + Metallic)
- Multi-resolution export (½×, ¼×, 1×, 2×)
- DirectX/OpenGL normal map convention support
- Before/after comparison slider
- Tiling preview
- Histogram and channel viewer
- Color picker with clipboard copy
- Measurement tool
- Professional tools: frequency separation, edge detection, color balance,
  gradient overlay, noise generator, seam detection, PBR color range
- Map dependency graph with cascade regeneration
- Project save/load (localStorage)
- Undo/redo (30 levels)
- Keyboard shortcuts for all major actions
- Map enable/disable toggles
- PBR validation checks
- Toast notification system
- Auto-update via GitHub Releases
- Privacy Policy (GDPR-compliant)
- Terms of Service with versioning
- Complete third-party license documentation

### Technical
- Built with Next.js 16.1.6 (static export), React 19, Three.js 0.182
- Electron 40 with context isolation and sandbox
- Zustand 5 state management
- Tailwind CSS v4
- Space Grotesk + JetBrains Mono fonts
- MIT licensed
