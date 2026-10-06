"use client";

import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

import type { Language } from "@/convex/judge/types";

// Monaco's own language ids.
const MONACO_LANGUAGE: Record<Language, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  java: "java",
  csharp: "csharp",
  cpp: "cpp",
  rust: "rust",
};

type Props = {
  language: Language;
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  onSubmit: () => void;
};

// Basic editor for phase 1. The Catppuccin themes from design.md come with the
// designed solve view in phase 2.
export function CodeEditor({ language, value, onChange, onRun, onSubmit }: Props) {
  const { resolvedTheme } = useTheme();
  // Monaco keeps the commands from mount time, so they call through refs.
  const handlers = useRef({ onRun, onSubmit });
  useEffect(() => {
    handlers.current = { onRun, onSubmit };
  }, [onRun, onSubmit]);
  return (
    <Editor
      height="100%"
      language={MONACO_LANGUAGE[language]}
      value={value}
      onChange={(v) => onChange(v ?? "")}
      theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
      loading={<p className="p-4 text-[13px] text-muted-foreground">Loading editor…</p>}
      options={{
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: 13,
        lineHeight: 20,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        tabSize: language === "python" || language === "rust" || language === "java" || language === "csharp" || language === "cpp" ? 4 : 2,
        automaticLayout: true,
        padding: { top: 12 },
      }}
      onMount={(editor, monaco) => {
        // Ctrl/Cmd+' runs the examples, Ctrl/Cmd+Enter submits.
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Quote, () => handlers.current.onRun());
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => handlers.current.onSubmit());
      }}
    />
  );
}
