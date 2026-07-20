# Changelog

All notable changes to JT Pixel are documented in this file.

The project follows [Semantic Versioning](https://semver.org/).

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
