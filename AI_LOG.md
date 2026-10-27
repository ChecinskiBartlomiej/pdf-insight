# AI_LOG — praca z AI przy PDF Insight

## Narzędzia

Korzystałem z asystenta Codex w ChatGPT Work do przygotowania planu, generowania i poprawiania kodu oraz wyjaśniania działania aplikacji. Aplikacja korzysta z modelu openai/gpt-oss-120b przez API Groq do analizy tekstu dokumentów. Klucza API nie przekazywałem asystentowi ani nie umieszczałem w repozytorium.

## Kluczowe polecenia

### 1. Przygotowanie planu

Streszczenie początkowego polecenia:

> Na podstawie załączonego zadania przygotuj szczegółowy plan realizacji aplikacji PDF Insight.

Omówiłem z AI szczegóły i w kilku iteracjach dopracowałem plan.

### 2. Implementacja zgodnie z planem

Polecenie przekazane AI:

> zrob to zadanie, napisz kod zgodnie z planem

Poniżej zamieszczam pełną treść początkowego planu. Opisuje on założenia sprzed implementacji, a nie potwierdzenie wykonania wszystkich punktów. OCR i obsługę długich dokumentów dodano później.

---

# PDF Insight — plan realizacji

Data ustaleń: 26.10.2026. Termin oddania: 27.10.2026, godz. 10:00, czas Warszawy.

## Cel i ustalenia

Zbudować aplikację webową, która przyjmuje PDF z warstwą tekstową do 10 MB, odczytuje tekst, tworzy podsumowanie w 3–5 zdaniach i zwraca uporządkowane dane JSON zgodne ze schematem briefu. Typowy dokument ma dawać wynik w mniej niż 30 sekund. Demo musi być na GitHub Pages i działać minimum 14 dni; bezpiecznie liczymy okres od oddania.

Wybraliśmy przygotowanie plików przez asystenta bez bezpośredniego łączenia konta GitHub. Użytkownik tworzy puste publiczne repozytorium, a asystent przygotowuje kod i instrukcje wysłania oraz wdrożenia. Plan nie jest potwierdzeniem wykonania: implementacja nie została jeszcze rozpoczęta.

## Stack

| Narzędzie | Rola |

|---|---|

| React 18+ i Vite | Frontend |

| TypeScript strict | Typowanie |

| PDF.js | Odczyt tekstu w przeglądarce |

| Cloudflare Workers | Backend i ochrona klucza |

| Groq API, plan Free | Analiza AI |

| openai/gpt-oss-120b | Pierwszy model do przetestowania |

| Zod | Wspólny schemat i walidacja |

| Vitest | Testy jednostkowe |

| ESLint i Prettier | Jakość kodu |

| GitHub Actions | Sprawdzanie i publikacja |

| GitHub Pages | Publiczny hosting frontendu |

GPU ani Claude Code nie są potrzebne. Nazwa modelu zawiera OpenAI, lecz konto i klucz będą w Groq; konto API OpenAI nie jest potrzebne.

## 1. Konta, pliki i dostęp

Użytkownik przygotuje konta GitHub, Cloudflare i Groq. Groq pozostaje na Free, bez aktualizacji do Developer. Utworzy puste publiczne repozytorium, np. pdf-insight, oraz klucz Groq. Klucza nie wolno wklejać do rozmowy, kodu ani repozytorium; zostanie zapisany jako sekret backendu.

Potrzebna jest testowa umowa Test_PDF_Insight_umowa_14-2026.pdf wymieniona w mailu. W rozmowie dostępny był jedynie brief. Czynności wymagające logowania, płatności i autoryzacji wykonuje użytkownik według instrukcji.

## 2. Weryfikacja darmowego API

Przed pełną integracją sprawdzimy dostępność modelu, limity przypisane do konta, wywołanie API, JSON Schema, jakość polskich danych i czas odpowiedzi. Nie zakładamy jakości modelu bez testu.

