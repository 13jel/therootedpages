import { useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { runImport, reindexSearch } from "../api/adminImport";
import AdminNav from "../components/AdminNav";
import { usePageTitle } from "../hooks/usePageTitle";

export default function AdminImport() {
  usePageTitle("Admin – Import");
  const { token } = useAuth();
  const [running, setRunning] = useState(null); // 'csv' | 'xml' | 'reindex' | null
  const [report, setReport] = useState(null);
  const [reindexed, setReindexed] = useState(null);
  const [error, setError] = useState(null);
  const reportRef = useRef(null);

  async function handleImport(format) {
    if (running) return;
    setRunning(format);
    setError(null);
    setReport(null);
    setReindexed(null);
    try {
      setReport(await runImport(token, format));
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(null);
      setTimeout(() => reportRef.current?.focus(), 0);
    }
  }

  async function handleReindex() {
    if (running) return;
    setRunning("reindex");
    setError(null);
    setReport(null);
    setReindexed(null);
    try {
      const result = await reindexSearch(token);
      setReindexed(result.indexed);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(null);
      setTimeout(() => reportRef.current?.focus(), 0);
    }
  }

  return (
    <div className="admin-products">
      <AdminNav />
      <h1>Admin – Import</h1>
      <p>
        Hämtar leverantörens produktkatalog och lägger till eller uppdaterar
        produkter på artikelnummer. Samma import två gånger skapar inga
        dubbletter.
      </p>

      <div className="import-actions">
        <button
          type="button"
          aria-disabled={running !== null}
          onClick={() => handleImport("csv")}
        >
          {running === "csv" ? "Importerar..." : "Importera CSV"}
        </button>
        <button
          type="button"
          aria-disabled={running !== null}
          onClick={() => handleImport("xml")}
        >
          {running === "xml" ? "Importerar..." : "Importera XML"}
        </button>
        <button
          type="button"
          aria-disabled={running !== null}
          onClick={handleReindex}
        >
          {running === "reindex" ? "Synkar..." : "Synka sökindex"}
        </button>
      </div>

      <div
        ref={reportRef}
        tabIndex={-1}
        className="import-report"
        aria-live="polite"
      >
        {running && <p role="status">Arbetar…</p>}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {reindexed !== null && (
          <p role="status">
            Sökindexet är uppdaterat: {reindexed} produkter skickades.
          </p>
        )}
        {report && (
          <>
            <h2>
              Rapport ({report.format.toUpperCase()}, {report.bransch})
            </h2>
            {report.searchIndexStale && (
              <p className="form-error" role="alert">
                Produkterna är sparade, men sökindexet är inte uppdaterat. Tryck
                på "Synka sökindex" när sökningen fungerar igen.
              </p>
            )}
            <ul className="import-summary">
              <li>
                Rader i filen: <strong>{report.total}</strong>
              </li>
              <li>
                Nya: <strong>{report.created}</strong>
              </li>
              <li>
                Uppdaterade: <strong>{report.updated}</strong>
              </li>
              <li>
                Oförändrade: <strong>{report.unchanged}</strong>
              </li>
              <li>
                Hoppades över: <strong>{report.skipped.length}</strong>
              </li>
            </ul>

            {report.skipped.length > 0 && (
              <table className="import-skipped">
                <caption>Överhoppade produkter</caption>
                <thead>
                  <tr>
                    <th scope="col">Artikelnummer</th>
                    <th scope="col">Orsak</th>
                  </tr>
                </thead>
                <tbody>
                  {report.skipped.map((s, i) => (
                    <tr key={`${s.sku}-${i}`}>
                      <td>{s.sku}</td>
                      <td>{s.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
