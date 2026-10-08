import { isValidElement, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const LANGUAGE_NAMES: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  csharp: "C#",
  cpp: "C++",
  rust: "Rust",
  html: "HTML",
  css: "CSS",
  text: "Output",
};

/** A fenced code block, with its language named above it (lessons often show the same code in two). */
function CodeBlock({ children }: { children?: ReactNode }) {
  const code = isValidElement<{ className?: string }>(children) ? children : null;
  const language = code?.props.className?.match(/language-(\w+)/)?.[1];
  const name = language ? (LANGUAGE_NAMES[language] ?? language) : null;
  return (
    <div className="overflow-hidden rounded-md border bg-bg-secondary">
      {name && (
        <p className="border-b px-4 py-1.5 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
          {name}
        </p>
      )}
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-5 text-foreground">{children}</pre>
    </div>
  );
}

/**
 * Lesson and roadmap Markdown at reading width (design.md 5): body copy at
 * 16px, headings at regular weight, code in Geist Mono on a muted surface.
 */
export function LessonText({ children }: { children: string }) {
  return (
    <div
      className={[
        "max-w-3xl space-y-4 text-base leading-7 text-text-secondary",
        "[&_h2]:mt-10 [&_h2]:text-xl [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-foreground",
        "[&_strong]:font-medium [&_strong]:text-foreground [&_a]:text-brand-text [&_a]:underline",
        "[&_ul]:ml-5 [&_ul]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal [&_li]:mt-1",
        "[&_:not(pre)>code]:rounded-xs [&_:not(pre)>code]:bg-bg-secondary [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[14px]",
        "[&_table]:w-full [&_table]:text-[13px] [&_th]:border-b [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_td]:border-b [&_td]:py-2 [&_td]:pr-4",
        "[&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
      ].join(" ")}
    >
      <Markdown remarkPlugins={[remarkGfm]} components={{ pre: CodeBlock }}>
        {children}
      </Markdown>
    </div>
  );
}