Publiczna tabela Groq sprawdzona 26.10.2026 wskazywała dla gpt-oss-120b: 30 zapytań/min, 1000 zapytań/dzień, 8000 tokenów/min i 200 000 tokenów/dzień. Dokładne wartości należy potwierdzić w panelu konta. Tokeny obejmują przetwarzaną treść; pula tokenów może skończyć się wcześniej niż liczba zapytań. Przy przekroczeniu limitu API zwraca 429. Nie włączamy automatycznego płatnego zastępstwa.

Opcja zapasowa do sprawdzenia: darmowe modele OpenRouter (oferta Free podawała 50 zapytań/dzień). Darmowe Gemini nie jest wybraną podstawą: sprawdzony regulamin wymaga Paid Services przy udostępnianiu aplikacji użytkownikom EOG.

## 3. Szkielet projektu

Utworzyć React/Vite, TypeScript strict, polecenia uruchomienia, testów, lintowania, kontroli typów i buildu. Podział: src/components/, src/lib/, src/api/, worker/ i shared/. Bez any, zbędnych console.log i sekretów. Dodać .gitignore i .env.example. Frontend otrzymuje tylko publiczny VITE_API_URL; klucz Groq pozostaje w backendzie.

## 4. Schemat danych

Zdefiniować w Zod wszystkie wymagane pola: document (fileName, pages, language, type, title, date), summary, keyPoints, entities (organizations, people), amounts (value, currency, context), dates (date, context), keywords. Brak informacji oznacza null lub pustą tablicę tam, gdzie dopuszcza to schemat. Daty ISO 8601, język ISO 639-1, waluty ISO 4217. Typ: faktura, umowa, oferta, raport lub inne. KeyPoints: 3–7 pozycji.

Nazwę pliku i liczbę stron ustala aplikacja, nie model. Zgodność schematu sprawdza backend i frontend. Dodać testy poprawnych i błędnych wyników oraz wartości pustych.

## 5. Wgrywanie PDF

Zbudować drag & drop i przycisk wyboru, prezentację nazwy i rozmiaru, zmianę pliku i informację o przesyłaniu tekstu do zewnętrznego AI. Zapewnić obsługę klawiaturą i blokadę wielokrotnego uruchamiania analizy. Sprawdzić limit 10 MB i poprawność dokumentu przez próbę odczytu, nie tylko rozszerzenie.

## 6. Ekstrakcja tekstu

Zintegrować PDF.js i poprawne ścieżki workera na GitHub Pages. Odczytać strony, tekst i przygotować wejście do analizy. Obsłużyć PDF uszkodzony, za duży, zabezpieczony hasłem i bez tekstu. Nie ucinać treści bez informacji. Dla przekroczenia zakresu pokazać ograniczenie. OCR nie należy do pierwszej wersji.

## 7. Backend

Utworzyć endpoint: odbiór tekstu i metadanych → walidacja żądania → kontrola limitów → Groq API → walidacja odpowiedzi → wynik. Skonfigurować CORS dla demo i lokalnego środowiska, w tym preflight. Nie przechowywać PDF-ów i nie logować treści dokumentów ani klucza. Kontrolować rozmiar żądania także na backendzie.

## 8. Prompt i analiza

Wymagać 3–5 zdań podsumowania i wartości w języku dokumentu przy angielskich nazwach kluczy. Model nie zgaduje brakujących danych, rozróżnia daty i kwoty według kontekstu, a treść PDF traktuje jako dane, nie instrukcje. Użyć JSON Schema/Structured Outputs i Zod. Porównać fakty z dokumentem: poprawna struktura nie gwarantuje poprawnej treści.

## 9. Błędy i ponawianie

Obsłużyć timeout, niedostępność API, odmowę, niekompletną odpowiedź, błędny JSON i wyczerpanie limitu. Przy błędnej odpowiedzi modelu dokładnie jedna ponowna próba, następnie komunikat błędu. Limit API nie uruchamia płatnej usługi. Frontend pozwala świadomie ponowić analizę po błędzie.

## 10. Bezpieczeństwo i kontrola użycia

