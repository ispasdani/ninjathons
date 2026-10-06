"use client";

import Editor, { type Monaco } from "@monaco-editor/react";
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

// Languages whose usual style indents with 4 spaces.
const FOUR_SPACES = new Set<Language>(["python", "java", "csharp", "cpp", "rust"]);

// Catppuccin Latte (light) and Mocha (dark), MIT licensed (design.md 6, code
// and the editor). Backgrounds follow our tokens: --background for the code,
// --bg-secondary for the active line.
const PALETTES = {
  "catppuccin-latte": {
    base: "vs" as const,
    background: "#ffffff",
    activeLine: "#f5f5f5",
    lineNumber: "#9ca0b0",
    selection: "#dce0e8",
    text: "#4c4f69",
    comment: "#9ca0b0",
    keyword: "#8839ef",
    string: "#40a02b",
    number: "#fe640b",
    type: "#df8e1d",
    func: "#1e66f5",
    variable: "#e64553",
  },
  "catppuccin-mocha": {
    base: "vs-dark" as const,
    background: "#0a0a0a",
    activeLine: "#171717",
    lineNumber: "#6c7086",
    selection: "#313244",
    text: "#cdd6f4",
    comment: "#6c7086",
    keyword: "#cba6f7",
    string: "#a6e3a1",
    number: "#fab387",
    type: "#f9e2af",
    func: "#89b4fa",
    variable: "#eba0ac",
  },
};

function defineThemes(monaco: Monaco) {
  for (const [name, p] of Object.entries(PALETTES)) {
    const hex = (color: string) => color.slice(1);
    monaco.editor.defineTheme(name, {
      base: p.base,
      inherit: true,
      rules: [
        { token: "", foreground: hex(p.text) },
        { token: "comment", foreground: hex(p.comment), fontStyle: "italic" },
        { token: "keyword", foreground: hex(p.keyword) },
        { token: "string", foreground: hex(p.string) },
        { token: "number", foreground: hex(p.number) },
        { token: "constant", foreground: hex(p.number) },
        { token: "type", foreground: hex(p.type) },
        { token: "type.identifier", foreground: hex(p.type) },
        { token: "identifier.function", foreground: hex(p.func) },
        { token: "variable", foreground: hex(p.variable) },
        { token: "tag", foreground: hex(p.variable) },
        { token: "delimiter", foreground: hex(p.text) },
        { token: "operator", foreground: hex(p.text) },
      ],
      colors: {
        "editor.background": p.background,
        "editor.foreground": p.text,
        "editor.lineHighlightBackground": p.activeLine,
        "editor.lineHighlightBorder": p.activeLine,
        "editorGutter.background": p.background,
        "editorLineNumber.foreground": p.lineNumber,
        "editorLineNumber.activeForeground": p.text,
        "editor.selectionBackground": p.selection,
        "editorCursor.foreground": p.text,
        "editorIndentGuide.background1": p.activeLine,
      },
    });
  }
}

type Props = {
  language: Language;
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  onSubmit: () => void;
};

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
      theme={resolvedTheme === "dark" ? "catppuccin-mocha" : "catppuccin-latte"}
      beforeMount={defineThemes}
      loading={<p className="p-4 text-[13px] text-muted-foreground">Loading editor…</p>}
      options={{
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        fontSize: 13,
        lineHeight: 20,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        tabSize: FOUR_SPACES.has(language) ? 4 : 2,
        automaticLayout: true,
        padding: { top: 12 },
        renderLineHighlight: "all",
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
      }}
      onMount={(editor, monaco) => {
        // Ctrl/Cmd+' runs the examples, Ctrl/Cmd+Enter submits.
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Quote, () => handlers.current.onRun());
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => handlers.current.onSubmit());
      }}
    />
  );
}
