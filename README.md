# PDF Insight

Aplikacja React + TypeScript: PDF → tekst → podsumowanie AI → zwalidowany JSON.

**Status:** kod przygotowany do wdrożenia. Publiczne repozytorium i demo GitHub Pages nie zostały jeszcze utworzone. Po publikacji wpisz tutaj rzeczywiste linki. Bez ustawienia API analiza nie zadziała.

## Uruchomienie

Wymagany Node.js 24 i npm. Nie wklejaj klucza API do frontendu ani do Git.

```bash
npm ci
cp .env.example .env
npm run dev
```

W drugim terminalu:

```bash
npx wrangler login
npx wrangler secret put GROQ_API_KEY
```

Sekret z powyższej komendy dotyczy wdrożonego Workera. Do pracy lokalnej utwórz ignorowany plik `.dev.vars` z `GROQ_API_KEY=twoj_klucz` (samodzielnie, poza rozmową). Następnie `npm run worker:dev`. Frontend: http://localhost:5173, API: http://localhost:8787. Konto Groq pozostaw na Free.

## Wdrożenie krok po kroku

1. Utwórz puste publiczne repozytorium `pdf-insight` na GitHub. Rozpakuj projekt; nie dołączaj node_modules, .env ani .dev.vars.
2. W `wrangler.toml` zmień `ALLOWED_ORIGINS` na `https://TWOJ_LOGIN.github.io` (bez ścieżki repozytorium i bez końcowego ukośnika). Lokalny adres dodaj po przecinku tylko jeśli jest potrzebny. Origin przeglądarki nie zawiera ścieżki, więc CORS nie rozróżnia repozytoriów tego samego konta.
3. `npx wrangler login`, następnie `npm run worker:deploy`. SQLite Durable Object i migracja są skonfigurowane w `wrangler.toml`. Sprawdź warunki i limity kont Cloudflare/Groq przed wdrożeniem; nie włączaj płatnego zastępstwa.
4. `npx wrangler secret put GROQ_API_KEY` — podaj klucz w ukrytym monicie. Ponownie sprawdź, że sekret jest ustawiony w tym samym Workerze.
5. W GitHub → Settings → Secrets and variables → Actions → **Variables** dodaj publiczne `VITE_API_URL` z adresem `https://pdf-insight-api.<twoja-subdomena>.workers.dev` (bez `/api/analyze`). To nie jest sekret. Klucza Groq nie dodawaj do zmiennych Vite.
6. W GitHub → Settings → Pages → Source wybierz **GitHub Actions**.
7. Wyślij kod z lokalnego katalogu projektu:

```bash
git init -b main
git add .
git commit -m "feat: implement PDF Insight with validated AI analysis"
git remote add origin https://github.com/TWOJ_LOGIN/pdf-insight.git
git push -u origin main
```

Jeżeli paczka zawiera `.git`, zachowaj dostarczoną historię i pomiń `git init`, `git add` oraz pierwszy commit. W dostarczonej historii są logiczne etapy implementacji; nie twórz sztucznych commitów udających wcześniejszą pracę.

8. Actions uruchomi lint → format → typy → testy → build → deploy. Adres: `https://TWOJ_LOGIN.github.io/pdf-insight/`. `base` jest wyliczany z nazwy repozytorium. Dla repozytorium użytkownika `TWOJ_LOGIN.github.io` zmień `VITE_BASE_PATH` w workflow na `/`.
9. Sprawdź z prywatnego okna prawdziwy PDF, podsumowanie, zgodność faktów i eksport JSON. Dodaj rzeczywisty link do demo oraz zrzut ekranu do README. Nie deklaruj działającego demo przed tym testem.

## Architektura

- `src/components/Results.tsx` — wyniki, przełączanie widoku i pełny eksport JSON.
- `src/lib/pdf.ts` — lokalny PDF.js, walidacja 10 MB, ekstrakcja stron. Worker PDF.js jest bundlowany przez Vite z `?url`, bez zależności od CDN.
- `src/api/analyze.ts` — wywołanie API i walidacja odpowiedzi przed wyświetleniem.
- `shared/schema.ts` — Zod, typy, limity, JSON Schema dostawcy oraz walidacja ISO.
- `worker/index.ts` — CORS, ograniczony odczyt body, metadane z aplikacji, trwały limiter Durable Object.
- `worker/groq.ts` — stały model `openai/gpt-oss-120b`, Structured Outputs, nieufna treść PDF w osobnej wiadomości danych, maksymalnie jedna ponowna próba po niepoprawnym wyniku.

Nazwę pliku i liczbę stron dodaje serwer z metadanych aplikacji, nie model. Klucze JSON są angielskie; wartości i podsumowanie w języku dokumentu. Nieobecne dane: `null` lub `[]`. Kwota bez określonej waluty ma `currency: null`. Dokładne daty są kalendarzowo walidowane. Typy: faktura, umowa, oferta, raport, inne. Podsumowanie: 3–5 zdań; keyPoints: 3–7.

