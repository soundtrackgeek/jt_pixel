# JT Pixel

JT Pixel is a desktop pixel-art and sprite-animation studio built with Rust, Tauri 2, React, and TypeScript. Its interface follows the **Arcade Bloom** direction: a focused ink-indigo workspace with expressive violet, coral, cyan, and acid-lime interaction states.

## Current foundation

Version `0.15.1` makes Advanced Layer Studio ordering dependable in the desktop WebView with pointer-based grip dragging and clear insertion feedback, while retaining frame-local naming, opacity, six blend modes, duplication, Merge Down, Flatten Visible, large-image PNG fitting, sprite-sheet slicing, palette policies, anchored canvas resizing, atomic Undo/Redo, seamless tile and symmetry editing, the advanced animation timeline, native system-wide screen picker, in-app Pixel Lens, dependable Palette Studio color management, layer locking, precision drawing, animated GIF, PNG, and sprite-sheet export, configurable canvas views, crash recovery, and the signed desktop update channel:

- Responsive Tauri 2 application shell
- Componentized editor workspace with tool rail, tool panel, canvas, inspector, timeline, and status bar
- Versioned schema-v1 project document with custom 1–512 pixel canvas dimensions, palette, layers, frames, animation settings, and sparse pixel cels
- Arcade Bloom New Project dialog with project naming, 16 × 16 through 128 × 128 presets, independent width and height controls, live canvas blueprint, validation, and `Ctrl+N`
- Blank Canvas projects with one frame and one editable layer, plus the original 64 × 64, eight-frame Courier Practice template
- Styled unsaved-work confirmation before replacing the current session with a new project
- Fresh-project lifecycle that clears the previous file path, recovery snapshot, playback state, and Undo/Redo history
- Interactive pencil and eraser behavior, boundary-aware flood fill, and precision Line, Rectangle, and Ellipse tools, persisted per layer and frame
- Dedicated Tiles workspace with standard or seamless edge behavior, live 3×3 repeat preview, horizontal, vertical, and quad symmetry, center-seam and one-pixel offsets, and visible symmetry guides
- Arcade Bloom Import Studio with PNG file selection or drag-and-drop, complete alpha-aware previews, automatic large-image fitting, editable 1–512 target dimensions, aspect locking, palette keep/merge/replace policies, centered frame-local placement, active-cel replacement, and `Ctrl+I`
- Sprite-sheet slicing with cell, row, column, spacing, margin, and frame-order controls, plus new-project or inserted-frame destinations
- Project-wide Canvas Operations with nine-point anchored resizing, transparent or background-color expansion, nearest-neighbor scaling, aspect locking, before/after previews, clipping warnings, and one-step Undo/Redo
- Live shape previews with brush-size and opacity support, outline or filled closed shapes, 45-degree Line snapping, square and circle constraints, and one Undo step per placement
- Pixel-snapped rectangular selections with drag creation, Select All, live size/origin feedback, and selection-masked Pencil, Eraser, Fill, precision shapes, and Clear behavior
- Drag or keyboard movement, Cut, Copy, Paste, Duplicate, horizontal and vertical Flip, 90-degree clockwise Rotate, Delete, and Deselect commands through a contextual Arcade Bloom toolbar
- App-internal selection clipboard that can carry pixel regions across layers, frames, and projects without depending on the operating-system clipboard
- Tool selection with visible state and keyboard shortcuts
- Functional HSV, RGB, and hex color editing with foreground/background colors, quick swap, recent colors, palette usage counts, and right-click background assignment
- Palette Studio controls for adding, updating, removing, reordering, and extracting project colors without silently changing artwork
- Current-layer or visible-pixel eyedropper sampling with `I`, click-and-drag sampling, temporary `Alt` sampling from any drawing tool, and a live 9 × 9 Pixel Lens with color and coordinate readouts
- Native Windows screen sampling from JT Pixel or any other application with `Shift+I`, a frozen multi-monitor desktop capture, a custom pipette cursor, and an edge-aware 9 × 9 Pixel Lens
- Scoped color replacement across the active selection, current cel, matching layer across frames, or the complete project, with live impact counts and locked-artwork protection
- Advanced frame-local layer creation, naming, deletion, selection, visibility, locking, WebView-safe grip dragging with cyan insertion feedback, arrow ordering, duplication, opacity, Normal/Multiply/Screen/Overlay/Add/Subtract blending, Merge Down, and Flatten Visible, with permanently locked-reference safeguards and live thumbnails
- Shift-range and Ctrl-additive frame selection, WebView-safe pointer drag ordering with insertion feedback, batch duplication and deletion, and live timeline previews
- Per-frame 1× through 12× hold timing, selected-range playback, functional Loop or Play once control, frame stepping, onion skin, adjustable base FPS, dynamic counts, and document dirty state
- Bounded 100-step Undo and Redo for complete drawing strokes, fills, selection transforms, cel clears, palette edits, scoped color replacements, frame-local layer visibility and locks, structural layer operations, frame ordering, frame holds, batch frame operations, loop behavior, and frame-rate changes, with one history step per completed transform, batch operation, drag reorder, or FPS slider drag
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
- Animated GIF export for any contiguous frame range, with a duration-aware live preview, ordered per-frame hold timing, and independent **Loop forever** or **Play once** behavior
- Nearest-neighbor 1× through 32× scaling, transparent or solid backgrounds, and configurable sheet spacing and padding
- Optional companion JSON metadata with ordered frame coordinates, dimensions, hold multipliers, effective timing, FPS, and loop state
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

