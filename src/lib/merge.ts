import { resultSchema, type AnalysisResult } from '../../shared/schema';
function unique<T>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = JSON.stringify(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
export function combineResults(
  parts: AnalysisResult[],
  synthesis: AnalysisResult,
  ocrPages: number[],
): AnalysisResult {
  return resultSchema.parse({
    ...synthesis,
    entities: {
      organizations: unique(parts.flatMap((p) => p.entities.organizations)),
      people: unique(parts.flatMap((p) => p.entities.people)),
    },
    amounts: unique(parts.flatMap((p) => p.amounts)),
    dates: unique(parts.flatMap((p) => p.dates)),
    keywords: unique(synthesis.keywords),
    processing: { ocrPages, chunks: parts.length },
  });
}
