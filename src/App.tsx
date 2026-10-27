import { useRef, useState } from 'react';
import { validateFile } from './lib/file';
import Results from './components/Results';
import type { AnalysisResult } from '../shared/schema';
type Phase = 'idle' | 'reading' | 'analyzing';
export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [page, setPage] = useState('');
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const busy = phase !== 'idle';
  const select = (files: FileList | null) => {
    if (busyRef.current || !files?.length) return;
    setResult(null);
    setError('');
    setConsent(false);
    if (files.length !== 1) {
      setFile(null);
      setError('Wybierz jeden plik PDF.');
      return;
    }
    try {
      validateFile(files[0]);
      setFile(files[0]);
    } catch (e) {
      setFile(null);
      setError(e instanceof Error ? e.message : 'Niepoprawny plik.');
    }
  };
  const run = async () => {
    if (!file || busyRef.current || !consent) return;
    busyRef.current = true;
    setPhase('reading');
    setError('');
    setResult(null);
    setPage('Otwieranie dokumentu…');
    try {
      const { extractPdf } = await import('./lib/pdf');
      const extracted = await extractPdf(
        file,
        (n, total) => setPage(`Odczytano ${n} z ${total} stron`),
        setPage,
      );
      setPhase('analyzing');
      const { analyzeDocument } = await import('./api/analyzeDocument');
      setPage('Analiza tekstu przez AI…');
      const data = await analyzeDocument(
        extracted,
        setPage,
        AbortSignal.timeout(1200000),
      );
      setResult(data);
      requestAnimationFrame(() => resultRef.current?.focus());
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.',
      );
    } finally {
      busyRef.current = false;
      setPhase('idle');
    }
  };
  return (
    <>
      <header className="header">
        <a className="brand" href="./" aria-label="PDF Insight — strona główna">
          <span className="brand-icon" aria-hidden="true">
            P<span>✦</span>
          </span>
          PDF<span className="brand-light">Insight</span>
        </a>
        <span className="header-tag">
          <span /> Dokumenty, które rozumiesz
        </span>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="line" /> MNIEJ CZYTANIA. WIĘCEJ WIEDZY.
            </span>
            <h1>
              Twój PDF.
              <br />
              <span>Jasny obraz.</span>
            </h1>
            <p>
              Od długiego dokumentu do krótkiego podsumowania i uporządkowanych
              danych. W jednym miejscu.
            </p>
            <div className="hero-pills">
              <span>↗ Podsumowanie AI</span>
              <span>⌘ Eksport JSON</span>
              <span>◎ Bez konta</span>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="orbit" />
            <div className="doc-card">
              <div className="doc-top">
                <span>PDF</span>
                <i>•••</i>
              </div>
              <div className="fake-title" />
              <div className="fake-line" />
              <div className="fake-line short" />
              <div className="fake-highlight" />
              <div className="fake-line" />
              <div className="fake-line short" />
            </div>
            <div className="insight-card">
              <span className="spark">✦</span>
              <div>
                <strong>Wszystko, co istotne.</strong>
                <span>Treść zamieniona w wiedzę</span>
              </div>
              <span className="check">✓</span>
            </div>
            <span className="code-tag">&#123; dane, uporządkowane &#125;</span>
          </div>
        </section>
        <section className="workspace" aria-labelledby="upload-title">
          <div className="workspace-heading">
            <div>
              <span className="step">01</span>
              <h2 id="upload-title">Zacznij od dokumentu</h2>
            </div>
            <span className="muted">PDF z warstwą tekstową · do 10 MB</span>
          </div>
          <div
            className={`dropzone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (!busy) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              select(e.dataTransfer.files);
            }}
          >
            <span className="upload-icon" aria-hidden="true">
              {file ? '✓' : '↑'}
            </span>
            <h3>{file ? file.name : 'Przeciągnij plik PDF tutaj'}</h3>
            <p>
              {file
                ? `${(file.size / 1024 / 1024).toFixed(2)} MB · gotowy do odczytu`
                : 'lub wybierz dokument ze swojego urządzenia'}
            </p>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => {
                if (input.current) {
                  input.current.value = '';
                  input.current.click();
                }
              }}
            >
              {file ? 'Zmień plik' : 'Wybierz plik PDF'}{' '}
              <span aria-hidden="true">↗</span>
            </button>
            <input
              ref={input}
              className="sr-only"
              tabIndex={-1}
              type="file"
              accept=".pdf,application/pdf"
              aria-label="Plik PDF"
              disabled={busy}
              onChange={(e) => select(e.target.files)}
            />
          </div>
          <aside
            className="analysis-info"
            aria-label="Czas analizy dłuższych dokumentów"
          >
            <strong>Dłuższe dokumenty analizujemy w częściach</strong>
            <p>
              Darmowa konfiguracja tego demo zakłada budżet Groq 8000 tokenów na
              minutę, obejmujący tekst, instrukcje i odpowiedź AI. Dłuższy tekst
              dzielimy automatycznie. Między żądaniami czekamy 65 sekund,
              dlatego analiza może potrwać kilka minut. Nie musisz samodzielnie
              dzielić PDF-a.
            </p>
          </aside>
          <div className="action-row">
            <label className="consent">
              <input
                type="checkbox"
                checked={consent}
                disabled={busy}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                Zgadzam się na przesłanie wyodrębnionego tekstu do API Groq w
                celu analizy. PDF jest odczytywany w przeglądarce; aplikacja nie
                zapisuje dokumentu ani wyników na serwerze.
              </span>
            </label>
            <button
              className="primary analyze"
              disabled={!file || !consent || busy}
              onClick={() => void run()}
            >
              {busy
                ? 'Trwa analiza…'
                : error
                  ? 'Spróbuj ponownie'
                  : 'Przeanalizuj PDF'}{' '}
              <span aria-hidden="true">✦</span>
            </button>
          </div>
          {busy && (
            <div className="progress" role="status" aria-live="polite">
              <span className="spinner" />
              <div>
                <strong>
                  {phase === 'reading'
                    ? 'Odczyt tekstu z PDF'
                    : 'Analiza dokumentu przez AI'}
                </strong>
                <p>{page}</p>
              </div>
            </div>
          )}
          {error && (
            <div role="alert" className="error">
              <strong>Nie udało się zakończyć analizy</strong>
              <p>{error}</p>
            </div>
          )}
        </section>
        <div ref={resultRef} tabIndex={-1}>
          {result ? (
            <Results result={result} />
          ) : (
            <section className="how">
              <div>
                <span>01 / WCZYTAJ</span>
                <h3>Dodaj swój PDF</h3>
                <p>Umowę, fakturę, ofertę lub raport z tekstem.</p>
              </div>
              <div>
                <span>02 / ZROZUM</span>
                <h3>Przejdź do sedna</h3>
                <p>Krótkie podsumowanie, kluczowe fakty, daty i kwoty.</p>
              </div>
              <div>
                <span>03 / WYKORZYSTAJ</span>
                <h3>Zabierz dane ze sobą</h3>
                <p>Sprawdź wynik i pobierz gotowy plik JSON.</p>
              </div>
            </section>
          )}
        </div>
      </main>
      <footer>
        <span>
          PDF Insight <span className="footer-dot">/</span> od dokumentu do
          danych
        </span>
        <span>
          OCR PL/EN · do 60 000 znaków · długie PDF-y mogą wymagać kilku minut
        </span>
      </footer>
    </>
  );
}
