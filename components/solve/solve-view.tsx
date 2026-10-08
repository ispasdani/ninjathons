"use client";

import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Language } from "@/convex/judge/types";
import { CodeEditor } from "./code-editor";
import { DailyChip } from "./daily-chip";
import { ProblemStatement } from "./problem-statement";
import { Split } from "./split";
import { SubmissionsList } from "./submissions-list";
import { VerdictPanel } from "./verdict-panel";

const ERRORS: Record<string, string> = {
  SUBMISSION_IN_PROGRESS: "Your previous run is still being judged.",
  SOURCE_TOO_LONG: "Your code is over 64 KB.",
  LANGUAGE_NOT_ALLOWED: "This problem can't be solved in that language.",
  PROBLEM_NOT_FOUND: "This problem isn't available.",
  UNAUTHENTICATED: "Sign in to run code.",
};

// Drafts are kept per problem and language in this browser only.
function draftKey(slug: string, language: Language) {
  return `draft:${slug}:${language}`;
}
function readDraft(slug: string, language: Language): string | null {
  try {
    return localStorage.getItem(draftKey(slug, language));
  } catch {
    return null;
  }
}
function writeDraft(slug: string, language: Language, code: string) {
  try {
    localStorage.setItem(draftKey(slug, language), code);
  } catch {
    // Storage full or blocked: the draft just isn't kept.
  }
}

type Tab = "description" | "submissions";

