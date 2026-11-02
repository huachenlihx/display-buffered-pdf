import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import DisplayBufferedPDF from '../index';

const getPage = vi.fn(async () => ({
  getViewport: () => ({ width: 200, height: 300 }),
  render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
}));
const destroy = vi.fn(async () => {});
vi.mock('pdfjs-dist', () => ({
  version: '6.4.299',
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: () => ({ promise: Promise.resolve({ numPages: 3, getPage, destroy }), destroy }),
}));

// jsdom does not implement PDF canvas painting; mock only that browser API.
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ clearRect: vi.fn() })) as never;
Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test-pdf') });
Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });

const bytes = new Uint8Array([37, 80, 68, 70]);

describe('DisplayBufferedPDF', () => {
  it('shows an empty state and no download without a PDF', () => {
    render(<DisplayBufferedPDF buffer={null} />);
    expect(screen.getByText('No PDF selected.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Download PDF' })).not.toBeInTheDocument();
  });

  it('loads a document and exposes navigation and download', async () => {
    render(<DisplayBufferedPDF buffer={bytes} title="Quarterly report" />);
    expect(await screen.findByRole('navigation', { name: 'PDF page navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download PDF' })).toHaveAttribute('download', 'document.pdf');
    expect(screen.getByRole('img', { name: /Quarterly report, page 1 of 3/ })).toBeInTheDocument();
  });

  it('changes pages using the selector and navigation buttons', async () => {
    const user = userEvent.setup();
    render(<DisplayBufferedPDF buffer={bytes} />);
    const next = await screen.findByRole('button', { name: 'Next PDF page' });
    await waitFor(() => expect(next).toBeEnabled());
    await user.click(next);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'PDF page' })).toHaveValue('2'));
    await waitFor(() => expect(next).toBeEnabled());
    await user.selectOptions(screen.getByRole('combobox', { name: 'PDF page' }), '3');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Last PDF page' })).toBeDisabled());
  });

  it('allows hiding the download link', async () => {
    render(<DisplayBufferedPDF buffer={bytes} downloadFileName={false} />);
    await screen.findByRole('navigation', { name: 'PDF page navigation' });
    expect(screen.queryByRole('link', { name: 'Download PDF' })).not.toBeInTheDocument();
  });

  it('has no automatically detectable axe violations in empty state', async () => {
    const { container } = render(<DisplayBufferedPDF buffer={null} />);
    expect((await axe(container)).violations).toEqual([]);
  });
});