## Advanced Layer Studio

Select a pixel layer in the right inspector to reveal its compact property shelf. Layer names, order, opacity, blend mode, visibility, and lock state belong to the current animation frame; moving to another frame restores that frame's own layer setup. Drag a layer by its dotted grip and release at the cyan insertion line to reorder it, or use the up and down arrows for precise movement. The blend selector supports **Normal**, **Multiply**, **Screen**, **Overlay**, **Add**, and **Subtract**.

Use the duplicate button to copy the selected layer and its artwork inside the current frame. The three-dot menu contains **Rename**, **Duplicate**, **Merge down**, **Flatten visible**, and **Delete layer**. Merge and flatten stay disabled when they would modify locked artwork; hidden layers are preserved by Flatten Visible. All Advanced Layer Studio edits are saved in `.jtp` projects and recovery snapshots, use the same compositing in the canvas, eyedropper, timeline, and exports, and participate in bounded Undo/Redo.

## Import Studio and canvas operations

Choose **Import PNG artwork** in the top toolbar, press `Ctrl+I`, or drag a PNG onto the app to open Import Studio. PNG transparency and RGBA pixel values are preserved. Sources can be up to 64 MB, 8192 pixels on either side, and 33,554,432 total pixels; editable JT Pixel canvases remain bounded to 1–512 pixels per side.

For a single PNG, Import Studio always contains the complete source in its preview. Images larger than the editable limit default to the largest aspect-preserving size inside 512 × 512; smaller sources keep their original size. Width and height can be set independently anywhere from 1–512 pixels, linked by the default aspect lock, or quickly fit to the maximum supported size or current canvas. Scaling uses nearest-neighbor sampling to keep pixel edges crisp and preserve alpha.

Choose **New project** to use the selected import size, **New layer** to center the result on a new layer present only in the active frame, or **Current cel** to replace the selected visible, unlocked pixel layer. Import Studio reports pixels that will be clipped when the selected size is larger than the current canvas. Palette handling can keep the current project palette, merge up to 256 most-used imported colors, or replace the palette with those imported colors. Imported pixels remain fully editable and are embedded in `.jtp` saves and crash recovery.

Choose **Sprite sheet** to define cell width and height, rows, columns, horizontal and vertical spacing, outer margins, and row-major or column-major frame order. Number fields can be cleared while typing a replacement value, normalize safely when editing ends, and include visible up and down controls for one-step adjustments. The live cyan grid is preview-only. A sheet can create a new animated project or insert frames after the active frame when every sliced cell matches the current canvas. Up to 1024 frames can be imported at once.

Choose **Canvas operations** in the top toolbar to reframe the complete project. **Resize canvas** adds or removes space around every frame and pixel layer from one of nine anchors; expanded space can remain transparent or use the current background color, and a warning reports artwork that would be cropped. **Scale artwork** resamples every cel with crisp nearest-neighbor scaling and can lock the existing aspect ratio. Both operations show composited before/after previews and commit as one Undo/Redo step.

Layer-row lock controls protect pixel artwork on the current frame. A locked layer remains visible and selectable, but Pencil, Eraser, Fill, precision shapes, and Clear cannot modify its cel until it is unlocked. Lock state is saved in `.jtp` files, crash recovery, and frame duplication; older project files open with pixel layers unlocked. The Courier Reference remains permanently locked. Lock and unlock changes participate in Undo/Redo and do not affect the same layer on other frames.

Frame order and hold duration are project data. They are saved in `.jtp` files and recovery snapshots, and older schema-v1 projects without hold values open at the normal 1× duration. Frame selection itself is temporary workspace state and is not serialized.

Undo and Redo history is kept for the current editing session and is not serialized into `.jtp` files. Saving preserves the current history and establishes a clean checkpoint, so undoing back to that position returns the status to **SAVED**. Opening or restoring a different project starts a fresh history.

