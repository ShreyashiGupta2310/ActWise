import type { Action, Deadline, TodayItem } from "../api";

interface Props {
  item: TodayItem;
  busy: boolean;
  onAction: (id: number, action: Action) => void;
}

const TYPE_LABEL: Record<string, string> = {
  job: "Job or internship",
  hackathon: "Hackathon",
  repo: "Code project",
  learning: "Learning",
  other: "Other",
};

function DeadlineLine({ deadline }: { deadline: Deadline }) {
  if (deadline.state === "verified") {
    return (
      <p className="deadline ok">
        Deadline {deadline.date}. The page says: “{deadline.quote}”
      </p>
    );
  }
  if (deadline.state === "mentioned") {
    return (
      <p className="deadline warn">
        The page mentions a deadline, but Actwise could not confirm the date: “{deadline.quote}”
      </p>
    );
  }
  return <p className="deadline muted">No deadline found on the page.</p>;
}

export function ItemCard({ item, busy, onAction }: Props) {
  const saved = item.savedAt ? new Date(item.savedAt).toLocaleDateString() : null;

  return (
    <article className="item-card">
      <div className="pill">{TYPE_LABEL[item.type] ?? "Other"}</div>
      <h3>
        <a href={item.url} target="_blank" rel="noreferrer">
          {item.title}
        </a>
      </h3>
      <div className="folder">
        {item.folderPath || "No folder"}
        {saved ? ` · saved ${saved}` : ""}
      </div>

      <p>
        <span className="label">What it is (AI summary):</span> {item.summary}
      </p>
      <p>
        <span className="label">Why it may matter (AI guess, please check):</span>{" "}
        {item.whyItMayMatter}
      </p>

      <DeadlineLine deadline={item.deadline} />

      <div className="checked">
        <span className="label">Checked by plain code:</span>
        <ul className="reasons">
          {item.reasons.map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
      </div>

      {item.unknowns.length > 0 && (
        <p className="muted">
          <span className="label">Not on the page:</span> {item.unknowns.join("; ")}
        </p>
      )}

      <p className="next">
        <span className="label">Next 10 minutes:</span> {item.nextStep}
      </p>

      <div className="btns">
        {item.status === "doing" ? (
          <button className="primary" disabled={busy} onClick={() => onAction(item.id, "done")}>
            Done
          </button>
        ) : (
          <button className="primary" disabled={busy} onClick={() => onAction(item.id, "do")}>
            I will do this
          </button>
        )}
        <button disabled={busy} onClick={() => onAction(item.id, "later")}>
          Later (hides 3 days)
        </button>
        <button disabled={busy} onClick={() => onAction(item.id, "drop")}>
          Drop it
        </button>
      </div>
    </article>
  );
}