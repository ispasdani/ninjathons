When you don't immediately see an efficient solution (which is normal), start with the slowest correct one. A brute force is not a confession of defeat: it's the first rung of a ladder that usually leads to the good answer, and it gives you something correct to fall back on.

## Why start there

- **It proves you understand the problem.** If you can't write the brute force, you're not ready to optimise.
- **It shows the waste.** The improvement almost always removes something the brute force recomputes or rechecks.
- **It's a safety net.** If time runs out, a working O(n²) solution scores far better than an unfinished O(n) one.
- **It's a test oracle.** You can check your clever version against it on small inputs.

Write it quickly, state its complexity, and say you'll improve it. Interviewers expect this.

## From brute force to better: look for repeated work

Example: the **largest sum** of a contiguous run of numbers.

1. **Brute force**: every start, every end, add up the run: O(n³).
2. **Notice**: the sum from `i` to `j + 1` is the sum from `i` to `j` plus one number. Keep a running sum as `j` grows: O(n²).
3. **Notice again**: for each end position, only the best run *ending there* matters, and it's either the number alone or the best run ending one earlier plus the number: O(n).

Each step removed one layer of repeated work, and each was a small, checkable change from the last.

## When the obvious fix breaks

Sometimes the "notice" step needs care. Products behave differently from sums: multiplying by a negative number turns the largest product into the smallest, and the smallest into the largest. So the best product ending at a position doesn't follow from the best product ending before it alone. It might come from the *worst* one, if the new number is negative.

That's exactly the kind of thing a brute force catches. Write the O(n²) version of the exercise below first, then try your faster idea on `[-2, 3, -4]` by hand and compare. If the faster idea gives a different answer, ask what it forgot to remember. (The hints help, but try without them first.)

## How to present it

> "The brute force tries every start and end: O(n²), with a running product so each step is O(1). That's correct but too slow for 100,000 numbers. The waste is that each start recomputes products we've already seen. Let me think about what we need to remember about runs ending at each position…"

That's a strong answer even before the optimal solution appears.
