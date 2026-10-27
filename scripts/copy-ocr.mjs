import { mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
const destination = path.resolve('public/ocr');
mkdirSync(destination, { recursive: true });
copyFileSync(
  'node_modules/tesseract.js/dist/worker.min.js',
  path.join(destination, 'worker.min.js'),
);
for (const name of readdirSync('node_modules/tesseract.js-core')) {
  if (name.endsWith('.wasm') || name.endsWith('.wasm.js'))
    copyFileSync(
      path.join('node_modules/tesseract.js-core', name),
      path.join(destination, name),
    );
}
for (const code of ['pol', 'eng'])
  copyFileSync(
    `node_modules/@tesseract.js-data/${code}/4.0.0/${code}.traineddata.gz`,
    path.join(destination, `${code}.traineddata.gz`),
  );