Klucz w sekretach Workera, osobny dla projektu. Model ustalany po stronie backendu. Ograniczyć częstotliwość, długość tekstu, długość odpowiedzi, równoczesne analizy i liczbę prób. Dodać wspólny limit dla całej aplikacji oraz możliwość wyłączenia analiz. Wspólny limit wymaga trwałej, skoordynowanej kontroli po stronie serwera; lokalny licznik w pamięci nie wystarcza.

CORS nie jest samodzielnym zabezpieczeniem publicznego endpointu. Darmowa pula może zostać zużyta przez osoby trzecie, powodując czasową niedostępność. Nie włączać płatnego planu bez osobnej decyzji. Nie wyświetlać treści przez dangerouslySetInnerHTML. Poinformować o przekazywaniu tekstu do AI.

## 11. Wyniki i eksport

Zbudować sekcje metadanych, podsumowania, punktów, osób, organizacji, dat, kwot i słów kluczowych. Jasno pokazać brak danych. Dodać podgląd JSON, kopiowanie, pobieranie .json i rozpoczęcie kolejnej analizy. Eksport obejmuje kompletny zwalidowany schemat.

## 12. UX i dostępność

Komunikaty po polsku, responsywność od 360 px, kontrast, fokus i obsługa klawiaturą. Stany: początkowy, wybrany plik, odczyt, analiza, wynik i błąd. Postęp jako rzeczywiste etapy, bez fikcyjnych procentów. Sprawdzić długie nazwy plików i treści.

## 13. Weryfikacja

Uruchomić testy schematu i istotnej logiki, w tym liczby ponowień. Ręcznie sprawdzić umowę testową, inny rodzaj dokumentu, brak danych, skan, zły format, uszkodzenie, przekroczenie rozmiaru, błąd API, limity i prompt injection. Porównać kwoty, daty, osoby i firmy ze źródłem. Sprawdzić eksport, telefon, klawiaturę i czas całego przepływu. Potwierdzić brak sekretów w plikach frontendu i historii Git.

## 14. Git i wdrożenie

Użytkownik tworzy puste repozytorium. Asystent przygotowuje komendy wysłania i logiczne etapy commitów: feat:, fix:, docs:. Skonfigurować base Vite dla nazwy repozytorium, worker PDF.js, API URL i GitHub Actions: lint → typy → testy → build → deploy. Jedna strona bez routera, jeśli dodatkowe trasy nie będą potrzebne.

Przeprowadzić użytkownika przez wdrożenie Workera, ustawienie sekretu i GitHub Pages. Wdrożyć pierwszy działający przepływ wcześnie. Publiczny adres ma postać https://<user>.github.io/<repo>/.

## 15. Dokumentacja i AI_LOG.md

README: opis, demo, screenshot, architektura i decyzje, uruchomienie lokalne, zmienne, sekrety, testy, build, wdrożenie i ograniczenia, w tym darmowe limity, brak OCR oraz przekazywanie tekstu do AI.

AI_LOG.md tworzyć od początku i aktualizować po ważnych etapach. Zapisywać faktycznie użyte narzędzia, 3–5 kluczowych promptów, rzeczywiste błędy AI, poprawki i weryfikację. Nie wymyślać zdarzeń i nie deklarować niewykonanych testów. Nie kopiować całej rozmowy ani sekretów. Aktualizacje commitować wraz ze zmianami. Przed oddaniem porównać log z kodem i historią.

## 16. Dodatki po wymaganiach MUST

Jeśli czas i limity pozwolą: dzielenie długich dokumentów oraz scalanie wyników; następnie lokalna historia analiz z usuwaniem. Uwzględnić, że dzielenie zwiększa liczbę wywołań i może utrudnić osiągnięcie czasu poniżej 30 sekund. OCR poza pierwszą wersją.

## 17. Kontrola publicznej wersji

Sprawdzić bez logowania ładowanie zasobów, odczyt, API, analizę, pobranie JSON, odświeżenie strony i telefon. Zweryfikować limity oraz brak klucza w repozytorium i frontendzie. Nie uznawać działania lokalnego za dowód poprawnego wdrożenia.

## 18. Zrozumienie rozwiązania

Omówić kod z użytkownikiem: przepływ danych, rolę backendu, lokalizację klucza, walidację, błędy, limity i ograniczenia. Użytkownik musi potrafić wyjaśnić oddawany projekt.

