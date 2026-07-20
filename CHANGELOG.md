# Changelog

All notable changes to JT Pixel are documented in this file.

The project follows [Semantic Versioning](https://semver.org/).

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
