# Display Buffered PDF

[![npm version](https://img.shields.io/npm/v/display-buffered-pdf.svg)](https://www.npmjs.com/package/display-buffered-pdf)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#license)

A React/Next.js client-side component that previews PDF bytes on a canvas, provides page navigation and offers a download link. Written in TypeScript.

## Features

- Accepts `Uint8Array`, `ArrayBuffer` or Node.js `Buffer` (a `Uint8Array` subclass)
- Renders PDF pages with PDF.js and supports first/previous/next/last and page selection
- Accessible navigation landmarks, native buttons, labeled controls and status updates
- Download link with configurable filename
- CommonJS and ESM bundles with TypeScript declarations

## Requirements

- React 18.3.1+ or React 19
- A browser environment (Next.js App Router: use a Client Component)
- PDF.js 6.4.299-compatible runtime; modern browsers and worker support

## Installation

```bash
npm install display-buffered-pdf pdfjs-dist
```

## Setup (Next.js App Router)

**Important:** PDF.js requires a worker file whose version matches `pdfjs-dist`. Copy `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` to `public/pdf.worker.min.mjs`, then pass the worker URL explicitly. The default fallback loads the matching version from jsDelivr, which may be restricted by your Content Security Policy.

Create `app/components/PdfPreview.tsx`:

```tsx
'use client';

import DisplayBufferedPDF from 'display-buffered-pdf';

export default function PdfPreview({ pdfBytes }: { pdfBytes: Uint8Array | null }) {
  return (
    <DisplayBufferedPDF
      buffer={pdfBytes}
      workerSrc="/pdf.worker.min.mjs"
      title="Invoice PDF"
      downloadFileName="invoice.pdf"
    />
  );
}
```

To fetch a PDF in a Client Component:

```tsx
const response = await fetch('/api/invoice.pdf');
if (!response.ok) throw new Error('Could not load PDF');
const pdfBytes = new Uint8Array(await response.arrayBuffer());
```

Pass `pdfBytes` into the component. For Next.js server-to-client boundaries, serialize the data appropriately or fetch the PDF from the client; do not assume Node.js `Buffer` serialization across the boundary.

## Props

| Prop | Type | Description |
|---|---|---|
| `buffer` | `Uint8Array \| ArrayBuffer \| null` | PDF contents; `null` clears the viewer |
| `workerSrc` | `string` (optional) | Recommended URL for a version-matched worker |
| `title` | `string` (optional) | Accessible name of the preview, default `PDF document` |
| `downloadFileName` | `string \| false` (optional) | Download filename; `false` hides the link |
| `className` | `string` (optional) | CSS class on the preview section |

## Accessibility (WCAG 2.2)

The controls use native HTML buttons and selects, descriptive accessible names, a labeled navigation landmark and status/error messaging. Use visible focus outlines and sufficient contrast in your consuming application; test keyboard interaction and screen readers.

**Important limitation:** PDF.js canvas rendering is a *visual preview*, not an accessible text representation of a PDF. `role="img"` and an accessible name do not make PDF text available to screen readers. Users must have an accessible original PDF or equivalent HTML/text alternative. The download link alone does not guarantee accessible PDF content. Automated tests are not a claim of WCAG 2.2 AA compliance.

## Development

```bash
git clone https://github.com/huachenlihx/display-buffered-pdf.git
cd display-buffered-pdf
npm install
npm run typecheck
npm test
npm run test:coverage
npm run build
npm pack --dry-run
```

Tests use Vitest, React Testing Library, and jest-axe with a mocked PDF.js document and canvas context; a real-browser integration test with an actual PDF is still required before publishing.

## Migration notes from 1.0.3

This modernization removes bundled Tailwind/Radix UI and duplicated controls, changes the worker strategy to modern `.mjs` PDF.js workers, and permits browser byte arrays in addition to Node `Buffer`. Default styling changes and PDF.js upgrades may be breaking; test existing consumers before publishing. **A major version is generally more appropriate than a patch when these changes break compatibility.**

## Repository / issues

https://github.com/huachenlihx/display-buffered-pdf

## License

MIT © 2026 Hua Chen
