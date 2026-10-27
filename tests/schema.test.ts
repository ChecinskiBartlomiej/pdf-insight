import { describe, it, expect } from 'vitest';
import {
  resultSchema,
  requestSchema,
  validateModel,
  providerSchema,
} from '../shared/schema';
import { validModel } from './fixtures';
const valid = {
  ...validModel,
  document: { ...validModel.document, fileName: 'umowa.pdf', pages: 4 },
};
describe('result schema', () => {
  it('accepts the full brief structure', () =>
    expect(resultSchema.safeParse(valid).success).toBe(true));
  it('accepts missing facts as null and arrays', () =>
    expect(
      resultSchema.safeParse({
        ...valid,
        document: {
          ...valid.document,
          title: null,
          language: null,
          date: null,
        },
        entities: { organizations: [], people: [] },
        amounts: [],
        dates: [],
        keywords: [],
      }).success,
    ).toBe(true));
  it.each(['2026-02-30', '2026-13-01', '01.10.2026'])(
    'rejects invalid date %s',
    (date) =>
      expect(
        resultSchema.safeParse({
          ...valid,
          document: { ...valid.document, date },
        }).success,
      ).toBe(false),
  );
  it('rejects missing fields and unexpected keys', () => {
    expect(resultSchema.safeParse({ summary: 'x' }).success).toBe(false);
    expect(resultSchema.safeParse({ ...valid, extra: true }).success).toBe(
      false,
    );
  });
  it('rejects unknown ISO currency and language', () => {
    expect(
      resultSchema.safeParse({
        ...valid,
        amounts: [{ value: 1, currency: 'ZZZ', context: 'x' }],
      }).success,
    ).toBe(false);
    expect(
      resultSchema.safeParse({
        ...valid,
        document: { ...valid.document, language: 'zz' },
      }).success,
    ).toBe(false);
  });
  it('requires 3–7 key points', () =>
    expect(
      resultSchema.safeParse({ ...valid, keyPoints: ['one'] }).success,
    ).toBe(false));
  it('enforces sentence count after provider validation', () => {
    expect(() => validateModel(validModel)).not.toThrow();
    expect(() =>
      validateModel({ ...validModel, summary: 'Only one sentence.' }),
    ).toThrow();
  });
  it('does not let model set file metadata', () =>
    expect(() => validateModel(valid)).toThrow());
  it('bounds requests', () => {
    expect(
      requestSchema.safeParse({
        text: 'a'.repeat(60001),
        fileName: 'x.pdf',
        pages: 1,
      }).success,
    ).toBe(false);
    expect(
      requestSchema.safeParse({ text: 'x', fileName: 'x.pdf', pages: 0 })
        .success,
    ).toBe(false);
  });
  it('provider schema has all fields required and no unsupported patterns', () => {
    const schema = providerSchema();
    expect(schema.additionalProperties).toBe(false);
    expect(JSON.stringify(schema)).not.toContain('"pattern"');
    expect(JSON.stringify(schema)).not.toContain('fileName');
  });
});
