# Changelog

All notable changes to **RestStudio** are documented in this file.

## [1.5.6] - 2026-09-04
### Added
- **Response Schema Tab & JSON Schema Tree Inspector**:
  - Added a dedicated **Schema** tab in `ResponseViewer` that automatically analyzes and infers structure from JSON API responses.
  - Interactive **Schema Tree** view with recursive node expansion/collapse, color-coded type badges (`string`, `integer`, `number`, `boolean`, `object`, `array`, `null`), field search/filtering, required/optional tags, format indicators (`date-time`, `email`, `uuid`, `uri`, `ipv4`), sample value previews, and instant copy property paths.
  - Automatic **Standard Draft-07 JSON Schema** generation with syntax highlighting, copy-to-clipboard, and direct `.json` schema file download.
  - Auto-generated **TypeScript Interfaces & Types** generator (`.d.ts`) with syntax highlighting, copy-to-clipboard, and direct `.d.ts` file export.
  - Summary metrics strip displaying root type, total unique fields, max tree depth, and type distribution.

## [1.5.5] - 2026-09-03
### Fixed
- **HTTP Executor Private IP Protocol & Null Safety**:
  - Fixed protocol fallback in `executeHttpRequest` so private IPv4 subnets (`192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`) default to `http://` instead of `https://`.
  - Added null safety checks for `executeNeutralinoFetch` return payloads to avoid uncaught property access errors during native execution.
- **Postman & Insomnia Import/Export Enhancements**:
  - Expanded Postman collection parsing (`parsePostmanItem`) to extract structured `url.query` arrays and URL search parameters into `queryParams`.
  - Added support for Basic Auth (`username`/`password`) and API Key Auth (`X-API-Key`) across Postman and Insomnia import and export routines.
  - Enhanced Postman export (`exportToPostmanCollection`) with structured URL query parameters and authentication payloads.
  - Added support for Insomnia collection smart paste in `QuickCurlModal`.
- **OpenAPI YAML Parsing**:
  - Implemented a robust self-contained YAML parser `parseYamlToObj` capable of handling YAML scalar values, nested objects, list items, and multiline strings for Swagger / OpenAPI specifications.
- **Pre & Post-Request Script Sandbox (pm Object)**:
  - Added `pm.environment.get()` and `pm.variables.get()` methods with automatic fallback to scoped project and environment variable layers.
  - Expanded `pm.expect()` matchers to support deep equality (`.to.eql()`), type checks (`.to.be.a()`, `.to.be.an()`), numeric bounds (`.to.be.above()`, `.to.be.below()`), membership (`.to.be.oneOf()`), and property checks (`.to.have.property()`, `.to.have.lengthOf()`).
- **Collection Runner & History Viewer Theme Adaptation**:
  - Added full Light / Dark theme support and styling across `CollectionRunner` and `HistoryViewer` for unified appearance in all selected presets.

## [1.5.4] - 2026-09-03
### Fixed
- **UI Theme Icon, Text, and Background Consistency**:
  - Upgraded the `UITheme` interface with dedicated icon mappings (`iconType`: `palette`, `sun`, `moon`, `zap`, `terminal`, `sparkles`, `compass`, `book`) and expanded color palette definitions (`bg`, `surface`, `border`, `text`, `subtext`, `primary`, `accent`).
  - Refined theme CSS styles across all 6 presets (Default Slate, Cyberpunk Neon, Midnight OLED, Monokai Pro, Dracula, Nordic Frost, Solarized Light) ensuring accurate background gradients, surface tones, border contrast, badge text legibility, and high-contrast button icon styling.
  - Enhanced `InlineThemeSelector`, `SettingsModal`, and `Header` theme selectors with real-time mockup previews, dedicated theme icons, color swatch dots, and active checkmarks.

## [1.5.3] - 2026-09-03
### Fixed
- **Recursive Multi-Pass Variable Resolution**:
  - Enhanced `resolveEnvVariables` with recursive multi-pass resolution up to depth 5 with cycle protection.
  - Nested variables like `baseUrl = https://{{host}}:{{port}}` now cleanly expand both inner and outer variables across all scopes.