/** Tab buttons above a panel, 13px, the active one underlined. */
function Tabs({ value, onChange }: { value: Tab; onChange: (tab: Tab) => void }) {
  const tabs: [Tab, string][] = [
    ["description", "Description"],
    ["submissions", "Submissions"],
  ];
  return (
    <div role="tablist" aria-label="Problem" className="flex h-10 shrink-0 items-end gap-4 border-b px-4">
      {tabs.map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="tab"
          id={`tab-${id}`}
          aria-selected={value === id}
          aria-controls={`panel-${id}`}
          onClick={() => onChange(id)}
          className="-mb-px border-b-2 border-transparent pb-2 text-[13px] text-muted-foreground transition-colors duration-150 ease-out-quad hover:text-foreground aria-selected:border-foreground aria-selected:font-medium aria-selected:text-foreground"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * The solve view (design.md 5.2): a resizable split with the problem and your
 * submissions on the left, the editor on the right and the results docked
 * under it. Run checks the examples; Submit checks every test.
 */
export function SolveView({ slug }: { slug: string }) {
  const problem = useQuery(api.problems.getBySlug, { slug });
  const createSubmission = useMutation(api.submissions.create);

  const [tab, setTab] = useState<Tab>("description");
  const [language, setLanguage] = useState<Language | null>(null);
  const [code, setCode] = useState("");
  const [submissionId, setSubmissionId] = useState<Id<"submissions"> | null>(null);
  const [openId, setOpenId] = useState<Id<"submissions"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submission = useQuery(api.submissions.get, submissionId ? { id: submissionId } : "skip");
  const opened = useQuery(api.submissions.get, openId ? { id: openId } : "skip");
  const busy = submission?.status === "queued" || submission?.status === "running";

  const current = problem?.languages.find((l) => l.id === language) ?? problem?.languages[0];

  // Pick the first language once the problem loads, and load its draft.
  useEffect(() => {
    if (!problem || language) return;
    const first = problem.languages[0];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from props and storage
    setLanguage(first.id);
    setCode(readDraft(slug, first.id) ?? first.starterCode);
  }, [problem, language, slug]);

  // A submission opened from the Submissions tab: load its code and show its result.
  useEffect(() => {
    if (!opened) return;
    /* eslint-disable react-hooks/set-state-in-effect -- applying data that just arrived */
    setLanguage(opened.language);
    setCode(opened.source);
    writeDraft(slug, opened.language, opened.source);
    setSubmissionId(opened._id);
    setOpenId(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [opened, slug]);

  function switchLanguage(id: Language) {
    const next = problem?.languages.find((l) => l.id === id);
    if (!next) return;
    setLanguage(id);
    setCode(readDraft(slug, id) ?? next.starterCode);
  }

  function changeCode(value: string) {
    setCode(value);
    if (language) writeDraft(slug, language, value);
  }

  function resetCode() {
    if (!current) return;
    setCode(current.starterCode);
    writeDraft(slug, current.id, current.starterCode);
  }

  const send = useCallback(
    async (kind: "run" | "submit") => {
      if (!language || busy) return;
      setError(null);
      try {
        setSubmissionId(await createSubmission({ slug, language, source: code, kind }));
      } catch (e) {
        const code = e instanceof ConvexError ? String(e.data) : "";
        setError(ERRORS[code] ?? "Couldn't start the run. Please try again.");
      }
    },
    [busy, code, createSubmission, language, slug],
  );

  if (problem === undefined) return <p className="p-6 text-[13px] text-muted-foreground">Loading…</p>;
  if (problem === null) return <p className="p-6 text-[13px] text-muted-foreground">Problem not found.</p>;

  const labels = Object.fromEntries(problem.languages.map((l) => [l.id, l.label]));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2">
        <Link
          href="/problems"
          className="flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Problems
        </Link>
        <span className="text-border" aria-hidden>
          /
        </span>
        <span className="truncate text-[13px] font-medium">{problem.title}</span>
        <DailyChip slug={slug} />

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            aria-label="Language"
            className="h-8 rounded-md border bg-background px-2 text-[13px] hover:border-border-strong dark:bg-bg-secondary"
            value={current?.id}
            onChange={(e) => switchLanguage(e.target.value as Language)}
          >
            {problem.languages.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <span className="hidden font-mono text-xs text-muted-foreground tabular-nums xl:inline">
            {current?.version} · {current?.timeLimitMs} ms · {problem.memoryLimitMb} MB
          </span>
          <Button variant="ghost" size="sm" onClick={resetCode} title="Replace your code with the starter code">
            Reset
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => send("run")} title="Ctrl + '">
            Run
          </Button>
          <Button variant="brand" size="sm" disabled={busy} onClick={() => send("submit")} title="Ctrl + Enter">
            Submit
          </Button>
        </div>
      </div>

      <Split
        direction="row"
        storageKey="solve:split"
        initial={42}
        min={25}
        max={70}
        label="Resize the problem and editor panels"
        first={
          <div className="flex min-h-0 flex-1 flex-col lg:border-r-0">
            <Tabs value={tab} onChange={setTab} />
            <div
              role="tabpanel"
              id={`panel-${tab}`}
              aria-labelledby={`tab-${tab}`}
              className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
            >
              {tab === "description" ? (
                <ProblemStatement {...problem} />
              ) : (
                <SubmissionsList slug={slug} labels={labels} onOpen={setOpenId} />
              )}
            </div>
          </div>
        }
        second={
          <Split
            direction="column"
            storageKey="solve:results"
            initial={64}
            min={25}
            max={85}
            label="Resize the editor and results panels"
            first={
              <div className="h-[420px] min-h-0 lg:h-auto lg:flex-1">
                {current && (
                  <CodeEditor
                    language={current.id}
                    value={code}
                    onChange={changeCode}
                    onRun={() => send("run")}
                    onSubmit={() => send("submit")}
                  />
                )}
              </div>
            }
            second={
              <section aria-label="Result" className="flex min-h-48 flex-1 flex-col border-t lg:min-h-0 lg:border-t-0">
                <div className="flex h-10 shrink-0 items-center justify-between border-b px-4">
                  <p className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                    Result
                  </p>
                  <p className="hidden font-mono text-xs text-muted-foreground sm:block">
                    Ctrl + &apos; run · Ctrl + Enter submit
                  </p>
                </div>
                <div aria-live="polite" className="min-h-0 flex-1 overflow-y-auto p-4">
                  {error ? (
                    <p className="text-[13px] text-destructive">{error}</p>
                  ) : (
                    <VerdictPanel submission={submission} />
                  )}
                </div>
              </section>
            }
          />
        }
      />
    </div>
  );
}
