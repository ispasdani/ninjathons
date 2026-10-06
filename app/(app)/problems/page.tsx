import type { Metadata } from "next";

import { ProblemLibrary } from "@/components/library/problem-library";

export const metadata: Metadata = {
  title: "Problems",
  description: "Coding problems to solve in JavaScript, TypeScript, Python, Java, C#, C++ and Rust.",
};

// Public, like the problem pages: signed-out visitors can browse; solving needs an account.
export default function ProblemsPage() {
  return <ProblemLibrary />;
}
