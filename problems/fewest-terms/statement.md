A degree has `n` courses, numbered `0` to `n - 1`. Each pair `[before, after]` in `prerequisites` means course `before` must be passed in an earlier term than course `after`.

In one term you can take as many courses as you like, as long as every prerequisite of each one was passed in an earlier term.

Return the fewest terms needed to pass every course, or `-1` if the prerequisites go round in a circle and some courses can never be taken.

## Constraints

- `1 <= n <= 100000`
- `0 <= prerequisites.length <= 100000`
- `0 <= before, after < n`, `before != after`
- No pair appears twice.
