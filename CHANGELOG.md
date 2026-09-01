# Changelog

All notable changes to **RestPulse** are documented in this file.

## [1.3.2] - 2026-09-01
### Fixed
- **Executable Block Run Execution**: Fixed `.rest` code editor executable blocks where clicking "Run" did not provide visual execution feedback or display response data. Added async execution handling with live loading spinners (`Running...`), instant status code badges (`200 OK`, `404 Not Found`, etc.), latency/size indicators, sequential "Run All" batch execution, and an embedded multi-tab Response Inspector (Body, Headers, Tests, and Script Logs).
- **File Variable Resolution in .rest Code Mode**: Ensured `@variable = value` definitions parsed within `.rest` files are properly stored and synchronized with the scope context during execution.

## [1.3.1] - 2026-09-01
### Fixed
- **Header Alignment & Layout**: Resolved multi-line wrapping and broken element order in the top navigation bar. Realigned the header into a clean 3-part layout: Left (Brand & Workspace context), Center (View mode segmented controller: Request Builder, .rest Code, Runner, History), and Right (Import, Cloud Sync, Theme, Settings, Quick Help) along a single horizontal baseline.
- **Settings Tab Cleanup**: Removed native engine support card from the Network tab in Workspace Settings.

## [1.3.0] - 2026-09-01
### Changed
- **Unified Workspace Settings Hub**: Consolidated fragmented settings, theme picker, cloud sync controls, environment hierarchy, network guides, and shortcuts into a unified, professional tabbed modal (`Ctrl+,` / `Cmd+,`).
- **Streamlined Top Header Bar**: Replaced the nested "Settings & Tools" dropdown with direct, high-leverage action buttons (`Import`, `GitHub Cloud Sync`, `Theme Selector`, `Settings ⚙️`, and `Quick Help ?`), eliminating UI clutter and multiple modal hops.
- **Global Keyboard Shortcut**: Added universal `Ctrl+,` / `Cmd+,` hotkey to open Workspace Settings instantly.

## [1.2.1] - 2026-09-01
### Fixed
- **Instant Snapshot UI Reflection**: Fixed snapshot rollback where the restored commit wasn't fully reflected on the workspace screen. Restoring now immediately recalculates the active organization, active project, files, endpoints, and resets open tabs directly to the restored state.
- **Two-Way Git Snapshot Reversion**: Restoring a snapshot now writes the restored workspace back to the GitHub Gist HEAD, keeping cloud and local states in 100% sync and generating a fresh history entry.
- **CORS Raw-URL Handling**: Fixed CORS preflight errors when fetching large or truncated revision payloads from GitHub Gist.

## [1.2.0] - 2026-09-01
### Added
- **Safe Multi-Device Conflict Resolution**: Automatic cloud inspection on login preventing accidental data wipes when signing in on a new device.
- **Smart Workspace Merge**: Deep merging of organizations, projects, `.rest` files, and request execution histories based on timestamps and entity identifiers.
- **Interactive Cloud Decision Modal**: Allows users to choose between **"Load Cloud Workspace"**, **"Smart Merge (Combine Both)"**, or **"Keep Local Workspace"**.
- **Cloud Safety Warnings**: Guardrails on manual cloud push if remote Gist contains more endpoints than the local device.

## [1.1.0] - 2026-09-01
### Added
- **Free GitHub Gist Cloud Sync**: Zero-cost, zero-maintenance cloud workspace backup and revision history.
- **Git Commit Snapshot History**: Inspect and restore previous Git commit revisions of your workspace.

## [1.0.0] - 2026-08-30
### Added
- Initial release of RestPulse offline-first REST API Studio.
- Multi-project workspace with `.rest` file editor and live runner.
- Environment variables manager with dynamic interpolation and autocomplete.
