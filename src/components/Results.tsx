import { useState } from 'react';
import type { AnalysisResult } from '../../shared/schema';
export default function Results({ result }: { result: AnalysisResult }) {
  const [tab, setTab] = useState<'overview' | 'json'>('overview');
  const [notice, setNotice] = useState('');
  const json = JSON.stringify(result, null, 2);
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([json], { type: 'application/json;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = result.document.fileName.replace(/\.pdf$/i, '') + '.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setNotice('JSON skopiowany do schowka.');
    } catch {
      setNotice('Nie udało się skopiować. Pobierz plik JSON.');
    }
  };
  return (
    <section className="results" aria-label="Wyniki analizy">
      <div className="result-heading">
        <div>
          <span className="eyebrow">ANALIZA GOTOWA</span>
          <h2>{result.document.title || 'Dokument bez tytułu'}</h2>
        </div>
        <button className="primary" onClick={download}>
          Pobierz JSON <span aria-hidden="true">↘</span>
        </button>
      </div>
      <div className="metadata">
        <span>{result.document.type}</span>
        <span>{result.document.pages} str.</span>
        <span>Język: {result.document.language || 'brak danych'}</span>
        <span>Data: {result.document.date || 'brak danych'}</span>
      </div>
      <div className="tabs" aria-label="Widok wyników">
        <button
          aria-pressed={tab === 'overview'}
          onClick={() => setTab('overview')}
        >
          Podsumowanie i dane
        </button>
        <button aria-pressed={tab === 'json'} onClick={() => setTab('json')}>
          Podgląd JSON
        </button>
      </div>
      {tab === 'json' ? (
        <div className="json">
          <button onClick={() => void copy()}>Kopiuj JSON</button>
          <pre tabIndex={0}>{json}</pre>
        </div>
      ) : (
        <>
          <div className="summary">
            <h3>Najważniejsze w kilku zdaniach</h3>
            <p>{result.summary}</p>
          </div>
          <div className="data-grid">
            <article>
              <h3>Kluczowe informacje</h3>
              <ul>
                {result.keyPoints.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </article>
            <article>
              <h3>Osoby i organizacje</h3>
              <h4>Organizacje</h4>
              <Items items={result.entities.organizations} />
              <h4>Osoby</h4>
              <Items items={result.entities.people} />
            </article>
            <article>
              <h3>Kwoty</h3>
              {result.amounts.length ? (
                <ul className="facts">
                  {result.amounts.map((a, i) => (
                    <li key={i}>
                      <strong>
                        {new Intl.NumberFormat('pl-PL', {
                          maximumFractionDigits: 6,
                        }).format(a.value)}{' '}
                        {a.currency || '(waluta nieznana)'}
                      </strong>
                      <span>{a.context}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Brak danych</p>
              )}
            </article>
            <article>
              <h3>Daty</h3>
              {result.dates.length ? (
                <ul className="facts">
                  {result.dates.map((d, i) => (
                    <li key={i}>
                      <strong>{d.date}</strong>
                      <span>{d.context}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Brak danych</p>
              )}
            </article>
          </div>
          <div className="keywords">
            <h3>Słowa kluczowe</h3>
            {result.keywords.length ? (
              result.keywords.map((k, i) => <span key={i}>{k}</span>)
            ) : (
              <p className="muted">Brak danych</p>
            )}
          </div>
        </>
      )}
      <p role="status" className="muted">
        {notice}
      </p>
      <p className="result-note">
        Wynik wygenerowany przez AI. Przed wykorzystaniem porównaj dane z
        dokumentem źródłowym.
      </p>
    </section>
  );
}
function Items({ items }: { items: string[] }) {
  return items.length ? (
    <ul>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  ) : (
    <p className="muted">Brak danych</p>
  );
}
