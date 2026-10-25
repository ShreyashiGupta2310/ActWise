import { useCallback, useEffect, useState } from "react";
import { fetchItems, type ItemsResponse } from "./api";
import { ImportBox } from "./components/ImportBox";

function App() {
  const [data, setData] = useState<ItemsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchItems()
      .then((response) => {
        setData(response);
        setLoadError(null);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Could not load items."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main>
      <h1>Actwise</h1>
      <p className="tagline">Know what matters. Act on it.</p>

      <ImportBox onImported={load} />

      <section className="card">
        <h2>Saved so far{data ? `: ${data.total}` : ""}</h2>
        {loadError && <p className="error">{loadError}</p>}
        {data && data.total === 0 && <p className="hint">Nothing yet. Import your bookmarks above.</p>}
        {data && data.items.length > 0 && (
          <ul className="items">
            {data.items.map((item) => (
              <li key={item.id}>
                <a href={item.url} target="_blank" rel="noreferrer">
                  {item.title}
                </a>
                <div className="folder">
                  {item.folderPath || "No folder"}
                  {item.savedAt ? ` · saved ${new Date(item.savedAt).toLocaleDateString()}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default App;