- **Inherited Project Authentication in Request Editor**:
  - Fixed `RequestEditor` header maps and generated code snippets (cURL, fetch, Python, Node, Go) when `request.auth.type` is set to `'inherit'`.
  - The editor now falls back to `projectAuth` (Bearer token, Basic Auth, or API Key) to ensure parity with execution.
- **REST File Parser Enhancements**:
  - Expanded `.rest` file variable regex to support hyphens and dots (e.g., `@my-var = 123` or `@auth.token = abc`).
  - Fixed query string splitting in `parseRestFileContent` for URLs containing secondary queries or redirect parameters.
- **TabBar Theme Adaptation**:
  - Added full light and dark mode theme styling to `TabBar` tabs, split layout buttons, and tab context menus.

## [1.5.2] - 2026-09-03
### Fixed
- **Save Request to Project Organization Dropdown**:
  - Fixed Organization and Project dropdown options failing to display organization names in the "Save Request to Project" modal (`SaveScratchpadModal`).
  - Added safe resolution and synchronization for `selectedOrgId` and `selectedProjectId` to ensure valid organization and project options are always matched and displayed.
  - Added rich option labels showing organization names, project counts, and icons (`🏢 Organization (X projects)`).
  - Enhanced theme adaptation (Dark and Light modes) for all select elements, inputs, and options in `SaveScratchpadModal`.
  - Improved header organization label responsiveness across all screen sizes.

## [1.5.1] - 2026-09-03
### Fixed
- **Request Execution & Scratchpad History Logging Error**: Fixed `"Cannot read properties of undefined (reading 'id')"` error when executing standalone scratchpad draft requests or requests executed when no project is actively selected.
  - Added safe optional chaining and fallback identifiers (`activeProject?.id || 'standalone_scratchpad'`) in `handleExecuteRequest` when creating request execution history entries.
  - Updated `RequestHistoryItem` interface in `types.ts` to allow optional `projectId`.

## [1.5.0] - 2026-09-03
### Added
- **Batch / Multi-Delete Workspace Manager**:
  - Implemented multi-select bulk deletion for Organizations, Projects, Environment Profiles, Variables (Global & Org scopes), Collection Files, Endpoints, and Scratchpad Drafts.
  - Added fast batch search, category badges, "Select All" toggles, and destructive bulk deletion confirmation modal with entity count summaries.
  - Added access points across the UI: Organization & Project header dropdown menus, Top Header Overflow Menu, and Sidebar Toolbar.
  - Integrated multi-select variable deletion into `EnvironmentManager` across Global, Organization, and Project scopes.

### Fixed
- **Automatic Tab Closing on Request Deletion**:
  - Deleting an endpoint request from the sidebar, collection file, or batch manager now automatically closes its associated tab in the workspace tab bar.
  - Deleting a collection file now automatically closes all open tabs for that file and its child endpoint requests.
  - Added smooth transition to adjacent remaining tabs or safe workspace fallback when all tabs are closed.
### Fixed
- **Organization & Project Deletion Safety Guard**: Fixed an `Uncaught TypeError: Cannot read properties of undefined (reading 'length')` that occurred during organization and project removal confirmation.
  - Added safe fallbacks for organization and project names in delete prompts to eliminate `"undefined"` name displays.
  - Added null-safe navigation and array guards across all organization, project, collection file, folder, and request state mutations.
  - Automated safe active workspace refocusing (switching active org, project, file, and request ID safely without throwing on empty entities).

## [1.4.0] - 2026-09-03
### Added
- **Standalone Scratchpad / Drafts (Zero Org / Zero Env Required)**:
  - Added full support for standalone draft requests that can be created, edited, and executed instantly without belonging to any Organization, Project, File, or Environment.
  - Added dedicated "Scratchpad / Drafts" sidebar section with create, duplicate, rename, delete, and quick actions.
  - Added "Save to Project" flow (`SaveScratchpadModal`) enabling one-click migration of any scratchpad draft into a project collection file.
  - Added "No Environment (Direct URL)" selection option to the environment selector for raw, un-templated requests.
  - Added "Standalone Scratchpad" target option in Quick New Request modal (`Ctrl+N`) and Quick cURL import modal (`Ctrl+I`).
- **Snapshot Deletion with Instant Refresh**:
  - Implemented cloud snapshot deletion in GitHub Sync modal with persistent exclusion tracking.
  - Automatic refresh of the snapshot list immediately after deletion.

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
