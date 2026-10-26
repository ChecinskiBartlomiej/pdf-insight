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

Wyniki faktycznych komend i zauważone błędy zostaną wpisane po zakończeniu kontroli. Nie wykonano jeszcze publicznego wdrożenia, sprawdzenia umowy rekrutacyjnej ani pomiaru prawdziwego AI. Ostateczna weryfikacja faktów i zrozumienie kodu przez kandydata pozostają wymagane przed oddaniem.
