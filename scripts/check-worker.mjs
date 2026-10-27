import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: readFileSync(
      process.argv[2] || '.worker-test-build/index.js',
      'utf8',
    ),
    compatibilityDate: '2026-10-01',
    durableObjects: { GATE: { className: 'AnalysisGate', useSQLite: true } },
    bindings: {
      ALLOWED_ORIGINS: 'https://example.github.io',
      ANALYSIS_ENABLED: 'true',
      GROQ_API_KEY: 'test-placeholder',
    },
    outboundService: async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content: JSON.stringify({
                  document: {
                    language: 'pl',
                    type: 'umowa',
                    title: 'Umowa serwisowa',
                    date: null,
                  },
                  summary:
                    'Umowa określa zasady serwisu. Wynagrodzenie wynosi 12500 PLN netto. Termin zapłaty nie został określony.',
                  keyPoints: ['Serwis', 'Wynagrodzenie netto', 'Brak terminu'],
                  entities: { organizations: [], people: [] },
                  amounts: [
                    { value: 12500, currency: 'PLN', context: 'netto' },
                  ],
                  dates: [],
                  keywords: [],
                }),
              },
            },
          ],
        }),
        { headers: { 'Content-Type': 'application/json' } },
      ),
  }),
);
try {
  const url = 'https://api.example/api/analyze';
  const headers = {
    Origin: 'https://example.github.io',
    'Content-Type': 'application/json',
  };
  const call = (body, extra = {}) =>
    mf.dispatchFetch(url, {
      method: 'POST',
      headers: { ...headers, ...extra },
      body: JSON.stringify(body),
    });
  assert.equal(
    (await mf.dispatchFetch(url, { method: 'OPTIONS', headers })).status,
    204,
  );
  assert.equal(
    (await call({}, { Origin: 'https://evil.example' })).status,
    403,
  );
  assert.equal((await call({})).status, 400);
  assert.equal((await call({ text: 'x'.repeat(400001) })).status, 413);
  const input = {
    text: 'Umowa serwisowa. 12500 PLN netto.',
    fileName: 'trusted-name.pdf',
    pages: 2,
  };
  const result = await call(input);
  assert.equal(result.status, 200, await result.clone().text());
  const data = await result.json();
  assert.equal(data.document.fileName, 'trusted-name.pdf');
  assert.equal(data.document.pages, 2);
  assert.equal(
    result.headers.get('Access-Control-Allow-Origin'),
    'https://example.github.io',
  );
  assert.equal((await call(input)).status, 429);
  process.stdout.write(
    'Worker runtime smoke: 7 checks passed (preflight, CORS, request schema, streamed size, result metadata, response CORS, shared rate limit).\n',
  );
} finally {
  await mf.dispose();
}
