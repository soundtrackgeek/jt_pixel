# JT Pixel

JT Pixel is a desktop pixel-art and sprite-animation studio built with Rust, Tauri 2, React, and TypeScript. Its interface follows the **Arcade Bloom** direction: a focused ink-indigo workspace with expressive violet, coral, cyan, and acid-lime interaction states.

## Current foundation

Version `0.8.0` adds precision Line, Rectangle, and Ellipse drawing with live pixel previews, constrained geometry, and outline or filled shapes while retaining animated GIF, PNG, and sprite-sheet export, configurable canvas views, dependable session history, persistent project files, crash recovery, saved workspace position, and the signed desktop update channel:

- Responsive Tauri 2 application shell
- Componentized editor workspace with tool rail, tool panel, canvas, inspector, timeline, and status bar
- Versioned schema-v1 project document with custom 1–512 pixel canvas dimensions, palette, layers, frames, animation settings, and sparse pixel cels
- Arcade Bloom New Project dialog with project naming, 16 × 16 through 128 × 128 presets, independent width and height controls, live canvas blueprint, validation, and `Ctrl+N`
- Blank Canvas projects with one frame and one editable layer, plus the original 64 × 64, eight-frame Courier Practice template
- Styled unsaved-work confirmation before replacing the current session with a new project
- Fresh-project lifecycle that clears the previous file path, recovery snapshot, playback state, and Undo/Redo history
- Interactive pencil and eraser behavior, boundary-aware flood fill, and precision Line, Rectangle, and Ellipse tools, persisted per layer and frame
- Live shape previews with brush-size and opacity support, outline or filled closed shapes, 45-degree Line snapping, square and circle constraints, and one Undo step per placement
- Tool selection with visible state and keyboard shortcuts
- Color palette, brush size, opacity, and pixel-perfect controls
- Functional frame-local layer creation, deletion, selection, visibility, and instant selected-layer restoration, with locked-reference safeguards and live thumbnails
- Functional frame duplication and deletion with copied cel data, layer selection context, and live timeline previews
- Animation playback, frame stepping, onion-skin control, adjustable frame rate, dynamic counts, and document dirty state
- Bounded 100-step Undo and Redo for complete drawing strokes, fills, cel clears, frame-local layer operations, frame operations, and frame-rate changes, with one history step per FPS slider drag
- Toolbar history controls plus `Ctrl+Z`, `Ctrl+Y`, and `Ctrl+Shift+Z` shortcuts, with Redo cleared after a branched edit
- Native Open and Save dialogs for validated, human-readable `.jtp` project files
- Saved workspace position so projects and recovered work reopen on the frame where you left them
- Debounced crash recovery with restore/discard choices and visible recovery status
- `Ctrl+O`, `Ctrl+S`, and `Ctrl+Shift+S` project shortcuts with unsaved-work protection
- Arcade Bloom confirmation before replacing unsaved work, with safe keyboard focus and Escape-to-cancel behavior
- Canvas View controls with checkerboard, dark neutral, mid neutral, and light neutral backgrounds plus Off, Subtle, Crisp, and Contrast grid styles
- A clearer Crisp grid by default, adaptive line colors, a `G` grid toggle, and persistent view preferences that never dirty or alter project artwork
- Arcade Bloom Export Studio available from the top toolbar or `Ctrl+E`, with a live pixel-perfect preview and exact output dimensions
- Lossless current-frame PNG export plus ranged sprite sheets arranged as a row, column, or configurable grid
- Animated GIF export for any contiguous frame range, with a live playback preview, project FPS timing, and independent **Loop forever** or **Play once** behavior
- Nearest-neighbor 1× through 32× scaling, transparent or solid backgrounds, and configurable sheet spacing and padding
- Optional companion JSON metadata with frame coordinates, dimensions, timing, FPS, and loop state
- Native Save dialog integration and post-export folder reveal, with remembered export preferences that never alter the project or its Undo/Redo history
- Deterministic export compositing from visible pixel layers only; reference layers, onion skin, workspace backgrounds, and pixel grids are always excluded
- Responsive worker-based GIF encoding with exact palettes where possible, automatic 256-color quantization when needed, and memory-safe animation limits
- Artboards that preserve portrait, landscape, and square canvas proportions
- Generated Arcade Bloom courier artwork and cross-platform application icons
- Compact layout for smaller windows
- Automatic update checks after launch and every five minutes by default
- Persistent update cadence controls under either Settings button
- Arcade Bloom update notifications with download and installation progress
- Signed, in-app Windows updates published through GitHub Releases

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

Choose **New project** in the top toolbar or press `Ctrl+N` to open canvas setup. Blank projects support independent width and height values from 1 to 512 pixels, with quick square presets at 16, 32, 64, and 128 pixels. **Courier Practice** restores the original guided 64 × 64 project with eight animation frames, three paint layers, and its locked reference layer.

New projects begin without a file path, recovery data, or Undo/Redo entries. Their first save opens the native Save dialog. If the current workspace contains unsaved changes, JT Pixel asks for confirmation inside the Arcade Bloom interface before replacing it.

JT Pixel desktop projects use the `.jtp` extension. Project files are readable JSON with a versioned schema; files are validated before they can replace the active document, including their canvas bounds, palette colors, layers, frames, cel references, and pixel indices.

