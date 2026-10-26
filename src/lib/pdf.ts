import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { MAX_TEXT_CHARS } from '../../shared/schema';
GlobalWorkerOptions.workerSrc = workerUrl;
import { validateFile } from './file';
export async function extractPdf(
  file: File,
  onPage: (page: number, total: number) => void,
) {
  validateFile(file);
  const data = new Uint8Array(await file.arrayBuffer());
  if (!new TextDecoder().decode(data.slice(0, 1024)).includes('%PDF-'))
    throw new Error('Ten plik nie jest poprawnym dokumentem PDF.');
  const task = getDocument({ data });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 200)
      throw new Error(
        'Dokument przekracza limit 200 stron. Wybierz krótszy PDF.',
      );
    const pages: string[] = [];
    let length = 0;
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) =>
          'str' in item
            ? item.str + ('hasEOL' in item && item.hasEOL ? '\n' : ' ')
            : '',
        )
        .join('')
        .trim();
      // Mixed scanned/text documents must not silently lose pages.
      if (!text)
        throw new Error(
          `Strona ${n} nie ma tekstu. Dokument zawiera skan lub pustą stronę; OCR nie jest obsługiwany.`,
        );
      length += text.length;
      if (length > MAX_TEXT_CHARS - 1000)
        throw new Error(
          'Dokument przekracza limit analizy (około 11 000 znaków). Podziel go na krótsze pliki. Treść nie została ucięta.',
        );
      pages.push(`[Strona ${n}]\n${text}`);
      onPage(n, pdf.numPages);
      page.cleanup();
    }
    return {
      text: pages.join('\n\n'),
      pages: pdf.numPages,
      fileName: file.name,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException')
      throw new Error('PDF jest chroniony hasłem. Wgraj odblokowaną kopię.', {
        cause: error,
      });
    if (
      error instanceof Error &&
      ['InvalidPDFException', 'UnknownErrorException'].includes(error.name)
    )
      throw new Error('Nie można odczytać PDF. Plik może być uszkodzony.', {
        cause: error,
      });
    throw error;
  } finally {
    await task.destroy();
  }
}
