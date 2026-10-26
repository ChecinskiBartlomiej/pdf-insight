import { it, expect } from 'vitest';
import { validateFile } from '../src/lib/file';
it('rejects empty, oversized and non-PDF files before extraction', () => {
  expect(() => validateFile({ name: 'x.pdf', size: 0 })).toThrow('pusty');
  expect(() => validateFile({ name: 'x.pdf', size: 10485761 })).toThrow(
    '10 MB',
  );
  expect(() => validateFile({ name: 'x.txt', size: 10 })).toThrow('.pdf');
  expect(() => validateFile({ name: 'X.PDF', size: 100 })).not.toThrow();
});
