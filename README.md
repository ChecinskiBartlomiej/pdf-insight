# PDF Insight

Aplikacja webowa, która odczytuje PDF, tworzy krótkie podsumowanie i zamienia treść dokumentu w uporządkowane dane JSON.

## Demo i repozytorium

- **Demo GitHub Pages:**
- **Publiczne repozytorium:**
- **Zrzut ekranu:**

## Funkcje

- Wybór pliku PDF lub przeciągnięcie go do pola wgrywania.
- Walidacja rozmiaru, rozszerzenia i odczytu dokumentu.
- Odczyt tekstu w przeglądarce przez PDF.js.
- Lokalny OCR stron bez warstwy tekstowej: Tesseract.js, języki polski i angielski.
- Podsumowanie w 3–5 zdaniach oraz 3–7 kluczowych punktów.
- Rozpoznawanie typu dokumentu, języka, tytułu, dat, kwot, osób i organizacji.
- Automatyczne dzielenie długiego tekstu i łączenie wyników.
- Podgląd JSON, kopiowanie i pobieranie wyniku jako pliku `.json`.
- Komunikaty postępu i błędów oraz możliwość ponowienia analizy.
- Zgoda na przekazanie tekstu do zewnętrznego API przed rozpoczęciem analizy.

## Technologie i architektura

| Warstwa              | Technologie                                      |
| -------------------- | ------------------------------------------------ |
| Frontend             | React, Vite, TypeScript strict                   |
| Odczyt PDF           | PDF.js 6.2.108, wariant legacy                   |
| OCR                  | Tesseract.js, lokalne zasoby PL/EN i WebAssembly |
| Backend              | Cloudflare Workers, Durable Object               |
| AI                   | Groq API, model `openai/gpt-oss-120b`            |
| Walidacja            | Zod, JSON Schema / Structured Outputs            |
| Dzielenie tekstu     | gpt-tokenizer, kodowanie o200k_harmony           |
| Kontrole             | Vitest, ESLint, Prettier, TypeScript             |
| Publikacja frontendu | GitHub Actions i GitHub Pages                    |

PDF jest odczytywany lokalnie. Po wyrażeniu zgody wyodrębniony tekst i metadane trafiają do Workera, który sprawdza dane i limity, a następnie wywołuje Groq. Odpowiedź jest walidowana na backendzie i ponownie na frontendzie. Nazwę pliku i liczbę stron dodaje backend na podstawie metadanych aplikacji, a nie odpowiedzi modelu.

GitHub Pages obsługuje frontend. Backend wymaga osobnego wdrożenia na Cloudflare; samo opublikowanie strony nie uruchamia API.

```text
src/App.tsx                 — wybór pliku, zgoda, stany analizy
src/components/Results.tsx  — prezentacja i eksport wyników
src/lib/file.ts             — podstawowa walidacja pliku
src/lib/pdf.ts              — ekstrakcja tekstu i uruchamianie OCR
src/lib/ocr.ts              — lokalne rozpoznawanie tekstu
src/lib/merge.ts            — łączenie faktów z fragmentów
src/api/analyze.ts          — komunikacja z backendem
src/api/analyzeDocument.ts  — analiza części i oczekiwanie
shared/schema.ts           — schematy, typy i limity
shared/tokens.ts           — dzielenie tekstu według tokenów
worker/index.ts            — endpoint, CORS i limiter
worker/groq.ts             — prompt, wywołanie modelu i walidacja
scripts/copy-ocr.mjs        — przygotowanie zasobów OCR
```

## Uruchomienie lokalne

Wymagania: Node.js 24, npm i klucz API Groq. Jeśli używasz nvm, wersję można wybrać poleceniem `nvm use` w katalogu projektu.

### 1. Instalacja i frontend

W głównym katalogu projektu:

```bash
npm ci
cp .env.example .env
```

Plik `.env`:

```dotenv
VITE_API_URL=http://localhost:8787
VITE_BASE_PATH=/
```

Uruchom frontend:

```bash
npm run dev
```

Otwórz <http://localhost:5173/>. Polecenia `dev` i `build` najpierw kopiują zasoby OCR z zależności do `public/ocr`. Nie trzeba wykonywać tego ręcznie.

### 2. Backend w drugim terminalu

Utwórz w głównym katalogu plik `.dev.vars`:

```dotenv
GROQ_API_KEY=WPISZ_TUTAJ_WLASNY_KLUCZ
```

