import type { NeedsLookItem } from "../api";

const REASONS: Record<string, string> = {
  http_404: "page not found",
  http_403: "access blocked",
  http_401: "login needed",
  http_429: "site asked us to slow down",
  blocked_address: "address not allowed",
  no_readable_text: "no readable text (maybe needs login or JavaScript)",
  not_html: "not a web page",
  too_large: "page too large",
  timeout: "took too long",
  dns_failed: "site not found",
  network_error: "network problem",
  too_many_redirects: "too many redirects",
  invalid_json: "AI answer unusable",
  invalid_shape: "AI answer unusable",
};

interface Props {
  items: NeedsLookItem[];
  total: number;
}

export function NeedsLook({ items, total }: Props) {
  if (total === 0) return null;

  return (
    <details className="card">
      <summary>Needs a quick look ({total})</summary>
      <p className="hint">
        Actwise could not read these pages. They might still matter, so open them yourself if they
        do.
      </p>
      <ul className="items">
        {items.map((item) => (
          <li key={item.id}>
            <a href={item.url} target="_blank" rel="noreferrer">
              {item.title}
            </a>
            <div className="folder">{REASONS[item.reason] ?? item.reason}</div>
          </li>
        ))}
      </ul>
      {total > items.length && <p className="hint">...and {total - items.length} more.</p>}
    </details>
  );
}