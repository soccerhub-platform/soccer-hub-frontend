# SoccerHub Frontend Design System

## Purpose

This file is the source of truth for the SoccerHub UI. Pages must not invent their own header sizes, table behavior, colors, shadows, or action placement.

## Visual direction

SoccerHub admin UI uses an Apple-inspired operational product style:

- canvas: `#f5f5f7`;
- surface: `#ffffff`;
- text: `#1d1d1f`;
- muted text: slate scale;
- single interactive accent: `#0066cc`;
- no `cyan`, `teal`, `gray`, `stone`, `red`, `admin-*`, or `dispatcher-*` Tailwind color namespaces in product UI;
- no `shadow*` classes;
- use borders and surface contrast for hierarchy.

Semantic colors are allowed only for state:

- success: `emerald`;
- warning: `amber` / `orange`;
- danger: `rose`;
- neutral: `slate`;
- info/interactive: `#0066cc` / `blue`.

## Typography contract

Use centralized CSS tokens from `src/index.css`.

| Role | Class | Use |
|---|---|---|
| Page title | `ui-page-title` | List/index pages: Clients, Trials, Groups, Students |
| Detail title | `ui-detail-title` | Entity detail headers: client name, student name, contract number |
| Modal title | `ui-modal-title` | Dialog/drawer titles |
| Card title | `ui-card-title` | Main card/panel headings |
| Section title | `ui-section-title` | Small sections inside details/cards |
| Metric value | `ui-metric-value` | KPI values and dashboard numbers |

Rules:

- Do not write page headers with raw `text-xl`, `text-2xl`, `text-3xl`, `text-4xl`, or `text-[28px]`.
- Do not add page title classes locally. Use `PageHeader`, `WorkspaceHeader`, or the typography tokens above.
- Detail headers should show only primary identity + essential status/metadata. Avoid duplicated eyebrow/title text.

## Page shell contract

- Top-level admin pages use `PageShell` without local max-width, horizontal padding, or vertical-spacing overrides.
- `PageShell` owns the `1440px` content width and `20px` section gap. Wider layouts are allowed only for genuinely horizontal workspaces such as kanban boards.
- Do not use page-local `space-y-4/5/6` to change the rhythm between the header, metrics, filters, and data surface.

## Header contract

List pages use this structure:

```text
Page title
Short description
Primary actions on the right
Filters below the header
Metrics below filters only if useful
```

Breadcrumbs are not shown on top-level index pages when the only breadcrumb item repeats the page title. Use breadcrumbs only for nested/detail contexts, for example `Пробные занятия / Иван Иванов`.

Detail pages use this structure:

```text
Breadcrumbs
Header surface
  icon/avatar
  detail title
  status
  1-line essential metadata
  actions on the right
```

Avoid:

- repeated title in breadcrumb + eyebrow + h1;
- long explanatory text in the header;
- page-specific font sizes;
- hiding actions in different places without a reason.
- decorative uppercase eyebrow text above list/detail titles unless the design system explicitly defines that page variant.

## Metric card contract

KPI and summary cards must use `src/shared/ui/MetricCard.tsx`.

Structure:

```text
Metric card
  icon tile: 48x48, rounded-lg
  title: 14px / 600 / slate-600
  value: ui-metric-value
  note/delta: 14px / slate-500, semantic tone only when meaningful
```

Rules:

- Do not create page-local `MetricCard`, `KpiCard`, or `Metric` components for top-level summary cards.
- Do not use uppercase labels inside metric cards.
- Do not use circular KPI icons on one page and rounded-square KPI icons on another page.
- Use Action Blue for neutral/info metrics; use emerald/amber/rose only for actual success/warning/danger states.
- Metric cards use white surface, `rounded-2xl`, `border-black/[0.08]`, no shadows.

## shadcn registry contract

The project is configured as a shadcn registry project through `components.json`.

Rules:

