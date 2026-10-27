import { encode } from 'gpt-tokenizer/encoding/o200k_harmony';
// Conservative data budget leaves room for instructions, JSON schema and output.
export const DATA_TOKEN_BUDGET = 3300;
export function countTokens(text: string) {
  return encode(text, { disallowedSpecial: new Set() }).length;
}
export function splitDocument(
  text: string,
  budget = DATA_TOKEN_BUDGET,
): string[] {
  if (countTokens(text) <= budget) return [text];
  const pieces: string[] = [];
  let start = 0;
  while (start < text.length) {
    let low = start + 1,
      high = text.length,
      end = start;
    while (low <= high) {
      const pivot = Math.floor((low + high) / 2);
      let mid = pivot;
      // Never split a UTF-16 surrogate pair.
      if (mid < text.length && /[\uDC00-\uDFFF]/.test(text[mid])) mid--;
      if (mid <= start) {
        low = pivot + 1;
        continue;
      }
      if (countTokens(text.slice(start, mid)) <= budget) {
        end = mid;
        low = pivot + 1;
      } else high = pivot - 1;
    }
    if (end <= start) throw new Error('Nie można podzielić tekstu.');
    // Prefer a nearby line boundary, retaining every character exactly once.
    const boundary = text.lastIndexOf('\n', end - 1);
    if (end < text.length && boundary > start + (end - start) * 0.7)
      end = boundary + 1;
    pieces.push(text.slice(start, end));
    start = end;
    if (pieces.length > 8)
      throw new Error(
        'Dokument wymaga więcej niż 8 części. Przekracza zakres tego demo; treść nie została ucięta.',
      );
  }
  return pieces;
}
