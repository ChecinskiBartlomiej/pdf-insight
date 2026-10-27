import { createWorker, type Worker } from 'tesseract.js';
import type { PDFPageProxy } from 'pdfjs-dist';
export async function createOcr(onStatus: (message: string) => void) {
  const base = new URL(
    `${import.meta.env.BASE_URL}ocr/`,
    window.location.origin,
  ).href;
  onStatus('Ładowanie lokalnego OCR (polski i angielski)…');
  const worker = await createWorker(['pol', 'eng'], 1, {
    workerPath: `${base}worker.min.js`,
    corePath: base,
    langPath: base.replace(/\/$/, ''),
    workerBlobURL: false,
    logger: (message) => {
      if (message.status === 'recognizing text')
        onStatus('Rozpoznawanie tekstu zeskanowanej strony…');
    },
  });
  return worker;
}
export async function recognizePage(page: PDFPageProxy, worker: Worker) {
  const viewport = page.getViewport({
    scale: Math.min(
      2,
      2200 /
        Math.max(
          page.getViewport({ scale: 1 }).width,
          page.getViewport({ scale: 1 }).height,
        ),
    ),
  });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  try {
    await page.render({ canvas, viewport }).promise;
    const { data } = await worker.recognize(canvas);
    const text = data.text.trim();
    if (!text || !/[\p{L}\p{N}]/u.test(text))
      throw new Error(
        'OCR nie rozpoznał tekstu. Strona może być pusta lub nieczytelna.',
      );
    return text;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
