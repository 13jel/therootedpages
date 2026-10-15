import { useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { runImport } from "../api/adminImport";
import AdminNav from "../components/AdminNav";
import { usePageTitle } from "../hooks/usePageTitle";

export default function AdminImport() {
  usePageTitle("Admin – Import");
  const { token } = useAuth();
  const [running, setRunning] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const reportRef = useRef(null);

  async function handleImport(format) {
    if (running) return;
    setRunning(format);
    setError(null);
    setReport(null);
    try {
      const result = await runImport(token, format);
      setReport(result);
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
      </div>

      <div
        ref={reportRef}
        tabIndex={-1}
        className="import-report"
        aria-live="polite"
      >
        {running && (
          <p role="status">Hämtar och importerar från leverantören…</p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {report && (
          <>
            <h2>
              Rapport ({report.format.toUpperCase()}, {report.bransch})
            </h2>
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
