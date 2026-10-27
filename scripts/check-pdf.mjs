import { readFileSync, writeFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createWorker } from 'tesseract.js';
import { createCanvas } from '@napi-rs/canvas';
import { splitDocument, countTokens } from '../shared/tokens.ts';
import path from 'node:path';
if (!process.argv[2]) throw new Error('Podaj ścieżkę do PDF jako argument.');
const task = getDocument({
  data: new Uint8Array(readFileSync(process.argv[2])),
});
let ocr;
try {
  const pdf = await task.promise;
  const pages = [];
  const ocrPages = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    let text = content.items
      .map((item) =>
        'str' in item ? item.str + (item.hasEOL ? '\n' : '') : '',
      )
      .join('')
      .trim();
    if (!text) {
      ocr ??= await createWorker(['pol', 'eng'], 1, {
        langPath: path.resolve('public/ocr'),
        cacheMethod: 'none',
        gzip: true,
      });
      const viewport = page.getViewport({ scale: 2 });
      const canvas = createCanvas(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height),
      );
      await page.render({ canvas, viewport }).promise;
      text = (
        await ocr.recognize(canvas.toBuffer('image/png'))
      ).data.text.trim();
      if (!text) throw new Error(`Nie odczytano strony ${n}`);
      ocrPages.push(n);
      process.stdout.write(`OCR strona ${n}:\n${text}\n`);
    }
    pages.push(`[Strona ${n}]\n${text}`);
    page.cleanup();
  }
  const text = pages.join('\n\n');
  if (process.env.PDF_CHECK_OUTPUT)
    writeFileSync(process.env.PDF_CHECK_OUTPUT, text);
  const chunks = splitDocument(text);
  if (chunks.join('') !== text)
    throw new Error('Utracono tekst przy dzieleniu.');
  process.stdout.write(
    JSON.stringify(
      {
        pages: pdf.numPages,
        ocrPages,
        chars: text.length,
        tokens: countTokens(text),
        chunks: chunks.map((c) => countTokens(c)),
        allTextPreserved: true,
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  try {
    await ocr?.terminate();
  } finally {
    await task.destroy();
  }
}
