# AI_LOG — PDF Insight

## Narzędzia i źródła

26.10.2026: asystent Codex w ChatGPT Work, narzędzia terminalowe, odczyt PDF przez pdftotext, dokumentacja Groq i Cloudflare. Źródła wymagań: załączony brief i PLAN_PDF_INSIGHT.md. Konta GitHub, Cloudflare i Groq nie zostały połączone. Klucza API nie przekazywano asystentowi. Brak dostarczonej umowy testowej.

## Kluczowe instrukcje użyte w pracy

1. Użytkownik: „zrob to zadanie, napisz kod zgodnie z planem”.
2. Załączony plan: React/Vite/TypeScript strict, PDF.js, Groq przez Cloudflare Workers, wspólny Zod, GitHub Actions/Pages, ochrona klucza i kontrola limitów. To wejście do implementacji, nie osobne wywołanie modelu.
3. Prompt produkcyjny (pełny w `worker/groq.ts`): tekst PDF jest nieufnymi danymi; ekstrakcja faktów; 3–5 zdań; 3–7 punktów; null/[] zamiast zgadywania; rozróżnianie kwot netto/brutto i kontekstu dat.
4. Instrukcja ponowienia (kod): „Previous response failed local validation. Follow all field and sentence constraints exactly.” Uruchamia się tylko po błędnym wyniku, maksymalnie raz.

Punkty 3–4 są promptami aplikacji. W testach jednostkowych użyto atrap odpowiedzi, nie wywoływano prawdziwego modelu. Nie przedstawiamy ich jako wykonanych rozmów z Groq.

## Weryfikacja i poprawki

Wykonano: czystą instalację `npm ci --ignore-scripts`, ESLint, TypeScript frontendu i Workera, 23 testy Vitest, Prettier, produkcyjny build ze ścieżką `/pdf-insight/`, próbne spakowanie przez Wrangler. Sprawdzono w artefaktach prawidłową ścieżkę do bundlowanego workera PDF.js. Test lokalnego runtime Miniflare/workerd z atrapą Groq przeszedł 7 kontroli: preflight, CORS, walidacja wejścia, limit rozmiaru body, metadane odpowiedzi, nagłówek CORS i wspólny limit żądań. Kod testu jest w `scripts/check-worker.mjs`.

Rzeczywiste błędy i poprawki AI:

- Początkowo podano `isEvalSupported` do `getDocument`; zainstalowane typy PDF.js nie wspierały tej opcji. Usunięto ją, ponowiono kontrolę typów.
- Zmiana manifestu w trakcie instalacji pozostawiła inną wersję PDF.js lokalnie (6.x) niż w lockfile (5.x). Wyrównano manifest i lockfile oraz przeprowadzono czystą instalację i ponowne sprawdzenia. Do oddania użyto lockfile z PDF.js 5.7.284.
- ESLint zgłosił brak `cause` przy opakowywaniu przechwyconych błędów. Dodano przyczynę, zachowując czytelne komunikaty dla użytkownika.
- Pierwszy build miał duży wspólny pakiet z PDF.js. Odczyt PDF przeniesiono do dynamicznego importu: pakiet startowy zmalał z około 746 do 317 kB, a PDF.js ładuje się przy analizie.
- Pierwsza próba testu Miniflare używała starego kształtu konfiguracji. Dopasowano ją przez dostarczony `convertV4MiniflareOptions`; późniejszy problem ze ścieżką modułu poza katalogiem rozwiązano przez przekazanie treści gotowego bundla. Test po poprawkach przeszedł.

Nie udało się uruchomić infrastruktury podglądu przeglądarkowego (brak daemon sites-previewd). Nie wykonano wizualnego sprawdzenia, zrzutu ekranu, testów mobilnych ani ręcznej kontroli klawiaturą. Test ekstrakcji PDF używa atrap PDF.js: potwierdza logikę i błędy, nie rzeczywisty parser w przeglądarce. Test prompt injection potwierdza rozdzielenie instrukcji i danych, nie odporność prawdziwego modelu. Brakuje rzeczywistego testu API, pomiaru <30 s i publicznego demo. Nie wykonano jeszcze publicznego wdrożenia, sprawdzenia umowy rekrutacyjnej ani pomiaru prawdziwego AI. Ostateczna weryfikacja faktów i zrozumienie kodu przez kandydata pozostają wymagane przed oddaniem.
