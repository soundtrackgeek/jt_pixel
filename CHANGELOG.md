# Changelog

All notable changes to JT Pixel are documented in this file.

The project follows [Semantic Versioning](https://semver.org/).

## [0.16.0] - 2026-07-22

### Added

- Magic selection with active-layer or visible-pixel sampling, connected-island or global matching, adjustable RGBA tolerance, hover previews, and New/Add/Cut combination modes.
- Exact irregular selection masks across Pencil, Eraser, Fill, precision shapes, Clear, scoped color replacement, clipboard commands, movement, flip, rotation, deletion, and selection-aware Undo/Redo.
- Dedicated Hand navigation with drag panning, temporary hold-Space panning from any tool, middle-mouse panning, and pointer-centered wheel zoom.
- Deterministic coverage for selection-region combination, transparent and tolerance-aware Magic matching, zoom stepping, point-anchored zoom, Fit calculations, and pan bounds.

### Changed

- Make the zoom readout a true 100% reset, extend stepped zoom from 25% through 6400%, and make Fit respond to artboard dimensions and the available workspace.
- Report exact selected-cell counts and mask bounds throughout the Arcade Bloom tool panel, stage, contextual toolbar, and status bar.
- Move animation playback to `Shift+Space` so holding `Space` can provide temporary canvas navigation without changing tools.
- Bumped the application version to `0.16.0`.

## [0.15.1] - 2026-07-22

### Fixed

- Replaced native HTML layer drag-and-drop with WebView-safe pointer reordering so dragging the dotted grip now works in the desktop app.

### Changed

- Added cyan before/after insertion feedback, dragged-row feedback, and gesture cleanup outside the Layers panel while preserving the adjacent visibility, lock, and property controls.
- Bumped the application version to `0.15.1`.

## [0.15.0] - 2026-07-22

### Added

- Advanced Layer Studio with inline frame-local renaming, drag-and-drop plus arrow reordering, current-frame duplication, and a compact selected-layer property shelf.
- Frame-local opacity and Normal, Multiply, Screen, Overlay, Add, and Subtract blend modes with exact shared compositing across the live canvas, timeline thumbnails, visible-pixel eyedropper, tile preview, PNG, sprite-sheet, and animated GIF output.
- Styled layer action menu with Merge Down, Flatten Visible, duplicate, rename, and protected delete commands.
- Project-file and recovery persistence for frame-local layer settings and order, including backward-compatible defaults for older schema-v1 projects.
- Reducer and blend-math coverage for frame isolation, duplication, merge, flatten, file migration, and all six blend modes.

### Changed

- Preserve hidden layers during Flatten Visible and prevent merge or flatten operations from changing locked artwork.
- Group an opacity slider gesture into one Undo step and make all structural Layer Studio actions fully Undo/Redo-aware.
- Bumped the application version to `0.15.0`.

## [0.14.2] - 2026-07-22

### Added

- Editable 1–512 pixel width and height controls for single-PNG imports, with aspect locking plus one-click **Fit 512** and **Fit canvas** presets.
- Direct nearest-neighbor resampling from decoded RGBA sources into the chosen editable size, preserving crisp pixel edges and PNG alpha without first allocating the full oversized source as project pixels.

### Fixed

- Keep the complete source image visible inside Import Studio at every supported window size instead of allowing large square PNG previews to overflow and show only part of the artwork.
- Automatically fit oversized single images inside the supported 512 × 512 project limit so a 1024 × 1024 PNG can immediately create a valid 512 × 512 project.
- Preserve equal left and right backdrop spacing around Import Studio at the 960-pixel minimum window width.

### Changed

- Show source and target dimensions separately throughout the single-image workflow, and apply the selected import size consistently to new-project, new-layer, and current-cel destinations.
- Bumped the application version to `0.14.2`.

## [0.14.1] - 2026-07-21

### Fixed

- Let Import Studio number fields remain temporarily empty while editing, so Backspace followed by a new value replaces the previous number instead of immediately forcing `1` and prefixing subsequent input.
- Normalize blank, fractional, or out-of-range slice values only when editing ends, with an inline validation message and disabled import action while a draft is incomplete.

### Changed

- Replace the WebView's low-contrast native number spinners with larger, high-contrast up and down controls while retaining direct typing and keyboard arrow support.
- Expand and rebalance Import Studio across maximized, standard, and minimum-size windows with a larger preview, more legible controls, and no content overlap or overflow.
- Bumped the application version to `0.14.1`.

## [0.14.0] - 2026-07-21

### Added

- Arcade Bloom Import Studio for transparent PNG artwork, with exact pixel previews, file-picker and drag-and-drop entry, source validation, palette keep/merge/replace policies, and an unsaved-work safeguard before creating a new project.
- Editable single-image destinations for a new project, a frame-local layer, or the active cel, with centered placement, clipping warnings, alpha preservation, and atomic Undo/Redo.
- Sprite-sheet slicing with configurable cell size, rows, columns, spacing, margins, row-major or column-major order, live grid overlays, and import as a new animated project or inserted frames.
- Canvas Operations with side-by-side before/after previews, project-wide canvas resizing from nine anchors, transparent or background-color expansion, and nearest-neighbor artwork scaling with optional aspect locking.
- Deterministic coverage for RGBA conversion, sprite slicing order, palette policies, clipping and anchoring, nearest-neighbor scaling, frame-local imports, multi-frame imports, background expansion, and complete-document history.

### Changed

- Apply imports and canvas transforms across their complete structural scope as one recoverable Undo/Redo operation while preserving frame-local layer selection.
- Allow native PNG paths chosen or dropped by the user to enter the Tauri filesystem scope only after extension, file type, size, and canonical-path validation.
- Bumped the application version to `0.14.0`.

## [0.13.0] - 2026-07-21

### Added

- A complete Arcade Bloom Tiles workspace reached from the left rail, with Standard and Seamless drawing modes and compact controls that remain fully accessible at the 960 × 680 minimum window size.
- Wraparound Pencil, Eraser, Fill, Line, Rectangle, and Ellipse behavior across opposite canvas edges, including selection masking and locked-layer protection.
- Horizontal, vertical, and quad symmetry with deduplicated center-line pixels on odd canvases plus cyan and violet artboard guides.
- A floating live 3×3 repeat preview that composites visible pixel layers during drawing while excluding reference artwork and editor-only overlays.
- One-pixel directional offsets and a center-seams action that shift the complete active cel toroidally as atomic Undo/Redo edits.
- Deterministic coverage for corner wrapping, clipped and selected brushes, seamless flood-fill connectivity, symmetry, precision shapes, offsets, history, and legacy project files.

### Changed

- Persist Tile mode, Repeat Preview, and Symmetry in project files and crash recovery with backward-compatible defaults for existing schema-v1 `.jtp` files.
- Make the top mode control and workspace rail reflect Canvas or Tiles context while preserving the established editor shell.
- Bumped the application version to `0.13.0`.

## [0.12.1] - 2026-07-21

### Fixed

- Constrain the timeline control rail's rows to their available width so the hold, transport, frame-rate, and batch-action controls retain an even right inset instead of overflowing into the panel border.

### Changed

- Bumped the application version to `0.12.1`.

## [0.12.0] - 2026-07-21

### Added

- Shift-range and Ctrl-additive frame selection with a violet range rail, cyan active-frame treatment, selected counts, and scrolling timeline thumbnails.
- WebView-safe pointer-driven frame and selected-block reordering with acid-lime insertion feedback and preserved internal order.
- Batch frame duplication and deletion that preserve artwork, frame-local layers, visibility, locks, remembered layer selection, and hold timing.
- Per-frame 1× through 12× hold durations, compact thumbnail badges, selected-range playback, and a functional project Loop or Play once control.
- Deterministic coverage for selection ranges, block ordering, batch edits, bounded holds, history, legacy project files, duration-aware metadata, and GIF timing.

### Changed

- Drive timeline playback from each frame's hold multiplier while retaining FPS as the base animation tempo.
- Persist frame order and hold timing in `.jtp` files and crash recovery, with a backward-compatible 1× default for existing schema-v1 projects.
- Make drag ordering, hold changes, batch duplicate/delete, and loop changes atomic Undo/Redo document edits.
- Preserve ordered hold multipliers and effective durations in sprite-sheet JSON, animated GIF encoding, and Export Studio's GIF preview.
- Expand and polish the Arcade Bloom timeline while retaining a usable scrolling strip and control rail at the 960 × 680 minimum desktop size.
- Bumped the application version to `0.12.0`.

## [0.11.0] - 2026-07-21

### Added

- A native Windows screen picker that samples from a frozen capture of the complete virtual desktop, including monitors with negative coordinates.
- An always-on-top Arcade Bloom Pixel Lens with a 9 × 9 neighborhood, custom pipette cursor, exact hex, RGB, and screen-coordinate readouts, and monitor-aware edge placement.
- **Pick from screen** actions in the Eyedropper panel and Color footer plus a global editor shortcut at `Shift+I`.
- Deterministic coverage for desktop pixel addressing, edge-aware lens placement, native-result validation, and foreground/background role handling.

### Changed

- Left-click now returns a system-picked color to the foreground role, right-click returns it to the background role, and `Escape` cancels while reliably restoring and focusing JT Pixel.
- Browser builds now explain that system-wide sampling requires the Windows desktop app.
- Bumped the application version to `0.11.0`.

## [0.10.2] - 2026-07-21

### Added

- A live 9 × 9 Pixel Lens for persistent Pick mode and temporary `Alt` sampling, with the center pixel's hex value, RGB values, canvas coordinates, transparency state, and active Layer or Visible source.
- A custom pipette cursor plus edge-aware lens placement that keeps the sampled pixel and magnified neighborhood visible near every artboard boundary.
- Deterministic coverage for active-layer, composited-visible, transparent, and out-of-bounds Pixel Lens sampling.

### Changed

- Left-click and drag now sample the foreground color while right-click and drag sample the background color; transparent pixels leave both roles unchanged.
- Bumped the application version to `0.10.2`.

## [0.10.1] - 2026-07-21

### Fixed

- Replace unreliable native swatch drag-and-drop with pointer-driven palette reordering that works consistently in the Tauri WebView, including clear source and destination feedback and one Undo step per completed move.

### Changed

- Bumped the application version to `0.10.1`.

## [0.10.0] - 2026-07-21

### Added

- Palette Studio with project color usage counts, Add, Update, Remove, drag and arrow reordering, and deterministic extraction of colors used by artwork.
- Precise HSV, RGB, and hex color editing, foreground/background color roles, quick swap, and an eight-color recent history.
- Eyedropper sampling from the active layer or composited visible painted layers, including click-and-drag sampling and temporary `Alt` sampling without leaving the current tool.
- Scoped color replacement for the active selection, current cel, matching layer across frames, or entire project, with live affected pixel/cel counts and locked-artwork reporting.
- Automated coverage for color conversion, palette extraction, visible compositing, scoped replacement, alpha preservation, lock protection, persistence actions, and Undo/Redo.

### Changed

- Save project palette edits in `.jtp` files and recovery snapshots, track them in dirty state, and include each palette operation in Undo/Redo history.
- Apply a pixel replacement and its optional source-swatch update as one atomic document edit and one Undo step.
- Bumped the application version to `0.10.0`.

## [0.9.1] - 2026-07-21

### Fixed

- Preserve the active marquee through Undo and Redo instead of clearing it whenever document history changes.
- Restore the matching pre-transform selection bounds on Undo and transformed bounds on Redo, allowing an alternate move immediately after stepping back.
- Keep manually created selections stable while undoing unrelated drawing edits, without persisting selection geometry in `.jtp` project files.

### Changed

- Bumped the application version to `0.9.1`.

## [0.9.0] - 2026-07-21

### Added

- Pixel-snapped rectangular marquee selections with drag creation, Select All, live size and origin feedback, and safe clearing when changing layers or frames.
- Drag movement, one- or eight-pixel keyboard nudging, Cut, Copy, Paste, Duplicate, horizontal and vertical Flip, 90-degree clockwise Rotate, Delete, and Deselect commands.
- An app-internal pixel clipboard that carries selections across frames, layers, and projects, plus a compact Arcade Bloom contextual toolbar and selection guidance panel.
- Deterministic automated coverage for bounds normalization, movement clamping, clipboard coordinates, deletion, flips, rotation, selection masking, and bounded flood fill.

### Changed

- Constrain Pencil, Eraser, Fill, Line, Rectangle, Ellipse, and Clear edits to the active selection without changing pixels outside its marquee.
- Treat every completed selection transform as one Undo/Redo cel edit while keeping the marquee and clipboard transient and outside `.jtp` project data.
- Allow read-only copying from locked layers while blocking all selection commands that would mutate protected artwork.
- Bumped the application version to `0.9.0`.

## [0.8.1] - 2026-07-21

### Added

- Frame-local lock and unlock controls for pixel layers, with clear Arcade Bloom locked states in the layer list and canvas header.
- Persisted layer locks in project files and crash recovery, including backward-compatible defaults for existing schema-v1 `.jtp` files.
- Automated coverage for lock enforcement, frame isolation, frame duplication, layer cleanup, file round trips, and Undo/Redo.

### Changed

- Block Pencil, Eraser, Fill, precision shapes, and cel clearing while the active pixel layer is locked, with reducer-level protection against non-UI edits.
- Keep the Courier Reference permanently locked while allowing ordinary pixel layers to be locked independently on each frame.
- Bumped the application version to `0.8.1`.

## [0.8.0] - 2026-07-21

### Added

- Functional Line, Rectangle, and Ellipse tools with immediate pixel-accurate drag previews on the active frame and layer.
- Outline and Filled modes for rectangles and ellipses, with current color, opacity, and brush-size support where applicable.
- `Shift` constraints for horizontal, vertical, and 45-degree lines plus perfect squares and circles.
- Deterministic rasterization and constraint coverage for endpoints, bounds, shape modes, stroke thickness, clipping, and no-op placements.

### Changed

- Treat each completed precision shape as one Undo/Redo entry while cancelled previews leave the document unchanged.
- Replace the inactive brush-pattern area with contextual Arcade Bloom precision controls whenever Line, Rectangle, or Ellipse is selected.
- Avoid creating drawing history when a brush or precision shape does not change any pixels.
- Bumped the application version to `0.8.0`.

## [0.7.3] - 2026-07-21

### Added

- Explicit **Loop forever** and **Play once** controls for Animated GIF export, independent of the project's timeline Loop setting.
- Playback-aware GIF previews that continuously cycle in Loop forever mode and stop on the final frame in Play once mode.

### Changed

- Remember the GIF playback choice with other export preferences while migrating existing `v1` preferences to the new `v2` schema without losing prior selections.
- Focus the remembered output format when Export Studio opens so keyboard focus and the visible selected state stay aligned.
- Bumped the application version to `0.7.3`.

## [0.7.2] - 2026-07-21

### Added

- Animated GIF as a third Export Studio output, with contiguous frame ranges, live playback preview, project FPS timing, project loop behavior, integer scaling, and transparent or solid backgrounds.
- Worker-based GIF encoding with exact per-frame palettes where possible, automatic 256-color quantization when needed, one-bit transparency, progress feedback, and memory-safe animation limits.
- Deterministic GIF signature, looping, transparency, rendering, timing, filename, validation, native save-path, and storage coverage.

### Changed

- Extended the native export handoff and browser download fallback to save format-correct `.gif` or `.png` files with matching filters and MIME types.
- Lazy-load GIF encoding code only when an animated export starts, keeping the normal editor bundle focused.
- Bumped the application version to `0.7.2`.

## [0.7.1] - 2026-07-20

### Fixed

- Prevent Export Studio from freezing at **ENCODING…** before its Windows Save dialog appears by replacing the main-thread blocking dialog call with Tauri's asynchronous save API.
- Preserve narrowly scoped PNG and optional sibling JSON filesystem access after the asynchronous dialog returns, including extension normalization and clean cancellation.

### Changed

- Added frontend ordering and cancellation coverage plus Rust export-path normalization tests for the native handoff.
- Reserved animated GIF export for `0.7.2` so this critical responsiveness fix can ship as the `0.7.1` semantic patch release.
- Bumped the application version to `0.7.1`.

## [0.7.0] - 2026-07-20

### Added

- Arcade Bloom Export Studio available from the top toolbar and `Ctrl+E`, with live pixel-perfect previews, exact output dimensions, PNG size estimates, and resettable remembered preferences.
- Lossless current-frame PNG export and ranged sprite-sheet export with row, column, and configurable grid layouts.
- Integer nearest-neighbor scaling from 1× through 32×, transparent or solid backgrounds, and adjustable sprite spacing and padding.
- Optional sibling JSON metadata describing the image, frame coordinates, source and output dimensions, frame timing, FPS, and loop state.
- Native save-path selection, narrowly scoped filesystem access, and an **Open folder** action after successful desktop exports.
- Deterministic compositor, layout, metadata, preference, native-storage, and safety-limit test coverage.

### Changed

- Build exports exclusively from visible frame-local pixel layers so reference layers, hidden artwork, onion skin, canvas backgrounds, and grids remain editor-only.
- Keep export preferences outside project files, dirty state, and Undo/Redo history.
- Bumped the application version to `0.7.0`.

## [0.6.1] - 2026-07-20

### Added

- Arcade Bloom Canvas View controls with checkerboard, dark neutral, mid neutral, and light neutral workspace backgrounds.
- Off, Subtle, Crisp, and Contrast pixel-grid modes, plus a `G` shortcut that hides the grid and restores the previously selected visible style.
- Persistent local canvas-view preferences with a one-click reset to the clearer default view.

### Changed

- Use the Crisp grid by default and adapt grid-line color to the selected background so individual cells remain legible on small canvases such as 16 × 16.
- Keep canvas-view preferences outside project files, document dirty state, and Undo/Redo history so changing the workspace never changes the artwork.
- Bumped the application version to `0.6.1`.

## [0.6.0] - 2026-07-20

### Added

- Arcade Bloom New Project dialog available from the top toolbar and `Ctrl+N`, with project naming, live canvas blueprint, and safe keyboard cancellation.
- Custom blank canvases from 1 × 1 through 512 × 512 pixels, including 16, 32, 64, and 128 pixel square presets.
- Blank Canvas setup with one frame and one editable layer, alongside the original 64 × 64, eight-frame Courier Practice template.
- Styled confirmation before a new project replaces unsaved session work, with the safe **Keep editing** choice focused by default.
- Automated coverage for blank and Courier document creation, validation boundaries, editable starter state, and custom project-file round trips.

### Changed

- Starting a new project now clears the previous file path, recovery snapshot, playback state, and Undo/Redo history before opening the clean document.
- Canvas artboards now show transparency and preserve the true proportions of square, portrait, and landscape documents.
- Bumped the application version to `0.6.0`.

## [0.5.1] - 2026-07-20

### Fixed

- Keep `Ctrl+Z`, `Ctrl+Y`, and `Ctrl+Shift+Z` available while the FPS range or another non-text input retains focus.
- Group a complete pointer drag on the FPS slider into one history step so intermediate range values cannot crowd out earlier Undo entries.

### Changed

- Preserve separate Undo steps for individual frame-rate `+` and `−` button clicks.
- Bumped the application version to `0.5.1`.

## [0.5.0] - 2026-07-20

### Added

- Bounded 100-step project history for completed pencil and eraser strokes, bucket fills, cel clearing, frame-local layer changes, frame duplication and deletion, and animation frame-rate changes.
- Functional Undo and Redo toolbar controls with `Ctrl+Z`, `Ctrl+Y`, and `Ctrl+Shift+Z` shortcuts.
- Automated history coverage for saved checkpoints, rejected edits, structural context restoration, branched edits, Save As metadata, opened projects, and the history limit.

### Changed

- Keep Undo and Redo available after saving while treating the saved history position as the clean checkpoint.
- Restore the relevant frame and layer when undoing or redoing document structure, without recording ordinary frame or layer navigation as edits.
- Clear Redo after a new branched edit, reset history after opening or restoring another document, and keep history session-only rather than storing it in `.jtp` files.
- Remove obsolete recovery data when undo returns a project to its saved state.
- Bumped the application version to `0.5.0`.

## [0.4.3] - 2026-07-20

### Added

- Persist the active workspace frame in project files and recovery snapshots so work reopens exactly where it was saved.

### Changed

- Keep schema-v1 project files without workspace metadata compatible by opening them on their first frame.

## [0.4.2] - 2026-07-20

### Added

- Arcade Bloom confirmation dialog before opening another project over unsaved work, including safe default focus and Escape-to-cancel behavior.

### Fixed

- Prevent `Ctrl+S`, `Ctrl+Shift+S`, and `Ctrl+O` from also selecting the Select or Ellipse drawing tools.

### Changed

- Replaced the native unsaved-project warning with an in-app dialog and removed the no-longer-needed native confirm permission.

## [0.4.1] - 2026-07-20

### Fixed

- Create JT Pixel's app-data directory before writing the first crash-recovery snapshot, preventing `Recovery paused` errors on fresh installations.

## [0.4.0] - 2026-07-20

### Added

- Native Tauri Open and Save dialogs for `.jtp` project files, including current-path reuse and Save As through `Ctrl+Shift+S`.
- Strict schema-v1 project validation for dimensions, palettes, layers, frames, animation settings, cel references, and pixel bounds before loading files.
- Debounced crash-recovery snapshots in the application-data directory with a polished restore/discard experience on the next launch.
- Project file notifications, visible `READY`, `SAVED`, `UNSAVED`, and `RECOVERY READY` status, unsaved-open confirmation, and close protection.
- Automated coverage for project serialization, invalid-file rejection, recovery snapshots, native storage calls, document replacement, and save metadata.

### Changed

- Activated the existing Open and Save toolbar controls and added `Ctrl+O`, `Ctrl+S`, and `Ctrl+Shift+S` shortcuts.
- Added narrowly scoped Tauri dialog and filesystem permissions for user-selected project files and the single app-data recovery file.
- Bumped the application version to `0.4.0`.

## [0.3.4] - 2026-07-20

### Fixed

- Removed the layer-row selection transition that briefly left the previous frame's layer looking selected after switching frames.
- Made remembered layer selection appear immediately while preserving hover, frame-local membership, and selection behavior.

### Changed

- Bumped the application version to `0.3.4`.

## [0.3.3] - 2026-07-20

### Fixed

- Remembered the selected layer independently for every frame so switching away and back restores the frame's previous working layer.
- Kept per-frame selection valid when adding or deleting layers and copied the source selection when duplicating a frame.

### Changed

- Bumped the application version to `0.3.3`.

## [0.3.2] - 2026-07-20

### Fixed

- Scoped layer deletion to the active frame so removing a layer no longer removes its artwork or membership from other frames.
- Kept at least one editable pixel layer available on every frame and automatically selected a valid fallback after frame switches or deletion.

### Changed

- New layers now belong only to the frame where they are created, matching the frame-local deletion model.
- Frame duplication now copies exact layer membership alongside cel pixels and visibility settings.
- Bumped the application version to `0.3.2`.

## [0.3.1] - 2026-07-20

### Fixed

- Replaced whole-canvas bucket painting with a four-way flood fill that respects closed pixel boundaries and replaces only the connected region under the pointer.
- Scoped layer visibility to the active frame so hiding a layer no longer hides that layer's artwork throughout the entire animation.
- Preserved per-frame visibility when duplicating frames and removed stale visibility state when deleting frames or layers.

### Changed

- Clarified layer visibility controls as frame-specific and expanded regression coverage for bounded fill and frame-scoped visibility.
- Bumped the application version to `0.3.1`.

## [0.3.0] - 2026-07-20

### Added

- Versioned schema-v1 project document with real layers, frames, animation settings, palette data, and sparse per-cel pixel storage.
- Functional layer creation, deletion, selection, visibility, locking safeguards, and live pixel thumbnails.
- Functional frame duplication and deletion with deep-copied cel data, dynamic previews, counts, and playback traversal.
- Document reducer tests covering seed invariants, cel isolation, frame duplication, deletion safeguards, visibility, dirty state, and frame-rate bounds.

### Changed

- Painting now batches live pointer input and commits one document update per completed stroke, preserving pixels when switching layers or frames.
- Canvas composition, timeline previews, status readouts, clear-cel behavior, and the unsaved indicator now derive from the shared project document.
- Repository workflow instructions now require a `What to test` checklist in every release summary.
- Bumped the application version to `0.3.0` for the first document-engine release.

## [0.2.0] - 2026-07-20

### Added

- Configurable automatic update checks with a five-minute default cadence and persisted manual, 1, 5, 15, 30, and 60-minute options.
- Arcade Bloom update settings dialog and notification states for availability, download progress, installation, current-version confirmation, and recoverable errors.
- Signed Tauri updater integration with authenticated packages, passive Windows installation, and automatic relaunch.
- GitHub Releases update feed backed by `latest.json` and signed NSIS artifacts on every `master` push.

### Changed

- Extended the Windows installer workflow so every push still publishes its installable workflow artifact while `master` also publishes a versioned GitHub Release for in-app updates.
- Bumped the application version to `0.2.0`, the first updater-aware JT Pixel release.

## [0.1.3] - 2026-07-20

### Fixed

- Removed cached installer bundles before each CI build so checksum and artifact steps only process the installer created for the current commit.

## [0.1.2] - 2026-07-20

### Changed

- Upgraded the official GitHub checkout, Node setup, cache, and artifact actions to their current Node 24-compatible major versions.

### Fixed

- Removed deprecated Node 20 runtime annotations from Windows installer workflow runs.

## [0.1.1] - 2026-07-20

### Added

- GitHub Actions workflow that builds a Windows x64 NSIS installer on every push and on manual dispatch.
- Downloadable installer artifacts named for the source commit and retained for 14 days.
- SHA-256 checksum manifest alongside every CI-built installer.
- Dedicated `tauri:dev` and `tauri:build` npm scripts.

### Changed

- Enabled Tauri NSIS bundling with a current-user installation mode and Windows package metadata.
- Expanded the README with installer build commands, artifact download instructions, and unsigned-build expectations.

## [0.1.0] - 2026-07-20

### Added

- Initial Rust and Tauri 2 desktop application foundation.
- React, TypeScript, and Vite frontend architecture.
- Arcade Bloom visual design system with responsive desktop editor shell.
- Componentized tool rail, drawing panel, canvas workspace, color inspector, layers panel, animation timeline, and status bar.
- Interactive 64 × 64 paint layer with pencil, eraser, fill, brush size, opacity, color, and pixel-perfect controls.
- Layer and frame selection, onion-skin state, playback controls, frame-rate adjustment, and keyboard shortcuts.
- Original pixel-art space courier scene and generated cross-platform application icons.
- Frontend type checking, production build scripts, and native Rust validation workflow.
