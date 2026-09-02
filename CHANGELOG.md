# Changelog

All notable changes to **RestPulse** are documented in this file.

## [1.3.8] - 2026-09-02
### Changed
- **4-Tier Clean Variable Scoping Hierarchy**: Refactored the variable scoping architecture to strictly enforce 4 distinct, predictable tiers:
  1. **Local Variables (`local`)**: Request & `.rest` file level (`@var = value`), evaluated with the highest priority override.
  2. **Environment Variables (`env`)**: Scoped to the active Project Environment Profile (Development, Staging, Production).
  3. **Organization Variables (`org`)**: Shared base variables across all projects within the active organization.
  4. **Global Variables (`global`)**: Workspace-wide fallback variables accessible everywhere.
- **Removed Folder-Level Scoping**: Removed folder-level variable overrides and folder variable management tabs from `EnvironmentManager`, `VarBadge`, `AutocompleteInput`, and resolution utilities (`envUtils`), preserving folders purely as clean organizational directory structures for `.rest` files.
- **Enhanced Variable Precedence UI**: Updated `EnvironmentManager`, `VarBadge`, `AutocompleteInput`, `SettingsModal`, and `QuickHelpModal` with clear color-coded scope indicators (`local`: emerald, `env`: sky, `org`: purple, `global`: amber).

## [1.3.7] - 2026-09-01
### Fixed
- **Restore Snapshot & Version Commit Rollback**: Fixed an issue where clicking "Restore Snapshot" did nothing in sandboxed iframe/browser environments due to blocked native `window.confirm` dialogs.
  - Replaced native `window.confirm` with an interactive, animated in-app confirmation modal across all sync operations (Restore Snapshot, Create New Gist, and Cloud Overwrite).
  - Enhanced snapshot restoration pipeline with immediate reactive state hydration (`onApplySyncedData`), local storage persistence, and non-blocking cloud fast-forward sync.
  - Added live progress indicator (`Restoring...` spinning state) and descriptive toast notifications with entity counts upon snapshot restoration.

## [1.3.6] - 2026-09-01
### Fixed
- **Hamburger Menu & Dropdown Stacking Layer**: Fixed an issue where the hamburger menu and header popovers were getting clipped or rendered beneath workspace panels.
  - Removed `overflow-hidden` from the top header container and added `relative z-40` stacking context.
  - Updated the hamburger menu toggle with the standard `Menu` icon and active sync badge.
  - Enforced top-tier `z-[999]` elevation and responsive max-height scroll bounds (`max-h-[calc(100vh-70px)] overflow-y-auto`) across all header popover drawers (Hamburger Tools, Organizations, Projects, Environments, and Live Theme Switcher).

## [1.3.5] - 2026-09-01
### Fixed
- **Tablet & Small Screen Header Visibility**: Resolved header element clipping and truncation on tablets (e.g. iPad portrait 768px, small laptops, and mobile screens).
  - Optimized Workspace Context bar text truncate limits (`Org`, `Project`, `Environment`) with responsive visibility.
  - Converted Center View Mode segmented controller (`Builder`, `.rest`, `Runner`, `History`) to icon-mode on tablet screens (`< lg`), expanding to full text labels on large screens (`>= lg`).
  - Streamlined utility actions to Dark/Light toggle, Settings shortcut (`sm:`+), and the More Tools Overflow popover with viewport boundary bounding (`max-w-[calc(100vw-24px)]`).

## [1.3.4] - 2026-09-01
### Added
- **Responsive Header Overflow & Hamburger Menu**: Introduced a dedicated more-tools popover menu (`MoreVertical`) on constrained and mobile viewports (< `1280px`). Consolidates less frequently used tools (Import/Export, Cloud & GitHub Sync, Theme presets preview switcher, Workspace Settings, Quick cURL import, and Help/Shortcuts) into a structured drawer.
- **Adaptive Screen-Width Breakpoints**: On ultra-wide and large screens (`xl:`+), displays the full direct-access toolbar. On compact screens, automatically condenses into a clean high-priority row (Dark/Light toggle, Settings button, and Overflow Menu), completely preventing header wrapping and horizontal scrolling.

## [1.3.3] - 2026-09-01
### Fixed
- **Top Bar Non-Scrollable Layout**: Eliminated horizontal scrollbars on the top navigation bar across all desktop and laptop screen sizes. Streamlined button padding, label responsive breakpoints (`hidden lg:inline`, `hidden sm:inline`), and workspace context capsule dimensions so all 3 header sections fit on a single horizontal line without overflow.

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
