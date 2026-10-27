import { resultSchema, type AnalysisRequest } from '../../shared/schema';
export async function analyze(input: AnalysisRequest, signal: AbortSignal) {
  const base = import.meta.env.VITE_API_URL as string | undefined;
  if (!base)
    throw new Error(
      'API nie zostało skonfigurowane. Ustaw VITE_API_URL i zbuduj aplikację ponownie.',
    );
  let response: Response;
  try {
    response = await fetch(`${base.replace(/\/$/, '')}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.any([signal, AbortSignal.timeout(115000)]),
    });
  } catch (error) {
    if (
      signal.aborted ||
      (error instanceof Error &&
        ['AbortError', 'TimeoutError'].includes(error.name))
    )
      throw new Error(
        'Analiza przekroczyła czas oczekiwania. Spróbuj ponownie.',
        { cause: error },
      );
    throw error instanceof TypeError
      ? new Error(
          'Nie można połączyć się z API. Sprawdź połączenie i spróbuj ponownie.',
          { cause: error },
        )
      : error;
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      body &&
        typeof body === 'object' &&
        'error' in body &&
        typeof body.error === 'string'
        ? body.error
        : 'API zwróciło błąd. Spróbuj ponownie.',
    );
  const parsed = resultSchema.safeParse(body);
  if (!parsed.success)
    throw new Error(
      'Odpowiedź API nie jest zgodna ze schematem. Spróbuj ponownie.',
    );
  return parsed.data;
}
