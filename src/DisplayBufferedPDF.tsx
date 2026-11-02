'use client';

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

export interface DisplayBufferedPDFProps {
  /** PDF bytes, for example from an API response. Node Buffer is a Uint8Array. */
  buffer: Uint8Array | ArrayBuffer | null;
  /** Custom PDF.js worker URL; host a matching worker locally for production. */
  workerSrc?: string;
  /** Accessible title describing the PDF. */
  title?: string;
  /** Download filename, or false to hide the download link. */
  downloadFileName?: string | false;
  className?: string;
}

function toBytes(input: Uint8Array | ArrayBuffer): Uint8Array<ArrayBuffer> {
  const source = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
  const copy = new Uint8Array(source.byteLength);
  copy.set(source);
  return copy;
}

/** A canvas-based, client-side PDF preview with accessible navigation controls. */
export default function DisplayBufferedPDF({
  buffer,
  workerSrc,
  title = 'PDF document',
  downloadFileName = 'document.pdf',
  className,
}: Readonly<DisplayBufferedPDFProps>): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [status, setStatus] = useState<'empty' | 'loading' | 'ready' | 'error'>('empty');
  const [error, setError] = useState('');
  const [rendering, setRendering] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const totalPages = document?.numPages ?? 0;
  const currentPage = Math.max(1, Math.min(pageNumber, totalPages || 1));

  useEffect(() => {
    if (!buffer) {
      setDownloadUrl(null);
      return;
    }
    const url = URL.createObjectURL(new Blob([toBytes(buffer)], { type: 'application/pdf' }));
    setDownloadUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [buffer]);

  useEffect(() => {
    let cancelled = false;
    let task: import('pdfjs-dist').PDFDocumentLoadingTask | undefined;
    setDocument(null);
    setPageNumber(1);
    setError('');
    if (!buffer) {
      setStatus('empty');
      return;
    }
    setStatus('loading');
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        // Consumers may pass a locally hosted worker to avoid CDN requests.
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc ??
          `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        if (cancelled) return;
        task = pdfjs.getDocument({ data: toBytes(buffer) });
        const pdf = await task.promise;
        if (cancelled) {
          // The effect cleanup destroys the PDF loading task.
          return;
        }
        setDocument(pdf);
        setStatus('ready');
      } catch (cause) {
        if (!cancelled) {
          setStatus('error');
          setError(cause instanceof Error ? cause.message : 'Unable to open PDF.');
        }
      }
    })();
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [buffer, workerSrc]);

  useEffect(() => {
    if (!document || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) {
      setError('Canvas rendering is unavailable.');
      return;
    }
    let cancelled = false;
    let renderTask: RenderTask | undefined;
    setRendering(true);
    (async () => {
      try {
        const page = await document.getPage(currentPage);
        if (cancelled) return;
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        renderTask = page.render({ canvas, canvasContext: context, viewport });
        await renderTask.promise;
      } catch (cause) {
        // Cancelling a render during page navigation is expected.
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Could not render page.');
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [document, currentPage]);

  const unavailable = status !== 'ready' || rendering;
  return (
    <section className={className} aria-label={title}>
      <div role="status" aria-live="polite">
        {status === 'loading' && 'Loading PDF…'}
        {status === 'empty' && 'No PDF selected.'}
        {status === 'error' && 'Unable to open PDF.'}
        {rendering && status === 'ready' && 'Rendering page…'}
      </div>
      {error && <p role="alert">{error}</p>}
      {status === 'ready' && totalPages > 0 && (
        <nav aria-label="PDF page navigation" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
          <button type="button" onClick={() => setPageNumber(1)} disabled={unavailable || currentPage === 1} aria-label="First PDF page">First</button>
          <button type="button" onClick={() => setPageNumber(Math.max(1, currentPage - 1))} disabled={unavailable || currentPage === 1} aria-label="Previous PDF page">Previous</button>
          <label>
            Page{' '}
            <select aria-label="PDF page" value={currentPage} disabled={unavailable} onChange={(event) => setPageNumber(Number(event.currentTarget.value))}>
              {Array.from({ length: totalPages }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
            </select>
          </label>
          <span>of {totalPages}</span>
          <button type="button" onClick={() => setPageNumber(Math.min(totalPages, currentPage + 1))} disabled={unavailable || currentPage === totalPages} aria-label="Next PDF page">Next</button>
          <button type="button" onClick={() => setPageNumber(totalPages)} disabled={unavailable || currentPage === totalPages} aria-label="Last PDF page">Last</button>
        </nav>
      )}
      <canvas ref={canvasRef} role="img" aria-label={`${title}, page ${currentPage} of ${totalPages || 1}. Visual preview only; use an accessible PDF reader for text.`} style={{ display: status === 'ready' ? 'block' : 'none', maxWidth: '100%', height: 'auto' }} />
      {buffer && downloadUrl && downloadFileName !== false && (
        <p><a href={downloadUrl} download={downloadFileName}>Download PDF</a></p>
      )}
      <p>PDF pages are drawn on a canvas. Text is not accessible to screen readers through this preview. Download the PDF and use an accessible PDF reader for the document content.</p>
    </section>
  );
}
