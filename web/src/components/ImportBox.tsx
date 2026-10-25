import { useState } from "react";
import { importBookmarks, type ImportSummary } from "../api";

interface Props {
  onImported: () => void;
}

export function ImportBox({ onImported }: Props) {
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setSummary(null);
    setError(null);
    try {
      const text = await file.text();
      setSummary(await importBookmarks(text));
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2>Bring in your bookmarks</h2>
      <p className="hint">
        In Chrome: Bookmark manager, then the three dots, then Export bookmarks. Pick that file here.
      </p>
      <input
        type="file"
        accept=".html,text/html"
        disabled={busy}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {busy && <p>Reading your bookmarks...</p>}
      {error && <p className="error">{error}</p>}
      {summary && (
        <p className="ok">
          Found {summary.totalLinks} links: {summary.added} new, {summary.duplicates} already
          saved, {summary.skipped} skipped (not web pages).
        </p>
      )}
    </section>
  );
}