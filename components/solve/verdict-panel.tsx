import type { Doc } from "@/convex/_generated/dataModel";
import type { VerdictStatus } from "@/convex/schemas/submissions";

import { Rewards } from "./rewards";

const LABELS: Record<VerdictStatus, { short: string; long: string; color: string }> = {
  accepted: { short: "AC", long: "Accepted", color: "text-verdict-ac bg-verdict-ac/10" },
  wrong_answer: { short: "WA", long: "Wrong answer", color: "text-verdict-wa bg-verdict-wa/10" },
  runtime_error: { short: "RE", long: "Runtime error", color: "text-verdict-re bg-verdict-re/10" },
  time_limit: { short: "TLE", long: "Time limit exceeded", color: "text-verdict-tle bg-verdict-tle/10" },
  memory_limit: { short: "MLE", long: "Memory limit exceeded", color: "text-verdict-mle bg-verdict-mle/10" },
  output_limit: { short: "OLE", long: "Output limit exceeded", color: "text-verdict-mle bg-verdict-mle/10" },
  compile_error: { short: "CE", long: "Compile error", color: "text-verdict-ce bg-verdict-ce/10" },
};

export function VerdictBadge({ status }: { status: VerdictStatus }) {
  const label = LABELS[status];
  return (
    <span className={`rounded-xs px-1.5 py-0.5 font-mono text-xs font-medium ${label.color}`}>{label.short}</span>
  );
}

function Block({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <pre className="max-h-40 overflow-auto rounded-sm bg-bg-secondary px-3 py-2 font-mono text-xs leading-5 break-all whitespace-pre-wrap">
        {text || " "}
      </pre>
    </div>
  );
}

export function VerdictPanel({ submission }: { submission: Doc<"submissions"> | null | undefined }) {
  if (!submission) {
    return (
      <p className="text-[13px] text-muted-foreground">
        Run checks your code on the examples. Submit checks it on every test.
      </p>
    );
  }

  if (submission.status === "queued" || submission.status === "running") {
    return (
      <p className="flex items-center gap-2 text-[13px] text-verdict-pending">
        <span className="size-2 animate-pulse rounded-full bg-verdict-pending" />
        {submission.status === "queued" ? "Queued…" : submission.kind === "run" ? "Running examples…" : "Judging…"}
      </p>
    );
  }

  if (submission.status === "error" || !submission.verdict) {
    return <p className="text-[13px] text-destructive">{submission.error ?? "Something went wrong."}</p>;
  }

  const { verdict } = submission;
  // Server clock only (architecture doc): from the row's creation to the verdict.
  const seconds = submission.finishedAt ? (submission.finishedAt - submission._creationTime) / 1000 : null;

  return (
    <div className="space-y-4 text-[13px]">
      <div className="flex flex-wrap items-center gap-3">
        <VerdictBadge status={verdict.status} />
        <span className="font-medium">{LABELS[verdict.status].long}</span>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {verdict.passed}/{verdict.total} tests · {verdict.timeMs} ms
          {seconds !== null && ` · verdict in ${seconds.toFixed(1)} s`}
        </span>
      </div>

      {submission.kind === "submit" && verdict.status === "accepted" && <Rewards submission={submission} />}

      {verdict.compileOutput && <Block label="Compiler output" text={verdict.compileOutput} />}

      <ol className="space-y-3">
        {verdict.tests.map((test, i) =>
          test.visible ? (
            <li key={i} className="space-y-2 rounded-md border p-3">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <VerdictBadge status={test.status} /> Example {i + 1} · {test.timeMs} ms
              </p>
              {test.status !== "accepted" && (
                <>
                  <Block label="Input" text={test.input ?? ""} />
                  <Block label="Expected" text={test.expected ?? ""} />
                  {test.status === "wrong_answer" && <Block label="Your output" text={test.actual ?? ""} />}
                </>
              )}
              {test.logs && <Block label={test.status === "accepted" ? "Printed" : "Error and printed output"} text={test.logs} />}
            </li>
          ) : (
            test.status !== "accepted" && (
              <li key={i} className="flex items-center gap-2 rounded-md border p-3 text-xs text-muted-foreground">
                <VerdictBadge status={test.status} /> Hidden test {i + 1} · {test.timeMs} ms · inputs of hidden tests stay hidden
              </li>
            )
          ),
        )}
      </ol>
    </div>
  );
}
