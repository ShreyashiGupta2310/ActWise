import { useCallback, useEffect, useState } from "react";
import { fetchToday, sendAction, type Action, type TodayResponse } from "./api";
import { ImportBox } from "./components/ImportBox";
import { ItemCard } from "./components/ItemCard";
import { NeedsLook } from "./components/NeedsLook";

function App() {
  const [data, setData] = useState<TodayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    fetchToday()
      .then((response) => {
        setData(response);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load Today."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const waiting = data?.counts.waiting ?? 0;
  useEffect(() => {
    if (waiting === 0) return;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [waiting, load]);

  async function handleAction(id: number, action: Action) {
    setBusyId(id);
    try {
      await sendAction(id, action);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main>
      <h1>Actwise</h1>
      <p className="tagline">Know what matters. Act on it.</p>

      {data?.modelProblem && (
        <p className="banner">
          The local AI model is not available ({data.modelProblem}). Start Ollama and check the
          model name. Actwise will keep trying.
        </p>
      )}

      <section className="card">
        <h2>Today</h2>
        {error && <p className="error">{error}</p>}

        {data && data.items.length > 0 && (
          <>
            {data.items.map((item) => (
              <ItemCard key={item.id} item={item} busy={busyId === item.id} onAction={handleAction} />
            ))}
            {data.counts.ready > data.items.length && (
              <p className="hint">
                {data.counts.ready - data.items.length} more are ready. Finish or drop one of these
                to see the next.
              </p>
            )}
          </>
        )}

        {data && data.items.length === 0 && data.counts.total === 0 && (
          <p className="hint">Nothing saved yet. Import your Chrome bookmarks below.</p>
        )}

        {data && data.items.length === 0 && data.counts.total > 0 && waiting > 0 && (
          <p className="hint">
            Reading your saved pages slowly ({waiting} left). Cards appear here as they are ready.
          </p>
        )}

        {data && data.items.length === 0 && data.counts.total > 0 && waiting === 0 && (
          <p className="hint">
            Nothing here clearly matches your goals right now. That is okay.
          </p>
        )}

        {data && data.items.length > 0 && waiting > 0 && (
          <p className="hint">Still reading {waiting} more pages in the background.</p>
        )}

        {data && <p className="hint">Goals used for matching: {data.goals.join(", ")}.</p>}
      </section>

      <ImportBox onImported={load} />

      {data && <NeedsLook items={data.needsLook} total={data.counts.needsLook} />}
    </main>
  );
}

export default App;