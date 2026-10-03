import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  title: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  mode: "function" | "stdio";
  statement: string;
  examples: { input: string; output: string; explanation?: string }[];
  hints: string[];
};

const DIFFICULTY_DOTS = { easy: 1, medium: 2, hard: 3 };

/** Function-mode inputs are JSON objects of arguments; show them as `name = value`. */
function formatInput(input: string, mode: Props["mode"]): string {
  if (mode === "stdio") return input;
  try {
    return Object.entries(JSON.parse(input) as Record<string, unknown>)
      .map(([name, value]) => `${name} = ${JSON.stringify(value)}`)
      .join(", ");
  } catch {
    return input;
  }
}

export function ProblemStatement({ title, difficulty, tags, mode, statement, examples, hints }: Props) {
  return (
    <article className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl">{title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-[13px] text-muted-foreground">
          <span className="flex items-center gap-1.5 capitalize">
            {difficulty}
            <span className="flex gap-0.5" aria-hidden>
              {[1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`size-1.5 rounded-full ${i <= DIFFICULTY_DOTS[difficulty] ? "bg-foreground" : "bg-border"}`}
                />
              ))}
            </span>
          </span>
          <span className="font-mono text-xs tracking-[0.12em] uppercase">
            {mode === "function" ? "Function" : "Full program"}
          </span>
          {tags.map((tag) => (
            <span key={tag} className="rounded-sm bg-bg-secondary px-2 py-0.5 text-xs">
              {tag}
            </span>
          ))}
        </div>
      </header>

      <div className="space-y-3 text-[15px] leading-6 [&_code]:rounded-xs [&_code]:bg-bg-secondary [&_code]:px-1 [&_code]:font-mono [&_code]:text-[13px] [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-medium [&_li]:ml-5 [&_li]:list-disc">
        <Markdown remarkPlugins={[remarkGfm]}>{statement}</Markdown>
      </div>

      <section className="space-y-3">
        {examples.map((example, i) => (
          <div key={i} className="rounded-md border bg-bg-secondary p-4 font-mono text-[13px] leading-5">
            <p className="mb-2 font-sans text-xs font-medium text-muted-foreground">Example {i + 1}</p>
            <p className="break-all whitespace-pre-wrap">
              <span className="text-muted-foreground">Input: </span>
              {formatInput(example.input, mode)}
            </p>
            <p className="break-all whitespace-pre-wrap">
              <span className="text-muted-foreground">Output: </span>
              {example.output}
            </p>
            {example.explanation && (
              <p className="mt-1 font-sans text-muted-foreground">{example.explanation}</p>
            )}
          </div>
        ))}
      </section>

      {hints.length > 0 && (
        <section className="space-y-2">
          {hints.map((hint, i) => (
            <details key={i} className="rounded-md border px-4 py-3 text-[13px]">
              <summary className="cursor-pointer font-medium">Hint {i + 1}</summary>
              <div className="mt-2 text-muted-foreground [&_code]:font-mono">
                <Markdown>{hint}</Markdown>
              </div>
            </details>
          ))}
        </section>
      )}
    </article>
  );
}