## 19. Oddanie i utrzymanie

Repozytorium wkleić w pole „Link do zadania testowego”, a demo w „Komentarz do zadania”. Użytkownik sam uzupełnia formę współpracy, oczekiwania finansowe i wysyła formularz. Termin: 27.10.2026, 10:00, Warszawa. Utrzymać demo, Worker i dostęp API minimum 14 dni. Monitorować dostępność darmowej puli; nie deklarować gwarancji dostępności darmowego dostawcy.

## Podział obowiązków

Asystent: kod, schemat, integracja, zabezpieczenia, dostępne testy, poprawki, konfiguracja CI/CD, README, AI_LOG, instrukcje i wyjaśnienie kodu. Użytkownik: konta, utworzenie repozytorium i klucza, bezpieczne ustawienie sekretu, kroki wymagające logowania i autoryzacji, formularz oraz utrzymanie kont.

## Kolejność i szacunek

Najpierw konta/limity i plik testowy, potem szkielet/schemat, PDF, backend/AI, wyniki, testy, wdrożenie i dokumentacja. Szacunek planistyczny 10–13 godzin pracy, zależny od dostępności środowiska, kont i wyników testów. Priorytet: MUST, wierność danych, bezpieczeństwo, działające demo. Nie jest to gwarancja czasu wykonania.

## Źródła ustaleń API (sprawdzone 26.10.2026)

- Groq limity: https://console.groq.com/docs/rate-limits

- Groq JSON Schema: https://console.groq.com/docs/structured-outputs

- Groq rozliczenia: https://console.groq.com/docs/billing-faqs

- OpenRouter oferta: https://openrouter.ai/pricing

- Gemini regulamin: https://ai.google.dev/gemini-api/terms

Limity i warunki należy potwierdzić ponownie przy konfiguracji. Źródłem wymagań rekrutacyjnych jest załączony Brief_Vibe_Coder_PDF_Insight.pdf.

---

### 3. Rozszerzenie obsługi PDF i dodanie OCR

Streszczenie kolejnych poleceń dotyczących tego etapu:

> Dostosuj aplikację do analizy dłuższej umowy testowej. Dodaj OCR dla stron bez warstwy tekstowej i podziel długi tekst na części, uwzględniając limity API.

Dodano lokalny Tesseract.js z językami polskim i angielskim. OCR uruchamia się dla stron, z których PDF.js nie odczytał tekstu. Dłuższy tekst jest analizowany w częściach, a wyniki są łączone. Nie dodawaliśmy wymuszonego OCR wszystkich stron.

### 4. Wyjaśnienie ograniczeń użytkownikowi

Streszczenie polecenia:

> Zachowaj 65-sekundowe przerwy między żądaniami i wyświetl informację, że dłuższy dokument jest automatycznie dzielony ze względu na budżet 8000 tokenów na minutę.

Dodano informację przed analizą i komunikaty postępu wyjaśniające liczbę części oraz oczekiwanie. Wcześniej zleciłem również dopasowanie kolejności pól w wynikowym JSON do przykładu z briefu; kolejność kluczy nie wpływa na znaczenie danych.

## Błędy AI i sposób ich poprawienia

- Początkowy limit około 11 000 znaków odrzucał umowę testową rekrutera. Zamiast obcinać tekst, dodano analizę w częściach i scalanie wyników.
- Kod ekstrakcji dodawał spacje między fragmentami tekstu PDF.js, co rozbijało polskie słowa i zwiększało liczbę tokenów. Usunięto sztuczne spacje, zachowując odstępy i końce wierszy dostarczone przez parser.
- Pierwsza analiza krótkiej umowy zwróciła null w document.date, mimo daty zawarcia rozpoznanej w podsumowaniu. Doprecyzowano prompt. W późniejszym teście data była poprawna.
- Przy renderowaniu strony do OCR wystąpił błąd getOrInsertComputed. Zmieniono import PDF.js i jego workera na wariant legacy, zachowując wersję 6.2.108 z poprawką bezpieczeństwa.
