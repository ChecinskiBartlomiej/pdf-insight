import { z } from 'zod';
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
// Conservative limit for the free token budget; never silently truncate.
export const MAX_TEXT_CHARS = 12000;
export const MAX_REQUEST_BYTES = 80000;
const text = z.string().trim().min(1).max(3000);
const isoDate = z.iso.date();
// Runtime Intl data is the source for assigned ISO codes, not just a regex.
const language = z
  .string()
  .regex(/^[a-z]{2}$/)
  .refine((code) => {
    try {
      return (
        new Intl.DisplayNames(['en'], {
          type: 'language',
          fallback: 'none',
        }).of(code) !== undefined
      );
    } catch {
      return false;
    }
  });
const currency = z
  .string()
  .refine(
    (code) => Intl.supportedValuesOf('currency').includes(code),
    'Niepoprawny kod ISO 4217',
  );
export const modelSchema = z
  .object({
    document: z
      .object({
        language: language.nullable(),
        type: z.enum(['faktura', 'umowa', 'oferta', 'raport', 'inne']),
        title: text.nullable(),
        date: isoDate.nullable(),
      })
      .strict(),
    summary: z.string().min(1).max(6000),
    keyPoints: z.array(text).min(3).max(7),
    entities: z
      .object({
        organizations: z.array(text).max(100),
        people: z.array(text).max(100),
      })
      .strict(),
    amounts: z
      .array(
        z
          .object({
            value: z.number().finite(),
            currency: currency.nullable(),
            context: text,
          })
          .strict(),
      )
      .max(100),
    dates: z
      .array(z.object({ date: isoDate, context: text }).strict())
      .max(100),
    keywords: z.array(text).max(30),
  })
  .strict();
export const resultSchema = modelSchema.extend({
  document: modelSchema.shape.document
    .extend({
      fileName: z.string().min(1).max(255),
      pages: z.number().int().min(1).max(200),
    })
    .strict(),
});
export const requestSchema = z
  .object({
    text: z.string().trim().min(1).max(MAX_TEXT_CHARS),
    fileName: z.string().min(1).max(255),
    pages: z.number().int().min(1).max(200),
  })
  .strict();
export type AnalysisResult = z.infer<typeof resultSchema>;
export type AnalysisRequest = z.infer<typeof requestSchema>;
export function validateModel(value: unknown) {
  const parsed = modelSchema.parse(value);
  const sentences = [
    ...new Intl.Segmenter(parsed.document.language || 'pl', {
      granularity: 'sentence',
    }).segment(parsed.summary),
  ].filter((s) => /[\p{L}\p{N}]/u.test(s.segment));
  if (sentences.length < 3 || sentences.length > 5)
    throw new Error('Podsumowanie musi zawierać 3–5 zdań.');
  return parsed;
}
// Provider schema deliberately uses only supported structural keywords.
export function providerSchema(): Record<string, unknown> {
  const clean = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value)
          .filter(
            ([k]) =>
              ![
                '$schema',
                'minLength',
                'maxLength',
                'minItems',
                'maxItems',
                'pattern',
                'format',
              ].includes(k),
          )
          .map(([k, v]) => [k, clean(v)]),
      );
    return value;
  };
  return clean(
    z.toJSONSchema(modelSchema, { unrepresentable: 'any' }),
  ) as Record<string, unknown>;
}