- Always search for an existing production-ready solution before writing a UI component. Check the configured shadcn registries first, then the project's installed and approved libraries.
- Prefer composing or adapting an existing registry/library component over recreating its behavior locally. Preserve accessibility, keyboard navigation, focus management, positioning, collision handling, and scrolling supplied by the library.
- Write a custom primitive only when no suitable maintained solution exists or when existing solutions cannot satisfy the product requirement without harmful complexity. Document that decision next to the custom primitive.
- Wrap third-party primitives in a project adapter when product-specific styling or API normalization is needed; pages must not fork or duplicate the underlying implementation.
- Registry primitives live in `src/shared/ui/shadcn`.
- Add missing primitives through the official shadcn registry/CLI or MCP, not by inventing local primitive APIs.
- Project-specific components live one layer above registry primitives:
  - `src/shared/ui/Button.tsx`
  - `src/shared/ui/ActionMenu.tsx`
  - `src/shared/ui/DataTable.tsx`
  - `src/shared/ui/EntitySheet.tsx`
  - `src/shared/ui/FilterBar.tsx`
  - `src/shared/ui/FormField.tsx`
  - `src/shared/ui/ModalShell.tsx`
  - `src/shared/ui/PageHeader.tsx`
  - `src/shared/ui/MetricCard.tsx`
  - `src/shared/ui/StatusBadge.tsx`
  - `src/shared/ui/Workspace.tsx`
- Pages should import project adapters from `src/shared/ui` by default.
- Import registry primitives directly only when building a new reusable adapter or when the page truly needs the primitive API.
- Do not overwrite project-adapted primitives with generic registry styles without reviewing the visual contract.

## Table contract

Tables must use `src/shared/ui/shadcn/Table.tsx`.

Interactive rows must use `InteractiveTableRow`.

Rules:

- If the whole row opens a detail page, the whole row must be clickable, keyboard accessible, and show the same cursor/focus/hover style.
- If only one field is clickable, the row must not use clickable-row styling.
- Do not mix `button` rows, clickable `tr`, and text links for the same kind of table.
- Row actions must be visually separated from the main row open action.

Use `src/shared/ui/DataTable.tsx` for new data tables. It is the project adapter over the official shadcn/TanStack Table pattern. Do not recreate header rendering, interactive-row keyboard handling, empty rows, or server pagination inside a page.

## Filter contract

List filters live below `PageHeader` inside `src/shared/ui/FilterBar.tsx`.

Rules:

- Use registry `Select`, `Input`, and other controls inside `FilterBar`.
- Do not place an ordinary status/filter select in the page-header action slot.
- Header actions are reserved for entity creation or another primary page action.
- Keep filter labels visible when the meaning of a control is not obvious from its value.

## Form and overlay contract

- Use shadcn `Form` with React Hook Form and Zod for validated forms.
- Use `EntitySheet` for right-side create/edit/action flows.
- `EntitySheet` owns the right-drawer overlay, focus trap, Escape/outside-click behavior, page scroll lock, and fixed header/body/footer layout. Never reproduce those behaviors in a page.
- Legacy `ModalShell placement="right"` delegates to `EntitySheet`; new right-side flows import `EntitySheet` directly.
- The drawer header and footer stay fixed while only `entity-sheet-body` scrolls. Dropdowns and popovers portal above the drawer and manage their own internal scrolling.
- Use registry `Dialog` for centered modal tasks.
- Use `ActionMenu` for three or more secondary actions or when destructive actions must be visually separated.
- Page-level action menus must use `ActionMenu` or the registry `DropdownMenu` composition. Never position a menu with local `absolute`, `z-*`, or outside-click state; registry portals own collision handling, viewport scrolling, focus, and stacking.
- Entity and workflow states use `StatusBadge` with `info`, `success`, `warning`, `danger`, or `neutral` tones. Pages may map domain values to a tone and label, but must not recreate badge colors or geometry.
- Drawer state must be represented in the URL when it belongs to an entity detail flow, for example `?drawer=result`.
- Do not create page-local overlay portals, focus traps, outside-click handlers, or keyboard-close logic.
- Overlay backgrounds use `slate-950/25` with a light backdrop blur; panels and menus have no box shadow.

