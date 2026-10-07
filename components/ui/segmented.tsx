"use client";

/** Segmented control: one choice out of a few, 13px, like the nav buttons. */
export function Segmented<T extends string>({
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