Następnie:

```bash
npm run worker:dev
```

Backend działa domyślnie pod <http://localhost:8787>. Oba terminale muszą pozostać uruchomione. Lokalny runtime można uruchomić bez logowania do Cloudflare; prawdziwa analiza wymaga działającego klucza Groq.

## Dane wynikowe

Eksport zawiera:

| Pole         | Zawartość                                    |
| ------------ | -------------------------------------------- |
| `document`   | fileName, pages, language, type, title, date |
| `summary`    | podsumowanie w 3–5 zdaniach                  |
| `keyPoints`  | 3–7 kluczowych punktów                       |
| `entities`   | organizations i people                       |
| `amounts`    | value, currency i context                    |
| `dates`      | date i context                               |
| `keywords`   | słowa kluczowe                               |
| `processing` | strony odczytane OCR i liczba części         |

Klucze JSON są angielskie. Wartości opisowe mają być w języku dokumentu. Typ dokumentu przyjmuje stałe etykiety: `faktura`, `umowa`, `oferta`, `raport`, `inne`. Daty są w formacie `YYYY-MM-DD`, język jako kod ISO 639-1, waluta jako kod ISO 4217. Braki są reprezentowane przez `null` lub puste tablice zgodnie ze schematem. Walidacja formatu nie gwarantuje prawdziwości faktów.

## Limity i czas analizy

| Ograniczenie aplikacji | Wartość                                        |
| ---------------------- | ---------------------------------------------- |
| Rozmiar PDF            | 10000000 bajtów                                |
| Liczba stron           | do 200                                         |
| Wyodrębniony tekst     | do 60 000 znaków, łącznie ze znacznikami stron |
| Liczba części          | do 8                                           |
| Tekst jednej części    | do około 3300 tokenów danych                   |
| Body żądania API       | do 400 000 bajtów                              |
| Wspólny limiter demo   | 1 żądanie/minutę, 30/dzień UTC, 1 równocześnie |

Każdy limit obowiązuje niezależnie. Dokument krótszy niż 60 000 znaków również może przekroczyć limit części. Przekroczenie limitu powoduje komunikat błędu; tekst ani tablice wynikowe nie są celowo obcinane.

Konfiguracja została przygotowana dla budżetu Groq **8000 tokenów na minutę**, obejmującego treść, instrukcje i odpowiedź. To założenie konfiguracji, nie gwarancja limitów każdego konta. Backend szacuje budżet całego żądania, maksymalnej odpowiedzi i zapasu. Rzeczywiste limity należy sprawdzić w panelu Groq.

Krótki dokument wymaga jednego żądania. Długi jest dzielony automatycznie: najpierw analizowane są części, następnie dodatkowe żądanie tworzy wspólne podsumowanie i punkty. Daty, kwoty i pozostałe tablice faktów są łączone w kodzie; usuwane są dokładne duplikaty, a odmienne konteksty pozostają.

**Między żądaniami dla długiego dokumentu są przerwy po 65 sekund.** Przeglądarka musi pozostać otwarta. Dla umowy testowej podzielonej na 3 części potrzeba 4 żądań z syntezą oraz 3 przerw, czyli 195 sekund samych przerw, dodatkowo odczyt i generowanie. Ta konfiguracja **nie spełnia celu poniżej 30 sekund dla tego długiego pliku**. Czas krótkich analiz zależy od API i nie jest gwarantowany.

Limit 30 żądań jest wspólny dla wszystkich użytkowników demo. Każda część i synteza liczą się osobno. Limit dobowy resetuje się o północy UTC, a nie po 24 godzinach od pierwszego użycia. Rezerwacja budżetu jest pobierana również przy błędzie. Komunikat limitera nie rozróżnia przekroczenia limitu minutowego i dziennego.

Błędna odpowiedź modelu może zostać ponowiona maksymalnie raz, po 65 sekundach. Po błędzie limitu dostawcy nie uruchamiamy płatnego zastępstwa. Ponowne kliknięcie analizy po błędzie rozpoczyna przetwarzanie od początku; nie ma wznawiania od ostatniej części.

## OCR i ograniczenia jakości

