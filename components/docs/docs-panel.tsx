"use client";

import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, ExternalLink, Search } from "lucide-react";
import { useEffect, useState } from "react";
import Markdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

import { CodeBlock } from "@/components/learn/lesson-text";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Language } from "@/convex/judge/types";

export type DocArea = "javascript" | "html" | "css" | "python";

/** The references for a language (decisions §8, §17). The other languages' sets come later. */
export function docAreasFor(language: Language | "web" | null): DocArea[] {
  if (language === "javascript" || language === "typescript") return ["javascript"];
  if (language === "python") return ["python"];
  if (language === "web") return ["html", "css"];
  return [];
}

type Open = { id: Id<"docPages"> } | { set: "mdn" | "python"; path: string };

/**
 * The docs library in a side panel (design.md 6, research panel): search the
 * references for the language in use, read a page, follow its links. In a
 * 1v1 match, each page opened is noted for the result (decisions §9).
 */
export function DocsPanel({
  areas,
  languageLabel,
  matchId,
}: {
  areas: DocArea[];
  languageLabel: string;
  matchId?: Id<"matches">;
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [history, setHistory] = useState<Open[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useQuery(api.docs.search, areas.length ? { areas, q: debounced } : "skip");
  const open = history[history.length - 1];

  if (areas.length === 0) {
    return (
      <p className="text-[13px] text-muted-foreground">
        No docs for {languageLabel} yet. The library has MDN (JavaScript, TypeScript, HTML, CSS) and Python so far;
        the official references for Java, C#, C++ and Rust come later.
      </p>
    );
  }

  if (open) {
    return (
      <DocPage
        open={open}
        matchId={matchId}
        onBack={() => setHistory((h) => h.slice(0, -1))}
        onFollow={(next) => setHistory((h) => [...h, next])}
      />
    );
  }

  return (
    <div className="space-y-4">
      {matchId && (
        <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
          Official docs only · pages you open show on the result
        </p>
      )}
      <label className="relative block">
        <span className="sr-only">Search the docs</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={areas.includes("python") ? "Search Python: sorted, dict, heapq…" : "Search MDN: map, flex, input…"}
          className="h-9 w-full rounded-md border bg-background pr-3 pl-9 text-[13px] hover:border-border-strong dark:bg-bg-secondary"
        />
      </label>
      {!debounced.trim() && <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">Start with</p>}
      {results === undefined ? (
        <p className="text-[13px] text-muted-foreground">Searching…</p>
      ) : results.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Nothing matches &ldquo;{debounced}&rdquo;.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {results.map((r) => (
            <li key={r._id}>
              <button
                type="button"
                onClick={() => setHistory([{ id: r._id }])}
                className="w-full px-3 py-2.5 text-left transition-colors hover:bg-bg-secondary"
              >
                <span className="block text-[13px] font-medium">{r.title}</span>
                <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">{r.breadcrumb.join(" › ")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DocPage({
  open,
  matchId,
  onBack,
  onFollow,
}: {
  open: Open;
  matchId?: Id<"matches">;
  onBack: () => void;
  onFollow: (next: Open) => void;
}) {
  const page = useQuery(api.docs.page, "id" in open ? { id: open.id } : { set: open.set, path: open.path });
  const noteView = useMutation(api.docs.noteMatchView);
  const pageId = page?._id;

  useEffect(() => {
    if (matchId && pageId) noteView({ matchId, pageId }).catch(() => {});
  }, [matchId, pageId, noteView]);

  return (
    <article className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Back
      </button>
      {page === undefined ? (
        <p className="text-[13px] text-muted-foreground">Loading…</p>
      ) : page === null ? (
        <p className="text-[13px] text-muted-foreground">This page isn&apos;t in the library.</p>
      ) : (
        <>
          <header>
            <p className="font-mono text-[11px] text-muted-foreground">{page.breadcrumb.join(" › ")}</p>
            <h2 className="mt-1 text-xl">{page.title}</h2>
          </header>
          <div
            className={[
              "max-w-[42rem] space-y-3 text-[15px] leading-6 text-text-secondary",
              "[&_h2]:mt-8 [&_h2]:text-lg [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:font-medium [&_h3]:text-foreground [&_h4]:mt-6 [&_h4]:font-medium [&_h4]:text-foreground [&_h5]:mt-4 [&_h5]:font-medium [&_h5]:text-foreground",
              "[&_strong]:font-medium [&_strong]:text-foreground [&_a]:text-brand-text [&_a]:underline",
              "[&_ul]:ml-5 [&_ul]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal [&_li]:mt-1",
              "[&_:not(pre)>code]:rounded-xs [&_:not(pre)>code]:bg-bg-secondary [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[13px]",
              "[&_table]:block [&_table]:overflow-x-auto [&_table]:text-[13px] [&_th]:border-b [&_th]:py-2 [&_th]:pr-4 [&_th]:text-left [&_th]:font-medium [&_td]:border-b [&_td]:py-2 [&_td]:pr-4",
              "[&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
            ].join(" ")}
          >
            <Markdown
              remarkPlugins={[remarkGfm]}
              // Links between library pages use doc:; everything else gets the safe default.
              urlTransform={(url) => (url.startsWith("doc:") ? url : defaultUrlTransform(url))}
              components={{
                pre: CodeBlock,
                a: ({ href, children }) => {
                  const inLibrary = href?.match(/^doc:(mdn|python)\/(.+)$/);
                  if (inLibrary) {
                    return (
                      <button
                        type="button"
                        className="text-brand-text underline"
                        onClick={() => onFollow({ set: inLibrary[1] as "mdn" | "python", path: inLibrary[2] })}
                      >
                        {children}
                      </button>
                    );
                  }
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  );
                },
              }}
            >
              {page.body}
            </Markdown>
          </div>
          <footer className="space-y-1 border-t pt-3 text-xs text-muted-foreground">
            <p>{page.license}</p>
            <p>
              <a
                href={page.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
              >
                {page.version} · source <ExternalLink className="size-3" aria-hidden />
              </a>
            </p>
          </footer>
        </>
      )}
    </article>
  );
}
