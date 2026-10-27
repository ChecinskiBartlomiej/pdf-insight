import { it, expect, vi } from 'vitest';
import {
  splitDocument,
  countTokens,
  DATA_TOKEN_BUDGET,
} from '../shared/tokens';
import { combineResults } from '../src/lib/merge';
import { analyzeDocument, waitForQuota } from '../src/api/analyzeDocument';
import { validModel } from './fixtures';
import { resultSchema } from '../shared/schema';
const result = resultSchema.parse({
  ...validModel,
  document: { ...validModel.document, fileName: 'umowa.pdf', pages: 12 },
});
it('splits a long Polish text without loss or broken Unicode', () => {
  const text = 'Umowę zawarto w Gdańsku. 13 100 PLN netto. 🐺\n'.repeat(700);
  const chunks = splitDocument(text);
  expect(chunks.length).toBeGreaterThan(1);
  expect(chunks.join('')).toBe(text);
  for (const chunk of chunks) {
    expect(countTokens(chunk)).toBeLessThanOrEqual(DATA_TOKEN_BUDGET);
    expect(chunk).not.toContain('\uFFFD');
  }
});
it('preserves amount contexts and source dates while using synthesized summary', () => {
  const other = {
    ...result,
    amounts: [
      { value: 13100, currency: 'PLN', context: 'abonament od 2027-04-01' },
    ],
  };
  const merged = combineResults(
    [result, other],
    { ...result, amounts: [], dates: [] },
    [11],
  );
  expect(merged.amounts).toHaveLength(2);
  expect(merged.amounts[1].value).toBe(13100);
  expect(merged.dates).toEqual(result.dates);
  expect(merged.processing).toEqual({ chunks: 2, ocrPages: [11] });
});
it('does not silently truncate when merged fact arrays exceed schema limits', () => {
  const tooMany = {
    ...result,
    dates: Array.from({ length: 101 }, (_, i) => ({
      date: '2026-01-01',
      context: String(i),
    })),
  };
  expect(() => combineResults([tooMany], result, [])).toThrow();
});
it('orchestrates fragment calls and synthesis with quota waits', async () => {
  const input = {
    text: 'Umowa. 800 PLN netto.\n'.repeat(1200),
    fileName: 'umowa.pdf',
    pages: 12,
    ocrPages: [11],
  };
  const count = splitDocument(input.text).length;
  const send = vi.fn().mockImplementation(async () => structuredClone(result));
  const wait = vi.fn().mockResolvedValue(undefined);
  const merged = await analyzeDocument(
    input,
    vi.fn(),
    new AbortController().signal,
    send,
    wait,
  );
  expect(send).toHaveBeenCalledTimes(count + 1);
  expect(wait).toHaveBeenCalledTimes(count);
  expect(send.mock.calls.at(-1)?.[0].mode).toBe('merge');
  expect(merged.processing?.chunks).toBe(count);
});
it('quota waiting can be cancelled without another provider call', async () => {
  const controller = new AbortController();
  const pending = waitForQuota(65000, controller.signal);
  controller.abort();
  await expect(pending).rejects.toThrow();
});