OCR działa lokalnie w przeglądarce przez WebAssembly i nie wymaga GPU ani osobnego klucza. Zasoby silnika i języków są serwowane z aplikacji, bez zewnętrznego API OCR. Kopiowane zasoby zajmują około 62 MB; pierwsze użycie pobiera potrzebny wariant silnika i modele językowe. W cache mogą pozostać modele językowe, nie zapis analizy dokumentu.

- OCR uruchamia się tylko wtedy, gdy na stronie nie odczytano tekstu. Obrazy zawierające tekst lub tabele na stronie z istniejącą warstwą tekstową mogą zostać pominięte.
- Tabele z warstwą tekstową są odczytywane przez PDF.js. Złożone kolumny, kolejność elementów i komórki tabel mogą utrudniać interpretację.
- OCR może mylić litery i cyfry. Całkowicie pusta lub nieczytelna strona kończy analizę komunikatem zamiast cichego pominięcia.
- PDF zabezpieczony hasłem wymaga odblokowanej kopii.
- AI może błędnie interpretować warunki, daty i kwoty mimo poprawnej struktury JSON. Wynik należy porównać ze źródłem.
- Nie ma historii analiz ani trwałego zapisywania wyników w aplikacji.

W rzeczywistych testach krótkiej umowy, faktury i oferty poprawnie rozpoznano główne fakty. Długa umowa ujawniła m.in. nieprecyzyjny opis terminu podwyżki, potencjalny koszt potraktowany jako pewny, dopowiedziane dni w datach miesięcznych i duplikaty nazwisk. Wynik uwzględnił skan aneksu oraz zignorował instrukcję podania fałszywej ceny 1 PLN. Jeden poprawny test nie dowodzi ogólnej odporności na prompt injection. Szczegóły współpracy z AI i poprawek są w [AI_LOG.md](AI_LOG.md).

## Bezpieczeństwo i prywatność

- Oryginalny plik jest przetwarzany w przeglądarce; do backendu i Groq trafia tekst oraz metadane po zaznaczeniu zgody.
- Kod aplikacji nie utrwala dokumentów, tekstu ani wyników na serwerze i nie loguje ich treści. Warunki przetwarzania po stronie dostawców należy ocenić osobno przed użyciem dokumentów poufnych.
- Klucz Groq jest sekretem backendu. Model wybierany jest po stronie serwera.
- Endpoint sprawdza rozmiar żądania, schemat, origin i wspólny limit. CORS nie zastępuje uwierzytelniania; zewnętrzny klient może podrobić nagłówek Origin i zużyć pulę demo.
- Durable Object przechowuje liczniki, rezerwacje i dzienny skrót IP używany w limiterze, bez dokumentów. To dane pseudonimowe. Wygasłe wpisy są usuwane przy kolejnych żądaniach.
- Treść PDF jest w prompcie traktowana jako nieufne dane. Wyniki są renderowane jako tekst, bez `dangerouslySetInnerHTML`.
- Analizy można wyłączyć przez `ANALYSIS_ENABLED = "false"` w konfiguracji Workera i ponowne wdrożenie.

## Testy i build

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run test:worker
npm run build
npx wrangler deploy --dry-run
```

Testy jednostkowe sprawdzają m.in. walidację, dzielenie tekstu, scalanie wyników, ekstrakcję z atrapą PDF.js i obsługę błędów. `test:worker` uruchamia lokalny runtime z atrapą Groq i sprawdza CORS, preflight, walidację, rozmiar body, metadane oraz limiter. Nie zużywa tokenów prawdziwego modelu.

Rzeczywiste analizy wykonano lokalnie po stronie autora, a eksporty porównano z PDF-ami. Testy automatyczne z atrapami nie potwierdzają jakości modelu.

Opcjonalna diagnostyka odczytu i OCR w Node:

```bash
node scripts/check-pdf.mjs /sciezka/do/testowego.pdf
```

Narzędzie wymaga opcjonalnego pakietu canvas dostarczanego z PDF.js. Wypisuje także rozpoznany tekst skanu, więc należy używać go świadomie na materiałach testowych. Nie wywołuje API AI.

## Hosting i dostępność

Frontend aplikacji jest przeznaczony do publikacji na GitHub Pages. Backend działa na Cloudflare Workers, a analizę tekstu wykonuje model udostępniany przez Groq.

Korzystanie z publicznego demo nie wymaga instalowania programu ani posiadania własnego klucza API. Dokument jest odczytywany w przeglądarce, a po wyrażeniu zgody wyodrębniony tekst trafia do analizy AI.