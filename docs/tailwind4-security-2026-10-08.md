# Tailwind 4 security migration

The frontend migrated from Tailwind 3 to Tailwind 4.3.3 using the official upgrade tool. The legacy JavaScript theme configuration was moved into `src/index.css`; PostCSS now uses `@tailwindcss/postcss`, and shadcn points to the CSS-first configuration.

## Security

- `brace-expansion` and `source-map-js` were updated to patched releases.
- Tailwind 3's vulnerable `braces`, `chokidar`, `micromatch`, `fast-glob`, and `postcss-selector-parser` dependency chain was removed.
- `npm audit --audit-level=high` reports zero vulnerabilities, without audit suppression or dependency overrides.

## Compatibility fixes

- Migrated utility names while retaining the custom admin/dispatcher palette.
- Kept calendar, trials, and workspace CSS unlayered to preserve cascade priority.
- Preserved border, placeholder, and interactive cursor defaults.
- Corrected the upgrade tool's accidental rename of the Button `outline` variant; added regression tests for both soft variants and the rendered shared Button.
- Tailwind 4 requires modern browsers: Chrome 111+, Safari 16.4+, Firefox 128+.

## Verification

- TypeScript, ESLint, and production build passed.
- 98 unit tests passed.
- 52 Playwright tests passed across desktop and mobile, covering admin/dispatcher navigation, accessibility, leads, trials, sessions, details, and forms.
- Four tests requiring writes to real business data were intentionally skipped. Mutation behavior is also covered by mocked browser scenarios; this run does not certify all live-data mutations.
- The dashboard was visually checked against its pre-migration screenshot.

Backend code and production business data were not changed by this migration.