History shortcuts remain active while non-text controls such as the FPS range have focus. Individual frame-rate `+` and `−` clicks remain separate Undo steps, while a complete mouse or touch drag on the FPS slider is grouped into one step.

## Palette Studio and smart color

Open **Palette Studio** from the Color panel menu to curate the project palette. Choose a swatch to use it as the foreground color, right-click it to assign the background color, or use the swap control beside the foreground/background pair. Colors can be entered precisely as HSV, RGB, or hex values, and the recent strip keeps the last eight foreground colors close at hand for the current session.

Palette entries can be added, updated, removed, dragged or nudged into a new order, and regenerated from colors currently used by the project. Swatch maintenance never changes artwork by itself. Palette changes are saved in `.jtp` files and crash recovery, mark the project unsaved, and participate in Undo/Redo; recent and foreground/background color choices remain transient workspace state.

Choose **Pick** (`I`) to sample continuously from the current layer or the composite of visible painted layers. Hold `Alt` while using another drawing tool to open the same sampling experience temporarily without switching tools. The custom pipette cursor and Pixel Lens follow the pointer across the artboard, magnifying a 9 × 9 neighborhood and reporting the center pixel's hex value, RGB values, canvas coordinates, transparency, and active sample source. The lens flips around canvas edges so its target stays visible.

Left-click or drag to assign sampled pixels to the foreground color; right-click or drag to assign them to the background color. Transparent cells are identified in the lens and leave both color roles unchanged. Visible sampling deliberately excludes the locked reference image, onion skin, grid, and workspace background.

Press `Shift+I`, choose **Pick from screen** in the Eyedropper panel, or use the monitor-pipette button in the Color footer to sample anywhere on the Windows desktop. JT Pixel temporarily hides itself, freezes the complete virtual desktop across every monitor, and follows the pointer with a native 9 × 9 Pixel Lens. Left-click assigns the sampled color to the foreground, right-click assigns it to the background, and `Escape` cancels without changing either color. The lens reports the exact hex, RGB, and screen coordinates and flips inside the active monitor's work area near screen edges; monitors positioned left of or above the primary display are supported. Browser builds show a desktop-required notice instead of starting the picker.

Choose **Replace pixels** in Palette Studio for a controlled recolor. The preview reports affected pixels and cels before applying the change, and the scope can be the active marquee, current cel, matching layer across all frames, or every editable pixel layer in the project. Locked layers and frames are always skipped. Updating the source palette swatch is optional, and the complete replacement—including that palette change—is one Undo/Redo step.

## Selections and transforms

Choose **Select** (`S`) and drag across an editable, visible pixel layer to create an inclusive rectangular marquee. The Draw panel and status bar report its exact size and origin. Choose **Move** (`M`) and drag inside the marquee, use the arrow keys for one-pixel nudges, or hold `Shift` with an arrow key for eight-pixel nudges. Selections always remain fully inside the canvas.

The contextual selection toolbar provides Cut, Copy, Paste, Duplicate, horizontal and vertical Flip, 90-degree clockwise Rotate, Delete, and Deselect. `Ctrl+A` selects the full canvas, `Ctrl+C`, `Ctrl+X`, `Ctrl+V`, and `Ctrl+D` operate on the selection, `Delete` or `Backspace` clears selected pixels, and `Escape` removes the marquee. Clipboard pixels stay available inside JT Pixel when changing frames, layers, or projects; they are not written to project files or the system clipboard.

An active marquee also masks Pencil, Eraser, Fill, Line, Rectangle, Ellipse, and the canvas Clear command so pixels outside the selection cannot change. Copy remains available on a locked layer because it is read-only, while Cut, Paste, Duplicate, movement, flips, rotation, and deletion remain disabled. Switching frames or layers clears the transient marquee safely. Every completed pixel transform is one Undo/Redo entry. Undo restores the matching pre-transform marquee and Redo restores its transformed bounds, so an alternate move can begin immediately; undoing unrelated drawing keeps the current selection. Selection geometry remains temporary editor state and is not saved in `.jtp` files.

## Precision drawing

Choose **Line** (`L`), **Rectangle** (`R`), or **Ellipse** (`O`), then click and drag on an editable, visible pixel layer. JT Pixel shows the exact rasterized pixels before placement and commits the shape only when the pointer is released. A complete placement is one Undo/Redo step and affects only the active layer and frame.

- Line, Rectangle, and Ellipse outlines use the current brush size and opacity.
- Rectangle and Ellipse offer **Outline** and **Filled** modes in the Draw panel; filled shapes use the exact selected bounds.
- Hold `Shift` while dragging a Line to snap it to horizontal, vertical, or 45-degree angles.
- Hold `Shift` while dragging a Rectangle or Ellipse to lock it to a square or circle.
- A cancelled shape gesture restores the active cel without placing its preview.

