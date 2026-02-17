# Changelog

All notable changes to materialililil will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