Lokalny Worker można testować bez logowania przez `npm run test:worker`; prawdziwa analiza wymaga sekretu.

Warstwa walidacji modelu jest silniejsza od schematu przekazywanego do Groq: sprawdza kody ISO, daty i liczbę zdań przez `Intl.Segmenter`. Skróty mogą wpływać na segmentację; prompt prosi o unikanie ich w podsumowaniu.

## Bezpieczeństwo i prywatność

PDF pozostaje w przeglądarce. Po zaznaczeniu zgody tekst trafia do Workera i Groq. Aplikacja nie utrwala PDF, tekstu ani wyników. Zasady przechowywania po stronie dostawcy AI zależą od jego aktualnych warunków; nie przesyłaj poufnych dokumentów bez odpowiedniej zgody. Brak logowania treści i kluczy, brak HTML z odpowiedzi modelu, CORS tylko dla wskazanych origins. CORS nie chroni przed klientem, który podszyje się pod Origin.

Jeden wspólny Durable Object przechowuje liczniki i krótkie rezerwacje, a nie dokumenty. Limit: **1 analiza/minutę, 30 analiz/dobę UTC, 1 równoczesna analiza**, maksymalnie 2 wywołania Groq na analizę. Rezerwacja wygasa po 35 s, AI ma wspólny timeout 24 s dla obu prób. Dzienny budżet jest pobierany także przy błędzie — to ogranicza nadużycia. IP zapisuje się wyłącznie jako dzienny skrót w minutowym oknie limitera; wpisy wygasłe są usuwane przy kolejnym żądaniu, a do tego czasu pozostają w pamięci trwałej. To dane pseudonimowe, nie anonimowe. Limit jest celowo konserwatywny dla darmowej puli; nie gwarantuje dostępności Groq. Duże odpowiedzi/rozumowanie również zużywają tokeny. Wyłączenie analiz: `ANALYSIS_ENABLED = "false"` i ponowne wdrożenie Workera.

## Sprawdzenie jakości

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run test:worker
npm run build
npx wrangler deploy --dry-run
```

Test runtime `npm run test:worker` uruchamia lokalny workerd/Miniflare i atrapę Groq bez połączenia z dostawcą; weryfikuje preflight, CORS, rozmiar body, walidację wejścia, metadane i trwały limiter w lokalnym runtime.

Testy jednostkowe obejmują schemat, brakujące dane, daty, waluty, limity wejścia, liczbę zdań, metadane, liczbę prób, przerwanie po 429 i niekompletną odpowiedź. Mocki nie potwierdzają jakości prawdziwego modelu ani odporności na prompt injection.

Przed oddaniem sprawdź: umowę z maila i drugi rodzaj dokumentu; zgodność każdej daty/kwoty/strony; PDF chroniony, uszkodzony, skan, pustą stronę, ponad 10 MB; timeout, 429; kopiowanie i pobranie JSON; klawiaturę i 360 px; publiczne zasoby i worker PDF.js na ścieżce repozytorium. Zmierz pełny czas od kliknięcia do wyniku. Cel briefu to <30 s, nie gwarancja. Pełna kontrola wdrożenia wymaga kont i klucza użytkownika.

## Ograniczenia

- Do 10 MB, 200 stron, około 11 000 znaków tekstu; za długie dokumenty są odrzucane w całości. Bez chunkingu, OCR i historii lokalnej.
- Strona bez tekstu (także pusta) zatrzymuje analizę, aby nie pominąć potencjalnego skanu. Można przygotować kopię PDF bez pustych stron.
- AI może błędnie odczytać fakty mimo poprawnego JSON. Wyniki trzeba porównać ze źródłem.
- PDF.js czyta elementy w kolejności warstwy tekstowej; złożone tabele i kolumny mogą wymagać ręcznej kontroli.
- Brak klucza i niezałączona umowa testowa uniemożliwiają potwierdzenie jakości Groq oraz end-to-end na właściwym materiale.
- Wygląd używa opcjonalnych fontów Google z systemowym fallbackiem; czytanie PDF nie zależy od ich dostępności.

## Oddanie

Repozytorium → pole „Link do zadania testowego”; GitHub Pages → „Komentarz do zadania”. Formularz i dane finansowe uzupełnia kandydat. Termin: **27.10.2026, 10:00 czasu Warszawy**. Utrzymuj demo i API co najmniej 14 dni po oddaniu. Rzeczywiste limity konta sprawdź w panelu Groq.

Dokumentacja integracji: https://console.groq.com/docs/structured-outputs oraz https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/.
