Hard interview problems are rarely one big idea. Usually they're two or three familiar techniques combined, with an awkward detail on top. The way in is to break them apart, solve the pieces, and keep the details for last.

## A method for hard problems

1. **Solve the core, ignoring a complication.** What if all values were distinct, the input sorted, only one answer possible? Solve that first.
2. **Name the technique for the core.** Is it a window, a pointer pair, a search, a DP? Say so.
3. **Find what makes it slow.** Usually a check inside a loop that looks at too much. Can that check be kept up to date in O(1) as things change?
4. **Add the complication back.** Duplicates, ties, empty answers: handle each explicitly.
5. **Test the details.** Hard problems have more edges, and the hidden tests know them.

## Keeping a check up to date

A classic upgrade turns "check everything" into "track one number".

Example: the **shortest run of an array that contains at least one of each colour** from a set of `c` colours.

- The core is a variable-size sliding window: grow on the right, shrink on the left while it's still valid, record the shortest.
- The naive check, "does the window contain every colour?", looks at all `c` colours each step: O(n × c).
- The upgrade: keep a count of each colour inside the window **and** a single number, `covered`, of how many colours have a count above zero. A colour entering with count 0 → 1 increases `covered`; one leaving with count 1 → 0 decreases it. The window is valid exactly when `covered === c`. Each step is now O(1), so the whole walk is O(n).

```python
def shortest_with_all(colours, wanted):
    need = set(wanted)
    count = {}
    covered = 0
    best = None
    left = 0
    for right, col in enumerate(colours):
        if col in need:
            count[col] = count.get(col, 0) + 1
            if count[col] == 1:
                covered += 1
        while covered == len(need):
            if best is None or right - left + 1 < best[1] - best[0]:
                best = (left, right + 1)
            out = colours[left]
            if out in need:
                count[out] -= 1
                if count[out] == 0:
                    covered -= 1
            left += 1
    return best  # (start, end), or None
```

## The complication in the exercise

The exercise below asks for the same kind of window, with one complication: characters can be needed **more than once**. "One of each" becomes "at least this many of each". Adapt the tracked number. What exactly does it count now, and when does it change? Then check the tie rule (which window wins when two are equally short) and the no-answer case.

## When you're short of time

Say what you'd do for the full solution, write the core cleanly, and leave clear `TODO`s for the details. A correct core with a clear plan for the rest is a respectable result on a hard problem.