### Drawer header

- Every drawer has one visible title in `#1d1d1f` and a short description explaining the outcome of the action.
- Do not reuse a title class whose color depends on the surrounding light/dark surface. `EntitySheet` owns title contrast.
- The description answers “what will change after save”; field hints explain individual inputs.

### Form fields

- Pages must use the shared shadcn `Input` and `Textarea` exports. Do not introduce raw `<input>` or `<textarea>` elements; technical checkbox, radio, file, and hidden inputs also go through `Input`, which preserves their native geometry.
- Shared controls own height, radius, border, placeholder, focus, disabled, and error-state styling. Page-level classes may change layout width or textarea height, but must not redefine the control chrome.
- Empty text controls must have an example placeholder. A label names the value; a placeholder demonstrates its format.
- Every non-obvious field must have persistent helper text below the control. Do not use a placeholder as the only instruction because it disappears after input.
- Validated React Hook Form fields use shadcn `FormDescription`; simple controlled fields use the same `text-xs leading-5 text-slate-500` treatment.
- Required fields use `*` in the visible label and a concrete validation message.
- Select triggers must provide a placeholder even when a default value is normally supplied.

### Selection controls

- Use registry `Select` only for short, stable lists that users can scan without search (normally up to 8 options).
- Use shadcn `Checkbox` for independent boolean choices and `RadioGroup` for one choice from a visible option set. Do not style native checkbox/radio inputs inside pages.
- Use shadcn `ToggleGroup type="single"` for 2–7 compact visual choices. Do not loop raw buttons with page-local active-state classes.
- Legacy forms that still provide native `<option>` children use the project `NativeSelect` adapter. It is backed by the installed shadcn/Radix `Select`; pages must not introduce new raw `<select>` elements.
- Use `SearchableSelect`, backed by the official shadcn `Combobox` (Base UI), for clients, students, contracts, groups, coaches, or any dynamic/long list.
- Searchable selects must anchor to the full control width, stay inside the viewport, and scroll internally when their options exceed the available height.
- Keep the search query separate from the selected value. After an option is chosen and the menu closes, the control must continue to display the selected option label; clearing the search query must not clear the selection.
- Floating controls opened inside a drawer or dialog must portal into the closest dialog content, not directly into `body`; otherwise the modal layer may block pointer interaction.
- Search must match the visible label plus useful secondary data such as phone, email, or configured keywords. Keep the registry keyboard navigation and highlighted-option behavior; do not implement a custom absolutely positioned menu.
- Long menus must be collision-aware, stay inside the viewport, and scroll internally. They must never increase drawer height or extend below the screen.
- Searchable options should show a primary label and, when helpful, a secondary identifier such as phone, group, student, or contract number.

### Date and time controls

- Do not use raw or shadcn-styled `input type="date"` / `datetime-local` in product forms. Use the shared `DatePicker`, backed by the official shadcn Calendar + Popover pattern.
- Date popovers opened inside a drawer or dialog portal into the closest dialog content and remain fully clickable.
- Date values cross API and form boundaries as ISO `yyyy-MM-dd`; localization belongs only to the visual label.
- Keep min/max constraints in the picker and show a concrete placeholder such as “Выберите дату” or “Без даты окончания”.
- Use the shared time adapter for time-only and date-time values; do not create page-local time dropdowns.

### Loading states

- Use shadcn `Skeleton` for structural loading placeholders. Pages must not create raw `animate-pulse` blocks.
- Skeleton geometry should match the content it replaces; loading state must not shift the surrounding layout.

## Component ownership

Common rules belong in `src/shared/ui`.

Page modules should compose shared primitives and keep only page-specific content, data loading, and action wiring.
