import { extractPageText } from "../src/fetching/extractText";
import { safeFetch } from "../src/fetching/safeFetch";

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.log("Usage: npx tsx scripts/tryFetch.ts <url>");
    return;
  }
  const result = await safeFetch(url);
  if (!result.ok) {
    console.log("Failed:", result.reason);
    return;
  }
  const page = extractPageText(result.html);
  console.log("Title:", page.title);
  console.log("Text starts:", page.text.slice(0, 300));
}

main();