- Choose **Save** or press `Ctrl+S` to save. A new or recovered project opens the native Save dialog; later saves reuse the selected path for the current session.
- Press `Ctrl+Shift+S` to choose a different path and save a copy.
- Choose **Open** or press `Ctrl+O` to open a `.jtp` file. JT Pixel asks before replacing unsaved work.
- Unsaved edits are written shortly after each document change to a versioned recovery file in JT Pixel's application-data folder.
- If recovery data is found on launch, choose **Restore work** to open it as an unsaved copy or **Discard recovery** to remove it.

Recovered work intentionally does not reuse its previous file path. Its next save opens the native Save dialog, preventing an automatic overwrite after a crash.

Undo and Redo history is kept for the current editing session and is not serialized into `.jtp` files. Saving preserves the current history and establishes a clean checkpoint, so undoing back to that position returns the status to **SAVED**. Opening or restoring a different project starts a fresh history.

History shortcuts remain active while non-text controls such as the FPS range have focus. Individual frame-rate `+` and `−` clicks remain separate Undo steps, while a complete mouse or touch drag on the FPS slider is grouped into one step.

## Precision drawing

Choose **Line** (`L`), **Rectangle** (`R`), or **Ellipse** (`O`), then click and drag on an editable, visible pixel layer. JT Pixel shows the exact rasterized pixels before placement and commits the shape only when the pointer is released. A complete placement is one Undo/Redo step and affects only the active layer and frame.

- Line, Rectangle, and Ellipse outlines use the current brush size and opacity.
- Rectangle and Ellipse offer **Outline** and **Filled** modes in the Draw panel; filled shapes use the exact selected bounds.
- Hold `Shift` while dragging a Line to snap it to horizontal, vertical, or 45-degree angles.
- Hold `Shift` while dragging a Rectangle or Ellipse to lock it to a square or circle.
- A cancelled shape gesture restores the active cel without placing its preview.

Precision settings are workspace controls rather than project data. Switching tools, frames, or projects does not create history entries or mark artwork unsaved; only a completed shape placement changes the document.

## Canvas view

Choose **Canvas view settings** beside the zoom controls to tailor the workspace around the artwork. **Checker** keeps the transparency pattern, while **Dark**, **Mid**, and **Light** provide neutral solid backgrounds for inspecting edges and contrast. The pixel grid can be **Off**, **Subtle**, **Crisp**, or **Contrast**; Crisp is the default for clear cell boundaries on small canvases.

Press `G` to hide the grid or restore the last visible grid style. Canvas-view choices are remembered on the device, but they are editor preferences rather than project data: they are not written into `.jtp` files, do not mark a project unsaved, and do not add Undo/Redo entries. Use **Reset** in the Canvas View panel to return to Checker and Crisp.

## Exporting artwork

Choose **Export artwork** in the top toolbar or press `Ctrl+E` to open Export Studio. **Current frame** creates one PNG from the active frame. **Sprite sheet** exports a contiguous frame range and can arrange it in a single row, a single column, or a grid with a chosen column count. **Animated GIF** exports the chosen range as a playback-ready animation using the project's FPS.

Export Studio supports integer nearest-neighbor scaling from 1× through 32×, transparent or solid backgrounds, and adjustable spacing and outer padding for sprite sheets. For GIFs, choose **Loop forever** or **Play once** without changing the project's timeline Loop setting; the preview follows the chosen behavior and stops on the final frame in Play once mode. PNG previews report exact output dimensions and estimate file size. Enable **JSON metadata** for sprite sheets to create a sibling file containing each frame's rectangle, duration, source size, scale, FPS, and project loop state.

GIF encoding runs in a background worker so Export Studio remains responsive while frames are compressed. Artwork with up to 256 exact colors per frame retains that palette directly; more complex frames are quantized automatically to the GIF format's 256-color limit. Transparent GIFs use one-bit alpha, while solid backgrounds flatten every frame before encoding.

Exports flatten only visible pixel layers for each frame. Reference layers, hidden artwork, onion skin, canvas-view backgrounds, and grid lines are never included. Export preferences—including GIF playback—are remembered locally but do not modify the `.jtp` project, dirty state, or Undo/Redo history. Desktop builds use a native Save dialog and can reveal the completed export in File Explorer.

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
| `G` | Toggle the pixel grid |
| `Space` | Play or pause animation |
| `Ctrl+N` | Create a new project |
| `Ctrl+O` | Open a project |
| `Ctrl+S` | Save the current project |
| `Ctrl+Shift+S` | Save to a new project file |
| `Ctrl+E` | Open Export Studio |
| `Ctrl+Z` | Undo the last document edit |
| `Ctrl+Y` | Redo the next document edit |
| `Ctrl+Shift+Z` | Redo the next document edit |

While Line, Rectangle, or Ellipse is active, hold `Shift` during a drag to constrain its geometry.

## Project structure

- `src/components/` — focused editor UI components
- `src/editor/` — versioned project model, validated file format, reducer, pixel operations, and tests
- `src/services/` — native project storage and recovery adapters
- `src/data/` — editor tool definitions
- `src/assets/` — generated Arcade Bloom artwork
- `src-tauri/` — Rust entry point, capabilities, icons, and Tauri configuration
