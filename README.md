# JT Pixel

JT Pixel is a desktop pixel-art and sprite-animation studio built with Rust, Tauri 2, React, and TypeScript. Its interface follows the **Arcade Bloom** direction: a focused ink-indigo workspace with expressive violet, coral, cyan, and acid-lime interaction states.

## Current foundation

Version `0.4.3` restores the saved working frame when opening projects while retaining persistent project files, crash recovery, and the signed desktop update channel:

- Responsive Tauri 2 application shell
- Componentized editor workspace with tool rail, tool panel, canvas, inspector, timeline, and status bar
- Versioned schema-v1 project document with a 64 × 64 canvas, palette, layers, frames, animation settings, and sparse pixel cels
- Interactive pencil and eraser behavior plus boundary-aware flood fill, persisted per layer and frame
- Tool selection with visible state and keyboard shortcuts
- Color palette, brush size, opacity, and pixel-perfect controls
- Functional frame-local layer creation, deletion, selection, visibility, and instant selected-layer restoration, with locked-reference safeguards and live thumbnails
- Functional frame duplication and deletion with copied cel data, layer selection context, and live timeline previews
- Animation playback, frame stepping, onion-skin control, adjustable frame rate, dynamic counts, and document dirty state
- Native Open and Save dialogs for validated, human-readable `.jtp` project files
- Saved workspace position so projects and recovered work reopen on the frame where you left them
- Debounced crash recovery with restore/discard choices and visible recovery status
- `Ctrl+O`, `Ctrl+S`, and `Ctrl+Shift+S` project shortcuts with unsaved-work protection
- Arcade Bloom confirmation before replacing unsaved work, with safe keyboard focus and Escape-to-cancel behavior
- Generated Arcade Bloom courier artwork and cross-platform application icons
- Compact layout for smaller windows
- Automatic update checks after launch and every five minutes by default
- Persistent update cadence controls under either Settings button
- Arcade Bloom update notifications with download and installation progress
- Signed, in-app Windows updates published through GitHub Releases

Undo history and image or sprite-sheet export remain reserved for later phases.

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

## Project files and recovery

JT Pixel desktop projects use the `.jtp` extension. Project files are readable JSON with a versioned schema; files are validated before they can replace the active document, including their canvas bounds, palette colors, layers, frames, cel references, and pixel indices.

- Choose **Save** or press `Ctrl+S` to save. A new or recovered project opens the native Save dialog; later saves reuse the selected path for the current session.
- Press `Ctrl+Shift+S` to choose a different path and save a copy.
- Choose **Open** or press `Ctrl+O` to open a `.jtp` file. JT Pixel asks before replacing unsaved work.
- Unsaved edits are written shortly after each document change to a versioned recovery file in JT Pixel's application-data folder.
- If recovery data is found on launch, choose **Restore work** to open it as an unsaved copy or **Discard recovery** to remove it.

Recovered work intentionally does not reuse its previous file path. Its next save opens the native Save dialog, preventing an automatic overwrite after a crash.

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
| `Ctrl+O` | Open a project |
| `Ctrl+S` | Save the current project |
| `Ctrl+Shift+S` | Save to a new project file |

## Project structure

- `src/components/` — focused editor UI components
- `src/editor/` — versioned project model, validated file format, reducer, pixel operations, and tests
- `src/services/` — native project storage and recovery adapters
- `src/data/` — editor tool definitions
- `src/assets/` — generated Arcade Bloom artwork
- `src-tauri/` — Rust entry point, capabilities, icons, and Tauri configuration
