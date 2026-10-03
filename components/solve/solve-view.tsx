"use client";

import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Language } from "@/convex/judge/types";
import { CodeEditor } from "./code-editor";
import { ProblemStatement } from "./problem-statement";
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

export function SolveView({ slug }: { slug: string }) {
  const problem = useQuery(api.problems.getBySlug, { slug });
  const createSubmission = useMutation(api.submissions.create);

  const [language, setLanguage] = useState<Language | null>(null);
  const [code, setCode] = useState("");
  const [submissionId, setSubmissionId] = useState<Id<"submissions"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submission = useQuery(api.submissions.get, submissionId ? { id: submissionId } : "skip");
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

  if (problem === undefined) return <p className="text-[13px] text-muted-foreground">Loading…</p>;
  if (problem === null) return <p className="text-[13px] text-muted-foreground">Problem not found.</p>;

  return (
    <div className="grid gap-6 lg:h-[calc(100dvh-8rem)] lg:grid-cols-2">
      <div className="min-w-0 lg:overflow-y-auto lg:pr-2">
        <ProblemStatement {...problem} />
      </div>

      <div className="flex min-h-0 min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Language"
            className="h-8 rounded-md border bg-background px-2 text-[13px] hover:border-border-strong"
            value={current?.id}
            onChange={(e) => switchLanguage(e.target.value as Language)}
          >
            {problem.languages.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <span className="font-mono text-xs text-muted-foreground">
            {current?.version} · {current?.timeLimitMs} ms
          </span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => send("run")}>
              Run
            </Button>
            <Button size="sm" disabled={busy} onClick={() => send("submit")}>
              Submit
            </Button>
          </div>
        </div>

        <div className="h-[420px] overflow-hidden rounded-md border lg:h-auto lg:min-h-0 lg:flex-1">
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

        <section aria-live="polite" className="max-h-[40%] min-h-24 overflow-y-auto rounded-md border p-4">
          {error ? <p className="text-[13px] text-destructive">{error}</p> : <VerdictPanel submission={submission} />}
        </section>
      </div>
    </div>
  );
}
