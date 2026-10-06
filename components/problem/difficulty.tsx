const DOTS = { easy: 1, medium: 2, hard: 3 };
const NAMES = { easy: "Easy", medium: "Medium", hard: "Hard" };

/** Difficulty as text plus a 3-dot meter, no colored pill (design.md 6, labels). */
export function Difficulty({ level }: { level: "easy" | "medium" | "hard" }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      {NAMES[level]}
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={`size-1.5 rounded-full ${i <= DOTS[level] ? "bg-foreground" : "bg-border"}`} />
        ))}
      </span>
    </span>
  );
}
