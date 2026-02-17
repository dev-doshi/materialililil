# materialililil

PBR texture map generator — turn any image into production-ready texture maps.
Runs entirely on your machine. No uploads, no accounts, no servers.

![License](https://img.shields.io/github/license/dev-doshi/materialililil)
![Version](https://img.shields.io/github/v/release/dev-doshi/materialililil)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)

---

## What It Does

Drop in a photo or texture image. materialililil generates 13 PBR texture maps
from it — height, normal, diffuse, ambient occlusion, roughness, metallic,
displacement, edge, specular, emissive, opacity, curvature, and smoothness.

Preview the result on a 3D model in real time. Tweak parameters. Export a ZIP
ready for Blender, Unity, Unreal Engine, Godot, or Source Engine.

Everything runs client-side using your CPU. Nothing leaves your computer.

---

## Installation

### Download (Recommended)

[![Latest Release](https://img.shields.io/github/v/release/dev-doshi/materialililil?label=Download&style=for-the-badge&color=f59e0b)](https://github.com/dev-doshi/materialililil/releases/latest)

**Quick Downloads:**

| Platform | Direct Download |
|----------|-----------------|
| 🍎 **macOS** | [materialililil-universal.dmg](https://github.com/dev-doshi/materialililil/releases/latest/download/materialililil-universal.dmg) |
| 🪟 **Windows** | [materialililil-Setup.exe](https://github.com/dev-doshi/materialililil/releases/latest/download/materialililil-Setup.exe) |
| 🐧 **Linux (AppImage)** | [materialililil.AppImage](https://github.com/dev-doshi/materialililil/releases/latest/download/materialililil.AppImage) |
| 🐧 **Linux (Debian)** | [materialililil.deb](https://github.com/dev-doshi/materialililil/releases/latest/download/materialililil.deb) |

> Links automatically point to the latest version. Downloads start immediately.

#### macOS

1. Download the `.dmg` file
2. Open it and drag **materialililil** to your Applications folder
3. On first launch, macOS may show a security warning — go to
   **System Settings → Privacy & Security** and click **Open Anyway**
4. The app will auto-update when new versions are released

#### Windows

1. Download the `.exe` installer
2. Run it — Windows Defender SmartScreen may show a warning since the app
   is not code-signed. Click **More info → Run anyway**
3. Follow the installation wizard
4. The app will auto-update when new versions are released

#### Linux

**AppImage:**
```bash
chmod +x materialililil-*.AppImage
./materialililil-*.AppImage
```

**Debian/Ubuntu:**
```bash
sudo dpkg -i materialililil_*_amd64.deb
```

---

### Build From Source

Requirements:
- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [Git](https://git-scm.com/)

```bash
# Clone the repository
git clone https://github.com/dev-doshi/materialililil.git
cd materialililil

# Install dependencies
pnpm install

# Development mode (Next.js + Electron hot reload)
pnpm dev:electron

# Build for your platform
pnpm build:electron

# Or build for a specific platform
pnpm build:electron:mac
pnpm build:electron:win
pnpm build:electron:linux
```

The built application will be in the `dist/` directory.

#### Web-Only Mode

You can also run materialililil as a web app without Electron:

```bash
pnpm dev    # Start the development server at http://localhost:3000
pnpm build  # Build the static site to ./out
```

---

## Features

### Map Generation
- **13 map types:** Height, Normal, Diffuse, AO, Roughness, Metallic,
  Displacement, Edge, Specular, Emissive, Opacity, Curvature, Smoothness
- 50+ adjustable parameters per workflow
- Map dependency graph — changing one map auto-regenerates dependents
- Enable/disable individual maps

### Preview
- Real-time 3D preview on sphere, cube, or plane (Three.js)
- 2D viewport with zoom, pan, pixel inspector
- Side-by-side grid comparison of all maps
- Before/after comparison slider
- Tiling preview

### Export
- ZIP export with engine-specific naming: Blender, Unity, Unreal, Godot,
  Source Engine, Custom
- ORM channel packing (AO + Roughness + Metallic into RGB)
- Multiple resolutions: ¼×, ½×, 1×, 2×
- OpenGL / DirectX normal map convention toggle
- PNG or JPEG output

### Tools
- Histogram and channel viewer
- Color picker with clipboard copy
- Measurement tool
- Frequency separation
- Edge detection
- Color balance / gradient overlay
- Noise generator
- Seam detection heatmap
- PBR validation checks

### Workflow
- 12 built-in material presets (Brick, Wood, Metal, Stone, etc.)
- Custom preset save/load
- Project save/load
- Undo/redo (30 levels)
- Full keyboard shortcuts

### Desktop App
- Native Electron window with system title bar
- Auto-updates via GitHub Releases
- Offline-capable — no internet required for core functionality

---

## Keyboard Shortcuts

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Generate All Maps | ⌘G | Ctrl+G |
| Undo | ⌘Z | Ctrl+Z |
| Redo | ⌘⇧Z | Ctrl+Shift+Z |
| Save Project | ⌘S | Ctrl+S |
| Load Project | ⌘O | Ctrl+O |
| 2D View | ⌘2 | Ctrl+2 |
| 3D View | ⌘3 | Ctrl+3 |
| Full Material | ⌘M | Ctrl+M |
| Toggle Left Panel | ⌘[ | Ctrl+[ |
| Toggle Right Panel | ⌘] | Ctrl+] |
| Select Map 1-9 | 1-9 | 1-9 |
| Show Shortcuts | ? | ? |

---

## Auto-Updates

materialililil checks for new versions on GitHub Releases automatically. When
an update is available, it downloads in the background and prompts you to
restart. You can also check manually through the app.

If you prefer to manage updates yourself, build from source with the updater
disabled.

---

## Privacy

materialililil does not collect any data. All processing happens on your
device. The only network request is checking GitHub for updates.

Read the full [Privacy Policy](PRIVACY_POLICY.md).

---

## Legal

- **License:** [MIT](LICENSE)
- **Terms of Service:** [ToS](TERMS_OF_SERVICE.md)
- **Privacy Policy:** [Privacy](PRIVACY_POLICY.md)
- **Third-Party Licenses:** [Attributions](THIRD_PARTY_LICENSES.md)
- **Security:** [Security Policy](SECURITY.md)
- **Contributing:** [Guide](CONTRIBUTING.md)

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router, static export) |
| UI | React 19, Tailwind CSS v4 |
| 3D | Three.js 0.182, React Three Fiber 9 |
| State | Zustand 5 |
| Desktop | Electron 40 |
| Updates | electron-updater (GitHub Releases) |
| Build | electron-builder, Turbopack |
| Fonts | Space Grotesk, JetBrains Mono (OFL-1.1) |

---

## License

MIT — see [LICENSE](LICENSE) for details.

Copyright © 2026 Dev Doshi.
