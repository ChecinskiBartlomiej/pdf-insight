import { DurableObject } from 'cloudflare:workers';
import {
  MAX_REQUEST_BYTES,
  requestSchema,
  resultSchema,
} from '../shared/schema';
import { ApiError, callGroq } from './groq';
interface Env {
  GROQ_API_KEY: string;
  ALLOWED_ORIGINS: string;
  ANALYSIS_ENABLED: string;
  GATE: DurableObjectNamespace<AnalysisGate>;
}
export { AnalysisGate };
// One shared object coordinates every request; persistent counters survive eviction.
class AnalysisGate extends DurableObject<Env> {
  async reserve(ip: string) {
    return this.ctx.storage.transaction(async (tx) => {
      const now = Date.now();
      const day = new Date(now).toISOString().slice(0, 10);
      const daily = await tx.get<{ day: string; count: number }>('daily');
      const recent = ((await tx.get<number[]>('recent')) || []).filter(
        (t) => now - t < 60000,
      );
      const leases = (
        (await tx.get<{ id: string; until: number }[]>('leases')) || []
      ).filter((l) => l.until > now);
      const peers = (
        (await tx.get<{ ip: string; time: number }[]>('peers')) || []
      ).filter((p) => now - p.time < 60000);
      // Each reservation allows up to 2 provider calls. Budget: <= 60 calls/day.
      if (
        (daily?.day === day && daily.count >= 30) ||
        recent.length >= 1 ||
        leases.length >= 1 ||
        peers.filter((p) => p.ip === ip).length >= 1
      )
        return null;
      const id = crypto.randomUUID();
      await tx.put({
        daily: { day, count: daily?.day === day ? daily.count + 1 : 1 },
        recent: [...recent, now],
        leases: [...leases, { id, until: now + 115000 }],
        peers: [...peers, { ip, time: now }],
      });
      return id;
    });
  }
  async release(id: string) {
    await this.ctx.storage.transaction(async (tx) => {
      const leases =
        (await tx.get<{ id: string; until: number }[]>('leases')) || [];
      await tx.put(
        'leases',
        leases.filter((l) => l.id !== id),
      );
    });
  }
}
async function readLimited(request: Request) {
  if (!request.body) throw new ApiError(400, 'Brak treści żądania.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new ApiError(413, 'Żądanie jest za duże.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    data.set(c, offset);
    offset += c.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(data)) as unknown;
  } catch {
    throw new ApiError(400, 'Niepoprawny JSON żądania.');
  }
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') || '';
    const allowed =
      env.ALLOWED_ORIGINS.split(',')
        .map((v) => v.trim())
        .includes(origin) && !!origin;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      Vary: 'Origin',
      'X-Content-Type-Options': 'nosniff',
    };
    if (allowed)
      Object.assign(headers, {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
    const reply = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers });
    if (!allowed) return reply({ error: 'Niedozwolone źródło żądania.' }, 403);
    if (new URL(request.url).pathname !== '/api/analyze')
      return reply({ error: 'Nie znaleziono endpointu.' }, 404);
    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers });
    if (request.method !== 'POST')
      return reply({ error: 'Dozwolona jest metoda POST.' }, 405);
    if (env.ANALYSIS_ENABLED !== 'true' || !env.GROQ_API_KEY)
      return reply(
        { error: 'Analiza jest chwilowo wyłączona. Spróbuj później.' },
        503,
      );
    if (!request.headers.get('Content-Type')?.startsWith('application/json'))
      return reply({ error: 'Wymagany Content-Type: application/json.' }, 415);
    let lease: string | null = null;
    const gate = env.GATE.get(env.GATE.idFromName('global'));
    try {
      if (Number(request.headers.get('Content-Length')) > MAX_REQUEST_BYTES)
        throw new ApiError(413, 'Żądanie jest za duże.');
      const parsed = requestSchema.safeParse(await readLimited(request));
      if (!parsed.success)
        throw new ApiError(
          400,
          'Niepoprawne dane lub przekroczony limit długości dokumentu.',
        );
      const ip = request.headers.get('CF-Connecting-IP') || 'local';
      // Retain only a daily digest in transient minute buckets, not the IP itself.
      const digest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(new Date().toISOString().slice(0, 10) + ip),
      );
      lease = await gate.reserve(
        Array.from(new Uint8Array(digest), (b) =>
          b.toString(16).padStart(2, '0'),
        ).join(''),
      );
      if (!lease)
        throw new ApiError(
          429,
          'Limit demo: 1 żądanie analizy na minutę i 30 dziennie (UTC), wspólnie dla wszystkich. Długi PDF zużywa kilka żądań. Spróbuj później.',
        );
      const result = await callGroq(
        parsed.data,
        env.GROQ_API_KEY,
        AbortSignal.timeout(105000),
      );
      return reply(
        resultSchema.parse({
          ...result,
          document: {
            ...result.document,
            fileName: parsed.data.fileName,
            pages: parsed.data.pages,
          },
        }),
      );
    } catch (error) {
      if (error instanceof ApiError)
        return reply({ error: error.message }, error.status);
      if (
        error instanceof Error &&
        ['TimeoutError', 'AbortError'].includes(error.name)
      )
        return reply(
          { error: 'Przekroczono czas analizy. Spróbuj ponownie.' },
          504,
        );
      return reply(
        { error: 'Nie udało się wykonać analizy. Spróbuj ponownie później.' },
        502,
      );
    } finally {
      if (lease) {
        try {
          await gate.release(lease);
        } catch {
          /* Lease expires automatically; do not hide the analysis response. */
        }
      }
    }
  },
} satisfies ExportedHandler<Env>;
