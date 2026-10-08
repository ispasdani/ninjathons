"use client";

import { useConvexAuth, useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { ArrowLeft, Check, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { api } from "@/convex/_generated/api";
import { titleForLevel } from "@/convex/lib/levels";
import { cn } from "@/lib/utils";
import { judgeWebPage, pageSource, type WebFiles, type WebVerdict } from "@/lib/web-judge";
import { ChallengeChips } from "./challenge-chips";
import { CodeEditor } from "./code-editor";
import { ProblemStatement } from "./problem-statement";
import { Split } from "./split";

type Problem = Extract<NonNullable<FunctionReturnType<typeof api.problems.getBySlug>>, { mode: "web" }>;
type FileName = "html" | "css";
type View = "side" | "overlay" | "checks";
type Outcome = FunctionReturnType<typeof api.web.submit>;

const ERRORS: Record<string, string> = {
  SOURCE_TOO_LONG: "Your HTML or CSS is over 64 KB.",
  SUBMIT_COOLDOWN: "Wait a few seconds between Submits.",
  PROBLEM_NOT_FOUND: "This challenge isn't available.",
  UNAUTHENTICATED: "Sign in to submit.",
};

// Drafts are kept per challenge and file in this browser only, like code drafts.
function readDraft(slug: string, file: FileName): string | null {
  try {
    return localStorage.getItem(`draft:${slug}:${file}`);
  } catch {
    return null;
  }
}
function writeDraft(slug: string, file: FileName, value: string) {
  try {
    localStorage.setItem(`draft:${slug}:${file}`, value);
  } catch {
    // Storage full or blocked: the draft just isn't kept.
  }
}

/**
 * A page drawn at the challenge's width and scaled down to fit its panel.
 * Sandboxed without allow-scripts, so nothing in it runs.
 */
function Preview({ source, width, label, className }: { source: string; width: number; label: string; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);
  return (
    <div ref={box} className={cn("relative min-h-0 flex-1 overflow-hidden bg-white", className)}>
      {/* Remounted for each new source: changing srcdoc in place can leave it blank, and adds history entries. */}
      <iframe
        key={source}
        title={label}
        sandbox=""
        srcDoc={source}
        className="absolute top-0 left-0 origin-top-left border-0"
        style={{ width, height: `${100 / scale}%`, transform: `scale(${scale})` }}
      />
    </div>
  );
}

/**
 * The HTML and CSS challenge view (decisions §17): the statement on the left,
 * the editor (one tab per file) on the right, and under it your page next to
 * the target, laid over it, or the checks. Run and Submit judge in this
 * browser; a Submit is then recorded for XP and lessons.
 */
export function WebSolveView({ problem }: { problem: Problem }) {
  const { slug } = problem;
  const { isAuthenticated } = useConvexAuth();
  const submit = useMutation(api.web.submit);

  const editable = (file: FileName) => problem.edit.includes(file);
  const [file, setFile] = useState<FileName>(problem.edit[0] ?? "html");
  const [files, setFiles] = useState<WebFiles>(problem.starter);
  const [preview, setPreview] = useState<WebFiles>(problem.starter);
  const [view, setView] = useState<View>("side");
  const [verdict, setVerdict] = useState<WebVerdict | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the drafts once, for the files the player edits.
  useEffect(() => {
    const loaded = {
      html: (editable("html") && readDraft(slug, "html")) || problem.starter.html,
      css: (editable("css") && readDraft(slug, "css")) || problem.starter.css,
    };
    /* eslint-disable react-hooks/set-state-in-effect -- initial load from storage */
    setFiles(loaded);
    setPreview(loaded);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per challenge
  }, [slug]);

  // The preview follows your typing after a short pause.
  useEffect(() => {
    const timer = setTimeout(() => setPreview(files), 300);
    return () => clearTimeout(timer);
  }, [files]);

  function change(value: string) {
    if (!editable(file)) return;
    setFiles((current) => ({ ...current, [file]: value }));
    writeDraft(slug, file, value);
  }

  function reset() {
    setFiles(problem.starter);
    for (const name of problem.edit) writeDraft(slug, name, problem.starter[name]);
  }

  const judge = useCallback(
    async (kind: "run" | "submit") => {
      if (busy) return;
      setBusy(true);
      setError(null);
      setOutcome(null);
      try {
        const result = await judgeWebPage({
          user: pageSource(files),
          target: pageSource(problem.target),
          checks: problem.checks,
          viewports: problem.viewports,
        });
        setVerdict(result);
        setView("checks");
        if (kind === "submit") {
          setOutcome(await submit({ slug, html: files.html, css: files.css, passed: result.passed, total: result.total }));
        }
      } catch (e) {
        const code = e instanceof ConvexError ? String(e.data) : "";
        setError(ERRORS[code] ?? "Couldn't check your page. Please try again.");
      } finally {
        setBusy(false);
      }
    },
    [busy, files, problem, slug, submit],
  );

  const width = problem.viewports[0];
  const mine = pageSource(preview);
  const target = pageSource(problem.target);
  const tabs: FileName[] = ["html", "css"];

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
        <ChallengeChips slug={slug} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="hidden font-mono text-xs text-muted-foreground tabular-nums xl:inline">
            {problem.viewports.map((w) => `${w}px`).join(" · ")} · checked in your browser
          </span>
          <Button variant="ghost" size="sm" onClick={reset} title="Replace your files with the starter files">
            Reset
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => judge("run")} title="Ctrl + '">
            Run
          </Button>
          <Button
            variant="brand"
            size="sm"
            disabled={busy || !isAuthenticated}
            onClick={() => judge("submit")}
            title="Ctrl + Enter"
          >
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
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <ProblemStatement {...problem} />
          </div>
        }
        second={
          <Split
            direction="column"
            storageKey="solve:web-results"
            initial={50}
            min={20}
            max={80}
            label="Resize the editor and preview panels"
            first={
              <div className="flex h-[420px] min-h-0 flex-col lg:h-auto lg:flex-1">
                <div role="tablist" aria-label="Files" className="flex h-10 shrink-0 items-end gap-4 border-b px-4">
                  {tabs.map((name) => (
                    <button
                      key={name}
                      type="button"
                      role="tab"
                      aria-selected={file === name}
                      onClick={() => setFile(name)}
                      className="-mb-px border-b-2 border-transparent pb-2 font-mono text-xs text-muted-foreground uppercase transition-colors hover:text-foreground aria-selected:border-foreground aria-selected:text-foreground"
                    >
                      {name}
                      {!editable(name) && <span className="ml-1.5 normal-case">(given)</span>}
                    </button>
                  ))}
                </div>
                <div className="min-h-0 flex-1">
                  <CodeEditor
                    path={`${slug}.${file}`}
                    language={file}
                    value={files[file]}
                    readOnly={!editable(file)}
                    onChange={change}
                    onRun={() => judge("run")}
                    onSubmit={() => judge("submit")}
                  />
                </div>
              </div>
            }
            second={
              <section aria-label="Preview" className="flex min-h-80 flex-1 flex-col border-t lg:min-h-0 lg:border-t-0">
                <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b px-4">
                  <Segmented
                    label="Preview"
                    value={view}
                    onChange={setView}
                    options={[
                      ["side", "Side by side"],
                      ["overlay", "Overlay"],
                      ["checks", verdict ? `Checks ${verdict.passed}/${verdict.total}` : "Checks"],
                    ]}
                  />
                  <p className="hidden font-mono text-xs text-muted-foreground sm:block">Ctrl + &apos; run · Ctrl + Enter submit</p>
                </div>
                {view === "side" && (
                  <div className="grid min-h-0 flex-1 grid-cols-2 divide-x">
                    <figure className="flex min-h-0 flex-col">
                      <figcaption className="px-3 py-1.5 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                        Your page
                      </figcaption>
                      <Preview source={mine} width={width} label="Your page" />
                    </figure>
                    <figure className="flex min-h-0 flex-col">
                      <figcaption className="px-3 py-1.5 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                        Target
                      </figcaption>
                      <Preview source={target} width={width} label="Target" />
                    </figure>
                  </div>
                )}
                {view === "overlay" && (
                  <div className="relative flex min-h-0 flex-1">
                    <Preview source={mine} width={width} label="Your page" />
                    <Preview
                      source={target}
                      width={width}
                      label="Target, laid over your page"
                      className="pointer-events-none absolute inset-0 bg-transparent opacity-50"
                    />
                  </div>
                )}
                {view === "checks" && (
                  <div aria-live="polite" className="min-h-0 flex-1 overflow-y-auto p-4">
                    <Checks verdict={verdict} outcome={outcome} error={error} signedIn={isAuthenticated} />
                  </div>
                )}
              </section>
            }
          />
        }
      />
    </div>
  );
}

