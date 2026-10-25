import { createApp } from "./app";

const PORT = 3001;

createApp().listen(PORT, () => {
  console.log(`Actwise server listening on http://localhost:${PORT}`);
});