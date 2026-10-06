## Hint

Once the intervals are sorted by start, overlapping ones are next to each other.

## Hint

Sort by start. Walk through: if an interval starts at or before the end of the last merged one, extend that end (with max, since it may be inside); otherwise start a new merged interval.
