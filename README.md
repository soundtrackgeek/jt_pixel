# JT Pixel

JT Pixel is a desktop pixel-art and sprite-animation studio built with Rust, Tauri 2, React, and TypeScript. Its interface follows the **Arcade Bloom** direction: a focused ink-indigo workspace with expressive violet, coral, cyan, and acid-lime interaction states.

## Current foundation

Version `0.3.2` adds the first production document engine while retaining the signed desktop update channel:

- Responsive Tauri 2 application shell
- Componentized editor workspace with tool rail, tool panel, canvas, inspector, timeline, and status bar
- Versioned schema-v1 project document with a 64 × 64 canvas, palette, layers, frames, animation settings, and sparse pixel cels
- Interactive pencil and eraser behavior plus boundary-aware flood fill, persisted per layer and frame for the current app session
- Tool selection with visible state and keyboard shortcuts
- Color palette, brush size, opacity, and pixel-perfect controls
- Functional frame-local layer creation, deletion, selection and visibility, with locked-reference safeguards and live thumbnails
- Functional frame duplication and deletion with copied cel data and live timeline previews
- Animation playback, frame stepping, onion-skin control, adjustable frame rate, dynamic counts, and document dirty state
- Generated Arcade Bloom courier artwork and cross-platform application icons
- Compact layout for smaller windows
- Automatic update checks after launch and every five minutes by default
- Persistent update cadence controls under either Settings button
- Arcade Bloom update notifications with download and installation progress
- Signed, in-app Windows updates published through GitHub Releases

The document currently lives in memory, so closing or reloading the app discards edits. Native save/open dialogs and crash recovery are the next document milestone; undo history and export remain reserved for later phases.

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

The normal local build does not create signed updater artifacts and does not require the release signing key. Signed updater bundles are generated only by the protected `master` CI release path.

## In-app updates

Installed builds from version `0.2.0` onward check the signed GitHub Releases update feed shortly after launch and then every five minutes while the app is open. Open **Settings** from the top toolbar or left rail to choose:

- Manual checks only
- Every 1, 5, 15, or 30 minutes
- Every hour

When a newer semantic version is available, JT Pixel shows an update notification. **Update now** downloads the package, verifies its Tauri signature, installs it, and relaunches the app. Choosing **Later** suppresses that version for the current session; manual checks can surface it again.

Versions older than `0.2.0` do not contain the updater and must install `0.2.0` or newer manually once before in-app updates become available.

## Verification

Run the frontend type check and production build:

```sh
npm test
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

Pushes to `master` additionally create a public GitHub Release named `JT Pixel v<version>`. That release contains the installable executable, its updater signature, and the generated `latest.json` feed consumed by installed copies of JT Pixel. Release builds use the `TAURI_SIGNING_PRIVATE_KEY` repository secret; the private key must never be committed, rotated casually, or lost because installed apps trust its matching public key.

To download an installer, open the repository's **Actions** tab, select a successful **Windows installer** run, and download the `jt-pixel-windows-x64-<commit>` artifact from its Artifacts section. The downloaded archive contains an installable `JT Pixel_<version>_x64-setup.exe` file.

Tauri updater signatures authenticate in-app packages, but they are separate from Windows Authenticode signing. Windows may still display a SmartScreen warning until a trusted code-signing certificate is configured in a later release phase.

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
- `src/editor/` — versioned project model, reducer, pixel operations, and reducer tests
- `src/data/` — editor tool definitions
- `src/assets/` — generated Arcade Bloom artwork
- `src-tauri/` — Rust entry point, capabilities, icons, and Tauri configuration
