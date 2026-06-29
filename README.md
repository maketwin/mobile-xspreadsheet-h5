# Mobile X-Spreadsheet H5

H5 mobile spreadsheet demo based on `x-data-spreadsheet`.

## Features

- Renders Excel-like grid with vendored `x-data-spreadsheet` source
- Mobile bottom cell editor
- Text, number, and date editing
- Cell value commit back to spreadsheet
- Pinch-to-zoom gesture layer
- Keyboard offset handling with `visualViewport`
- Mobile long-press cell menu

## Maintained Spreadsheet Source

The spreadsheet engine source is vendored under:

```text
src/vendor/x-spreadsheet
```

This lets us patch mobile-specific behavior directly instead of treating
`x-data-spreadsheet` as a black-box dependency.

Current mobile patches:

- Multi-touch is ignored by the internal touch scroller so the outer pinch zoom can work.
- Internal touch scrolling no longer always calls `preventDefault`.
- Built-in desktop editor is disabled in mobile mode.
- Desktop keyboard input and paste handlers are disabled in mobile mode.
- The app uses its own bottom cell editor and long-press menu.

## Mobile Adapter Package

New mobile-specific behavior should live outside the spreadsheet base.

The adapter package is located at:

```text
packages/mobile-spreadsheet-adapter
```

It provides a non-invasive `mountMobileSpreadsheetAdapter` entry plus helper
APIs for mobile adaptation, including client-point cell lookup, drag range
selection, edge auto-scroll while selecting, pinch gesture callbacks, and
spreadsheet resize bridging. The package is allowed to read the spreadsheet
runtime instance and DOM, but it must not modify `src/vendor/x-spreadsheet`.

## Local Preview

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 3462
```

Open:

```text
http://127.0.0.1:3462/
```

## GitHub Pages

The project includes `.github/workflows/pages.yml`.

After pushing to a GitHub repository, enable Pages with GitHub Actions as the source:

```bash
gh api --method POST repos/OWNER/REPO/pages -f build_type=workflow
```

Then push to `main` or manually run the `Deploy GitHub Pages` workflow.
