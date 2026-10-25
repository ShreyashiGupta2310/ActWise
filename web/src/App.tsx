import { useEffect, useState } from "react";

function App() {
  const [status, setStatus] = useState("checking...");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("server not reachable"));
  }, []);

  return (
    <main>
      <h1>Actwise</h1>
      <p>Know what matters. Act on it.</p>
      <p>Server: {status}</p>
    </main>
  );
}

export default App;