# Changelog

All notable changes to **RestPulse** are documented in this file.

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