function Checks({
  verdict,
  outcome,
  error,
  signedIn,
}: {
  verdict: WebVerdict | null;
  outcome: Outcome | null;
  error: string | null;
  signedIn: boolean;
}) {
  if (error) return <p className="text-[13px] text-destructive">{error}</p>;
  if (!verdict) {
    return (
      <p className="text-[13px] text-muted-foreground">
        Run compares your page with the target, check by check. Submit does the same and records your solve
        {signedIn ? "." : " once you sign in."}
      </p>
    );
  }
  const accepted = verdict.passed === verdict.total;
  const several = new Set(verdict.results.map((r) => r.viewport)).size > 1;
  return (
    <div className="space-y-4 text-[13px]">
      <p className={cn("font-medium", accepted ? "text-verdict-ac" : "text-verdict-wa")}>
        {accepted ? "Accepted" : "Not the same yet"}
        <span className="ml-2 font-mono text-xs font-normal text-muted-foreground tabular-nums">
          {verdict.passed}/{verdict.total} checks
        </span>
      </p>
      {outcome?.accepted && (
        <div className="flex flex-wrap items-center gap-2" role="status">
          {outcome.xp ? (
            <span className="rounded-xs bg-brand px-1.5 py-0.5 font-mono text-xs font-medium text-brand-foreground tabular-nums">
              +{outcome.xp} XP
            </span>
          ) : (
            <span className="text-muted-foreground">No XP this time: you&apos;ve already solved this challenge.</span>
          )}
          {outcome.learn?.lessons.map((lesson) => (
            <Link key={lesson.slug} href={`/learn/${lesson.slug}`} className="font-medium hover:underline">
              Lesson finished · {lesson.title}
            </Link>
          ))}
          {outcome.levelReached !== null && (
            <span className="font-medium">
              Level {outcome.levelReached} reached · {titleForLevel(outcome.levelReached)}
            </span>
          )}
          {outcome.badges.length > 0 && (
            <Link href="/badges" className="text-text-secondary hover:underline">
              {outcome.badges.length === 1 ? "Badge earned" : "Badges earned"}
            </Link>
          )}
        </div>
      )}
      <ul className="divide-y rounded-md border">
        {verdict.results.map((r, i) => (
          <li key={i} className="flex items-start gap-3 px-3 py-2">
            {r.ok ? (
              <Check className="mt-0.5 size-4 shrink-0 text-verdict-ac" aria-label="Passed" />
            ) : (
              <X className="mt-0.5 size-4 shrink-0 text-verdict-wa" aria-label="Failed" />
            )}
            <div className="min-w-0">
              <p className="font-mono text-xs">
                {r.selector}
                {several && <span className="text-muted-foreground"> · {r.viewport}px</span>}
              </p>
              {r.message && <p className="mt-0.5 text-muted-foreground">{r.message}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