Precision settings are workspace controls rather than project data. Switching tools, frames, or projects does not create history entries or mark artwork unsaved; only a completed shape placement changes the document.

## Seamless tiles and symmetry

Choose **Tiles** from the left workspace rail to open the tile controls without leaving the current frame or layer. **Standard** keeps normal canvas boundaries. **Seamless** wraps Pencil, Eraser, Fill, Line, Rectangle, and Ellipse edits across opposite edges so a stroke leaving one side continues on the other. Active selections remain strict masks and intentionally disable edge wrapping beyond the selected bounds.

Enable **3×3** Repeat Preview to inspect the visible pixel-layer composite as a live repeating texture. The floating preview refreshes during drawing, respects per-frame layer presence, visibility, opacity, and blend mode, and never includes reference artwork, grid lines, or canvas-view backgrounds. Close the preview from its header or choose **Off** in the Tiles panel.

Symmetry can be **Horizontal**, **Vertical**, or **Quad**. Cyan and violet artboard guides show the active axes, and odd-sized canvases deduplicate pixels that land directly on a center line. Symmetry works with Pencil, Eraser, Fill, and precision shapes; one completed gesture remains one Undo/Redo entry.

The Offset Seam pad shifts the complete active pixel cel by one pixel in any direction with wraparound. Its center control offsets by half the canvas width and height, bringing both outer seams into the middle for inspection and repair. Offset actions respect layer visibility and locking and each create one Undo/Redo step.

Tile mode, Repeat Preview, and Symmetry are saved in `.jtp` files and crash recovery. Existing schema-v1 projects open safely with Standard mode, Repeat Preview Off, and Symmetry Off. Workspace switching itself does not modify the project.

## Animation timeline

Click a frame to work on it. Hold `Shift` while clicking another frame to select the complete range between them, or hold `Ctrl` (`Cmd` on macOS) to add or remove individual frames. A single selected frame keeps playback scoped to the complete animation; two or more selected frames define a playback range from the earliest selected position to the latest.

Drag any selected frame to move the complete selected block while preserving its internal order. The violet range rail marks the selection, cyan identifies the active frame, and an acid-lime insertion line shows the exact drop position. Timeline dragging uses pointer capture rather than native HTML drag-and-drop for dependable behavior in the Tauri WebView. The duplicate and delete actions operate on the complete selection, and deleting every frame remains blocked.

Use **Hold** to keep selected frames on screen for 1× through 12× the base frame duration. The FPS control remains the animation's base tempo; for example, a 3× frame at 10 FPS displays for 300 ms. Playback, Loop or Play once, Export Studio's GIF preview, encoded GIF timing, and sprite-sheet metadata all follow the current frame order and holds. Reordering, hold changes, batch duplicate/delete, and loop changes each participate in Undo/Redo as atomic document edits.

## Canvas view

Choose **Canvas view settings** beside the zoom controls to tailor the workspace around the artwork. **Checker** keeps the transparency pattern, while **Dark**, **Mid**, and **Light** provide neutral solid backgrounds for inspecting edges and contrast. The pixel grid can be **Off**, **Subtle**, **Crisp**, or **Contrast**; Crisp is the default for clear cell boundaries on small canvases.

Press `G` to hide the grid or restore the last visible grid style. Canvas-view choices are remembered on the device, but they are editor preferences rather than project data: they are not written into `.jtp` files, do not mark a project unsaved, and do not add Undo/Redo entries. Use **Reset** in the Canvas View panel to return to Checker and Crisp.

## Exporting artwork

Choose **Export artwork** in the top toolbar or press `Ctrl+E` to open Export Studio. **Current frame** creates one PNG from the active frame. **Sprite sheet** exports a contiguous frame range and can arrange it in a single row, a single column, or a grid with a chosen column count. **Animated GIF** exports the chosen range as a playback-ready animation using the project's FPS.

Export Studio supports integer nearest-neighbor scaling from 1× through 32×, transparent or solid backgrounds, and adjustable spacing and outer padding for sprite sheets. For GIFs, choose **Loop forever** or **Play once** without changing the project's timeline Loop setting; the duration-aware preview follows the chosen behavior and stops on the final frame in Play once mode. PNG previews report exact output dimensions and estimate file size. Enable **JSON metadata** for sprite sheets to create a sibling file containing each frame's ordered rectangle, hold multiplier, effective duration, source size, scale, FPS, and project loop state.

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
| `Shift+I` | Pick a color anywhere on the Windows desktop |
| `Alt` + canvas click or drag | Temporarily open Pixel Lens and sample with the current source without changing tools |
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
