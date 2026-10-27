import { it, expect, vi, beforeEach } from 'vitest';
const { getDocument, recognizePage, terminate } = vi.hoisted(() => ({
  getDocument: vi.fn(),
  recognizePage: vi.fn(),
  terminate: vi.fn(),
}));
vi.mock('../src/lib/ocr', () => ({
  createOcr: async () => ({ terminate }),
  recognizePage,
}));
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  getDocument,
  GlobalWorkerOptions: {},
}));
import { extractPdf } from '../src/lib/pdf';
function mockPdf(pages: string[]) {
  const destroy = vi.fn().mockResolvedValue(undefined);
  getDocument.mockReturnValue({
    promise: Promise.resolve({
      numPages: pages.length,
      getPage: async (n: number) => ({
        getTextContent: async () => ({
          items: pages[n - 1] ? [{ str: pages[n - 1], hasEOL: true }] : [],
        }),
        cleanup: vi.fn(),
      }),
    }),
    destroy,
  });
  return destroy;
}
const file = () =>
  new File(['%PDF-1.7\nfixture'], 'fixture.pdf', { type: 'application/pdf' });
beforeEach(() => {
  vi.clearAllMocks();
  recognizePage.mockRejectedValue(new Error('OCR nie rozpoznał tekstu.'));
});
it('extracts all pages and keeps app metadata', async () => {
  const destroy = mockPdf(['Pierwsza strona', 'Druga strona']);
  const progress = vi.fn();
  const result = await extractPdf(file(), progress);
  expect(result).toEqual({
    text: '[Strona 1]\nPierwsza strona\n\n[Strona 2]\nDruga strona',
    pages: 2,
    fileName: 'fixture.pdf',
    ocrPages: [],
  });
  expect(progress).toHaveBeenLastCalledWith(2, 2);
  expect(destroy).toHaveBeenCalledOnce();
});
it('reads a scanned page by OCR and includes it without skipping', async () => {
  const destroy = mockPdf(['Tekst', '']);
  recognizePage.mockResolvedValue('Aneks: 13 100 PLN netto.');
  const result = await extractPdf(file(), vi.fn());
  expect(result.text).toContain('[Strona 2]\nAneks: 13 100 PLN netto.');
  expect(result.ocrPages).toEqual([2]);
  expect(terminate).toHaveBeenCalledOnce();
  expect(destroy).toHaveBeenCalledOnce();
});
it('fails visibly if OCR cannot read the page', async () => {
  const destroy = mockPdf(['Tekst', '']);
  await expect(extractPdf(file(), vi.fn())).rejects.toThrow('OCR');
  expect(destroy).toHaveBeenCalledOnce();
});
it('rejects too long content without truncation', async () => {
  const destroy = mockPdf(['a'.repeat(60001)]);
  await expect(extractPdf(file(), vi.fn())).rejects.toThrow(
    'nie została ucięta',
  );
  expect(destroy).toHaveBeenCalledOnce();
});
it('does not insert spaces inside words split into text runs', async () => {
  const page = {
    getTextContent: async () => ({
      items: [
        { str: 'Gda', hasEOL: false },
        { str: 'ń', hasEOL: false },
        { str: 'sk', hasEOL: true },
        { str: '800 PLN', hasEOL: true },
      ],
    }),
    cleanup: vi.fn(),
  };
  getDocument.mockReturnValue({
    promise: Promise.resolve({ numPages: 1, getPage: async () => page }),
    destroy: vi.fn(),
  });
  expect((await extractPdf(file(), vi.fn())).text).toContain('Gdańsk\n800 PLN');
});
it('rejects a false PDF extension', async () => {
  await expect(
    extractPdf(new File(['not a PDF'], 'x.pdf'), vi.fn()),
  ).rejects.toThrow('nie jest poprawnym');
  expect(getDocument).not.toHaveBeenCalled();
});
it('explains encrypted PDF and releases the task', async () => {
  const error = Object.assign(new Error('password'), {
    name: 'PasswordException',
  });
  const destroy = vi.fn().mockResolvedValue(undefined);
  getDocument.mockReturnValue({ promise: Promise.reject(error), destroy });
  await expect(extractPdf(file(), vi.fn())).rejects.toThrow('hasłem');
  expect(destroy).toHaveBeenCalledOnce();
});
