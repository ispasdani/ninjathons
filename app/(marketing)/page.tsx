import Link from "next/link";

import { Button } from "@/components/ui/button";

const tracks = ["Algorithms", "1v1 races", "Territory", "Ninjathons"];

// Left-aligned hero (design.md 5.1): heading, one lede line, track chips,
// then a primary and a Pro button.
export default function HomePage() {
  return (
    <section className="mx-auto max-w-[84rem] px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
      <p className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
        Learn · Compete · Level up
      </p>
      <h1 className="mt-4 max-w-3xl text-4xl leading-[1.1] sm:text-5xl lg:text-6xl">
        Solve problems. Race real people. Show what you can do.
      </h1>
      <p className="mt-6 max-w-[65ch] text-lg leading-[29px] text-text-secondary">
        Practice in five languages, then take it live in 1v1 races and
        Territory matches.
      </p>

      <ul className="mt-8 flex flex-wrap gap-2">
        {tracks.map((track) => (
          <li
            key={track}
            className="rounded-sm bg-bg-secondary px-2 py-0.5 text-xs text-foreground"
          >
            {track}
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button size="lg" asChild>
          <Link href="/sign-up">Find a match</Link>
        </Button>
        {/* Point this at /pricing once that page exists. */}
        <Button size="lg" variant="pro" asChild>
          <Link href="/sign-up">Go Pro</Link>
        </Button>
      </div>
    </section>
  );
}
