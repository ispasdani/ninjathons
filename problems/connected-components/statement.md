A network has `n` computers, numbered `0` to `n - 1`. Each cable `[a, b]` in `edges` connects computers `a` and `b` both ways. Two computers can talk if a chain of cables links them.

Return how many separate groups the computers form: the number of connected components. A computer with no cables is a group of its own.

The same pair may be joined by more than one cable, and cables can form loops.

## Constraints

- `1 <= n <= 100000`
- `0 <= edges.length <= 100000`
- `0 <= a, b < n`, `a != b`
