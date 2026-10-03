import type { Judge, Language, RunJob, Signature } from "../types";

/** What a language adds to the judge. One per language, written once and tested heavily. */
export type LanguageSpec = {
  id: Language;
  label: string;
  /** Toolchain version, shown to users and pinned in the runner image. */
  version: string;
  /** The problem's base time limit is multiplied by this, so slower languages stay fair. */
  timeMultiplier: number;
  /** What the editor starts with for a function-mode problem. */
  starterCode(signature: Signature): string;
  /**
   * Error output as the user should see it: their own code's lines only (no
   * driver or runtime internals), with the file called solution.<ext>.
   * `sourceLines` is how many lines the user wrote; later lines are the driver.
   */
  cleanError(stderr: string, sourceLines: number): string;
  /** The files and commands that run the user's source (plus the driver in function mode). */
  program(judge: Judge, source: string): Pick<RunJob, "files" | "compile" | "run">;
};
