# JT Pixel

JT Pixel is a desktop pixel-art and sprite-animation studio built with Rust, Tauri 2, React, and TypeScript. Its interface follows the **Arcade Bloom** direction: a focused ink-indigo workspace with expressive violet, coral, cyan, and acid-lime interaction states.

## Foundation release

Version `0.1.0` establishes the product foundation:

- Responsive Tauri 2 application shell
- Componentized editor workspace with tool rail, tool panel, canvas, inspector, timeline, and status bar
- Interactive pencil, eraser, and fill behavior on a 64 × 64 paint layer
- Tool selection with visible state and keyboard shortcuts
- Color palette, brush size, opacity, pixel-perfect, layer, and frame controls
- Animation playback, frame stepping, onion-skin control, and adjustable frame rate
- Generated Arcade Bloom courier artwork and cross-platform application icons
- Compact layout for smaller windows

Project persistence, native file dialogs, undo history, export, and a production document model are intentionally reserved for later phases.

## Prerequisites

- [Node.js](https://nodejs.org/) 22 or newer
- [Rust](https://www.rust-lang.org/tools/install) 1.95 or newer
- The [Tauri 2 platform prerequisites](https://v2.tauri.app/start/prerequisites/) for your operating system

## Development

Install dependencies:

```sh
npm install
```

Run the frontend in a browser:

```sh
npm run dev
```

Run the desktop application through Tauri:

```sh
npm run tauri:dev
```

Build the native application and configured installer bundles:

```sh
npm run tauri:build
```

## Verification

Run the frontend type check and production build:

```sh
npm run check
npm run build
```

Verify the Rust/Tauri layer:

```sh
cd src-tauri
cargo check
```

## Windows installer CI

Every push to any branch triggers the **Windows installer** workflow in GitHub Actions. The workflow:

1. Installs the locked Node.js and Rust dependencies.
2. Runs the frontend type check.
3. Builds a release-mode Windows x64 NSIS installer.
4. Generates `SHA256SUMS.txt` for integrity verification.
5. Uploads the installer and checksum as a workflow artifact for 14 days.

To download an installer, open the repository's **Actions** tab, select a successful **Windows installer** run, and download the `jt-pixel-windows-x64-<commit>` artifact from its Artifacts section. The downloaded archive contains an installable `JT Pixel_<version>_x64-setup.exe` file.

CI installers are currently unsigned development builds. Windows may display a SmartScreen warning until a trusted code-signing certificate is configured in a later release phase.

## Keyboard shortcuts

The editor foundation supports single-key tool switching when a form control is not focused:

| Key | Tool |
| --- | --- |
| `P` | Pencil |
| `E` | Eraser |
| `B` | Bucket |
| `L` | Line |
| `R` | Rectangle |
| `O` | Ellipse |
| `S` | Select |
| `M` | Move |
| `W` | Magic |
| `T` | Text |
| `I` | Eyedropper |
| `H` | Hand |
| `Space` | Play or pause animation |

## Project structure

- `src/components/` — focused editor UI components
- `src/data/` — initial tools, palette, layers, and frame data
- `src/assets/` — generated Arcade Bloom artwork
- `src-tauri/` — Rust entry point, capabilities, icons, and Tauri configuration
