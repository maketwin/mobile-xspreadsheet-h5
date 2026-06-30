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
- Mobile drag range selection and selection resize handles
- Non-invasive mobile adapter package with type declarations

## Spreadsheet Base Boundary

The spreadsheet engine source is vendored under:

```text
src/vendor/x-spreadsheet
```

The current direction is to keep this Excel base stable. Mobile-specific
behavior should be implemented through the adapter package and demo integration
layer, not by modifying `src/vendor/x-spreadsheet`.

Adapter boundary:

- Allowed: read the spreadsheet runtime instance and DOM geometry, call existing
  selection/render/resize APIs, and surface mobile gestures through callbacks.
- Not allowed: patch the spreadsheet renderer, fork internal modules, or put
  mobile UI directly into the Excel base.
- Host-owned: bottom editor, long-press menu, selection handles, zoom UI, data
  persistence, permissions, and analytics.

## Mobile Adapter Package

New mobile-specific behavior should live outside the spreadsheet base.

The adapter package is located at:

```text
packages/mobile-spreadsheet-adapter
```

It provides a non-invasive `mountMobileSpreadsheetAdapter` entry plus helper
APIs for mobile adaptation, including client-point cell lookup, drag range
selection, selection resize handles, edge auto-scroll while selecting, pinch
gesture callbacks, and spreadsheet resize bridging.

The package includes JSDoc comments and `src/index.d.ts` so business projects
can get editor hints when integrating it.

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
