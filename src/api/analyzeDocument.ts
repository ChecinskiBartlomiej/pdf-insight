import { analyze } from './analyze';
import { splitDocument } from '../../shared/tokens';
import { combineResults } from '../lib/merge';
import {
  resultSchema,
  type AnalysisRequest,
  type AnalysisResult,
} from '../../shared/schema';
// Waiting happens in the browser, not in a long-running server request.
export async function waitForQuota(ms: number, signal: AbortSignal) {
  signal.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const cancel = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel);
      resolve();
    }, ms);
    signal.addEventListener('abort', cancel, { once: true });
  });
}
export async function analyzeDocument(
  input: AnalysisRequest & { ocrPages: number[] },
  onStatus: (message: string) => void,
  signal: AbortSignal,
  send = analyze,
  wait = waitForQuota,
) {
  const chunks = splitDocument(input.text);
  if (chunks.length === 1) {
    const result = await send(
      { text: input.text, fileName: input.fileName, pages: input.pages },
      signal,
    );
    return resultSchema.parse({
      ...result,
      processing: { ocrPages: input.ocrPages, chunks: 1 },
    });
  }
  const parts: AnalysisResult[] = [];
  const sendNext = async (text: string, mode: 'fragment' | 'merge') => {
    if (parts.length) {
      onStatus(
        'Groq: budżet 8000 tokenów/min. Przerwa 65 sekund przed kolejnym żądaniem pomaga uniknąć przekroczenia limitu. Analiza trwa nadal — nie zamykaj strony.',
      );
      await wait(65000, signal);
    }
    onStatus(
      mode === 'merge'
        ? 'Wszystkie części przeanalizowano. Tworzenie wspólnego podsumowania i łączenie danych…'
        : `Dokument podzielono automatycznie na ${chunks.length} części. Analiza części ${parts.length + 1} z ${chunks.length}. Między żądaniami występują 65-sekundowe przerwy.`,
    );
    return send(
      { text, fileName: input.fileName, pages: input.pages, mode },
      signal,
    );
  };
  for (let n = 0; n < chunks.length; n++)
    parts.push(
      await sendNext(
        `Fragment ${n + 1} z ${chunks.length}. To nie jest osobny dokument.\n${chunks[n]}`,
        'fragment',
      ),
    );
  // Only summaries and key points go to the synthesis call. Source facts are
  // merged locally, so the synthesis model cannot delete amounts or dates.
  const text = JSON.stringify(
    parts.map((p, i) => ({
      part: i + 1,
      document: p.document,
      summary: p.summary,
      keyPoints: p.keyPoints,
    })),
  );
  const synthesis = await sendNext(text, 'merge');
  return combineResults(parts, synthesis, input.ocrPages);
}
