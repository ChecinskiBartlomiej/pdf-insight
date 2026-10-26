import { it, expect, vi, beforeEach } from 'vitest';
const { getDocument } = vi.hoisted(() => ({ getDocument: vi.fn() }));
vi.mock('pdfjs-dist', () => ({ getDocument, GlobalWorkerOptions: {} }));
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
beforeEach(() => vi.clearAllMocks());
it('extracts all pages and keeps app metadata', async () => {
  const destroy = mockPdf(['Pierwsza strona', 'Druga strona']);
  const progress = vi.fn();
  const result = await extractPdf(file(), progress);
  expect(result).toEqual({
    text: '[Strona 1]\nPierwsza strona\n\n[Strona 2]\nDruga strona',
    pages: 2,
    fileName: 'fixture.pdf',
  });
  expect(progress).toHaveBeenLastCalledWith(2, 2);
  expect(destroy).toHaveBeenCalledOnce();
});
it('rejects scanned or empty pages instead of skipping content', async () => {
  const destroy = mockPdf(['Tekst', '']);
  await expect(extractPdf(file(), vi.fn())).rejects.toThrow('Strona 2');
  expect(destroy).toHaveBeenCalledOnce();
});
it('rejects too long content without truncation', async () => {
  const destroy = mockPdf(['a'.repeat(11001)]);
  await expect(extractPdf(file(), vi.fn())).rejects.toThrow(
    'nie została ucięta',
  );
  expect(destroy).toHaveBeenCalledOnce();
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
