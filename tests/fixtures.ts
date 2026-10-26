export const validModel = {
  document: {
    language: 'pl',
    type: 'umowa',
    title: 'Umowa serwisowa',
    date: '2026-10-01',
  },
  summary:
    'Umowa określa zasady serwisu. Wynagrodzenie wynosi 12500 PLN netto. Termin zapłaty to 15 października 2026 roku.',
  keyPoints: [
    'Serwis oprogramowania',
    'Wynagrodzenie 12500 PLN netto',
    'Płatność do 15 października 2026',
  ],
  entities: { organizations: ['Przykład sp. z o.o.'], people: [] },
  amounts: [{ value: 12500, currency: 'PLN', context: 'wynagrodzenie netto' }],
  dates: [{ date: '2026-10-15', context: 'termin płatności' }],
  keywords: ['serwis'],
};
