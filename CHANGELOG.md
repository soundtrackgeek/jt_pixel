# Changelog

All notable changes to JT Pixel are documented in this file.

The project follows [Semantic Versioning](https://semver.org/).

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
