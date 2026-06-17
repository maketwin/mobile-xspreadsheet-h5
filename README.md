# Mobile X-Spreadsheet H5

H5 mobile spreadsheet demo based on `x-data-spreadsheet`.

## Features

- Renders Excel-like grid with `x-data-spreadsheet`
- Mobile bottom cell editor
- Text, number, and date editing
- Cell value commit back to spreadsheet
- Pinch-to-zoom gesture layer
- Keyboard offset handling with `visualViewport`

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
