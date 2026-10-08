## Hint

Comparing every pair of meetings is about 5 billion comparisons for 100,000 meetings.

## Hint

Sort the meetings by start time. If any two overlap, then some meeting overlaps the one right after it.

## Hint

After sorting, check each neighbouring pair: meeting `i + 1` must start at or after meeting `i` ends. Ending at 10 and starting at 10 is fine.
