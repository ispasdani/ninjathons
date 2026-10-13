import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

// The colours of the "bring the colors back" section, so every window on the
// home page shares one palette. Fixed values, the same in both themes. The last
// two have no colour and follow the theme, for windows where colour would get
// in the way: plain is the quiet one, ink the strong one.
export type WinColor = "orange" | "yellow" | "green" | "pink" | "purple" | "blue" | "red" | "plain" | "ink";

export const WIN: Record<WinColor, { bar: string; text: string; shadow?: string }> = {
  orange: { bar: "#ff7a00", text: "#ffffff" },
  yellow: { bar: "#ffe600", text: "#0a0a0a" },
  green: { bar: "#12c98a", text: "#0a0a0a" },
  pink: { bar: "#ff1f8f", text: "#ffffff" },
  purple: { bar: "#a12cf0", text: "#ffffff" },
  blue: { bar: "#2233ff", text: "#ffffff" },
  red: { bar: "#ff2d2d", text: "#ffffff" },
  plain: { bar: "var(--bg-tertiary)", text: "var(--foreground)", shadow: "var(--border-strong)" },
  ink: { bar: "var(--foreground)", text: "var(--background)" },
};

/**
 * A square window: a coloured title bar with a file name and window controls,
 * a solid offset shadow in the same colour, and the content below. Pass `href`
 * to make the whole window a link, or `as` for another element (a section, an
 * article, a list item, a form). `role` and `aria-label` go on the content, so
 * a window can be a tab panel; any other attributes go on the window itself.
 */
export function WindowCard({
  file,
  color,
  href,
  as: Tag = "div",
  className,
  bodyClassName,
  role,
  "aria-label": label,
  children,
  ...rest
}: {
  file: string;
  color: WinColor;
  href?: string;
  as?: "div" | "section" | "article" | "aside" | "li" | "form";
  className?: string;
  bodyClassName?: string;
  role?: string;
  "aria-label"?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "className" | "role" | "aria-label" | "children" | "style">) {
  const { bar, text, shadow = bar } = WIN[color];
  const outer = cn(
    "flex min-w-0 flex-col overflow-hidden border-2 border-foreground bg-card text-card-foreground",
    "transition-transform duration-150 ease-out-quad motion-reduce:transition-none",
    href && "hover:-translate-x-0.5 hover:-translate-y-0.5",
    className,
  );
  const content = (
    <>
      <div
        className="flex h-[30px] shrink-0 items-center justify-between gap-3 border-b-2 border-foreground pr-1.5 pl-2.5 font-mono text-xs font-medium"
        style={{ background: bar, color: text }}
      >
        <span className="truncate">{file}</span>
        <span className="flex shrink-0 gap-[3px]" aria-hidden>
          <i className="size-3.5 border border-t-white border-r-[#404040] border-b-[#404040] border-l-white bg-[#c0c0c0]" />
          <i className="size-3.5 border border-t-white border-r-[#404040] border-b-[#404040] border-l-white bg-[#c0c0c0]" />
          <i className="size-3.5 border border-t-white border-r-[#404040] border-b-[#404040] border-l-white bg-[#c0c0c0]" />
        </span>
      </div>
      <div role={role} aria-label={label} className={cn("flex grow flex-col", bodyClassName)}>
        {children}
      </div>
    </>
  );
  const style = { boxShadow: `6px 6px 0 ${shadow}` };

  return href ? (
    <Link href={href} className={outer} style={style} {...rest}>
      {content}
    </Link>
  ) : (
    <Tag className={outer} style={style} {...rest}>
      {content}
    </Tag>
  );
}
