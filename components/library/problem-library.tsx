"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { Check, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Difficulty } from "@/components/problem/difficulty";
import { api } from "@/convex/_generated/api";

type Row = NonNullable<ReturnType<typeof useLibrary>>[number];
type DifficultyFilter = "all" | Row["difficulty"];
type ModeFilter = "all" | Row["mode"];
type StatusFilter = "all" | "solved" | "unsolved";

function useLibrary() {
  return useQuery(api.problems.library);
}

const ORDER = { easy: 0, medium: 1, hard: 2 };

/** Segmented control: one choice out of a few, 13px, like the nav buttons. */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-md border p-0.5">
      {options.map(([id, text]) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          onClick={() => onChange(id)}
          className="h-7 rounded-sm px-2.5 text-[13px] text-muted-foreground transition-colors duration-150 ease-out-quad hover:text-foreground aria-checked:bg-bg-secondary aria-checked:font-medium aria-checked:text-foreground"
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function StatusIcon({ status }: { status: Row["status"] }) {
  if (status === "solved") {
    return (
      <span title="Solved" className="text-verdict-ac">
        <Check className="size-4" aria-label="Solved" />
      </span>
    );
  }
  if (status === "attempted") {
    return <span title="Attempted" aria-label="Attempted" className="block size-2 rounded-full bg-verdict-tle" />;
  }
  return <span className="sr-only">Not attempted</span>;
}

/**
 * The problem library: every published problem with filters, and your own
 * status and progress when signed in. Filters stay in this page's state.
 */
export function ProblemLibrary() {
  const problems = useLibrary();
  const { isAuthenticated } = useConvexAuth();

  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [mode, setMode] = useState<ModeFilter>("all");
  const [topic, setTopic] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const topics = useMemo(
    () => [...new Set((problems ?? []).flatMap((p) => p.tags))].sort(),
    [problems],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (problems ?? [])
      .filter((p) => difficulty === "all" || p.difficulty === difficulty)
      .filter((p) => mode === "all" || p.mode === mode)
      .filter((p) => topic === "all" || p.tags.includes(topic))
      .filter((p) => status === "all" || (status === "solved" ? p.status === "solved" : p.status !== "solved"))
      .filter((p) => !q || p.title.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q)))
      .sort((a, b) => ORDER[a.difficulty] - ORDER[b.difficulty] || a.title.localeCompare(b.title));
  }, [problems, query, difficulty, mode, topic, status]);

  const solved = (problems ?? []).filter((p) => p.status === "solved").length;
  const total = problems?.length ?? 0;
  const filtered = rows.length !== total;

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Library</p>
          <h1 className="mt-2 text-3xl text-balance sm:text-4xl">Problems</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Solve them in JavaScript, TypeScript, Python, Java, C#, C++ or Rust.
          </p>
        </div>
        {isAuthenticated && problems && (
          <div className="w-full max-w-56 sm:w-56">
            <p className="flex justify-between text-[13px]">
              <span className="text-muted-foreground">Solved</span>
              <span className="font-mono font-medium tabular-nums">
                {solved} / {total}
              </span>
            </p>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-sm bg-bg-tertiary"
              role="progressbar"
              aria-label="Problems solved"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={solved}
            >
              <div className="h-full bg-brand" style={{ width: `${total ? (solved / total) * 100 : 0}%` }} />
            </div>
          </div>
        )}
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <label className="flex h-9 w-full items-center gap-2 rounded-md border bg-background px-3 transition-colors focus-within:outline-2 focus-within:outline-ring hover:border-border-strong sm:w-64 dark:bg-bg-secondary">
          <Search className="size-4 text-muted-foreground" aria-hidden />
          <span className="sr-only">Search problems</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or topic"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          />
        </label>
        <Segmented
          label="Difficulty"
          value={difficulty}
          onChange={setDifficulty}
          options={[["all", "All"], ["easy", "Easy"], ["medium", "Medium"], ["hard", "Hard"]]}
        />
        <Segmented
          label="Type"
          value={mode}
          onChange={setMode}
          options={[["all", "Any type"], ["function", "Function"], ["stdio", "Full program"]]}
        />
        <select
          aria-label="Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="h-9 rounded-md border bg-background px-2 text-[13px] hover:border-border-strong dark:bg-bg-secondary"
        >
          <option value="all">All topics</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {isAuthenticated && (
          <Segmented
            label="Status"
            value={status}
            onChange={setStatus}
            options={[["all", "All"], ["unsolved", "Unsolved"], ["solved", "Solved"]]}
          />
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b text-left font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
              <th className="w-10 py-3 pl-4 font-medium">
                <span className="sr-only">Status</span>
              </th>
              <th className="py-3 pr-4 font-medium">Title</th>
              <th className="hidden py-3 pr-4 font-medium md:table-cell">Topics</th>
              <th className="hidden py-3 pr-4 font-medium sm:table-cell">Type</th>
              <th className="py-3 pr-4 font-medium">Difficulty</th>
            </tr>
          </thead>
          <tbody>
            {problems === undefined ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-muted-foreground">
                  No problems match these filters.
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p.slug} className="h-11 border-b last:border-b-0 hover:bg-bg-secondary">
                  <td className="pl-4">
                    <StatusIcon status={p.status} />
                  </td>
                  <td className="pr-4">
                    <Link href={`/solve/${p.slug}`} className="font-medium hover:underline">
                      {p.title}
                    </Link>
                  </td>
                  <td className="hidden pr-4 md:table-cell">
                    <span className="flex flex-wrap gap-1">
                      {p.tags.slice(0, 3).map((t) => (
                        <span key={t} className="rounded-sm bg-bg-secondary px-2 py-0.5 text-xs">
                          {t}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="hidden pr-4 text-muted-foreground sm:table-cell">
                    {p.mode === "function" ? "Function" : "Full program"}
                  </td>
                  <td className="pr-4">
                    <Difficulty level={p.difficulty} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {problems && (
        <p className="mt-3 font-mono text-xs text-muted-foreground tabular-nums">
          {filtered ? `${rows.length} of ${total} problems` : `${total} problems`}
        </p>
      )}
    </div>
  );
}
